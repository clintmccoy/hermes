-- =============================================================
-- Migration: 20260413000004_ai_execution_layer
-- Ticket: MMC-16 — AI execution layer (analysis jobs, extracted
-- inputs, agent provenance)
--
-- Translates ADR 010 (v0 agentic architecture) and ADR 011 §3
-- (flexible human gate system) into schema.
--
-- Key design decisions:
--   - Gate system is normalized (job_gates table) not hardcoded
--     columns on analysis_jobs — supersedes original ticket spec
--   - Agent events persisted to Postgres for audit replay (v0)
--   - Proactive background agents share analysis_jobs via job_type
--   - conversation_sessions + conversation_refs are stub tables
--     for the co-analyst; full architecture deferred to v1
--   - System default gate config profile seeded at migration time
--
-- Table creation order (dependency chain):
--   gate_config_profiles → gate_config_entries
--   conversation_sessions → conversation_refs
--   analysis_jobs → job_gates → extracted_inputs
--     → job_gate_corrections, field_review_events, agent_events
--
-- Rollback: supabase/migrations/rollback/20260413000004_rollback.sql
-- =============================================================


-- =============================================================
-- TABLE: gate_config_profiles
-- Named gate configurations. A system default profile is seeded
-- below. Orgs can create custom profiles in v1.
-- org_id = NULL means the profile is a system-level default,
-- readable by all orgs.
-- =============================================================

CREATE TABLE public.gate_config_profiles (
  id          uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid        REFERENCES public.organizations(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  description text,
  is_default  boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gate_config_profiles ENABLE ROW LEVEL SECURITY;


-- =============================================================
-- TABLE: gate_config_entries
-- One row per gate per profile. Defines gate name, sequence
-- order, which analysis depths it applies to, and skippability.
--
-- analysis_depths (jsonb): array of analysis_depth values this
-- gate fires on. e.g. ["first_run","ic_grade","strategic_mix"]
-- BOE is excluded from the v0 default — it runs without gates.
-- =============================================================

CREATE TABLE public.gate_config_entries (
  id               uuid     NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       uuid     NOT NULL REFERENCES public.gate_config_profiles(id) ON DELETE CASCADE,
  gate_name        text     NOT NULL,
  gate_sequence    smallint NOT NULL CHECK (gate_sequence > 0),
  analysis_depths  jsonb    NOT NULL,
  is_skippable     boolean  NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),

  UNIQUE (profile_id, gate_sequence)
);

ALTER TABLE public.gate_config_entries ENABLE ROW LEVEL SECURITY;


-- =============================================================
-- SEED: system default gate config profile (v0 defaults)
-- Two gates per ADR 010 §4. BOE excluded — no gates for screens.
-- Using a fixed UUID so the application can reference it by ID.
-- =============================================================

INSERT INTO public.gate_config_profiles (id, org_id, name, description, is_default)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  NULL,
  'Default (v0)',
  'Two-gate system per ADR 010: post-extraction review and post-construction review. Applies to first-run, IC-grade, and strategic mix analyses. BOE screens run without gates.',
  true
);

INSERT INTO public.gate_config_entries (profile_id, gate_name, gate_sequence, analysis_depths, is_skippable)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'post_extraction',
    1,
    '["first_run", "ic_grade", "strategic_mix"]',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'post_construction',
    2,
    '["first_run", "ic_grade", "strategic_mix"]',
    true
  );


-- =============================================================
-- TABLE: conversation_sessions
-- Stub table for the co-analyst conversational agent.
-- One session per analyst-deal conversation thread. Full memory
-- model and context window architecture deferred to v1 per
-- ADR 010. The metadata field is reserved for v1 config.
-- =============================================================

CREATE TABLE public.conversation_sessions (
  id             uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_id        uuid        REFERENCES public.deals(id) ON DELETE SET NULL,
  created_by     uuid        NOT NULL REFERENCES auth.users(id),
  status         text        NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'archived')),
  started_at     timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz NOT NULL DEFAULT now(),
  metadata       jsonb       -- reserved: memory model config, context window state (v1)
);

ALTER TABLE public.conversation_sessions ENABLE ROW LEVEL SECURITY;


-- =============================================================
-- TABLE: conversation_refs
-- Provenance reference to a specific message in a conversation
-- session. The conversational counterpart to document_refs —
-- extracted_inputs points here when a value came from analyst
-- dialogue rather than an uploaded document.
-- =============================================================

