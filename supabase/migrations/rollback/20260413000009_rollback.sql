-- =============================================================
-- Rollback: 20260413000009_value_driver_engine
-- Ticket: MMC-26
-- =============================================================

DROP TABLE IF EXISTS public.value_schedule_entries CASCADE;
DROP TABLE IF EXISTS public.investment_assumptions CASCADE;
DROP TABLE IF EXISTS public.operating_assumptions CASCADE;
DROP TABLE IF EXISTS public.market_leasing_assumptions CASCADE;

DROP TYPE IF EXISTS public.value_schedule_assumption_source_enum;
DROP TYPE IF EXISTS public.value_schedule_period_type_enum;
DROP TYPE IF EXISTS public.escalation_rate_type_enum;
DROP TYPE IF EXISTS public.inflation_convention_enum;
