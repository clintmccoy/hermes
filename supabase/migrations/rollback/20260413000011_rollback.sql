-- =============================================================
-- Rollback: 20260413000011_model_output_tables
-- Ticket: MMC-28
-- =============================================================

DROP TABLE IF EXISTS public.model_run_quarterly_cashflows CASCADE;
DROP TABLE IF EXISTS public.model_run_annual_cashflows CASCADE;
DROP TABLE IF EXISTS public.model_run_monthly_cashflows CASCADE;
DROP TABLE IF EXISTS public.model_run_kpis CASCADE;
