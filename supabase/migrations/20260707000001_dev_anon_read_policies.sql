-- =============================================================
-- Dev-only anon SELECT policies — pre-auth bypass period
--
-- MMC-96: The MMC-52/53 UI reads deals, uploaded_files, and
-- analysis_jobs from the browser via the anon Supabase client,
-- but all RLS policies on those tables are TO authenticated.
-- Until auth lands (MMC-22) the anon role sees zero rows, so the
-- dashboard and deal detail page cannot render any data.
--
-- These policies grant anon SELECT scoped strictly to the dev
-- org (NEXT_PUBLIC_DEV_ORG_ID). All other rows remain invisible
-- to anon. No table or column changes.
--
-- ⚠ REMOVAL TRIGGER: drop these policies when MMC-22 (auth)
-- lands. Rollback script: rollback/20260707000001_rollback.sql
--
-- References:
-- - MMC-96 — this migration
-- - MMC-54 — E2E test that surfaced the gap
-- - MMC-22 — auth; removal trigger
-- =============================================================

-- Idempotent (drop-then-create) so a manual pre-apply for local E2E
-- verification doesn't break the CI reapply on merge.

DROP POLICY IF EXISTS "deals_select_anon_dev" ON public.deals;
CREATE POLICY "deals_select_anon_dev"
  ON public.deals FOR SELECT
  TO anon
  USING (org_id = '22222222-2222-2222-2222-222222222222');

DROP POLICY IF EXISTS "uploaded_files_select_anon_dev" ON public.uploaded_files;
CREATE POLICY "uploaded_files_select_anon_dev"
  ON public.uploaded_files FOR SELECT
  TO anon
  USING (org_id = '22222222-2222-2222-2222-222222222222');

DROP POLICY IF EXISTS "analysis_jobs_select_anon_dev" ON public.analysis_jobs;
CREATE POLICY "analysis_jobs_select_anon_dev"
  ON public.analysis_jobs FOR SELECT
  TO anon
  USING (org_id = '22222222-2222-2222-2222-222222222222');
