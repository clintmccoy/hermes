-- =============================================================
-- Rollback: 20260413000008_lease_stack
-- Ticket: MMC-25
--
-- Drop order: trait tables first (FK to leases), then child tables,
-- then spine, then ENUMs.
-- =============================================================

DROP TABLE IF EXISTS public.lease_traits_percentage_rent CASCADE;
DROP TABLE IF EXISTS public.lease_traits_license CASCADE;
DROP TABLE IF EXISTS public.lease_traits_membership CASCADE;
DROP TABLE IF EXISTS public.lease_traits_hotel_mgmt CASCADE;
DROP TABLE IF EXISTS public.lease_traits_residential CASCADE;
DROP TABLE IF EXISTS public.lease_traits_ground CASCADE;
DROP TABLE IF EXISTS public.lease_traits_modified_gross CASCADE;
DROP TABLE IF EXISTS public.lease_traits_gross CASCADE;
DROP TABLE IF EXISTS public.lease_traits_nnn CASCADE;
DROP TABLE IF EXISTS public.lease_renewal_options CASCADE;
DROP TABLE IF EXISTS public.lease_rent_steps CASCADE;
DROP TABLE IF EXISTS public.lease_spaces CASCADE;
DROP TABLE IF EXISTS public.leases CASCADE;

DROP TYPE IF EXISTS public.sales_reporting_cadence_enum;
DROP TYPE IF EXISTS public.percentage_rent_breakpoint_type_enum;
DROP TYPE IF EXISTS public.rent_determination_type_enum;
DROP TYPE IF EXISTS public.lease_option_type_enum;
DROP TYPE IF EXISTS public.rent_step_escalation_type_enum;
DROP TYPE IF EXISTS public.lease_status_enum;
DROP TYPE IF EXISTS public.lease_type_enum;
