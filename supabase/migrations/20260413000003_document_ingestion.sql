-- =============================================================
-- Migration: 20260413000003_document_ingestion
-- Ticket: MMC-15 — Document ingestion pipeline
--
-- Creates the document ingestion pipeline: inbound_emails,
-- uploaded_files, document_refs (quality annotation),
-- document_processing_jobs, and document_pages.
--
-- Design decisions:
--   - GDAI output: dual-storage. Raw JSON → Supabase Storage
--     (pointer in document_pages.raw_gdai_storage_path).
--     Structured extract (text, tables, confidence) → Postgres.
--     Bounding box data preserved in raw JSON per ADR 006.
--   - Deduplication: flag via duplicate_of_id, never block.
--     SHA256 match within same org sets the FK; analyst sees both.
--   - Email ingestion: inbound_emails table per ADR 008. Email
--     body is a Tier 4 source; attachments become uploaded_files
--     rows with source = 'email_inbound'.
--   - Document classification: document_type on document_refs is
--     nullable at creation. Recommended sequence: lightweight
--     pre-classification step sets document_type before GDAI
--     runs, enabling correct processor selection. Schema supports
--     classification at any point in the pipeline.
--   - source_quality on document_refs per ADR 011 §6: quality is
--     a property of the source, not the field. One update here
--     propagates to all extracted values from this document.
--
-- Rollback: supabase/migrations/rollback/20260413000003_rollback.sql
-- =============================================================


-- =============================================================
-- TABLE: inbound_emails
-- Records email arrivals via Postmark or Resend inbound webhook.
-- Created first in the pipeline — attachments become uploaded_files
-- rows that FK back here.
--
-- org_id is nullable at receipt time: the webhook handler creates
-- the row immediately, then an async job resolves the org from the
-- sender address. Until resolved, only service role can read it.
--
-- body_text is a Tier 4 source per ADR 008 — broker notes,
-- pricing commentary, and deal context carried in email prose.
-- Stored here and referenced via a document_refs row.
-- =============================================================

CREATE TABLE public.inbound_emails (
  id                uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid        REFERENCES public.organizations(id) ON DELETE SET NULL,
  message_id        text        NOT NULL UNIQUE,  -- SMTP Message-ID header
  from_address      text        NOT NULL,
  from_name         text,
  subject           text,
  body_text         text,       -- plain text body (Tier 4 source)
  body_html         text,
  received_at       timestamptz NOT NULL DEFAULT now(),
  raw_payload_path  text        -- Supabase Storage path to full webhook JSON payload
);

ALTER TABLE public.inbound_emails ENABLE ROW LEVEL SECURITY;


-- =============================================================
-- TABLE: uploaded_files
-- Metadata for every file that lands in Supabase Storage.
-- Created after a presigned direct upload completes (browser
-- uploads directly to Storage, bypassing Vercel's 4.5MB limit).
-- Trigger.dev listens for file_uploaded events and kicks off
-- the ingestion pipeline.
--
-- deal_id is nullable: a file may arrive via email before a deal
-- has been created in the system. The application links it to a
-- deal once one is created or identified.
--
-- source values:
--   direct_upload  — user uploads via browser presigned URL
--   email_inbound  — attachment extracted from inbound_emails
--   google_drive   — pulled from Google Drive (future)
--
-- status lifecycle:
--   pending    — uploaded, awaiting processing job creation
--   queued     — processing job created, waiting to run
--   processing — GDAI job running
--   processed  — GDAI complete, pages extracted
--   failed     — processing failed; see processing job error_message
--
-- duplicate_of_id: set if sha256_hash matches an existing file
-- in the same org. Processing is skipped for duplicates by default
-- but can be forced. Both records are retained — never silently
-- merged.
-- =============================================================

CREATE TABLE public.uploaded_files (
  id               uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_id          uuid        REFERENCES public.deals(id) ON DELETE SET NULL,
  storage_path     text        NOT NULL UNIQUE,  -- Supabase Storage object key
  file_name        text        NOT NULL,
  mime_type        text        NOT NULL,
  file_size_bytes  bigint      NOT NULL,
  sha256_hash      text        NOT NULL,
  source           text        NOT NULL DEFAULT 'direct_upload'
                     CHECK (source IN ('direct_upload', 'email_inbound', 'google_drive')),
  inbound_email_id uuid        REFERENCES public.inbound_emails(id) ON DELETE SET NULL,
  status           text        NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'queued', 'processing', 'processed', 'failed')),
  duplicate_of_id  uuid        REFERENCES public.uploaded_files(id) ON DELETE SET NULL,
  uploaded_by      uuid        NOT NULL REFERENCES auth.users(id),
  uploaded_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;


