-- =============================================================
-- Migration: 20260413000008_lease_stack
-- Ticket: MMC-25 — Lease stack (spine, junction, steps, options, traits)
--
-- Creates the full lease data model using a thin spine + trait
-- pattern. New lease structures are addable via new trait tables
-- without modifying leases or lease_spaces.
--
-- Tables created:
--   leases                        — universal spine; all lease types
--   lease_spaces                  — M:M: one lease → many spaces
--   lease_rent_steps              — rent step / escalation schedule
--   lease_renewal_options         — renewal, expansion, contraction,
--                                   termination, and purchase options
--   lease_traits_nnn              — NNN-specific expense fields
--   lease_traits_gross            — Gross lease expense stop fields
--   lease_traits_modified_gross   — Modified gross pass-through fields
--   lease_traits_ground           — Ground lease reversion/escalation
--   lease_traits_residential      — Unit-specific residential fields
--   lease_traits_hotel_mgmt       — Hotel management agreement fields
--   lease_traits_membership       — Flex/coworking membership fields
--   lease_traits_license          — Short-term license fields
--   lease_traits_percentage_rent  — Percentage rent overage mechanics
--                                   (trait on any lease type; most
--                                   common on gross/modified_gross)
--
-- ENUMs created:
--   lease_type_enum
--   lease_status_enum
--   rent_step_escalation_type_enum
--   lease_option_type_enum
--   rent_determination_type_enum
--   percentage_rent_breakpoint_type_enum
--   sales_reporting_cadence_enum
--
-- Rollback: supabase/migrations/rollback/20260413000008_rollback.sql
-- =============================================================


-- =============================================================
-- ENUMs
-- =============================================================

CREATE TYPE public.lease_type_enum AS ENUM (
  'nnn',              -- triple net: tenant pays taxes, insurance, CAM
  'gross',            -- full service gross: landlord pays operating expenses
  'modified_gross',   -- hybrid: specific expenses passed to tenant
  'ground_lease',     -- land-only lease; tenant owns/builds improvements
  'residential',      -- apartment unit, condo, townhome
  'hotel_management', -- management agreement; operator runs the asset
  'membership',       -- access-based recurring fee (coworking, storage, parking)
  'license'           -- short-term license; <1 year typical; no possessory interest
);

CREATE TYPE public.lease_status_enum AS ENUM (
  'draft',       -- under negotiation; not yet binding
  'executed',    -- signed and in force
  'expired',     -- reached natural expiration date
  'terminated'   -- ended early (mutual, default, or buyout)
);

-- How a rent step was determined
CREATE TYPE public.rent_step_escalation_type_enum AS ENUM (
  'fixed_amount',   -- absolute dollar PSF amount (e.g. $0.50/SF/year)
  'fixed_percent',  -- percentage increase over prior rent (e.g. 3% annually)
  'cpi'             -- tied to Consumer Price Index; specific index in notes
);

-- Types of options that can attach to a lease
CREATE TYPE public.lease_option_type_enum AS ENUM (
  'renewal',      -- extend the lease for an additional term
  'expansion',    -- add adjacent space to the lease
  'contraction',  -- give back a portion of leased space
  'termination',  -- early termination right (kick-out clause)
  'purchase'      -- right of first offer or first refusal to purchase
);

-- How rent is set during an option period
CREATE TYPE public.rent_determination_type_enum AS ENUM (
  'fixed',              -- flat dollar PSF specified at signing
  'fair_market_value',  -- FMV determined at time of exercise
  'cpi_adjusted',       -- prior rent adjusted by CPI index
  'fixed_plus_cpi_floor' -- fixed base with CPI floor (no decrease)
);

-- Percentage rent breakpoint type
CREATE TYPE public.percentage_rent_breakpoint_type_enum AS ENUM (
  'natural',    -- breakpoint = base_rent / overage_pct (mathematically derived)
  'artificial'  -- landlord-negotiated dollar amount; stored in artificial_breakpoint
);

-- How often the tenant reports gross sales
CREATE TYPE public.sales_reporting_cadence_enum AS ENUM (
  'monthly',
  'quarterly',
  'annual'
);


-- =============================================================
-- TABLE: leases
--
-- The universal spine. Carries only fields that apply to every
-- lease type. Type-specific fields live in trait tables.
--
-- space_id: primary/anchor space for display and quick queries.
-- The complete space set for multi-space leases is in lease_spaces.
-- Nullable because a lease can be created before spaces are assigned,
-- and multi-space leases have no single authoritative space.
--
-- base_rent_psf: the headline rent figure. Nullable because some
-- lease types (hotel_management, membership) price differently
-- and do not express rent per square foot.
--
-- rentable_sf: the as-leased SF agreed in this lease. May differ
-- from spaces_master.rsf (e.g. a tenant leasing part of a floor).
-- =============================================================

