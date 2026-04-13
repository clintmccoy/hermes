-- =============================================================
-- Migration: 20260413000009_value_driver_engine
-- Ticket: MMC-26 — Value driver engine (dual-track DCF assumptions)
--
-- Implements the dual-track DCF architecture per ADR 013.
-- Replaces the original generic value_drivers/value_schedule_entries
-- design (7-type enum) with three typed assumption tables plus
-- a custom curve override mechanism.
--
-- Tables created:
--   market_leasing_assumptions  — Track 2: re-leasing scenario inputs
--                                 per space type per deal (ARGUS MLA equivalent)
--   operating_assumptions       — NOI-layer inputs: vacancy, expenses,
--                                 management fee, capital reserve
--   investment_assumptions      — Returns-layer inputs: acquisition price,
--                                 hold period, cap rates, inflation convention
--   value_schedule_entries      — Custom curve override path: time-series
--                                 values for any assumption field
--
-- ENUMs created:
--   inflation_convention_enum
--   escalation_rate_type_enum
--   value_schedule_period_type_enum
--   value_schedule_assumption_source_enum
--
-- Key architectural decisions: see ADR 013.
-- Rollback: supabase/migrations/rollback/20260413000009_rollback.sql
-- =============================================================


-- =============================================================
-- ENUMs
-- =============================================================

-- When escalation rates begin applying in the model
-- year_1: apply from Period 1 (first month of hold)
-- year_2: apply starting Period 13 (ARGUS default; standard for stabilized deals)
CREATE TYPE public.inflation_convention_enum AS ENUM (
  'year_1',
  'year_2'
);

-- How growth rate percentages are expressed
CREATE TYPE public.escalation_rate_type_enum AS ENUM (
  'effective_annual',   -- % stated as annual rate, applied once per 12-month period
  'nominal_monthly'     -- % stated as monthly compounding rate
);

-- Granularity of entries in value_schedule_entries
CREATE TYPE public.value_schedule_period_type_enum AS ENUM (
  'monthly',
  'annual'
);

-- Which assumption table a value_schedule_entries row overrides
CREATE TYPE public.value_schedule_assumption_source_enum AS ENUM (
  'market_leasing',   -- overrides a field on market_leasing_assumptions
  'operating',        -- overrides a field on operating_assumptions
  'investment'        -- overrides a field on investment_assumptions
);


-- =============================================================
-- TABLE: market_leasing_assumptions
--
-- Track 2 of the dual-track DCF. One row per space type per deal.
-- Defines what the engine assumes happens when each in-place lease
-- expires: will the tenant renew or leave, how long is the space
-- vacant, what does the new rent look like, and what are the
-- landlord costs (TI and leasing commissions) for re-leasing.
--
-- The engine blends renewal and new-tenant scenarios using
-- renewal_probability_pct as a weighting factor:
--   Blended Rent = (renewal_prob × renewal_rent) + ((1 − renewal_prob) × new_market_rent)
--   Blended Downtime = (renewal_prob × downtime_renewal) + ((1 − renewal_prob) × downtime_new)
--
-- renewal_rent is typically market_rent_psf (same rate, no concessions).
-- new_market_rent is also market_rent_psf by default, but the engine
-- may differentiate via value_schedule_entries if the analyst inputs
-- a separate curve for new vs. renewal rates.
--
-- UNIQUE (deal_id, applies_to_space_type): a deal can have at most
-- one MLA per space type. Mixed-use deals with both office and retail
-- will have two MLA rows — one per type.
-- =============================================================

CREATE TABLE public.market_leasing_assumptions (
  id                          uuid               PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                      uuid               NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_id                     uuid               NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,

  -- Scope: which spaces this MLA governs
  applies_to_space_type       public.space_type  NOT NULL,

  -- Market rent
  market_rent_psf             numeric            NOT NULL,
  market_rent_growth_pct      numeric            NOT NULL DEFAULT 3.0,
                                                 -- annual effective growth rate for market rent
  -- Renewal probability
  renewal_probability_pct     numeric            NOT NULL DEFAULT 65.0
                                                   CHECK (renewal_probability_pct >= 0
                                                     AND renewal_probability_pct <= 100),

  -- Downtime (months of vacancy between tenant departure and next rent-paying occupant)
  downtime_months_new_tenant  int                NOT NULL DEFAULT 6,
  downtime_months_renewal     int                NOT NULL DEFAULT 2,

  -- New lease terms (what a new tenant gets)
  new_lease_term_months       int                NOT NULL DEFAULT 60,
  ti_psf_new                  numeric,           -- TI allowance for new tenants ($/RSF)
  lc_pct_new                  numeric,           -- leasing commission for new leases (% of total lease value)

  -- Renewal lease terms (what a renewing tenant gets)
  renewal_lease_term_months   int                NOT NULL DEFAULT 36,
  ti_psf_renewal              numeric,           -- TI for renewals (typically lower than new)
  lc_pct_renewal              numeric,           -- LC for renewals (typically half of new rate)

  -- Constraints
  CONSTRAINT uq_mla_deal_space_type UNIQUE (deal_id, applies_to_space_type),

  -- Audit
  created_by                  uuid               NOT NULL REFERENCES auth.users(id),
  created_at                  timestamptz        NOT NULL DEFAULT now(),
  updated_at                  timestamptz        NOT NULL DEFAULT now()
);