-- =============================================================
-- TABLE: document_refs
-- Semantic source record with quality annotation. One row per
-- uploaded file. This is what extracted_inputs (MMC-16) points
-- to as its provenance source — quality lives here, not on each
-- individual extracted field (ADR 011 §6).
--
-- source_quality values:
--   strong     — executed, recorded, or audited document.
--                Examples: signed lease, recorded deed,
--                audited financial statements.
--   reasonable — current but unexecuted. Examples: current rent
--                roll, recent T12, broker OM with up-to-date data.
--   weak       — stale, estimated, or unverified. Examples:
--                proforma projections, 2-year-old rent roll,
--                broker verbal estimates committed to email.
--
-- source_quality is nullable until set by the analyst or AI.
-- The source_quality_override on extracted_inputs handles
-- field-level exceptions where one value from a document has
-- materially different quality than the document overall.
--
-- document_type is nullable until the classification step runs.
-- Recommended: set before GDAI processing to enable correct
-- processor selection. Both AI classification and analyst
-- override are valid. email_body type is used when this
-- document_ref represents an inbound email body.
-- =============================================================

CREATE TABLE public.document_refs (
  id               uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_file_id uuid        NOT NULL UNIQUE REFERENCES public.uploaded_files(id) ON DELETE CASCADE,
  document_type    text
                     CHECK (document_type IS NULL OR document_type IN (
                       'offering_memorandum', 'rent_roll', 't12', 'budget',
                       'appraisal', 'lease', 'construction_budget',
                       'loan_documents', 'email_body', 'other'
                     )),
  source_quality   text
                     CHECK (source_quality IS NULL OR source_quality IN (
                       'strong', 'reasonable', 'weak'
                     )),
  effective_date   date,        -- "as of" date of the document's data
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.document_refs ENABLE ROW LEVEL SECURITY;


-- =============================================================
-- TABLE: document_processing_jobs
-- One record per Google Document AI processing attempt.
-- A file may have multiple jobs: retry on failure, or reprocess
-- with an updated GDAI processor version (intentional reprocess
-- must be an explicit action, not automatic, to avoid silently
-- invalidating existing extracted_inputs provenance).
--
-- gdai_processor_id: the full GDAI processor resource name,
-- e.g. "projects/123/locations/us/processors/abc123". Stored
-- verbatim so the exact processor version that ran is always
-- recoverable — required for provenance reproducibility.
--
-- gdai_operation_name: GDAI long-running operation name returned
-- at job submission. Used to poll for completion status.
-- =============================================================

CREATE TABLE public.document_processing_jobs (
  id                   uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_file_id     uuid        NOT NULL REFERENCES public.uploaded_files(id) ON DELETE CASCADE,
  gdai_processor_id    text        NOT NULL,
  gdai_operation_name  text,       -- null until GDAI operation submitted
  status               text        NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'running', 'complete', 'failed')),
  pages_processed      integer,
  started_at           timestamptz,
  completed_at         timestamptz,
  failed_at            timestamptz,
  error_message        text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.document_processing_jobs ENABLE ROW LEVEL SECURITY;


-- =============================================================
-- TABLE: document_pages
-- Per-page structured output from a GDAI processing job.
-- One row per page per job — multiple jobs on the same file
-- produce separate sets of page rows.
--
-- extracted_text: full plain-text content of the page.
-- tables: JSONB array of structured table data extracted by GDAI.
--   Each element represents one table: { headers: [], rows: [[]] }
--   Preserved as close to GDAI output format as practical.
-- raw_gdai_storage_path: pointer to the full GDAI page-level
--   JSON response in Supabase Storage. Contains bounding box
--   coordinates required for PDF provenance pointers (ADR 006).
--   Never discard this data — it is the audit anchor.
--
-- confidence_score: GDAI's overall page-level confidence (0–1).
-- Field-level confidence lives in the raw GDAI JSON.
-- =============================================================

CREATE TABLE public.document_pages (
  id                    uuid         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_file_id      uuid         NOT NULL REFERENCES public.uploaded_files(id) ON DELETE CASCADE,
  processing_job_id     uuid         NOT NULL REFERENCES public.document_processing_jobs(id) ON DELETE CASCADE,
  page_number           integer      NOT NULL,
  extracted_text        text,
  tables                jsonb,
  confidence_score      numeric(4,3) CHECK (confidence_score BETWEEN 0 AND 1),
  raw_gdai_storage_path text,        -- pointer to raw GDAI page JSON in Storage
  created_at            timestamptz  NOT NULL DEFAULT now(),

  UNIQUE (processing_job_id, page_number)
);

