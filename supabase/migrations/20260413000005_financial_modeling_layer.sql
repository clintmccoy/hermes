-- =============================================================
-- Migration: 20260413000005_financial_modeling_layer
-- Ticket: MMC-17 — Financial modeling layer (module registry,
-- deal compositions, model results, scenario sets)
--
-- Key design decisions:
--   - financial_module_registry is a reference table written by
--     Hermes engineers; tells the AI which modules exist, which
--     revenue mechanisms and asset classes each applies to, and
--     which version is current. The registry is the source of
--     truth for module selection — the AI does not compose from
--     scratch each time; it picks from this list.
--   - deal_model_compositions records the AI's module selection
--     decision at Gate 2 with full rationale. Multiple
--     compositions per deal are allowed (retries, overrides).
--   - model_results stores the full structured output from the
--     calculation engine. result_data (jsonb) holds the complete
--     cash flow schedule (monthly or annual, any hold period).
--     result_summary (jsonb) holds a normalized subset of
--     universal key metrics for efficient querying and sorting.
--   - scenario_sets groups multiple model_results rows (base,
--     bear, bull, etc.) under a named scenario analysis.
--
-- Table creation order (dependency chain):
--   financial_module_registry (standalone)
--   → deal_model_compositions (references deals, analysis_jobs)
--   → model_results (references deals, compositions, analysis_jobs)
--   → scenario_sets (references deals, compositions, model_results)
--
-- Rollback: supabase/migrations/rollback/20260413000005_rollback.sql
-- =============================================================


-- =============================================================
-- TABLE: financial_module_registry
-- Catalog of every financial module Hermes can run. The AI
-- selects from this list when composing a model — it does not
-- invent modules on the fly.
--
-- revenue_mechanisms (jsonb): array of revenue mechanism values
--   this module applies to, e.g. ["fixed_rent","percentage_rent"]
-- asset_classes (jsonb): array of asset class values this module
--   applies to, e.g. ["office","retail","multifamily"]
-- version: integer bumped when module logic changes materially.
--   Compositions record which version was used at build time.
-- is_active: soft-disable without migration; inactive modules
--   will not be selected by the AI.
--
-- No RLS: reference data, readable by all authenticated users.
-- Written by Hermes engineers via service role only.
-- =============================================================

