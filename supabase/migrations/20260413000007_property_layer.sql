-- =============================================================
-- Migration: 20260413000007_property_layer
-- Ticket: MMC-24 — Property layer (buildings, spaces, pools)
--
-- Creates the physical property registry that anchors all
-- monetary events in the schema (per ADR 011 §2).
--
-- Tables created:
--   buildings           — one row per physical structure per deal
--   spaces_master       — load-bearing space registry; every lease,
--                         sale, and capex event traces to a space
--   space_pools         — named groupings of spaces for analysis
--   space_pool_members  — M:M junction: spaces ↔ pools
--
-- ALTER TABLE:
--   deals.parent_deal_id — nullable self-referential FK for
--                          portfolio hierarchy (ADR 011 §4)
--
-- ENUMs created:
--   space_type            — physical use category of a space
--   space_lifecycle_status — current occupancy/construction state
--   space_pool_type        — purpose of a pool grouping
--
-- Rollback: supabase/migrations/rollback/20260413000007_rollback.sql
-- =============================================================


-- =============================================================
-- ALTER TABLE: deals — portfolio hierarchy
--
-- parent_deal_id is nullable. A deal with a non-null parent_deal_id
-- is a building-level child inside a portfolio wrapper.
-- A null parent_deal_id means a standalone deal or portfolio parent.
-- Depth is always one level in practice (portfolio → building);
-- the schema does not enforce this but the application should.
--
-- ON DELETE SET NULL: if a portfolio parent is deleted, its
-- children become standalone deals rather than orphaned records.
-- =============================================================

ALTER TABLE public.deals
  ADD COLUMN parent_deal_id uuid
    REFERENCES public.deals(id) ON DELETE SET NULL;

-- Index for portfolio child lookups
CREATE INDEX idx_deals_parent_deal_id
  ON public.deals(parent_deal_id)
  WHERE parent_deal_id IS NOT NULL;


-- =============================================================
-- ENUM: space_type
--
-- Describes the physical use category of a space. Used for
-- filtering, financial module selection, and lease routing.
--
--   office           — private offices, open plan, bullpen
--   retail           — storefront, restaurant, kiosk
--   industrial       — warehouse, distribution, manufacturing, flex/R&D
--   residential_unit — apartment unit, condo, townhome
--   hotel_key        — individual hotel room or suite
--   parking          — structured or surface parking stall
--   storage          — self-storage unit, ancillary storage
--   common_area      — lobby, corridor, amenity space (typically not leasable)
--   land             — unimproved land parcel, ground lease pad
--   hot_desk         — flex coworking desk (membership or day-pass based)
--   private_suite    — flex coworking private office (membership or short-term)
--   other            — catch-all; space_identifier provides context
--
-- mixed_use is intentionally excluded per ADR 011 §5. An asset is
-- mixed-use because its spaces span multiple types, which this
-- registry already captures. Declaring mixed_use on a single space
-- is semantically incoherent.
-- =============================================================

CREATE TYPE public.space_type AS ENUM (
  'office',
  'retail',
  'industrial',
  'residential_unit',
  'hotel_key',
  'parking',
  'storage',
  'common_area',
  'land',
  'hot_desk',
  'private_suite',
  'other'
);


-- =============================================================
-- ENUM: space_lifecycle_status
-- =============================================================

CREATE TYPE public.space_lifecycle_status AS ENUM (
  'occupied',
  'vacant',
  'under_construction',
  'dark',         -- physically vacant but economically dark (not being leased up)
  'demolished'    -- no longer exists; retained for historical audit
);


-- =============================================================
-- ENUM: space_pool_type
-- =============================================================

CREATE TYPE public.space_pool_type AS ENUM (
  'leasing_pool',      -- grouped for vacancy / lease-up schedule analysis
  'liquidation_pool',  -- grouped for condo sellout / disposition modeling
  'capex_pool'         -- grouped for renovation cost allocation
);


-- =============================================================
-- TABLE: buildings
--
-- One row per physical structure associated with a deal.
-- For single-building deals: one buildings row per deal.
-- For portfolio/campus deals: multiple buildings rows per deal,
-- each building typically also linked to a child deal via
-- deals.parent_deal_id.
--
-- Address fields are duplicated here (also on deals) intentionally.
-- For single-building deals they will match. For portfolio deals,
-- each building has its own address; the deal-level address is
-- the portfolio's primary address.
-- =============================================================

