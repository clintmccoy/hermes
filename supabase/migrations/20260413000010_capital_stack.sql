-- =============================================================
-- Migration: 20260413000010_capital_stack
-- Ticket: MMC-27 — Capital stack (sources, debt, equity, waterfall, covenants)
--
-- Models the full capital stack for a deal: every tranche of debt
-- and equity, their terms, the distribution waterfall, and debt
-- covenants. Designed for v0 — further expansion expected as
-- modeling capabilities grow (refi mechanics, complex waterfalls,
-- per-investor return tracking).
--
-- Tables created:
--   capital_sources   — spine: one row per capital tranche
--   debt_terms        — one-to-one extension for debt tranches;
--                       includes future funding / future advance terms
--   equity_terms      — one-to-one extension for equity tranches
--   waterfall_tiers   — distribution waterfall tiers, ordered by
--                       tier_order; lp/gp splits must sum to 100
--   debt_covenants    — testable covenants per debt instrument
--
-- Refi/recap modeled via effective_date + exit_date on capital_sources.
-- A refi is new capital_sources rows with a future effective_date;
-- the outgoing tranche has an exit_date set to the same date.
-- No separate event table required.
--
-- ENUMs created:
--   capital_type_enum
--   debt_rate_type_enum
--   waterfall_hurdle_type_enum
--   covenant_type_enum
--   covenant_test_frequency_enum
--
-- Rollback: supabase/migrations/rollback/20260413000010_rollback.sql
-- =============================================================


-- =============================================================
-- ENUMs
-- =============================================================

CREATE TYPE public.capital_type_enum AS ENUM (
  'senior_debt',        -- first mortgage / senior secured loan
  'construction_loan',  -- construction financing; typically converts to perm at stabilization
  'bridge_loan',        -- short-term bridge; replaced by perm at refi
  'mezzanine_debt',     -- subordinate debt; sits between senior and equity
  'preferred_equity',   -- equity with debt-like preferred return; senior to common equity
  'lp_equity',          -- limited partner equity
  'gp_equity',          -- general partner / sponsor equity (often a small co-invest slug)
  'co_gp',              -- co-GP equity (operating partner or JV partner GP slug)
  'jv_equity',          -- joint venture equity (institutional partner)
  'other'
);

CREATE TYPE public.debt_rate_type_enum AS ENUM (
  'fixed',    -- fixed rate for term
  'floating', -- index + spread (e.g. SOFR + 250 bps)
  'hybrid'    -- fixed for initial period, then converts to floating
);

CREATE TYPE public.waterfall_hurdle_type_enum AS ENUM (
  'return_of_capital',      -- first: return all invested equity
  'preferred_return',       -- pref return (% per annum on invested capital)
  'irr_hurdle',             -- promote kicks in above this IRR
  'equity_multiple_hurdle', -- promote kicks in above this EM (e.g. 1.5x, 2.0x)
  'residual'                -- everything above the last hurdle
);

CREATE TYPE public.covenant_type_enum AS ENUM (
  'dscr_min',        -- minimum debt service coverage ratio
  'ltv_max',         -- maximum loan-to-value
  'ltc_max',         -- maximum loan-to-cost (construction/value-add)
  'debt_yield_min',  -- minimum debt yield (NOI / loan balance)
  'occupancy_min',   -- minimum physical or economic occupancy
  'custom'           -- catch-all; description field carries the detail
);

CREATE TYPE public.covenant_test_frequency_enum AS ENUM (
  'at_funding',  -- tested once at loan origination / initial funding
  'monthly',
  'quarterly',
  'annual'
);


-- =============================================================
-- TABLE: capital_sources
--
-- The spine of the capital stack. One row per tranche, whether
-- debt or equity. All tranches — including those that come in at
-- a future refi or recap — live in this table.
--
-- Refi/recap modeling:
--   effective_date: when this tranche becomes active in the model.
--     Null = active from model start (analysis_start_date on
--     investment_assumptions).
--   exit_date: when this tranche is retired (loan paid off, equity
--     bought out, etc.). Null = active through end of hold period.
--
--   A construction-to-perm refi:
--     Row 1 (construction loan): effective_date=null, exit_date=2027-06-01
--     Row 2 (permanent loan):    effective_date=2027-06-01, exit_date=null
--
--   The calculation engine queries active tranches at any date via:
--     WHERE (effective_date IS NULL OR effective_date <= :date)
--       AND (exit_date IS NULL OR exit_date > :date)
--
-- position: seniority in the stack (1 = most senior). Lower position
--   receives distributions last but has highest priority in default/
--   liquidation. Used to order the waterfall and covenant cascade.
-- =============================================================