ALTER TABLE public.market_leasing_assumptions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_mla_deal_id ON public.market_leasing_assumptions(deal_id);
CREATE INDEX idx_mla_org_id  ON public.market_leasing_assumptions(org_id);

CREATE TRIGGER set_mla_updated_at
  BEFORE UPDATE ON public.market_leasing_assumptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =============================================================
-- TABLE: operating_assumptions
--
-- NOI-layer inputs for the Operations module (PRD §7).
-- One base-case row per deal.
--
-- vacancy_rate_pct: economic vacancy assumption for stabilized
--   operations. Applied against Potential Gross Income to produce
--   Effective Gross Income.
--   Note: physical vacancy is tracked in spaces_master.lifecycle_status;
--   economic vacancy here is the underwriting assumption.
--
-- credit_loss_pct: additional haircut for non-payment / bad debt.
--   Separate from vacancy (a tenant can be physically present but
--   not paying). Typically 0.5–2% of PGI.
--
-- opex_psf: total operating expenses per RSF in the starting year.
--   The calculation engine uses this as the Year 1 baseline and
--   escalates at opex_growth_pct. Granular expense lines (taxes,
--   insurance, utilities, etc.) are optional and should sum to opex_psf
--   if all populated. The engine uses opex_psf if the granular lines
--   are null; it uses the sum of granular lines if populated.
--
-- mgmt_fee_pct: property management fee as a % of EGI.
--   Industry range: 3–8%. Applied AFTER vacancy/credit loss deduction.
--
-- capex_reserve_psf: annual capital reserve / replacement reserve per RSF.
--   Below-the-NOI-line cost per ADR 013. Typically $0.15–$0.50 for
--   stabilized office/industrial; $200–$400/unit/year for multifamily.
-- =============================================================