CREATE TABLE public.buildings (
  id                uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid         NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_id           uuid         NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,

  -- Identity
  building_name     text,        -- e.g. "Tower A", "North Building"; nullable for single-building deals

  -- Address (per-building; see comment above)
  street_address    text,
  city              text,
  state_province    text,
  postal_code       text,
  country           text         NOT NULL DEFAULT 'US',
  latitude          numeric(9,6),
  longitude         numeric(9,6),

  -- Physical attributes
  year_built        int,
  total_rsf         numeric,     -- total rentable SF across all floors
  total_gsf         numeric,     -- gross SF including non-leasable area
  num_floors        int,
  parking_spaces    int,

  -- Audit
  created_by        uuid         NOT NULL REFERENCES auth.users(id),
  created_at        timestamptz  NOT NULL DEFAULT now(),
  updated_at        timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_buildings_deal_id
  ON public.buildings(deal_id);

CREATE INDEX idx_buildings_org_id
  ON public.buildings(org_id);

CREATE TRIGGER set_buildings_updated_at
  BEFORE UPDATE ON public.buildings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =============================================================
-- TABLE: spaces_master
--
-- The foundational space registry. Every lease, sale event, capex
-- spend line, and value driver must eventually trace to a space
-- in this table (per ADR 011 §2: spaces as required FK).
--
-- deal_id is denormalized from buildings for RLS performance and
-- to enable direct deal-scoped queries without a join.
--
-- stub_only: true for BOE-stage analysis where the space is a
-- planning estimate (approximate RSF, inferred type) rather than
-- a surveyed unit. The schema mechanics are identical at all
-- analysis depths — only fidelity differs. stub_only is a signal
-- to the UI and to the financial engine, not a structural limiter.
--
-- For whole-asset exits: a single sale_products row points to a
-- building-level space (space_type = common_area or a dedicated
-- "whole building" space with rsf = total_rsf). No need to
-- enumerate every suite for an as-is disposition.
-- =============================================================

CREATE TABLE public.spaces_master (
  id                  uuid                        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid                        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_id             uuid                        NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  building_id         uuid                        NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,

  -- Identity
  space_identifier    text                        NOT NULL,  -- suite #, unit label, bay, floor, etc.
  space_type          public.space_type           NOT NULL,

  -- Area
  rsf                 numeric,                    -- rentable SF (lease pricing basis)
  usf                 numeric,                    -- usable SF (tenant's actual footprint)
  floor_number        int,

  -- Status
  lifecycle_status    public.space_lifecycle_status NOT NULL DEFAULT 'vacant',
  stub_only           boolean                     NOT NULL DEFAULT false,

  notes               text,

  -- Audit
  created_by          uuid                        NOT NULL REFERENCES auth.users(id),
  created_at          timestamptz                 NOT NULL DEFAULT now(),
  updated_at          timestamptz                 NOT NULL DEFAULT now()
);

ALTER TABLE public.spaces_master ENABLE ROW LEVEL SECURITY;

-- Building-scoped lookup (most common access pattern)
CREATE INDEX idx_spaces_master_building_id
  ON public.spaces_master(building_id);

-- Deal-scoped lookup (for RLS + full deal space inventory)
CREATE INDEX idx_spaces_master_deal_id
  ON public.spaces_master(deal_id);

-- Vacancy analysis by deal (leasing/absorption modeling)
CREATE INDEX idx_spaces_master_deal_lifecycle
  ON public.spaces_master(deal_id, lifecycle_status);

CREATE INDEX idx_spaces_master_org_id
  ON public.spaces_master(org_id);

CREATE TRIGGER set_spaces_master_updated_at
  BEFORE UPDATE ON public.spaces_master
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =============================================================
-- TABLE: space_pools
--
-- Named groupings of spaces for analysis.
-- A pool has a type that controls its downstream use:
--   leasing_pool     — apply vacancy and lease-up schedule to the pool
--   liquidation_pool — model condo sellout absorption across the pool
--   capex_pool       — allocate renovation costs across the pool
--
-- One space can belong to multiple pools via space_pool_members
-- (e.g., a retail suite is in a leasing pool and a capex pool).
-- =============================================================

CREATE TABLE public.space_pools (
  id            uuid                      PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid                      NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_id       uuid                      NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,

  pool_name     text                      NOT NULL,
  pool_type     public.space_pool_type    NOT NULL,
  description   text,

  -- Audit
  created_by    uuid                      NOT NULL REFERENCES auth.users(id),
  created_at    timestamptz               NOT NULL DEFAULT now(),
  updated_at    timestamptz               NOT NULL DEFAULT now()
);

ALTER TABLE public.space_pools ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_space_pools_deal_id
  ON public.space_pools(deal_id);

CREATE INDEX idx_space_pools_org_id
  ON public.space_pools(org_id);

CREATE TRIGGER set_space_pools_updated_at
  BEFORE UPDATE ON public.space_pools
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =============================================================
-- TABLE: space_pool_members
--
-- M:M junction between spaces_master and space_pools.
-- org_id denormalized for RLS policy performance.
-- Unique constraint prevents a space from appearing in the
-- same pool twice.
-- =============================================================

CREATE TABLE public.space_pool_members (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid         NOT NULL,
  pool_id     uuid         NOT NULL REFERENCES public.space_pools(id) ON DELETE CASCADE,
  space_id    uuid         NOT NULL REFERENCES public.spaces_master(id) ON DELETE CASCADE,
  created_at  timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT uq_space_pool_members UNIQUE (pool_id, space_id)
);

ALTER TABLE public.space_pool_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_space_pool_members_pool_id
  ON public.space_pool_members(pool_id);

CREATE INDEX idx_space_pool_members_space_id
  ON public.space_pool_members(space_id);


-- =============================================================
-- RLS POLICIES: buildings
-- =============================================================

CREATE POLICY "buildings_select"
  ON public.buildings FOR SELECT
  USING (org_id = ANY(public.user_org_ids()));

CREATE POLICY "buildings_insert"
  ON public.buildings FOR INSERT
  WITH CHECK (org_id = ANY(public.user_org_ids()));

CREATE POLICY "buildings_update"
  ON public.buildings FOR UPDATE
  USING (org_id = ANY(public.user_org_ids()))
  WITH CHECK (org_id = ANY(public.user_org_ids()));

CREATE POLICY "buildings_delete"
  ON public.buildings FOR DELETE
  USING (org_id = ANY(public.user_org_ids()));


-- =============================================================
-- RLS POLICIES: spaces_master
-- =============================================================

CREATE POLICY "spaces_master_select"
  ON public.spaces_master FOR SELECT
  USING (org_id = ANY(public.user_org_ids()));

CREATE POLICY "spaces_master_insert"
  ON public.spaces_master FOR INSERT
  WITH CHECK (org_id = ANY(public.user_org_ids()));

CREATE POLICY "spaces_master_update"
  ON public.spaces_master FOR UPDATE
  USING (org_id = ANY(public.user_org_ids()))
  WITH CHECK (org_id = ANY(public.user_org_ids()));

CREATE POLICY "spaces_master_delete"
  ON public.spaces_master FOR DELETE
  USING (org_id = ANY(public.user_org_ids()));


-- =============================================================
-- RLS POLICIES: space_pools
-- =============================================================

CREATE POLICY "space_pools_select"
  ON public.space_pools FOR SELECT
  USING (org_id = ANY(public.user_org_ids()));

CREATE POLICY "space_pools_insert"
  ON public.space_pools FOR INSERT
  WITH CHECK (org_id = ANY(public.user_org_ids()));

CREATE POLICY "space_pools_update"
  ON public.space_pools FOR UPDATE
  USING (org_id = ANY(public.user_org_ids()))
  WITH CHECK (org_id = ANY(public.user_org_ids()));

CREATE POLICY "space_pools_delete"
  ON public.space_pools FOR DELETE
  USING (org_id = ANY(public.user_org_ids()));


-- =============================================================
-- RLS POLICIES: space_pool_members
-- =============================================================

CREATE POLICY "space_pool_members_select"
  ON public.space_pool_members FOR SELECT
  USING (org_id = ANY(public.user_org_ids()));

CREATE POLICY "space_pool_members_insert"
  ON public.space_pool_members FOR INSERT
  WITH CHECK (org_id = ANY(public.user_org_ids()));

CREATE POLICY "space_pool_members_update"
  ON public.space_pool_members FOR UPDATE
  USING (org_id = ANY(public.user_org_ids()))
  WITH CHECK (org_id = ANY(public.user_org_ids()));

CREATE POLICY "space_pool_members_delete"
  ON public.space_pool_members FOR DELETE
  USING (org_id = ANY(public.user_org_ids()));
