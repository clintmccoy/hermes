-- =============================================================
-- Rollback: 20260413000003_document_ingestion
-- Ticket: MMC-15
--
-- WARNING: drops all document ingestion data including uploaded
-- file metadata, processing jobs, pages, and email records.
-- Supabase Storage objects are NOT deleted by this script —
-- clean up Storage buckets separately if needed.
-- =============================================================

DROP TRIGGER IF EXISTS set_document_refs_updated_at ON public.document_refs;
DROP TABLE IF EXISTS public.document_pages;
DROP TABLE IF EXISTS public.document_processing_jobs;
DROP TABLE IF EXISTS public.document_refs;
DROP TABLE IF EXISTS public.uploaded_files;
DROP TABLE IF EXISTS public.inbound_emails;