CREATE TABLE public.conversation_refs (
  id                      uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_session_id uuid        NOT NULL REFERENCES public.conversation_sessions(id) ON DELETE CASCADE,
  message_index           integer     NOT NULL CHECK (message_index >= 0),
  message_excerpt         text,
  source_quality          text        NOT NULL DEFAULT 'reasonable'
                            CHECK (source_quality IN ('strong', 'reasonable', 'weak')),
  created_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.conversation_refs ENABLE ROW LEVEL SECURITY;


-- =============================================================
-- TABLE: analysis_jobs
-- One record per Trigger.dev background job. Covers both analyst-
-- initiated analysis jobs and proactive background agent runs
-- (distinguished by job_type).
--
-- job_type values:
--   analysis        — initiated by an analyst action
--   background_agent — scheduled or event-triggered; deal_id
--                      may be null for org-level scans
--
-- analysis_depth required when job_type = 'analysis'. NULL is
-- permitted for background_agent jobs.
--
-- status values:
--   queued        — submitted, not yet picked up by Trigger.dev
--   running       — agent actively executing
--   awaiting_gate — suspended at a human checkpoint (Trigger.dev
--                   wait step); job_gates row is 'pending'
--   complete      — all steps done, results stored
--   failed        — unrecoverable error; see error_message
--   cancelled     — stopped before completion
--
-- executor_model + advisor_model: required, never null per ADR 010
-- §1+2. Version-pinned strings — never 'claude-sonnet-latest'.
--
-- Credit deduction at completion (step 6), not at job start per
-- ADR 010 §5. Failed jobs do not consume credits.
-- =============================================================

CREATE TABLE public.analysis_jobs (
  id                       uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                   uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_id                  uuid        REFERENCES public.deals(id) ON DELETE SET NULL,

  -- Job classification
  job_type                 text        NOT NULL DEFAULT 'analysis'
                             CHECK (job_type IN ('analysis', 'background_agent')),
  analysis_depth           text
                             CHECK (analysis_depth IS NULL OR analysis_depth IN
                               ('boe', 'first_run', 'ic_grade', 'strategic_mix')),

  -- Enforce: analysis jobs must have a depth; background agents may not
  CONSTRAINT analysis_requires_depth CHECK (
    (job_type = 'analysis' AND analysis_depth IS NOT NULL) OR
    (job_type = 'background_agent')
  ),

  status                   text        NOT NULL DEFAULT 'queued'
                             CHECK (status IN (
                               'queued', 'running', 'awaiting_gate',
                               'complete', 'failed', 'cancelled'
                             )),

  -- ADR 010 §1+2: model versions — required, version-pinned, never null
  executor_model           text        NOT NULL,
  advisor_model            text        NOT NULL,

  -- ADR 010 §2: advisor usage — populated at job completion
  advisor_invocation_count integer,
  advisor_tokens_used      integer,
  executor_tokens_used     integer,

  -- Billing: deducted at completion, not at start (ADR 010 §5)
  credit_cost              integer,        -- null until job completes successfully
  credits_deducted_at      timestamptz,

  -- Trigger.dev linkage — for deep-linking to run logs in the dashboard
  trigger_dev_job_id       text,

  -- Lifecycle
  created_by               uuid        NOT NULL REFERENCES auth.users(id),
  created_at               timestamptz NOT NULL DEFAULT now(),
  started_at               timestamptz,
  completed_at             timestamptz,
  failed_at                timestamptz,
  cancelled_at             timestamptz,
  error_message            text
);

ALTER TABLE public.analysis_jobs ENABLE ROW LEVEL SECURITY;


-- =============================================================
-- TABLE: job_gates
-- One row per gate event per job. Normalized gate system per
-- ADR 011 §3 — replaces hardcoded gate_1/gate_2 columns.
-- Gate rows are created when the job reaches each checkpoint;
-- status moves to 'confirmed' or 'skipped' on user action.
-- =============================================================

CREATE TABLE public.job_gates (
  id            uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        uuid        NOT NULL REFERENCES public.analysis_jobs(id) ON DELETE CASCADE,
  gate_name     text        NOT NULL,
  gate_sequence smallint    NOT NULL CHECK (gate_sequence > 0),
  status        text        NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'confirmed', 'skipped')),
  confirmed_at  timestamptz,
  confirmed_by  uuid        REFERENCES auth.users(id),
  skipped_at    timestamptz,
  skipped_by    uuid        REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),

  UNIQUE (job_id, gate_sequence)
);

