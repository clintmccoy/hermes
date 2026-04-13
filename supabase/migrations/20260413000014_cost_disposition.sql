-- =============================================================
-- Migration: 20260413000014_cost_disposition
-- Ticket: MMC-30 — Carry costs, CapEx, liquidation/disposition
--
-- Tables:
--   carry_costs            — deal-level carry cost (computed + override split)
--   capex_spend_lines      — individual capex items with spend schedule
--   liquidation_tranches   — disposition structure for phased/partial exits
--   sale_products          — individual sellable units (condos, pads, lots)
--   absorption_schedules   — for-sale product sales pace assumptions
--
-- Design notes:
--   - carry_cost_calculated/override split per ADR 011 §1
--   - capex_category is free-text NOT NULL (no enum — categories will
--     evolve with property types; schema does not restrict)
--   - spend_schedule is jsonb [{period_date, amount}] — same pattern
--     as value_schedule_entries; monthly/quarterly disbursement curve
--   - sale_products.space_id NOT NULL per ADR 011 §2 — spaces must
--     exist before disposition modeling
--   - liquidation_tranche_id on sale_products is nullable — not all
--     deals have structured phased exits
--   - absorption_schedules support for-sale product sales pace modeling
--     (condo sellout, lot absorption, etc.)
--
-- Rollback: supabase/migrations/rollback/20260413000014_rollback.sql
-- =============================================================


-- =============================================================
-- CARRY COSTS
-- One row per deal. Computed/override split per ADR 011 §1.
-- carry_cost_calculated: engine output — jsonb breakdown by category
--   e.g. {"property_tax": 120000, "insurance": 45000,
--          "debt_service": 890000, "utilities": 12000}
-- carry_cost_override: if set, total replaces the computed sum
-- =============================================================

CREATE TABLE public.carry_costs (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                      uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_id                     uuid        NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,

  -- Computed value (engine output, refreshed on each model run)
  carry_cost_calculated       jsonb,      -- category breakdown; null until first model run

  -- Override path (ADR 011 §1)
  carry_cost_override         numeric(14,2),  -- total dollar amount; null = use computed
  carry_cost_override_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  carry_cost_override_at      timestamptz,
  carry_cost_override_note    text,

  -- Timestamps
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),

  UNIQUE (deal_id),

  -- Override audit fields must be set together
  CONSTRAINT chk_carry_override_audit
    CHECK (
      (carry_cost_override IS NULL AND carry_cost_override_by IS NULL AND carry_cost_override_at IS NULL)
      OR
      (carry_cost_override IS NOT NULL AND carry_cost_override_by IS NOT NULL AND carry_cost_override_at IS NOT NULL)
    )
);

ALTER TABLE public.carry_costs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_carry_costs_deal_id ON public.carry_costs(deal_id);

CREATE POLICY "carry_costs_select" ON public.carry_costs FOR SELECT
  USING (org_id = ANY(public.user_org_ids()));
CREATE POLICY "carry_costs_insert" ON public.carry_costs FOR INSERT
  WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "carry_costs_update" ON public.carry_costs FOR UPDATE
  USING (org_id = ANY(public.user_org_ids()))
  WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "carry_costs_delete" ON public.carry_costs FOR DELETE
  USING (org_id = ANY(public.user_org_ids()));


-- =============================================================
-- CAPEX SPEND LINES
-- One row per capex item. capex_category is free-text NOT NULL.
-- UI populates a suggested dropdown; schema does not restrict.
-- spend_schedule: jsonb array [{period_date: "YYYY-MM-DD", amount: 0}]
-- actual_costs_to_date: nullable — used for in-progress deals
--   where actual spend is tracked against the budget.
-- =============================================================

CREATE TABLE public.capex_spend_lines (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_id                 uuid        NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,

  -- What kind of capex
  capex_category          text        NOT NULL,  -- free-text; e.g. 'renovation', 'tenant_buildout',
                                                 -- 'ffe', 'infrastructure', 'deferred_maintenance'
  description             text,                  -- optional line-item narrative

  -- Amounts
  budget_amount           numeric(14,2) NOT NULL CHECK (budget_amount >= 0),
  actual_costs_to_date    numeric(14,2),          -- null = not yet tracking actuals
                          CHECK (actual_costs_to_date IS NULL OR actual_costs_to_date >= 0),

  -- Disbursement curve
  spend_schedule          jsonb,                 -- [{period_date, amount}]; null = lump sum at deal start

  -- Ordering within a deal
  sort_order              int         NOT NULL DEFAULT 0,

  -- Timestamps
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.capex_spend_lines ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_capex_spend_lines_deal_id
  ON public.capex_spend_lines(deal_id, sort_order);

CREATE POLICY "capex_spend_lines_select" ON public.capex_spend_lines FOR SELECT
  USING (org_id = ANY(public.user_org_ids()));
CREATE POLICY "capex_spend_lines_insert" ON public.capex_spend_lines FOR INSERT
  WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "capex_spend_lines_update" ON public.capex_spend_lines FOR UPDATE
  USING (org_id = ANY(public.user_org_ids()))
  WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "capex_spend_lines_delete" ON public.capex_spend_lines FOR DELETE
  USING (org_id = ANY(public.user_org_ids()));


-- =============================================================
-- LIQUIDATION TRANCHES
-- Disposition structure for phased/partial exits.
-- Most deals have one tranche (the exit sale). Complex deals
-- (condo maps, portfolio sells, phased land dispositions) may
-- have multiple ordered tranches.
-- disposition_cost_pct: broker commission + transfer tax + legal
--   as a percentage of gross_proceeds.
-- =============================================================

CREATE TABLE public.liquidation_tranches (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_id                 uuid        NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,

  tranche_name            text        NOT NULL,
  tranche_order           int         NOT NULL DEFAULT 1,

  target_sale_date        date,
  gross_proceeds          numeric(14,2) CHECK (gross_proceeds >= 0),
  disposition_cost_pct    numeric(6,4) NOT NULL DEFAULT 0.0300  -- 3% default
                          CHECK (disposition_cost_pct >= 0 AND disposition_cost_pct <= 1),

  notes                   text,

  -- Timestamps
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),

  UNIQUE (deal_id, tranche_order)
);

