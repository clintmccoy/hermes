-- =============================================================
-- Migration: 20260413000015_lease_traits_modified_gross_expense_stops
-- Ticket: MMC-31 — Add base year expense stop amounts to modified gross trait
--
-- Gap identified in ADR 013 consequences section:
--   lease_traits_modified_gross stores tenant_pays: text[] (category
--   names) but has no base year dollar amounts per category. The
--   expense stop delta calculation — tenant owes (actual spend minus
--   base year amount) — has no base year to subtract from.
--
-- Two nullable ADD COLUMN operations (safe, no backfill required;
-- existing rows receive NULL, which means "expense stop not modeled"):
--
--   base_year_expenses jsonb
--     Category-to-amount map. Keys match entries in tenant_pays[].
--     Values are total annual dollar amounts for the base year.
--     Format: {"electricity": 45000, "janitorial": 18000}
--     NULL means no expense stop is being modeled — landlord absorbs
--     all expenses above base. Key/tenant_pays alignment is enforced
--     by the application layer, not the schema.
--
--   expense_stop_base_year int DEFAULT 1
--     Which lease year (1-indexed) the stop is anchored to.
--     Almost always 1 (Year 1 actual or budgeted), but some leases
--     specify Year 2 or another year. Explicit storage prevents the
--     engine from hardcoding the assumption. NULL means inherit
--     the default (Year 1) — engine should treat NULL as 1.
--
-- Rollback: supabase/migrations/rollback/20260413000015_rollback.sql
-- =============================================================

ALTER TABLE public.lease_traits_modified_gross
  ADD COLUMN base_year_expenses     jsonb,
  ADD COLUMN expense_stop_base_year int  DEFAULT 1
             CHECK (expense_stop_base_year IS NULL OR expense_stop_base_year >= 1);

COMMENT ON COLUMN public.lease_traits_modified_gross.base_year_expenses IS
  'Category-to-amount map for expense stop base year. Keys match tenant_pays[] entries. '
  'Values are total annual dollar amounts. NULL = expense stop not modeled.';

COMMENT ON COLUMN public.lease_traits_modified_gross.expense_stop_base_year IS
  'Lease year (1-indexed) that anchors the expense stop base amounts. '
  'NULL or 1 = Year 1. Engine treats NULL as 1.';