ALTER TABLE public.job_gates ENABLE ROW LEVEL SECURITY;


-- =============================================================
-- TABLE: extracted_inputs
-- Every AI-extracted value with full provenance. The canonical
-- record of what the agent read, where it read it from, and how
-- confident it was.
--
-- Source provenance: exactly one of source_document_ref_id or
-- source_conversation_ref_id should be set. Both null is allowed
-- for AI-inferred values with no document/conversation anchor.
-- Both set simultaneously is not permitted.
--
-- source_text_excerpt: the verbatim text the agent quoted from
-- the source document or conversation. This is the RAG grounding
-- anchor — it's how analysts verify the extraction is correct.
-- Preserve it exactly; do not summarize or paraphrase.
--
-- extraction_model: version-pinned model string at extraction
-- time. Required per ADR 007 + ADR 010.
--
-- source_quality_override (ADR 011 §6): field-level exception
-- for cases where one value from a document has materially
-- different quality than the document overall (e.g. a weak
-- broker OM that happens to include an executed lease schedule).
-- =============================================================

CREATE TABLE public.extracted_inputs (
  id                         uuid         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_job_id            uuid         NOT NULL REFERENCES public.analysis_jobs(id) ON DELETE CASCADE,
  deal_id                    uuid         NOT NULL REFERENCES public.deals(id),
  org_id                     uuid         NOT NULL REFERENCES public.organizations(id),

  -- Source provenance — mutually exclusive; both null = AI-inferred
  source_document_ref_id     uuid         REFERENCES public.document_refs(id),
  source_conversation_ref_id uuid         REFERENCES public.conversation_refs(id),
  CONSTRAINT one_source_max CHECK (
    NOT (source_document_ref_id IS NOT NULL AND source_conversation_ref_id IS NOT NULL)
  ),

  source_page_number         integer,
  source_text_excerpt        text,        -- verbatim agent quote; preserve exactly

  -- The extracted value
  field_name                 text         NOT NULL,
  extracted_value            jsonb        NOT NULL,
  unit                       text,        -- e.g. 'usd', 'usd_psf', 'percent', 'sqft'

  -- Confidence and model provenance
  confidence_score           numeric(4,3) CHECK (confidence_score BETWEEN 0 AND 1),
  extraction_model           text         NOT NULL,
  advisor_invoked            boolean      NOT NULL DEFAULT false,

  -- ADR 011 §6: field-level source quality exception
  source_quality_override    text
                               CHECK (source_quality_override IS NULL OR
                                      source_quality_override IN ('strong','reasonable','weak')),

  -- Analyst override at Gate 1
  user_override_value        jsonb,
  user_override_at           timestamptz,
  user_override_by           uuid         REFERENCES auth.users(id),

  created_at                 timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.extracted_inputs ENABLE ROW LEVEL SECURITY;


-- =============================================================
-- TABLE: job_gate_corrections
-- One row per field corrected during a gate review.
-- Structured as queryable training data per ADR 011 §3 —
-- each row is a labeled signal about where the agent erred.
-- This table is a first-class data asset, not just an audit log.
-- =============================================================

CREATE TABLE public.job_gate_corrections (
  id                  uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_id             uuid        NOT NULL REFERENCES public.job_gates(id) ON DELETE CASCADE,
  job_id              uuid        NOT NULL REFERENCES public.analysis_jobs(id),  -- denormalized
  extracted_input_id  uuid        REFERENCES public.extracted_inputs(id) ON DELETE SET NULL,
  field_name          text        NOT NULL,
  original_value      jsonb       NOT NULL,
  corrected_value     jsonb       NOT NULL,
  correction_reason   text,
  corrected_by        uuid        NOT NULL REFERENCES auth.users(id),
  corrected_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_gate_corrections ENABLE ROW LEVEL SECURITY;


-- =============================================================
-- TABLE: field_review_events
-- Every explicit analyst confirmation or override of an
-- extracted field. Feeds the "human review level" dimension
-- of the three-dimensional health score (ADR 011 §7).
-- Append-only — never update or delete rows.
-- =============================================================

CREATE TABLE public.field_review_events (
  id                  uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  extracted_input_id  uuid        NOT NULL REFERENCES public.extracted_inputs(id) ON DELETE CASCADE,
  job_id              uuid        NOT NULL REFERENCES public.analysis_jobs(id),  -- denormalized
  action              text        NOT NULL CHECK (action IN ('confirmed', 'overridden', 'flagged')),
  reviewed_by         uuid        NOT NULL REFERENCES auth.users(id),
  reviewed_at         timestamptz NOT NULL DEFAULT now(),
  review_notes        text
);

ALTER TABLE public.field_review_events ENABLE ROW LEVEL SECURITY;


-- =============================================================
-- TABLE: agent_events
-- Persisted streaming events emitted by the agent during a job.
-- Ordered by sequence_number for deterministic replay.
-- Written by the Trigger.dev job via service role.
-- Read by analysts for job progress + audit review.
-- Prune old events at scale (v1 concern); retain all for v0.
-- =============================================================

CREATE TABLE public.agent_events (
  id              uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          uuid        NOT NULL REFERENCES public.analysis_jobs(id) ON DELETE CASCADE,
  event_type      text        NOT NULL,
  payload         jsonb,
  sequence_number integer     NOT NULL,
  emitted_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (job_id, sequence_number)
);

ALTER TABLE public.agent_events ENABLE ROW LEVEL SECURITY;


-- =============================================================
-- INDEXES
-- =============================================================

-- analysis_jobs: org-scoped list + status filtering
CREATE INDEX idx_analysis_jobs_org_id
  ON public.analysis_jobs(org_id);

CREATE INDEX idx_analysis_jobs_deal_id
  ON public.analysis_jobs(deal_id);

CREATE INDEX idx_analysis_jobs_org_status
  ON public.analysis_jobs(org_id, status);

-- job_gates: all gates for a job (ordered by sequence)
CREATE INDEX idx_job_gates_job_id
  ON public.job_gates(job_id);

-- extracted_inputs: all extractions for a job or deal
CREATE INDEX idx_extracted_inputs_job_id
  ON public.extracted_inputs(analysis_job_id);

CREATE INDEX idx_extracted_inputs_deal_id
  ON public.extracted_inputs(deal_id);

-- extracted_inputs: org-scoped RLS (denormalized org_id used directly)
CREATE INDEX idx_extracted_inputs_org_id
  ON public.extracted_inputs(org_id);

-- extracted_inputs: field name lookups (e.g. "give me all noi_annual extractions")
CREATE INDEX idx_extracted_inputs_field_name
  ON public.extracted_inputs(deal_id, field_name);

-- job_gate_corrections: training data queries by job
CREATE INDEX idx_job_gate_corrections_job_id
  ON public.job_gate_corrections(job_id);

-- field_review_events: review history per input
CREATE INDEX idx_field_review_events_input_id
  ON public.field_review_events(extracted_input_id);

-- agent_events: ordered event stream per job
CREATE INDEX idx_agent_events_job_id_seq
  ON public.agent_events(job_id, sequence_number);

-- conversation_sessions: org + deal scoped
CREATE INDEX idx_conversation_sessions_org_id
  ON public.conversation_sessions(org_id);

CREATE INDEX idx_conversation_sessions_deal_id
  ON public.conversation_sessions(deal_id);


-- =============================================================
-- RLS POLICIES: gate_config_profiles
-- System profiles (org_id = null) readable by all authenticated
-- users. Org custom profiles readable by org members only.
-- =============================================================

CREATE POLICY "gate_config_profiles_select"
  ON public.gate_config_profiles FOR SELECT
  TO authenticated
  USING (
    org_id IS NULL                          -- system defaults: visible to all
    OR org_id = ANY(auth.user_org_ids())    -- org custom profiles
  );


-- =============================================================
-- RLS POLICIES: gate_config_entries
-- Inherits visibility from the parent profile.
-- =============================================================

CREATE POLICY "gate_config_entries_select"
  ON public.gate_config_entries FOR SELECT
  TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM public.gate_config_profiles
      WHERE org_id IS NULL OR org_id = ANY(auth.user_org_ids())
    )
  );


