-- =============================================================
-- Rollback: 20260413000010_capital_stack
-- Ticket: MMC-27
-- =============================================================

DROP TABLE IF EXISTS public.debt_covenants CASCADE;
DROP TABLE IF EXISTS public.waterfall_tiers CASCADE;
DROP TABLE IF EXISTS public.equity_terms CASCADE;
DROP TABLE IF EXISTS public.debt_terms CASCADE;
DROP TABLE IF EXISTS public.capital_sources CASCADE;

DROP TYPE IF EXISTS public.covenant_test_frequency_enum;
DROP TYPE IF EXISTS public.covenant_type_enum;
DROP TYPE IF EXISTS public.waterfall_hurdle_type_enum;
DROP TYPE IF EXISTS public.debt_rate_type_enum;
DROP TYPE IF EXISTS public.capital_type_enum;
