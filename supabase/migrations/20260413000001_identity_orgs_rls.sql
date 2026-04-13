-- =============================================================
-- Migration: 20260413000001_identity_orgs_rls
-- Ticket: MMC-13 — Identity, organizations, and RLS strategy
--
-- Creates the multi-tenancy foundation: profiles, organizations,
-- organization_members, the RLS helper function, and the
-- auto-create trigger that fires on new user signup.
--
-- Rollback: supabase/migrations/rollback/20260413000001_rollback.sql
-- =============================================================


-- =============================================================
-- TABLE: profiles
-- Extends auth.users with display metadata.
-- One row per authenticated user, created automatically on signup
-- via the handle_new_user() trigger — never inserted directly.
-- =============================================================

CREATE TABLE public.profiles (
  id           uuid        NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text        NOT NULL,
  avatar_url   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;


-- =============================================================
-- TABLE: organizations
-- Top-level tenancy unit. Every deal, document, and analysis
-- job belongs to an organization.
--
-- subscription_tier: text + CHECK (not enum) so new tiers can be
-- added without a schema migration.
--   values: 'free' | 'single_deal' | 'team' | 'enterprise'
--
-- confidence_weight_config (jsonb): org-level health score weights.
-- See ADR 011 §7. Shape: { extraction: int, source_quality: int,
-- human_review: int } — max 3, 3, 4 respectively (total 10).
-- Null = use system defaults.
-- =============================================================

CREATE TABLE public.organizations (
  id                       uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  name                     text        NOT NULL,
  slug                     text        NOT NULL UNIQUE,
  subscription_tier        text        NOT NULL DEFAULT 'free'
                             CHECK (subscription_tier IN ('free', 'single_deal', 'team', 'enterprise')),
  created_by               uuid        NOT NULL REFERENCES auth.users(id),
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  confidence_weight_config jsonb
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;


-- =============================================================
-- TABLE: organization_members
-- Join table: user <-> org relationship with role.
-- A user can belong to multiple orgs (e.g. personal workspace
-- + firm workspace; broker across multiple client engagements).
--
-- Role permission matrix (enforced at application layer in v0;
-- RLS enforces org membership only — role gates are in app code):
--
--   owner  — billing, delete org, change any role, all admin actions
--   admin  — invite/remove members, configure org settings
--   member — create deals, run analyses, create share links
--
-- All roles: view org credit balance, create share links.
-- =============================================================

CREATE TABLE public.organization_members (
  id         uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text        NOT NULL DEFAULT 'member'
               CHECK (role IN ('owner', 'admin', 'member')),
  invited_by uuid        REFERENCES auth.users(id),
  joined_at  timestamptz NOT NULL DEFAULT now(),

  UNIQUE (org_id, user_id)
);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;


-- =============================================================
-- INDEXES
-- =============================================================

-- Critical: drives every RLS policy check — must be fast
CREATE INDEX idx_organization_members_user_id
  ON public.organization_members(user_id);

-- Member listing queries
CREATE INDEX idx_organization_members_org_id
  ON public.organization_members(org_id);

-- Slug is already covered by the UNIQUE constraint above,
-- but naming it explicitly for clarity
-- (Postgres creates a unique index automatically on UNIQUE columns)


-- =============================================================
-- RLS HELPER FUNCTION: public.user_org_ids()
-- Returns all org_ids the current user belongs to as an array.
-- STABLE: Postgres may cache result within a transaction.
-- SECURITY DEFINER: runs as the function owner, not the caller,
-- so it can read organization_members regardless of caller's RLS.
-- This means the function is the single choke point for org
-- membership resolution — keep it simple and auditable.
-- =============================================================

CREATE OR REPLACE FUNCTION public.user_org_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(org_id), '{}')
  FROM public.organization_members
  WHERE user_id = auth.uid()
$$;


-- =============================================================
-- RLS POLICIES: profiles
-- =============================================================

-- Any authenticated user can read any profile.
-- Display names and avatars are visible within org context.
CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can only update their own profile.
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- No direct INSERT policy — profiles are created by trigger only.


-- =============================================================
-- RLS POLICIES: organizations
-- =============================================================

-- Members can read their own orgs.
CREATE POLICY "organizations_select"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (id = ANY(public.user_org_ids()));

-- Any member can update org fields in v0 — owner-only enforcement
-- lives in the application layer. Tighten to role check in v1.
CREATE POLICY "organizations_update"
  ON public.organizations FOR UPDATE
  TO authenticated
  USING (id = ANY(public.user_org_ids()))
  WITH CHECK (id = ANY(public.user_org_ids()));

-- Authenticated users can create orgs (created_by must be themselves).
CREATE POLICY "organizations_insert"
  ON public.organizations FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());


-- =============================================================
-- RLS POLICIES: organization_members
-- =============================================================

-- Members can read the member list for any org they belong to.
CREATE POLICY "org_members_select"
  ON public.organization_members FOR SELECT
  TO authenticated
  USING (org_id = ANY(public.user_org_ids()));

-- Any org member can add new members in v0 — admin-only enforcement
-- lives in the application layer. Tighten in v1.
CREATE POLICY "org_members_insert"
  ON public.organization_members FOR INSERT
  TO authenticated
  WITH CHECK (org_id = ANY(public.user_org_ids()));

-- Users can always remove themselves (leave org).
-- Removal of others is allowed for any org member in v0 —
-- owner/admin enforcement lives in the application layer.
CREATE POLICY "org_members_delete"
  ON public.organization_members FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()                  -- leave org (self)
    OR org_id = ANY(public.user_org_ids())  -- remove others (app enforces role)
  );


-- =============================================================
-- TRIGGER FUNCTION: set_updated_at()
-- Generic updated_at maintenance trigger, reused across tables.
-- =============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =============================================================
-- TRIGGER FUNCTION: handle_new_user()
-- Fires AFTER INSERT on auth.users (Supabase signup).
-- Creates a profile row and a personal org for every new user.
--
-- Display name resolution priority:
--   1. OAuth full_name (Microsoft / Google)
--   2. OAuth name
--   3. Email prefix (magic link fallback)
--
-- Slug: lowercased display name (non-alphanumeric → hyphens)
-- + first 8 chars of org UUID for uniqueness guarantee.
-- =============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id        uuid;
  user_display_name text;
  user_slug         text;
BEGIN
  -- Resolve display name from OAuth metadata or email
  user_display_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- Create profile
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    user_display_name,
    NEW.raw_user_meta_data->>'avatar_url'
  );

  -- Create personal org
  new_org_id := gen_random_uuid();

  user_slug := lower(
    regexp_replace(user_display_name, '[^a-zA-Z0-9]+', '-', 'g')
  ) || '-' || substr(new_org_id::text, 1, 8);

  INSERT INTO public.organizations (id, name, slug, subscription_tier, created_by)
  VALUES (
    new_org_id,
    user_display_name || '''s Workspace',
    user_slug,
    'free',
    NEW.id
  );

  -- Add user as owner of their personal org
  INSERT INTO public.organization_members (org_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