-- =============================================================
-- RLS POLICIES: conversation_sessions
-- =============================================================

CREATE POLICY "conversation_sessions_select"
  ON public.conversation_sessions FOR SELECT
  TO authenticated
  USING (org_id = ANY(auth.user_org_ids()));

CREATE POLICY "conversation_sessions_insert"
  ON public.conversation_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id = ANY(auth.user_org_ids())
    AND created_by = auth.uid()
  );

CREATE POLICY "conversation_sessions_update"
  ON public.conversation_sessions FOR UPDATE
  TO authenticated
  USING (org_id = ANY(auth.user_org_ids()))
  WITH CHECK (org_id = ANY(auth.user_org_ids()));


-- =============================================================
-- RLS POLICIES: conversation_refs
-- Inherits org scope via conversation_sessions.
-- =============================================================

CREATE POLICY "conversation_refs_select"
  ON public.conversation_refs FOR SELECT
  TO authenticated
  USING (
    conversation_session_id IN (
      SELECT id FROM public.conversation_sessions
      WHERE org_id = ANY(auth.user_org_ids())
    )
  );

CREATE POLICY "conversation_refs_insert"
  ON public.conversation_refs FOR INSERT
  TO authenticated
  WITH CHECK (
    conversation_session_id IN (
      SELECT id FROM public.conversation_sessions
      WHERE org_id = ANY(auth.user_org_ids())
    )
  );


