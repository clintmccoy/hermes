-- =============================================================
-- Rollback: 20260421000001_deals_business_plan
-- Ticket: MMC-43
-- =============================================================

ALTER TABLE public.deals
  DROP COLUMN IF EXISTS business_plan;
