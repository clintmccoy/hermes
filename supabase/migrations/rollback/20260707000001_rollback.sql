-- Rollback for 20260707000001_dev_anon_read_policies.sql (MMC-96)
-- Drops the dev-only anon SELECT policies. Run when MMC-22 (auth)
-- lands, or to revert the bypass-period read access.

DROP POLICY IF EXISTS "deals_select_anon_dev" ON public.deals;
DROP POLICY IF EXISTS "uploaded_files_select_anon_dev" ON public.uploaded_files;
DROP POLICY IF EXISTS "analysis_jobs_select_anon_dev" ON public.analysis_jobs;