ALTER TABLE public.liquidation_tranches ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_liquidation_tranches_deal_id
  ON public.liquidation_tranches(deal_id, tranche_order);

CREATE POLICY "liquidation_tranches_select" ON public.liquidation_tranches FOR SELECT
  USING (org_id = ANY(public.user_org_ids()));
CREATE POLICY "liquidation_tranches_insert" ON public.liquidation_tranches FOR INSERT
  WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "liquidation_tranches_update" ON public.liquidation_tranches FOR UPDATE
  USING (org_id = ANY(public.user_org_ids()))
  WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "liquidation_tranches_delete" ON public.liquidation_tranches FOR DELETE
  USING (org_id = ANY(public.user_org_ids()));


-- =============================================================
-- BUYER TYPE ENUM
-- =============================================================

CREATE TYPE public.buyer_type_enum AS ENUM (
  'investor',
  'owner_occupant',
  'developer',
  'other'
);


-- =============================================================
-- SALE PRODUCTS
-- Individual sellable units: condos, pads, lots, individual
-- buildings in a portfolio disposition.
-- space_id NOT NULL per ADR 011 §2 — the space must exist in
-- spaces_master before a sale_product can reference it.
-- liquidation_tranche_id nullable — not all deals have structured
-- phased exits; a simple single-asset sale has no tranche.
-- =============================================================

CREATE TABLE public.sale_products (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                      uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_id                     uuid        NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,

  -- Load-bearing FK per ADR 011 §2
  space_id                    uuid        NOT NULL REFERENCES public.spaces_master(id) ON DELETE RESTRICT,

  -- Optional tranche linkage
  liquidation_tranche_id      uuid        REFERENCES public.liquidation_tranches(id) ON DELETE SET NULL,

  -- Product description
  product_name                text        NOT NULL,  -- e.g. "Unit 4B", "Pad Site 2", "Building C"
  buyer_type                  public.buyer_type_enum,

  -- Pricing
  list_price                  numeric(14,2) CHECK (list_price >= 0),
  sale_price                  numeric(14,2) CHECK (sale_price >= 0),  -- null until modeled/closed
  sale_date                   date,

  notes                       text,

  -- Timestamps
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sale_products ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_sale_products_deal_id    ON public.sale_products(deal_id);
CREATE INDEX idx_sale_products_space_id   ON public.sale_products(space_id);
CREATE INDEX idx_sale_products_tranche_id ON public.sale_products(liquidation_tranche_id)
  WHERE liquidation_tranche_id IS NOT NULL;

CREATE POLICY "sale_products_select" ON public.sale_products FOR SELECT
  USING (org_id = ANY(public.user_org_ids()));
CREATE POLICY "sale_products_insert" ON public.sale_products FOR INSERT
  WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "sale_products_update" ON public.sale_products FOR UPDATE
  USING (org_id = ANY(public.user_org_ids()))
  WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "sale_products_delete" ON public.sale_products FOR DELETE
  USING (org_id = ANY(public.user_org_ids()));


-- =============================================================
-- ABSORPTION SCHEDULES
-- For-sale product sales pace assumptions. Used for condo sellout,
-- lot absorption, phased disposition modeling.
-- One row per (sale_product, period_date) — the projected number
-- of units sold and price per unit in that period.
-- =============================================================

CREATE TABLE public.absorption_schedules (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                      uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sale_product_id             uuid        NOT NULL REFERENCES public.sale_products(id) ON DELETE CASCADE,

  period_date                 date        NOT NULL,
  units_sold_assumption       int         NOT NULL DEFAULT 0 CHECK (units_sold_assumption >= 0),
  price_per_unit_assumption   numeric(14,2) NOT NULL CHECK (price_per_unit_assumption >= 0),

  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),

  UNIQUE (sale_product_id, period_date)
);

ALTER TABLE public.absorption_schedules ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_absorption_schedules_sale_product_id
  ON public.absorption_schedules(sale_product_id, period_date);

CREATE POLICY "absorption_schedules_select" ON public.absorption_schedules FOR SELECT
  USING (org_id = ANY(public.user_org_ids()));
CREATE POLICY "absorption_schedules_insert" ON public.absorption_schedules FOR INSERT
  WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "absorption_schedules_update" ON public.absorption_schedules FOR UPDATE
  USING (org_id = ANY(public.user_org_ids()))
  WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "absorption_schedules_delete" ON public.absorption_schedules FOR DELETE
  USING (org_id = ANY(public.user_org_ids()));