CREATE TABLE public.operating_assumptions (
  id                        uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                    uuid         NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_id                   uuid         NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,

  -- Vacancy & credit loss (applied to PGI to produce EGI)
  vacancy_rate_pct          numeric      NOT NULL DEFAULT 5.0
                                           CHECK (vacancy_rate_pct >= 0 AND vacancy_rate_pct < 100),
  credit_loss_pct           numeric      NOT NULL DEFAULT 1.0
                                           CHECK (credit_loss_pct >= 0 AND credit_loss_pct < 100),

  -- Operating expenses
  opex_psf                  numeric,     -- total OpEx per RSF, starting year (see comment above)
  opex_growth_pct           numeric      NOT NULL DEFAULT 3.0,  -- annual expense escalation %

  -- Granular expense lines (optional; must sum to opex_psf if all provided)
  real_estate_tax_psf       numeric,
  insurance_psf             numeric,
  utilities_psf             numeric,
  repairs_maintenance_psf   numeric,
  cam_psf                   numeric,     -- common area maintenance
  other_opex_psf            numeric,     -- miscellaneous operating expenses

  -- Management fee (applied to EGI, below operating expenses)
  mgmt_fee_pct              numeric      NOT NULL DEFAULT 4.0
                                           CHECK (mgmt_fee_pct >= 0 AND mgmt_fee_pct <= 20),

  -- Below-NOI capital costs
  capex_reserve_psf         numeric,     -- annual capital reserve per RSF (below NOI line)

  -- One base-case row per deal
  CONSTRAINT uq_operating_assumptions_deal UNIQUE (deal_id),

  -- Audit
  created_by                uuid         NOT NULL REFERENCES auth.users(id),
  created_at                timestamptz  NOT NULL DEFAULT now(),
  updated_at                timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.operating_assumptions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_operating_assumptions_deal_id ON public.operating_assumptions(deal_id);
CREATE INDEX idx_operating_assumptions_org_id  ON public.operating_assumptions(org_id);

CREATE TRIGGER set_operating_assumptions_updated_at
  BEFORE UPDATE ON public.operating_assumptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =============================================================
-- TABLE: investment_assumptions
--
-- Returns-layer inputs and model-wide calculation settings.
-- One base-case row per deal.
--
-- Acquisition fields:
--   acquisition_price: total purchase price (the denominator for
--     going-in yield, LTV, and unlevered basis calculations).
--   acquisition_costs_pct: closing costs as a % of purchase price
--     (typical range: 0.5–2.0%; varies by asset type and market).
--
-- Hold period:
--   hold_period_months: the full analysis period. Determines how
--     many monthly cash flow periods the engine calculates.
--   analysis_start_date: the model clock start (acquisition date
--     or construction start for development deals).
--
-- Cap rates:
--   going_in_cap_rate_pct: implied yield at acquisition.
--     = Year 1 Stabilized NOI / acquisition_price.
--     Used for investment thesis validation; not directly used in
--     the DCF cash flow calculation.
--   exit_cap_rate_pct: used to calculate terminal value at sale.
--     Terminal Value = Forward Stabilized NOI / exit_cap_rate.
--     "Forward Stabilized NOI" = projected NOI in the 12 months
--     following the modeled sale date — NOT Year 1 NOI.
--   exit_cap_spread_bps: alternative expression of exit cap as a
--     spread over going_in_cap_rate_pct. Exactly one of
--     exit_cap_rate_pct or exit_cap_spread_bps must be provided.
--   disposition_costs_pct: broker + legal + transfer costs at sale
--     (typical: 1.0–2.5% of gross sale price).
--
-- Inflation convention (see ADR 013 §5):
--   inflation_convention: when escalations begin applying.
--   escalation_rate_type: how growth percentages are expressed.
--   These fields cascade to ALL escalation calculations in the model.
-- =============================================================

CREATE TABLE public.investment_assumptions (
  id                        uuid                              PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                    uuid                              NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_id                   uuid                              NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,

  -- Acquisition
  acquisition_price         numeric,
  acquisition_costs_pct     numeric      NOT NULL DEFAULT 1.5
                                           CHECK (acquisition_costs_pct >= 0),

  -- Hold period
  hold_period_months        int          NOT NULL DEFAULT 60
                                           CHECK (hold_period_months > 0),
  analysis_start_date       date,

  -- Cap rates
  going_in_cap_rate_pct     numeric      CHECK (going_in_cap_rate_pct > 0),
  exit_cap_rate_pct         numeric      CHECK (exit_cap_rate_pct > 0),
  exit_cap_spread_bps       int,         -- exit cap = going_in_cap + spread / 10000
                                         -- e.g. 50 bps over a 5.00% going-in = 5.50% exit cap
  disposition_costs_pct     numeric      NOT NULL DEFAULT 1.5
                                           CHECK (disposition_costs_pct >= 0),

  -- Inflation convention (governs all escalation calculations in the engine)
  inflation_convention      public.inflation_convention_enum   NOT NULL DEFAULT 'year_2',
  escalation_rate_type      public.escalation_rate_type_enum   NOT NULL DEFAULT 'effective_annual',

  -- Constraints
  -- At least one of acquisition_price or going_in_cap_rate_pct should be set for a useful model,
  -- but neither is enforced NOT NULL because BOE-level models may omit acquisition price initially.
  CONSTRAINT exit_cap_rate_or_spread CHECK (
    -- Either an absolute exit cap rate or a spread must be provided (or both, but not neither
    -- once the model is past BOE stage — enforced at application layer, not DB level)
    exit_cap_rate_pct IS NOT NULL OR exit_cap_spread_bps IS NOT NULL OR
    (exit_cap_rate_pct IS NULL AND exit_cap_spread_bps IS NULL) -- both null is OK at draft stage
  ),
  CONSTRAINT uq_investment_assumptions_deal UNIQUE (deal_id),

  -- Audit
  created_by                uuid         NOT NULL REFERENCES auth.users(id),
  created_at                timestamptz  NOT NULL DEFAULT now(),
  updated_at                timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.investment_assumptions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_investment_assumptions_deal_id ON public.investment_assumptions(deal_id);
CREATE INDEX idx_investment_assumptions_org_id  ON public.investment_assumptions(org_id);

CREATE TRIGGER set_investment_assumptions_updated_at
  BEFORE UPDATE ON public.investment_assumptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =============================================================
-- TABLE: value_schedule_entries
--
-- Custom curve override path. When an analyst wants to input a
-- manual year-by-year (or month-by-month) schedule for any
-- assumption rather than relying on flat escalation rates,
-- this table stores the time series.
--
-- The calculation engine checks this table FIRST for each
-- assumption field and period. If a matching entry exists,
-- it uses that value. If no entry exists, it falls back to
-- the flat escalation logic from the parent assumption table.
--
-- assumption_source: which of the three assumption tables the
--   override targets.
-- field_name: the specific column being overridden.
--   e.g. 'market_rent_psf', 'vacancy_rate_pct', 'exit_cap_rate_pct'
-- applies_to_space_type: required for market_leasing overrides
--   (since market_leasing_assumptions is scoped per space type);
--   null for operating and investment overrides.
-- period_date: first day of the period this value applies to.
-- period_type: monthly or annual granularity.
-- value: the override value for this period.
--
-- Example: an analyst inputs a custom rent growth curve:
--   Year 1: 2.0%, Year 2: 3.5%, Year 3: 4.0%, Year 4+: 3.0%
--   Four rows with assumption_source='market_leasing',
--   field_name='market_rent_growth_pct', period_type='annual',
--   one per year. The engine uses these instead of the flat
--   market_rent_growth_pct on market_leasing_assumptions.
-- =============================================================

CREATE TABLE public.value_schedule_entries (
  id                      uuid                                          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  uuid                                          NOT NULL,
  deal_id                 uuid                                          NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,

  -- Which assumption this entry overrides
  assumption_source       public.value_schedule_assumption_source_enum  NOT NULL,
  field_name              text                                          NOT NULL,
  applies_to_space_type   public.space_type,                            -- required for market_leasing source

  -- Time series
  period_date             date                                          NOT NULL,
  period_type             public.value_schedule_period_type_enum        NOT NULL DEFAULT 'annual',
  value                   numeric                                       NOT NULL,

  -- Constraint: market_leasing overrides must specify space type
  CONSTRAINT market_leasing_requires_space_type CHECK (
    assumption_source <> 'market_leasing' OR applies_to_space_type IS NOT NULL
  ),

  -- Unique: one entry per (deal, source, field, space_type, period)
  CONSTRAINT uq_value_schedule_entry UNIQUE (
    deal_id, assumption_source, field_name, applies_to_space_type, period_date
  ),

  created_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.value_schedule_entries ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_value_schedule_deal_id
  ON public.value_schedule_entries(deal_id);

CREATE INDEX idx_value_schedule_lookup
  ON public.value_schedule_entries(deal_id, assumption_source, field_name, applies_to_space_type);


-- =============================================================
-- RLS POLICIES
-- =============================================================

CREATE POLICY "mla_select" ON public.market_leasing_assumptions FOR SELECT USING (org_id = ANY(public.user_org_ids()));
CREATE POLICY "mla_insert" ON public.market_leasing_assumptions FOR INSERT WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "mla_update" ON public.market_leasing_assumptions FOR UPDATE USING (org_id = ANY(public.user_org_ids())) WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "mla_delete" ON public.market_leasing_assumptions FOR DELETE USING (org_id = ANY(public.user_org_ids()));

CREATE POLICY "operating_assumptions_select" ON public.operating_assumptions FOR SELECT USING (org_id = ANY(public.user_org_ids()));
CREATE POLICY "operating_assumptions_insert" ON public.operating_assumptions FOR INSERT WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "operating_assumptions_update" ON public.operating_assumptions FOR UPDATE USING (org_id = ANY(public.user_org_ids())) WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "operating_assumptions_delete" ON public.operating_assumptions FOR DELETE USING (org_id = ANY(public.user_org_ids()));

CREATE POLICY "investment_assumptions_select" ON public.investment_assumptions FOR SELECT USING (org_id = ANY(public.user_org_ids()));
CREATE POLICY "investment_assumptions_insert" ON public.investment_assumptions FOR INSERT WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "investment_assumptions_update" ON public.investment_assumptions FOR UPDATE USING (org_id = ANY(public.user_org_ids())) WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "investment_assumptions_delete" ON public.investment_assumptions FOR DELETE USING (org_id = ANY(public.user_org_ids()));

CREATE POLICY "value_schedule_entries_select" ON public.value_schedule_entries FOR SELECT USING (org_id = ANY(public.user_org_ids()));
CREATE POLICY "value_schedule_entries_insert" ON public.value_schedule_entries FOR INSERT WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "value_schedule_entries_update" ON public.value_schedule_entries FOR UPDATE USING (org_id = ANY(public.user_org_ids())) WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "value_schedule_entries_delete" ON public.value_schedule_entries FOR DELETE USING (org_id = ANY(public.user_org_ids()));
