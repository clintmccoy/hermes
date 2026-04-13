-- =============================================================
-- Rollback: 20260413000002_deals_revenue_model
-- Ticket: MMC-14
--
-- WARNING: drops all deals and revenue allocation data.
-- =============================================================

DROP TRIGGER IF EXISTS set_deals_updated_at ON public.deals;
DROP TABLE IF EXISTS public.deal_revenue_allocations;
DROP TABLE IF EXISTS public.deals;