CREATE TABLE public.leases (
  id                  uuid                      PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid                      NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_id             uuid                      NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  space_id            uuid                      REFERENCES public.spaces_master(id) ON DELETE SET NULL,

  -- Classification
  lease_type          public.lease_type_enum    NOT NULL,
  lease_status        public.lease_status_enum  NOT NULL DEFAULT 'draft',

  -- Parties
  tenant_name         text,
  tenant_industry     text,   -- optional; useful for retail/office tenant mix analysis

  -- Economic terms
  base_rent_psf       numeric,                  -- annualized; nullable for non-PSF lease types
  rentable_sf         numeric,                  -- as-leased SF per this lease

  -- Term
  commencement_date   date,
  expiration_date     date,

  -- Free rent / abatement
  free_rent_months    int      NOT NULL DEFAULT 0,
  free_rent_applied_at_start boolean NOT NULL DEFAULT true,
                                                -- false = abatement is mid-lease (e.g. after TI work)

  -- Tenant improvements
  ti_allowance_psf    numeric,                  -- TI allowance per rentable SF

  -- Audit
  created_by          uuid                      NOT NULL REFERENCES auth.users(id),
  created_at          timestamptz               NOT NULL DEFAULT now(),
  updated_at          timestamptz               NOT NULL DEFAULT now()
);

ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_leases_deal_id      ON public.leases(deal_id);
CREATE INDEX idx_leases_space_id     ON public.leases(space_id) WHERE space_id IS NOT NULL;
CREATE INDEX idx_leases_org_id       ON public.leases(org_id);
CREATE INDEX idx_leases_deal_status  ON public.leases(deal_id, lease_status);

CREATE TRIGGER set_leases_updated_at
  BEFORE UPDATE ON public.leases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =============================================================
-- TABLE: lease_spaces
--
-- M:M junction: one lease → many spaces.
-- For single-space leases this will have one row matching
-- leases.space_id. For multi-space leases (full-floor tenant
-- across multiple suites, hotel management covering all keys)
-- this carries the complete space inventory for the lease.
--
-- sf_allocated: how much of a shared/divided space is attributed
-- to this lease. Null means the full space RSF is attributed.
-- =============================================================

CREATE TABLE public.lease_spaces (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid         NOT NULL,
  lease_id        uuid         NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  space_id        uuid         NOT NULL REFERENCES public.spaces_master(id) ON DELETE CASCADE,
  sf_allocated    numeric,     -- nullable: null = full space RSF

  created_at      timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT uq_lease_spaces UNIQUE (lease_id, space_id)
);

ALTER TABLE public.lease_spaces ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_lease_spaces_lease_id  ON public.lease_spaces(lease_id);
CREATE INDEX idx_lease_spaces_space_id  ON public.lease_spaces(space_id);


-- =============================================================
-- TABLE: lease_rent_steps
--
-- Rent step / escalation schedule for a lease.
-- One row per step event. The step replaces the prior rent
-- as of effective_date.
--
-- step_number: integer ordering (1 = first step, 2 = second, etc.)
-- escalation_type: how the step was determined
-- escalation_value: the % or $/SF amount (null for CPI — actual
--   value is not known at signing; notes carries the index name)
-- new_rent_psf: the resulting rent PSF after applying this step.
--   May be null for CPI steps where the future amount is unknown.
-- =============================================================

CREATE TABLE public.lease_rent_steps (
  id                    uuid                                  PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid                                  NOT NULL,
  lease_id              uuid                                  NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,

  step_number           int                                   NOT NULL,
  effective_date        date                                  NOT NULL,
  escalation_type       public.rent_step_escalation_type_enum NOT NULL,
  escalation_value      numeric,   -- % for fixed_percent; $/SF for fixed_amount; null for cpi
  new_rent_psf          numeric,   -- resulting rent; nullable for future CPI steps
  notes                 text,      -- e.g. "CPI-U, capped at 4% per annum"

  created_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_lease_rent_steps UNIQUE (lease_id, step_number)
);

ALTER TABLE public.lease_rent_steps ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_lease_rent_steps_lease_id
  ON public.lease_rent_steps(lease_id);


