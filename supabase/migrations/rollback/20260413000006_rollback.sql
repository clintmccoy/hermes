-- =============================================================
-- Rollback: 20260413000006_plg_monetization
-- Ticket: MMC-18
--
-- WARNING: drops all PLG and monetization data including share
-- links and view history, credit ledger entries, and subscription
-- records. This is destructive and irreversible for billing data.
--
-- Deletion order respects FK dependencies.
-- =============================================================

-- share_link_views references share_links
DROP TABLE IF EXISTS public.share_link_views;

-- share_links references deals, model_results
DROP TABLE IF EXISTS public.share_links;

-- credit_ledger references orgs, deals, analysis_jobs
DROP TABLE IF EXISTS public.credit_ledger;

-- org_subscriptions references organizations
DROP TABLE IF EXISTS public.org_subscriptions;