CREATE TABLE public.capital_sources (
  id                    uuid                      PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid                      NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_id               uuid                      NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,

  -- Identity
  source_name           text                      NOT NULL,
  capital_type          public.capital_type_enum  NOT NULL,
  lender_investor_name  text,

  -- Amounts
  committed_amount      numeric,             -- total committed capital for this tranche
  funded_amount         numeric,             -- actual funded to date (nullable; updated as draws occur)

  -- Stack position (1 = most senior; higher = more junior/equity-like)
  position              int                  NOT NULL DEFAULT 1
                                               CHECK (position > 0),

  -- Recourse
  is_recourse           boolean              NOT NULL DEFAULT false,

  -- Timeline (for refi/recap modeling; see comment above)
  effective_date        date,               -- null = active from model start
  exit_date             date,               -- null = active through end of hold

  -- Audit
  created_by            uuid                NOT NULL REFERENCES auth.users(id),
  created_at            timestamptz         NOT NULL DEFAULT now(),
  updated_at            timestamptz         NOT NULL DEFAULT now(),

  CONSTRAINT exit_after_effective CHECK (
    effective_date IS NULL OR exit_date IS NULL OR exit_date > effective_date
  )
);

ALTER TABLE public.capital_sources ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_capital_sources_deal_id  ON public.capital_sources(deal_id);
CREATE INDEX idx_capital_sources_org_id   ON public.capital_sources(org_id);
CREATE INDEX idx_capital_sources_position ON public.capital_sources(deal_id, position);

CREATE TRIGGER set_capital_sources_updated_at
  BEFORE UPDATE ON public.capital_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =============================================================
-- TABLE: debt_terms
--
-- One-to-one extension of capital_sources for any debt tranche
-- (senior_debt, construction_loan, bridge_loan, mezzanine_debt).
-- capital_source_id is the PK — enforces one-to-one.
--
-- Rate fields:
--   interest_rate_pct: the all-in rate for fixed loans; the initial
--     rate for hybrid. For floating, this is the rate at origination.
--   index_rate + spread_bps: for floating loans only.
--     All-in floating rate = index_rate_value + spread_bps / 100.
--
-- Amortization:
--   io_period_months: months of interest-only payments before
--     amortization begins.
--   amortization_years: amortization schedule after IO period.
--     Null = full IO loan (no principal amortization).
--
-- Future funding / future advance facility:
--   Captures the lender's commitment to fund costs as they are
--   incurred during the hold (TI/LC, capex, construction draws).
--   future_funding_ti_lc_pct: % of future TI and LC costs the
--     lender will advance (e.g. 65.0 for 65%).
--   future_funding_capex_pct: % of future capex/construction costs
--     (e.g. 75.0 for 75% of approved draw requests).
--   future_funding_max_amount: hard cap on total future advances
--     across all categories.
--   future_advance_terms: jsonb escape hatch for complex or
--     non-standard advance mechanics (earn-out structures, phased
--     funding conditions, lender approval requirements, etc.).
--     Structure evolves with product; no enforced schema at DB level.
-- =============================================================

