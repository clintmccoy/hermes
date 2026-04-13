-- =============================================================
-- Rollback: 20260413000007_property_layer
-- Ticket: MMC-24
--
-- Drop order respects FK dependencies:
--   space_pool_members → space_pools → spaces_master → buildings
--   → remove parent_deal_id from deals
-- ENUMs must be dropped after all tables referencing them.
-- =============================================================

DROP TABLE IF EXISTS public.space_pool_members CASCADE;
DROP TABLE IF EXISTS public.space_pools CASCADE;
DROP TABLE IF EXISTS public.spaces_master CASCADE;
DROP TABLE IF EXISTS public.buildings CASCADE;

DROP TYPE IF EXISTS public.space_pool_type;
DROP TYPE IF EXISTS public.space_lifecycle_status;
DROP TYPE IF EXISTS public.space_type;

ALTER TABLE public.deals
  DROP COLUMN IF EXISTS parent_deal_id;

DROP INDEX IF EXISTS public.idx_deals_parent_deal_id;