CREATE TABLE public.financial_module_registry (
  id                  uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key          text        NOT NULL UNIQUE,
  label               text        NOT NULL,
  description         text,
  revenue_mechanisms  jsonb       NOT NULL DEFAULT '[]',
  asset_classes       jsonb       NOT NULL DEFAULT '[]',
  version             integer     NOT NULL DEFAULT 1 CHECK (version > 0),
  is_active           boolean     NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_financial_module_registry_updated_at
  BEFORE UPDATE ON public.financial_module_registry
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.financial_module_registry ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read the module registry
CREATE POLICY "Authenticated users can read module registry"
  ON public.financial_module_registry
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Indexes for AI module selection queries
CREATE INDEX idx_financial_module_registry_active
  ON public.financial_module_registry (is_active)
  WHERE is_active = true;

CREATE INDEX idx_financial_module_registry_revenue_mechanisms
  ON public.financial_module_registry USING GIN (revenue_mechanisms);

CREATE INDEX idx_financial_module_registry_asset_classes
  ON public.financial_module_registry USING GIN (asset_classes);


-- =============================================================
-- SEED: v0 module registry entries
-- Initial set of modules for the asset classes and revenue
-- mechanisms supported at launch. Engineers extend this list
-- as new modules are built; no migration required for new rows.
-- =============================================================

INSERT INTO public.financial_module_registry
  (module_key, label, description, revenue_mechanisms, asset_classes, version)
VALUES
  (
    'nnn_stabilized',
    'NNN Lease — Stabilized',
    'Single or multi-tenant NNN lease asset with in-place rent roll. Models base rent, rent bumps, lease expirations, renewal probability, and retenanting costs.',
    '["fixed_rent"]',
    '["office","retail","industrial"]',
    1
  ),
  (
    'gross_lease_stabilized',
    'Gross/Modified Gross Lease — Stabilized',
    'Office or retail gross lease asset. Models base rent, expense reimbursements, vacancy, and opex passthrough structure.',
    '["fixed_rent"]',
    '["office","retail"]',
    1
  ),
  (
    'multifamily_unit_mix',
    'Multifamily — Unit Mix',
    'Market-rate or affordable multifamily. Models unit mix, market rents, loss-to-lease, vacancy, concessions, and unit-turn costs.',
    '["fixed_rent"]',
    '["multifamily"]',
    1
  ),
  (
    'value_add_renovation',
    'Value-Add Renovation',
    'Renovation-driven rent upside on any asset class. Models renovation budget, phasing, temporary vacancy, post-reno rent premiums, and stabilization timeline.',
    '["fixed_rent","percentage_rent"]',
    '["office","retail","multifamily","industrial"]',
    1
  ),
  (
    'hotel_revpar',
    'Hotel — RevPAR Model',
    'Full-service or select-service hotel. Models occupancy, ADR, RevPAR, departmental revenues (rooms, F&B, other), and GOP waterfall.',
    '["nightly_rate"]',
    '["hotel"]',
    1
  ),
  (
    'flex_coworking',
    'Flex / Coworking — Membership',
    'Flex office or coworking product. Models membership tiers, desk/suite inventory, churn rate, and ancillary revenue.',
    '["membership"]',
    '["office"]',
    1
  ),
  (
    'retail_percentage_rent',
    'Retail — Percentage Rent',
    'Percentage rent retail (anchor or inline). Models natural breakpoints, overage rent triggers, and blended effective rent.',
    '["percentage_rent"]',
    '["retail"]',
    1
  ),
  (
    'for_sale_residential',
    'For-Sale Residential',
    'Condo or townhome for-sale project. Models unit absorption, sales pricing, sales pace, cost of sales, and residual land value.',
    '["unit_sale"]',
    '["multifamily"]',
    1
  ),
  (
    'industrial_logistics',
    'Industrial / Logistics',
    'Warehouse, distribution, or last-mile logistics. Models clear height premiums, dock-door inventory, NNN rent escalations, and retenanting timelines.',
    '["fixed_rent"]',
    '["industrial"]',
    1
  ),
  (
    'self_storage_operating',
    'Self-Storage — Operating',
    'Self-storage facility. Models unit mix by type and size, street rates, discount/concession programs, occupancy ramp, and management fee.',
    '["fixed_rent"]',
    '["self_storage"]',
    1
  ),
  (
    'ground_lease_lessor',
    'Ground Lease — Lessor',
    'Ground lease from the landowner perspective. Models ground rent, rent reset schedule, reversion value, and leasehold depreciation.',
    '["fixed_rent"]',
    '["office","retail","multifamily","industrial","hotel"]',
    1
  ),
  (
    'debt_service_waterfall',
    'Debt Service & Waterfall',
    'Capital stack module applicable to any asset. Models senior debt (IO/amortizing), mezz, preferred equity, and GP/LP waterfall with promote hurdles.',
    '["fixed_rent","percentage_rent","nightly_rate","membership","unit_sale"]',
    '["office","retail","multifamily","industrial","hotel","land","self_storage","other"]',
    1
  );


-- =============================================================
-- TABLE: deal_model_compositions
-- Records the AI's module selection decision at Gate 2.
-- A deal can have multiple compositions over time (retries,
-- analyst overrides, scenario reruns).
--
-- modules_selected (jsonb): array of objects:
--   [{ "module_key": "nnn_stabilized", "version": 1,
--      "rationale": "Single-tenant NNN with 7yr remaining term" }]
-- composition_status:
--   draft     — AI assembled; awaiting Gate 2 confirmation
--   confirmed — analyst confirmed at Gate 2
--   superseded — a newer composition exists for this deal
-- =============================================================

CREATE TABLE public.deal_model_compositions (
  id                  uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id             uuid        NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  analysis_job_id     uuid        NOT NULL REFERENCES public.analysis_jobs(id),
  modules_selected    jsonb       NOT NULL DEFAULT '[]',
  composition_status  text        NOT NULL DEFAULT 'draft'
                        CHECK (composition_status IN ('draft','confirmed','superseded')),
  confirmed_by        uuid        REFERENCES auth.users(id),
  confirmed_at        timestamptz,
  override_notes      text,
  created_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT confirmed_fields_consistent CHECK (
    (composition_status = 'confirmed' AND confirmed_by IS NOT NULL AND confirmed_at IS NOT NULL)
    OR (composition_status != 'confirmed')
  )
);

ALTER TABLE public.deal_model_compositions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can access deal compositions"
  ON public.deal_model_compositions
  FOR ALL
  TO authenticated
  USING (
    deal_id IN (
      SELECT id FROM public.deals
      WHERE org_id = ANY(public.user_org_ids())
    )
  );

CREATE INDEX idx_deal_model_compositions_deal_id
  ON public.deal_model_compositions (deal_id);

CREATE INDEX idx_deal_model_compositions_status
  ON public.deal_model_compositions (deal_id, composition_status);


-- =============================================================
-- TABLE: model_results
-- The computed output from the calculation engine. One row per
-- authoritative calculation run.
--
-- result_data (jsonb): full structured output — complete cash
--   flow schedule (monthly or annual, any hold period from 2 to
--   50 years), terminal value, and all module-specific outputs.
--   Shape is owned by the calculation engine and varies by
--   module combination. Canonical period structure:
--     { period_type, hold_years, periods: [...], terminal: {...},
--       levered_returns: {...}, unlevered_returns: {...} }
--
-- result_summary (jsonb): normalized subset of universal key
--   metrics always present for efficient querying and deal
--   comparison without unpacking result_data. Fields:
--     { noi, egr, cap_rate, irr, equity_multiple, dscr, ltv,
--       hold_years, exit_cap_rate }
--   All fields nullable — present only when calculable for the
--   given module combination.
--
-- scenario_label: null for base case; named for alternatives
--   ("Bear Case", "Bull Case", "Downside — 15% Rent Decline")
--
-- is_base_case: exactly one result per composition should be
--   true; enforced at application layer (not DB constraint, as
--   the base case may shift when scenarios are added).
--
-- org_id: denormalized from deals for RLS efficiency (same
--   pattern as extracted_inputs in MMC-16).
-- =============================================================

CREATE TABLE public.model_results (
  id                          uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id                     uuid        NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  org_id                      uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  composition_id              uuid        NOT NULL REFERENCES public.deal_model_compositions(id),
  analysis_job_id             uuid        NOT NULL REFERENCES public.analysis_jobs(id),
  analysis_depth              text        NOT NULL
                                CHECK (analysis_depth IN ('boe','first_run','ic_grade','strategic_mix')),
  result_data                 jsonb       NOT NULL,
  result_summary              jsonb,
  scenario_label              text,
  is_base_case                boolean     NOT NULL DEFAULT false,
  calculation_engine_version  text        NOT NULL,
  credits_consumed            numeric(10,4) NOT NULL DEFAULT 0
                                CHECK (credits_consumed >= 0),
  created_at                  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.model_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can access model results"
  ON public.model_results
  FOR ALL
  TO authenticated
  USING (org_id = ANY(public.user_org_ids()));

CREATE INDEX idx_model_results_deal_id
  ON public.model_results (deal_id);

CREATE INDEX idx_model_results_composition_id
  ON public.model_results (composition_id);

CREATE INDEX idx_model_results_base_case
  ON public.model_results (deal_id, is_base_case)
  WHERE is_base_case = true;

-- Index on result_summary for deal list sorting/filtering by key metrics
CREATE INDEX idx_model_results_summary
  ON public.model_results USING GIN (result_summary);


-- =============================================================
-- TABLE: scenario_sets
-- Groups multiple model_results rows into a named scenario
-- analysis. Lightweight grouping record — results stay in
-- model_results, this ties them together for display and export.
-- =============================================================

CREATE TABLE public.scenario_sets (
  id              uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id         uuid        NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  composition_id  uuid        NOT NULL REFERENCES public.deal_model_compositions(id),
  name            text        NOT NULL,
  analysis_depth  text        NOT NULL
                    CHECK (analysis_depth IN ('boe','first_run','ic_grade','strategic_mix')),
  base_result_id  uuid        NOT NULL REFERENCES public.model_results(id),
  created_by      uuid        NOT NULL REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scenario_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can access scenario sets"
  ON public.scenario_sets
  FOR ALL
  TO authenticated
  USING (
    deal_id IN (
      SELECT id FROM public.deals
      WHERE org_id = ANY(public.user_org_ids())
    )
  );

CREATE INDEX idx_scenario_sets_deal_id
  ON public.scenario_sets (deal_id);

CREATE INDEX idx_scenario_sets_composition_id
  ON public.scenario_sets (composition_id);