CREATE TABLE public.debt_terms (
  capital_source_id       uuid                      PRIMARY KEY
                            REFERENCES public.capital_sources(id) ON DELETE CASCADE,
  org_id                  uuid                      NOT NULL,

  -- Interest rate
  interest_rate_pct       numeric,                  -- all-in rate for fixed; current rate for floating
  rate_type               public.debt_rate_type_enum NOT NULL DEFAULT 'fixed',
  index_rate              text,                     -- e.g. 'SOFR', 'Prime', '1M SOFR'
  spread_bps              int,                      -- basis points over index (floating only)

  -- Amortization
  io_period_months        int                       NOT NULL DEFAULT 0,
  amortization_years      int,                      -- null = IO-only loan
  loan_term_months        int,
  maturity_date           date,

  -- Origination costs
  origination_fee_pct     numeric,                  -- points (e.g. 1.0 = 1 point)

  -- Extension options
  extension_options       int,                      -- number of extension options available
  extension_term_months   int,                      -- months per option

  -- Future funding / future advance facility
  future_funding_ti_lc_pct    numeric,              -- % of TI/LC costs lender will fund
  future_funding_capex_pct    numeric,              -- % of capex/construction draw lender will fund
  future_funding_max_amount   numeric,              -- hard cap on total future advances
  future_advance_terms        jsonb,                -- complex/non-standard advance mechanics

  -- Audit
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.debt_terms ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_debt_terms_updated_at
  BEFORE UPDATE ON public.debt_terms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =============================================================
-- TABLE: equity_terms
--
-- One-to-one extension of capital_sources for equity tranches
-- (lp_equity, gp_equity, co_gp, jv_equity, preferred_equity).
--
-- ownership_pct: economic ownership percentage of this tranche.
--   Total equity ownership across all tranches on a deal should
--   sum to 100; enforced at application layer.
--
-- preferred_return_pct: annual preferred return rate. Null = no
--   preferred return (pure common equity). Applied to invested
--   capital account before promote / profit split.
--
-- pref_is_cumulative: if true, unpaid preferred return accrues
--   to a running balance and must be made whole before the next
--   waterfall tier distributes. Most institutional LP equity
--   structures are cumulative.
--
-- capital_account_basis: the starting capital account for this
--   tranche at model inception. Usually equals committed_amount
--   on capital_sources, but may differ for contributed assets,
--   cash and carry structures, or partial syndicates.
-- =============================================================

CREATE TABLE public.equity_terms (
  capital_source_id       uuid         PRIMARY KEY
                            REFERENCES public.capital_sources(id) ON DELETE CASCADE,
  org_id                  uuid         NOT NULL,

  ownership_pct           numeric      NOT NULL
                                         CHECK (ownership_pct > 0 AND ownership_pct <= 100),
  preferred_return_pct    numeric,     -- null = no preferred return
  pref_is_cumulative      boolean      NOT NULL DEFAULT true,
  capital_account_basis   numeric,     -- starting capital account; null = use committed_amount

  -- Audit
  created_at              timestamptz  NOT NULL DEFAULT now(),
  updated_at              timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.equity_terms ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_equity_terms_updated_at
  BEFORE UPDATE ON public.equity_terms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =============================================================
-- TABLE: waterfall_tiers
--
-- Distribution waterfall tiers for a deal. One row per tier,
-- ordered by tier_order (ascending = first to receive).
--
-- Standard waterfall structure:
--   Tier 1 (tier_order=1): Return of Capital  → 100% LP / 0% GP
--   Tier 2 (tier_order=2): 8% Preferred Return → 100% LP / 0% GP
--   Tier 3 (tier_order=3): GP Catch-up (if any) → 0% LP / 100% GP
--   Tier 4 (tier_order=4): Residual profits     → 80% LP / 20% GP
--
-- hurdle_rate_pct: IRR or preferred return threshold (%).
--   Applicable to preferred_return and irr_hurdle types.
-- hurdle_multiple: equity multiple threshold (e.g. 1.5 for 1.5x).
--   Applicable to equity_multiple_hurdle type.
--
-- lp_split_pct + gp_split_pct must sum to 100.
--
-- UNIQUE (deal_id, tier_order): prevents duplicate tier ordering.
-- =============================================================

CREATE TABLE public.waterfall_tiers (
  id                uuid                              PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid                              NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_id           uuid                              NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,

  tier_order        int                               NOT NULL CHECK (tier_order > 0),
  tier_name         text                              NOT NULL,
  hurdle_type       public.waterfall_hurdle_type_enum NOT NULL,
  hurdle_rate_pct   numeric,          -- % hurdle for preferred_return / irr_hurdle types
  hurdle_multiple   numeric,          -- EM hurdle for equity_multiple_hurdle type

  -- Distribution split at this tier (must sum to 100)
  lp_split_pct      numeric           NOT NULL CHECK (lp_split_pct >= 0 AND lp_split_pct <= 100),
  gp_split_pct      numeric           NOT NULL CHECK (gp_split_pct >= 0 AND gp_split_pct <= 100),

  CONSTRAINT waterfall_splits_sum_to_100
    CHECK (lp_split_pct + gp_split_pct = 100),
  CONSTRAINT uq_waterfall_tier_order
    UNIQUE (deal_id, tier_order),

  -- Audit
  created_by        uuid              NOT NULL REFERENCES auth.users(id),
  created_at        timestamptz       NOT NULL DEFAULT now(),
  updated_at        timestamptz       NOT NULL DEFAULT now()
);

ALTER TABLE public.waterfall_tiers ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_waterfall_tiers_deal_id ON public.waterfall_tiers(deal_id);
CREATE INDEX idx_waterfall_tiers_org_id  ON public.waterfall_tiers(org_id);

CREATE TRIGGER set_waterfall_tiers_updated_at
  BEFORE UPDATE ON public.waterfall_tiers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =============================================================
-- TABLE: debt_covenants
--
-- Testable covenants on a debt instrument.
-- One row per covenant test per capital source.
--
-- threshold_value: the limit that must not be breached.
--   For dscr_min: e.g. 1.25 (DSCR must be >= 1.25x)
--   For ltv_max: e.g. 75.0 (LTV must be <= 75%)
--   For debt_yield_min: e.g. 8.0 (debt yield must be >= 8%)
--   For occupancy_min: e.g. 85.0 (must be >= 85% occupied)
--
-- test_frequency: how often the covenant is measured.
--   at_funding: tested once at origination.
--   Ongoing tests are the engine's responsibility to flag.
-- =============================================================

CREATE TABLE public.debt_covenants (
  id                      uuid                                PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  uuid                                NOT NULL,
  capital_source_id       uuid                                NOT NULL
                            REFERENCES public.capital_sources(id) ON DELETE CASCADE,

  covenant_type           public.covenant_type_enum           NOT NULL,
  threshold_value         numeric                             NOT NULL,
  test_frequency          public.covenant_test_frequency_enum NOT NULL DEFAULT 'quarterly',
  grace_period_days       int,
  description             text,    -- required for covenant_type = 'custom'; optional otherwise

  -- Audit
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.debt_covenants ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_debt_covenants_capital_source_id
  ON public.debt_covenants(capital_source_id);

CREATE TRIGGER set_debt_covenants_updated_at
  BEFORE UPDATE ON public.debt_covenants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =============================================================
-- RLS POLICIES
-- =============================================================

CREATE POLICY "capital_sources_select" ON public.capital_sources FOR SELECT USING (org_id = ANY(public.user_org_ids()));
CREATE POLICY "capital_sources_insert" ON public.capital_sources FOR INSERT WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "capital_sources_update" ON public.capital_sources FOR UPDATE USING (org_id = ANY(public.user_org_ids())) WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "capital_sources_delete" ON public.capital_sources FOR DELETE USING (org_id = ANY(public.user_org_ids()));

CREATE POLICY "debt_terms_select" ON public.debt_terms FOR SELECT USING (org_id = ANY(public.user_org_ids()));
CREATE POLICY "debt_terms_insert" ON public.debt_terms FOR INSERT WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "debt_terms_update" ON public.debt_terms FOR UPDATE USING (org_id = ANY(public.user_org_ids())) WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "debt_terms_delete" ON public.debt_terms FOR DELETE USING (org_id = ANY(public.user_org_ids()));

CREATE POLICY "equity_terms_select" ON public.equity_terms FOR SELECT USING (org_id = ANY(public.user_org_ids()));
CREATE POLICY "equity_terms_insert" ON public.equity_terms FOR INSERT WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "equity_terms_update" ON public.equity_terms FOR UPDATE USING (org_id = ANY(public.user_org_ids())) WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "equity_terms_delete" ON public.equity_terms FOR DELETE USING (org_id = ANY(public.user_org_ids()));

CREATE POLICY "waterfall_tiers_select" ON public.waterfall_tiers FOR SELECT USING (org_id = ANY(public.user_org_ids()));
CREATE POLICY "waterfall_tiers_insert" ON public.waterfall_tiers FOR INSERT WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "waterfall_tiers_update" ON public.waterfall_tiers FOR UPDATE USING (org_id = ANY(public.user_org_ids())) WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "waterfall_tiers_delete" ON public.waterfall_tiers FOR DELETE USING (org_id = ANY(public.user_org_ids()));

CREATE POLICY "debt_covenants_select" ON public.debt_covenants FOR SELECT USING (org_id = ANY(public.user_org_ids()));
CREATE POLICY "debt_covenants_insert" ON public.debt_covenants FOR INSERT WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "debt_covenants_update" ON public.debt_covenants FOR UPDATE USING (org_id = ANY(public.user_org_ids())) WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "debt_covenants_delete" ON public.debt_covenants FOR DELETE USING (org_id = ANY(public.user_org_ids()));