-- =============================================================
-- RLS POLICIES: analysis_jobs
-- =============================================================

CREATE POLICY "analysis_jobs_select"
  ON public.analysis_jobs FOR SELECT
  TO authenticated
  USING (org_id = ANY(auth.user_org_ids()));

CREATE POLICY "analysis_jobs_insert"
  ON public.analysis_jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id = ANY(auth.user_org_ids())
    AND created_by = auth.uid()
  );

CREATE POLICY "analysis_jobs_update"
  ON public.analysis_jobs FOR UPDATE
  TO authenticated
  USING (org_id = ANY(auth.user_org_ids()))
  WITH CHECK (org_id = ANY(auth.user_org_ids()));


-- =============================================================
-- RLS POLICIES: job_gates
-- Inherits org scope via analysis_jobs.
-- =============================================================

CREATE POLICY "job_gates_select"
  ON public.job_gates FOR SELECT
  TO authenticated
  USING (
    job_id IN (
      SELECT id FROM public.analysis_jobs WHERE org_id = ANY(auth.user_org_ids())
    )
  );

CREATE POLICY "job_gates_update"
  ON public.job_gates FOR UPDATE
  TO authenticated
  USING (
    job_id IN (
      SELECT id FROM public.analysis_jobs WHERE org_id = ANY(auth.user_org_ids())
    )
  );


-- =============================================================
-- RLS POLICIES: extracted_inputs
-- Uses denormalized org_id — single index hit, no subquery chain.
-- =============================================================

CREATE POLICY "extracted_inputs_select"
  ON public.extracted_inputs FOR SELECT
  TO authenticated
  USING (org_id = ANY(auth.user_org_ids()));

CREATE POLICY "extracted_inputs_update"
  ON public.extracted_inputs FOR UPDATE
  TO authenticated
  USING (org_id = ANY(auth.user_org_ids()))
  WITH CHECK (org_id = ANY(auth.user_org_ids()));


-- =============================================================
-- RLS POLICIES: job_gate_corrections
-- Inherits org scope via analysis_jobs.
-- =============================================================

CREATE POLICY "job_gate_corrections_select"
  ON public.job_gate_corrections FOR SELECT
  TO authenticated
  USING (
    job_id IN (
      SELECT id FROM public.analysis_jobs WHERE org_id = ANY(auth.user_org_ids())
    )
  );

CREATE POLICY "job_gate_corrections_insert"
  ON public.job_gate_corrections FOR INSERT
  TO authenticated
  WITH CHECK (
    job_id IN (
      SELECT id FROM public.analysis_jobs WHERE org_id = ANY(auth.user_org_ids())
    )
  );


-- =============================================================
-- RLS POLICIES: field_review_events (append-only, no update/delete)
-- =============================================================

CREATE POLICY "field_review_events_select"
  ON public.field_review_events FOR SELECT
  TO authenticated
  USING (
    job_id IN (
      SELECT id FROM public.analysis_jobs WHERE org_id = ANY(auth.user_org_ids())
    )
  );

CREATE POLICY "field_review_events_insert"
  ON public.field_review_events FOR INSERT
  TO authenticated
  WITH CHECK (
    job_id IN (
      SELECT id FROM public.analysis_jobs WHERE org_id = ANY(auth.user_org_ids())
    )
    AND reviewed_by = auth.uid()
  );


-- =============================================================
-- RLS POLICIES: agent_events
-- Written by service role (Trigger.dev); read by org members.
-- =============================================================

CREATE POLICY "agent_events_select"
  ON public.agent_events FOR SELECT
  TO authenticated
  USING (
    job_id IN (
      SELECT id FROM public.analysis_jobs WHERE org_id = ANY(auth.user_org_ids())
    )
  );