ALTER TABLE public.document_pages ENABLE ROW LEVEL SECURITY;


-- =============================================================
-- INDEXES
-- =============================================================

-- uploaded_files: org-scoped list queries
CREATE INDEX idx_uploaded_files_org_id
  ON public.uploaded_files(org_id);

-- uploaded_files: deal-scoped document list
CREATE INDEX idx_uploaded_files_deal_id
  ON public.uploaded_files(deal_id);

-- uploaded_files: deduplication lookup by hash within org
CREATE INDEX idx_uploaded_files_org_sha256
  ON public.uploaded_files(org_id, sha256_hash);

-- inbound_emails: org-scoped queries (once org is resolved)
CREATE INDEX idx_inbound_emails_org_id
  ON public.inbound_emails(org_id);

-- document_processing_jobs: all jobs for a given file
CREATE INDEX idx_document_processing_jobs_file_id
  ON public.document_processing_jobs(uploaded_file_id);

-- document_pages: page lookup by file (cross-job — latest job pattern)
CREATE INDEX idx_document_pages_file_id
  ON public.document_pages(uploaded_file_id);

-- document_pages: all pages for a specific processing job
CREATE INDEX idx_document_pages_job_id
  ON public.document_pages(processing_job_id);


-- =============================================================
-- RLS POLICIES: inbound_emails
-- Org-scoped once org_id is resolved. Rows with null org_id
-- (just received, not yet resolved) require service role.
-- =============================================================

CREATE POLICY "inbound_emails_select"
  ON public.inbound_emails FOR SELECT
  TO authenticated
  USING (org_id = ANY(auth.user_org_ids()));

CREATE POLICY "inbound_emails_update"
  ON public.inbound_emails FOR UPDATE
  TO authenticated
  USING (org_id = ANY(auth.user_org_ids()))
  WITH CHECK (org_id = ANY(auth.user_org_ids()));


-- =============================================================
-- RLS POLICIES: uploaded_files
-- =============================================================

CREATE POLICY "uploaded_files_select"
  ON public.uploaded_files FOR SELECT
  TO authenticated
  USING (org_id = ANY(auth.user_org_ids()));

CREATE POLICY "uploaded_files_insert"
  ON public.uploaded_files FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id = ANY(auth.user_org_ids())
    AND uploaded_by = auth.uid()
  );

CREATE POLICY "uploaded_files_update"
  ON public.uploaded_files FOR UPDATE
  TO authenticated
  USING (org_id = ANY(auth.user_org_ids()))
  WITH CHECK (org_id = ANY(auth.user_org_ids()));


-- =============================================================
-- RLS POLICIES: document_refs
-- Inherits org scope via uploaded_files.
-- =============================================================

CREATE POLICY "document_refs_select"
  ON public.document_refs FOR SELECT
  TO authenticated
  USING (
    uploaded_file_id IN (
      SELECT id FROM public.uploaded_files WHERE org_id = ANY(auth.user_org_ids())
    )
  );

CREATE POLICY "document_refs_insert"
  ON public.document_refs FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_file_id IN (
      SELECT id FROM public.uploaded_files WHERE org_id = ANY(auth.user_org_ids())
    )
  );

CREATE POLICY "document_refs_update"
  ON public.document_refs FOR UPDATE
  TO authenticated
  USING (
    uploaded_file_id IN (
      SELECT id FROM public.uploaded_files WHERE org_id = ANY(auth.user_org_ids())
    )
  );


-- =============================================================
-- RLS POLICIES: document_processing_jobs
-- Inherits org scope via uploaded_files.
-- Note: jobs are primarily written by the Trigger.dev service
-- role — these policies cover analyst read access.
-- =============================================================

CREATE POLICY "document_processing_jobs_select"
  ON public.document_processing_jobs FOR SELECT
  TO authenticated
  USING (
    uploaded_file_id IN (
      SELECT id FROM public.uploaded_files WHERE org_id = ANY(auth.user_org_ids())
    )
  );


-- =============================================================
-- RLS POLICIES: document_pages
-- Inherits org scope via uploaded_files.
-- =============================================================

CREATE POLICY "document_pages_select"
  ON public.document_pages FOR SELECT
  TO authenticated
  USING (
    uploaded_file_id IN (
      SELECT id FROM public.uploaded_files WHERE org_id = ANY(auth.user_org_ids())
    )
  );


-- =============================================================
-- TRIGGER: updated_at on document_refs
-- Reuses set_updated_at() from MMC-13 migration.
-- =============================================================

CREATE TRIGGER set_document_refs_updated_at
  BEFORE UPDATE ON public.document_refs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
