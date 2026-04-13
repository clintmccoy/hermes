-- =============================================================
-- Rollback: 20260413000014_cost_disposition
-- Ticket: MMC-30
-- =============================================================

DROP TABLE IF EXISTS public.absorption_schedules CASCADE;
DROP TABLE IF EXISTS public.sale_products CASCADE;
DROP TABLE IF EXISTS public.liquidation_tranches CASCADE;
DROP TABLE IF EXISTS public.capex_spend_lines CASCADE;
DROP TABLE IF EXISTS public.carry_costs CASCADE;
DROP TYPE  IF EXISTS public.buyer_type_enum;
