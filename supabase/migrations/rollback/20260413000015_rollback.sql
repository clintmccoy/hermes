-- =============================================================
-- Rollback: 20260413000015_lease_traits_modified_gross_expense_stops
-- Ticket: MMC-31
-- =============================================================

ALTER TABLE public.lease_traits_modified_gross
  DROP COLUMN IF EXISTS base_year_expenses,
  DROP COLUMN IF EXISTS expense_stop_base_year;