-- =============================================================
-- TABLE: lease_renewal_options
--
-- Proper table for all option types: renewal, expansion,
-- contraction, termination, and purchase. One row per option.
-- Multiple options on one lease are distinguished by option_number.
--
-- option_type:
--   renewal     — extend term; term_months and rent_determination required
--   expansion   — add space; expansion_sf is the size of space added
--   contraction — give back space; contraction_sf is the size returned;
--                 typically has a buyout / surrender premium
--   termination — early kick-out right; notice_period_months required
--   purchase    — ROFR/ROFO to acquire the asset
--
-- rent_determination_type: how rent is set for the option period.
--   Relevant for renewal and expansion. Null for termination/purchase.
--
-- notice_period_months: how far in advance written notice must be given.
-- exercise_deadline: hard calendar date by which option must be exercised.
--   One or both may be set; both is common.
--
-- is_exercised / exercised_at: tracks whether the option was used.
-- =============================================================

CREATE TABLE public.lease_renewal_options (
  id                        uuid                              PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                    uuid                              NOT NULL,
  lease_id                  uuid                              NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,

  option_type               public.lease_option_type_enum    NOT NULL,
  option_number             int                              NOT NULL DEFAULT 1,
                                                             -- ordering for multiple options of same type

  -- Term and notice
  notice_period_months      int,
  exercise_deadline         date,
  term_months               int,                             -- renewal/expansion duration

  -- Rent for option period
  rent_determination_type   public.rent_determination_type_enum,
  fixed_rent_psf            numeric,                         -- if determination = fixed
  fmv_floor_psf             numeric,                         -- floor on FMV determination
  fmv_cap_psf               numeric,                         -- cap on FMV determination

  -- Expansion / contraction specifics
  expansion_sf              numeric,                         -- SF to be added (expansion)
  contraction_sf            numeric,                         -- SF to be surrendered (contraction)
  surrender_premium_psf     numeric,                         -- buyout fee for contraction/termination

  -- Purchase option specifics
  purchase_price            numeric,                         -- ROFR/ROFO fixed price if applicable
  purchase_price_notes      text,                            -- e.g. "FMV less 5%"

  -- Status
  is_exercised              boolean      NOT NULL DEFAULT false,
  exercised_at              timestamptz,

  notes                     text,

  created_at                timestamptz  NOT NULL DEFAULT now(),
  updated_at                timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT uq_lease_renewal_options UNIQUE (lease_id, option_type, option_number)
);

ALTER TABLE public.lease_renewal_options ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_lease_renewal_options_lease_id
  ON public.lease_renewal_options(lease_id);

CREATE TRIGGER set_lease_renewal_options_updated_at
  BEFORE UPDATE ON public.lease_renewal_options
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =============================================================
-- TRAIT TABLES
--
-- Each trait table is a one-to-one extension of leases.
-- lease_id is the PK — enforces the one-to-one constraint and
-- makes joins trivial. No row = trait not applicable to this lease.
-- =============================================================


