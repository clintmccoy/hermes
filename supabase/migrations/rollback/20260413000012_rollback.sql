-- =============================================================
-- Rollback: 20260413000012_collaboration
-- Ticket: MMC-29
-- =============================================================

DROP TABLE IF EXISTS public.deal_activity_log CASCADE;
DROP TABLE IF EXISTS public.deal_members CASCADE;

DROP TYPE IF EXISTS public.deal_activity_event_type_enum;
DROP TYPE IF EXISTS public.deal_member_role_enum;
