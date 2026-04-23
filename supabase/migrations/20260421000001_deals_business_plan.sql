-- =============================================================
-- Migration: 20260421000001_deals_business_plan
-- Ticket: MMC-43 — Add deals.business_plan column (cycle-1 deal-intake)
--
-- Adds a nullable text column to public.deals so the deal-intake
-- UX (MMC-40) can capture asset-level intent at deal creation
-- time, upstream of extraction/analysis. Design approved in
-- docs/scopes/cycle-1/deal-intake.md §3.1.
--
-- One nullable ADD COLUMN operation (safe, no backfill required;
-- existing v0 seed rows receive NULL, which means "business plan
-- not yet recorded"):
--
--   business_plan text
--     The intended operational approach for the deal. Two values
--     for cycle 1:
--       'ground_up'          — new construction / vertical build
--       'acquire_lease_hold' — acquire existing asset, operate,
--                              lease up, and hold through stabilization
--     Additional values (e.g. 'redevelopment') are future scope
--     and will require their own migration + CHECK constraint
--     update.
--
-- Style notes:
--   - CHECK constraint, not Postgres enum. Matches the existing
--     precedent on public.deals.asset_class and public.deals.
--     ownership_structure. Keeps schema evolution simple (no
--     ALTER TYPE ... ADD VALUE ceremony in the future).
--   - No index. Cardinality is low (2 values + NULL) and cycle-1
--     query paths do not filter by business_plan alone.
--   - Nullable. Application layer enforces required-at-create
--     via zod in POST /api/deals (separate ticket). The database
--     intentionally permits NULL so existing seed data is unaffected.
--
-- Rollback: supabase/migrations/rollback/20260421000001_rollback.sql
-- =============================================================

ALTER TABLE public.deals
  ADD COLUMN business_plan text
              CHECK (business_plan IS NULL OR business_plan IN (
                'ground_up', 'acquire_lease_hold'
              ));

COMMENT ON COLUMN public.deals.business_plan IS
  'Operational intent for the deal. Cycle 1 values: ground_up, acquire_lease_hold. '
  'NULL = not yet recorded (applies to pre-MMC-43 seed rows). '
  'Application layer enforces required-at-create via zod.';