-- NNN: triple net expense pass-through
CREATE TABLE public.lease_traits_nnn (
  lease_id            uuid     PRIMARY KEY REFERENCES public.leases(id) ON DELETE CASCADE,
  org_id              uuid     NOT NULL,

  cam_psf_base        numeric,             -- base year CAM charge PSF
  cam_cap_pct         numeric,             -- annual CAM increase cap (%)
  tax_base_year       int,                 -- property tax base year
  insurance_base_year int,                 -- insurance base year
  admin_fee_pct       numeric  NOT NULL DEFAULT 0,
                                           -- management/admin fee on top of CAM (typically 10–15%)
  expense_stop_psf    numeric,             -- gross-up stop; expenses above this are tenant's

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lease_traits_nnn ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_lease_traits_nnn_updated_at
  BEFORE UPDATE ON public.lease_traits_nnn
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- Gross: full service; landlord absorbs operating expenses
CREATE TABLE public.lease_traits_gross (
  lease_id            uuid     PRIMARY KEY REFERENCES public.leases(id) ON DELETE CASCADE,
  org_id              uuid     NOT NULL,

  expense_stop_psf    numeric,             -- tenant pays expenses above this stop
  base_year           int,                 -- expense stop base year
  included_expenses   text[],              -- landlord-covered expense categories

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lease_traits_gross ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_lease_traits_gross_updated_at
  BEFORE UPDATE ON public.lease_traits_gross
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- Modified gross: hybrid; specific expenses passed to tenant
CREATE TABLE public.lease_traits_modified_gross (
  lease_id            uuid     PRIMARY KEY REFERENCES public.leases(id) ON DELETE CASCADE,
  org_id              uuid     NOT NULL,

  tenant_pays         text[]   NOT NULL DEFAULT '{}',
                               -- expense categories tenant pays directly
                               -- e.g. ['electricity', 'janitorial', 'hvac_maintenance']

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lease_traits_modified_gross ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_lease_traits_modified_gross_updated_at
  BEFORE UPDATE ON public.lease_traits_modified_gross
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- Ground lease: land-only; tenant owns/builds improvements
CREATE TABLE public.lease_traits_ground (
  lease_id                      uuid     PRIMARY KEY REFERENCES public.leases(id) ON DELETE CASCADE,
  org_id                        uuid     NOT NULL,

  ground_rent_initial_psf       numeric,             -- initial annual ground rent PSF
  escalation_schedule           jsonb,               -- long-dated step schedule; jsonb for flexibility
                                                     -- format: [{effective_date, rent_psf}, ...]
  reversion_year                int,                 -- year improvements revert to landowner
  landowner_reversionary_notes  text,                -- description of reversionary rights
  purchase_option_price         numeric,             -- if tenant has option to purchase land

  created_at                    timestamptz NOT NULL DEFAULT now(),
  updated_at                    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lease_traits_ground ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_lease_traits_ground_updated_at
  BEFORE UPDATE ON public.lease_traits_ground
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- Residential: apartment unit, condo, townhome
CREATE TABLE public.lease_traits_residential (
  lease_id            uuid     PRIMARY KEY REFERENCES public.leases(id) ON DELETE CASCADE,
  org_id              uuid     NOT NULL,

  unit_type           text,                -- studio, 1BR, 2BR, 3BR, penthouse, etc.
  security_deposit    numeric,             -- dollar amount
  pet_policy          text,                -- allowed, not allowed, with deposit, etc.
  furnished           boolean  NOT NULL DEFAULT false,
  amenity_tier        text,                -- standard, premium, luxury

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lease_traits_residential ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_lease_traits_residential_updated_at
  BEFORE UPDATE ON public.lease_traits_residential
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- Hotel management agreement
CREATE TABLE public.lease_traits_hotel_mgmt (
  lease_id                    uuid     PRIMARY KEY REFERENCES public.leases(id) ON DELETE CASCADE,
  org_id                      uuid     NOT NULL,

  management_fee_pct          numeric  NOT NULL,       -- % of gross revenue paid to operator
  incentive_fee_pct           numeric,                 -- performance fee % above threshold
  incentive_fee_threshold     numeric,                 -- GOP or RevPAR threshold for incentive fee
  incentive_fee_basis         text,                    -- 'gop' | 'revpar' | 'noi'
  brand_flag                  text,                    -- Marriott, Hilton, Hyatt, independent, etc.
  agreement_term_years        int,                     -- management agreement term in years

  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lease_traits_hotel_mgmt ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_lease_traits_hotel_mgmt_updated_at
  BEFORE UPDATE ON public.lease_traits_hotel_mgmt
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- Flex coworking membership
CREATE TABLE public.lease_traits_membership (
  lease_id            uuid     PRIMARY KEY REFERENCES public.leases(id) ON DELETE CASCADE,
  org_id              uuid     NOT NULL,

  membership_tier     text,                -- hot_desk, dedicated_desk, private_office, virtual, etc.
  monthly_rate        numeric  NOT NULL,   -- per-unit monthly rate
  access_hours        text,                -- '24/7', 'business_hours', 'custom'
  unit_count          int,                 -- number of desks/offices covered by this membership

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lease_traits_membership ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_lease_traits_membership_updated_at
  BEFORE UPDATE ON public.lease_traits_membership
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- Short-term license (no possessory interest, <1 year typical)
CREATE TABLE public.lease_traits_license (
  lease_id                    uuid     PRIMARY KEY REFERENCES public.leases(id) ON DELETE CASCADE,
  org_id                      uuid     NOT NULL,

  permitted_use               text     NOT NULL,       -- what the space may be used for
  auto_renew                  boolean  NOT NULL DEFAULT false,
  notice_to_terminate_days    int,                     -- days notice required to terminate

  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lease_traits_license ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_lease_traits_license_updated_at
  BEFORE UPDATE ON public.lease_traits_license
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- Percentage rent overage mechanics
-- Attaches to any lease_type (most commonly gross or modified_gross retail).
-- base_rent_psf on the parent lease is the minimum guaranteed rent.
-- Overage kicks in above the breakpoint.
CREATE TABLE public.lease_traits_percentage_rent (
  lease_id                uuid                                        PRIMARY KEY REFERENCES public.leases(id) ON DELETE CASCADE,
  org_id                  uuid                                        NOT NULL,

  breakpoint_type         public.percentage_rent_breakpoint_type_enum NOT NULL,
  artificial_breakpoint   numeric,                                     -- dollar sales amount; required if breakpoint_type = artificial
  overage_pct             numeric                                      NOT NULL,
                                                                       -- % of sales above breakpoint paid to landlord (e.g. 6.0)
  sales_reporting_cadence public.sales_reporting_cadence_enum          NOT NULL DEFAULT 'annual',
  exclusion_categories    text[],                                      -- excluded sales categories (e.g. ['online_sales', 'gift_cards'])

  -- Constraint: artificial breakpoint required when type = artificial
  CONSTRAINT artificial_breakpoint_required
    CHECK (
      breakpoint_type = 'natural'
      OR (breakpoint_type = 'artificial' AND artificial_breakpoint IS NOT NULL)
    ),

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lease_traits_percentage_rent ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_lease_traits_percentage_rent_updated_at
  BEFORE UPDATE ON public.lease_traits_percentage_rent
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =============================================================
-- RLS POLICIES
-- Pattern: org_id = ANY(public.user_org_ids()) on all tables.
-- Trait tables and child tables carry org_id denormalized.
-- =============================================================

-- leases
CREATE POLICY "leases_select" ON public.leases FOR SELECT USING (org_id = ANY(public.user_org_ids()));
CREATE POLICY "leases_insert" ON public.leases FOR INSERT WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "leases_update" ON public.leases FOR UPDATE USING (org_id = ANY(public.user_org_ids())) WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "leases_delete" ON public.leases FOR DELETE USING (org_id = ANY(public.user_org_ids()));

-- lease_spaces
CREATE POLICY "lease_spaces_select" ON public.lease_spaces FOR SELECT USING (org_id = ANY(public.user_org_ids()));
CREATE POLICY "lease_spaces_insert" ON public.lease_spaces FOR INSERT WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "lease_spaces_update" ON public.lease_spaces FOR UPDATE USING (org_id = ANY(public.user_org_ids())) WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "lease_spaces_delete" ON public.lease_spaces FOR DELETE USING (org_id = ANY(public.user_org_ids()));

-- lease_rent_steps
CREATE POLICY "lease_rent_steps_select" ON public.lease_rent_steps FOR SELECT USING (org_id = ANY(public.user_org_ids()));
CREATE POLICY "lease_rent_steps_insert" ON public.lease_rent_steps FOR INSERT WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "lease_rent_steps_update" ON public.lease_rent_steps FOR UPDATE USING (org_id = ANY(public.user_org_ids())) WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "lease_rent_steps_delete" ON public.lease_rent_steps FOR DELETE USING (org_id = ANY(public.user_org_ids()));

-- lease_renewal_options
CREATE POLICY "lease_renewal_options_select" ON public.lease_renewal_options FOR SELECT USING (org_id = ANY(public.user_org_ids()));
CREATE POLICY "lease_renewal_options_insert" ON public.lease_renewal_options FOR INSERT WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "lease_renewal_options_update" ON public.lease_renewal_options FOR UPDATE USING (org_id = ANY(public.user_org_ids())) WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "lease_renewal_options_delete" ON public.lease_renewal_options FOR DELETE USING (org_id = ANY(public.user_org_ids()));

-- lease_traits_nnn
CREATE POLICY "lease_traits_nnn_select" ON public.lease_traits_nnn FOR SELECT USING (org_id = ANY(public.user_org_ids()));
CREATE POLICY "lease_traits_nnn_insert" ON public.lease_traits_nnn FOR INSERT WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "lease_traits_nnn_update" ON public.lease_traits_nnn FOR UPDATE USING (org_id = ANY(public.user_org_ids())) WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "lease_traits_nnn_delete" ON public.lease_traits_nnn FOR DELETE USING (org_id = ANY(public.user_org_ids()));

-- lease_traits_gross
CREATE POLICY "lease_traits_gross_select" ON public.lease_traits_gross FOR SELECT USING (org_id = ANY(public.user_org_ids()));
CREATE POLICY "lease_traits_gross_insert" ON public.lease_traits_gross FOR INSERT WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "lease_traits_gross_update" ON public.lease_traits_gross FOR UPDATE USING (org_id = ANY(public.user_org_ids())) WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "lease_traits_gross_delete" ON public.lease_traits_gross FOR DELETE USING (org_id = ANY(public.user_org_ids()));

-- lease_traits_modified_gross
CREATE POLICY "lease_traits_modified_gross_select" ON public.lease_traits_modified_gross FOR SELECT USING (org_id = ANY(public.user_org_ids()));
CREATE POLICY "lease_traits_modified_gross_insert" ON public.lease_traits_modified_gross FOR INSERT WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "lease_traits_modified_gross_update" ON public.lease_traits_modified_gross FOR UPDATE USING (org_id = ANY(public.user_org_ids())) WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "lease_traits_modified_gross_delete" ON public.lease_traits_modified_gross FOR DELETE USING (org_id = ANY(public.user_org_ids()));

-- lease_traits_ground
CREATE POLICY "lease_traits_ground_select" ON public.lease_traits_ground FOR SELECT USING (org_id = ANY(public.user_org_ids()));
CREATE POLICY "lease_traits_ground_insert" ON public.lease_traits_ground FOR INSERT WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "lease_traits_ground_update" ON public.lease_traits_ground FOR UPDATE USING (org_id = ANY(public.user_org_ids())) WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "lease_traits_ground_delete" ON public.lease_traits_ground FOR DELETE USING (org_id = ANY(public.user_org_ids()));

-- lease_traits_residential
CREATE POLICY "lease_traits_residential_select" ON public.lease_traits_residential FOR SELECT USING (org_id = ANY(public.user_org_ids()));
CREATE POLICY "lease_traits_residential_insert" ON public.lease_traits_residential FOR INSERT WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "lease_traits_residential_update" ON public.lease_traits_residential FOR UPDATE USING (org_id = ANY(public.user_org_ids())) WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "lease_traits_residential_delete" ON public.lease_traits_residential FOR DELETE USING (org_id = ANY(public.user_org_ids()));

-- lease_traits_hotel_mgmt
CREATE POLICY "lease_traits_hotel_mgmt_select" ON public.lease_traits_hotel_mgmt FOR SELECT USING (org_id = ANY(public.user_org_ids()));
CREATE POLICY "lease_traits_hotel_mgmt_insert" ON public.lease_traits_hotel_mgmt FOR INSERT WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "lease_traits_hotel_mgmt_update" ON public.lease_traits_hotel_mgmt FOR UPDATE USING (org_id = ANY(public.user_org_ids())) WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "lease_traits_hotel_mgmt_delete" ON public.lease_traits_hotel_mgmt FOR DELETE USING (org_id = ANY(public.user_org_ids()));

-- lease_traits_membership
CREATE POLICY "lease_traits_membership_select" ON public.lease_traits_membership FOR SELECT USING (org_id = ANY(public.user_org_ids()));
CREATE POLICY "lease_traits_membership_insert" ON public.lease_traits_membership FOR INSERT WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "lease_traits_membership_update" ON public.lease_traits_membership FOR UPDATE USING (org_id = ANY(public.user_org_ids())) WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "lease_traits_membership_delete" ON public.lease_traits_membership FOR DELETE USING (org_id = ANY(public.user_org_ids()));

-- lease_traits_license
CREATE POLICY "lease_traits_license_select" ON public.lease_traits_license FOR SELECT USING (org_id = ANY(public.user_org_ids()));
CREATE POLICY "lease_traits_license_insert" ON public.lease_traits_license FOR INSERT WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "lease_traits_license_update" ON public.lease_traits_license FOR UPDATE USING (org_id = ANY(public.user_org_ids())) WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "lease_traits_license_delete" ON public.lease_traits_license FOR DELETE USING (org_id = ANY(public.user_org_ids()));

-- lease_traits_percentage_rent
CREATE POLICY "lease_traits_percentage_rent_select" ON public.lease_traits_percentage_rent FOR SELECT USING (org_id = ANY(public.user_org_ids()));
CREATE POLICY "lease_traits_percentage_rent_insert" ON public.lease_traits_percentage_rent FOR INSERT WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "lease_traits_percentage_rent_update" ON public.lease_traits_percentage_rent FOR UPDATE USING (org_id = ANY(public.user_org_ids())) WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "lease_traits_percentage_rent_delete" ON public.lease_traits_percentage_rent FOR DELETE USING (org_id = ANY(public.user_org_ids()));
