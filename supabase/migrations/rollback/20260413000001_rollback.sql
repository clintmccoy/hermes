-- =============================================================
-- Rollback: 20260413000001_identity_orgs_rls
-- Ticket: MMC-13
--
-- Reverses the identity/orgs/RLS migration in dependency order.
-- WARNING: drops all profiles, organizations, and members data.
-- =============================================================

-- Triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS set_organizations_updated_at ON public.organizations;
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;

-- Functions
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.set_updated_at();
DROP FUNCTION IF EXISTS auth.user_org_ids();

-- Tables (members first — FK dependency on organizations + auth.users)
DROP TABLE IF EXISTS public.organization_members;
DROP TABLE IF EXISTS public.organizations;
DROP TABLE IF EXISTS public.profiles;
