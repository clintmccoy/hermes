-- =============================================================
-- Migration: 20260413000002_deals_revenue_model
-- Ticket: MMC-14 — Deals, assets, and operating model taxonomy
--
-- Creates the core deal entity and the revenue mix table.
-- Revenue mechanisms are stored abstractly (fixed_rent, nightly_rate,
-- etc.) rather than as named operating models, enabling flexible
-- composition for complex and mixed-use assets.
--
-- Rollback: supabase/migrations/rollback/20260413000002_rollback.sql
-- =============================================================


-- =============================================================
-- TABLE: deals
-- The primary entity in Hermes. Every document, analysis job,
-- extracted input, and financial model belongs to a deal.
--
-- asset_class: the physical use of the property.
--   office | retail | multifamily | industrial | hotel |
--   land | self_storage | other
--   Note: no 'mixed_use' value — per ADR 011 §5, mixed-use is a
--   derived descriptor captured by the space registry and the
--   deal_revenue_allocations breakdown, not an asset class.
--
-- primary_revenue_mechanism: the dominant way this asset makes
-- money. Used for deal list display and filtering. The full
-- revenue breakdown (including blended/mixed assets) lives in
-- deal_revenue_allocations.
--
--   fixed_rent      — fixed periodic payment per unit or per SF.
--                     Covers any lease structure: NNN, gross,
--                     modified gross, residential rent.
--   percentage_rent — share of tenant or operator gross revenue.
--                     Retail % of sales, flex coworking revenue
--                     share, F&B overage above breakpoint.
--   nightly_rate    — per-night or per-stay dynamic pricing.
--                     Hotel, STR, apart-hotel.
--   membership      — access-based recurring fee, no lease.
--                     Coworking desks, self-storage units,
--                     marina slips, parking.
--   unit_sale       — one-time proceeds from unit disposition.
--                     Condo sellout, lot sales, for-sale
--                     townhomes, absorption models.
--
--   New mechanisms can be added in future migrations as new
--   asset structures require them.
--
-- operator_managed: true when a third-party operator runs the
-- asset under a management agreement (e.g. hotel managed by
-- Marriott, flex space via Industrious). Orthogonal to revenue
-- mechanism — any mechanism can be operator-managed. When true,
-- underwriting models the owner's NET cash flow after operator
-- fees and expenses, rather than gross revenue.
--
-- ownership_structure: legal form of ownership per ADR 011 §5.
--   fee_simple | condo_regime | ground_lease | tic
--   Orthogonal to asset_class and revenue mechanism.
--
-- status lifecycle:
--   drafting    — created, no analysis yet
--   screening   — BOE screen run or in progress
--   in_analysis — first-run or IC-grade underwriting active
--   ic_review   — submitted to investment committee
--   acquired    — closed-won: deal executed, we bought it
--   lost        — closed-lost: lost to competing bidder or fell through
--   passed      — proactive decision not to bid
--   archived    — soft-deleted / inactive
--
-- rsf: rentable square feet. Stored at deal level because it is
-- typically known at BOE screening before detailed space data
-- exists. More granular space data lives in the space registry
-- (future tickets).
-- =============================================================

CREATE TABLE public.deals (
  id                        uuid         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                    uuid         NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name                      text         NOT NULL,

  -- Classification
  asset_class               text         NOT NULL
                              CHECK (asset_class IN (
                                'office', 'retail', 'multifamily', 'industrial',
                                'hotel', 'land', 'self_storage', 'other'
                              )),
  primary_revenue_mechanism text         NOT NULL
                              CHECK (primary_revenue_mechanism IN (
                                'fixed_rent', 'percentage_rent', 'nightly_rate',
                                'membership', 'unit_sale'
                              )),
  operator_managed          boolean      NOT NULL DEFAULT false,
  ownership_structure       text
                              CHECK (ownership_structure IS NULL OR ownership_structure IN (
                                'fee_simple', 'condo_regime', 'ground_lease', 'tic'
                              )),

  -- Lifecycle
  status                    text         NOT NULL DEFAULT 'drafting'
                              CHECK (status IN (
                                'drafting', 'screening', 'in_analysis', 'ic_review',
                                'acquired', 'lost', 'passed', 'archived'
                              )),

  -- Geography
  street_address            text,
  city                      text,
  state_province            text,
  postal_code               text,
  country                   text         NOT NULL DEFAULT 'US',
  market                    text,        -- analyst-defined label, e.g. "Manhattan Midtown"
  latitude                  numeric(9,6),
  longitude                 numeric(9,6),

  -- Quick metrics (known at BOE screening stage)
  rsf                       numeric,     -- rentable square feet

  -- Audit
  created_by                uuid         NOT NULL REFERENCES auth.users(id),
  created_at                timestamptz  NOT NULL DEFAULT now(),
  updated_at                timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;


-- =============================================================
-- TABLE: deal_revenue_allocations
-- Revenue mechanism breakdown for a deal. Enables strategic mix
-- analysis: what percentage of this asset's revenue comes from
-- each mechanism?
--
-- Multiple rows of the same revenue_mechanism are allowed —
-- use the label field to distinguish them. Example:
--
--   Master planned community (sums to 100%):
--   | mechanism        | pct | label                        |
--   |------------------|-----|------------------------------|
--   | fixed_rent       | 45% | "Apartment units"            |
--   | fixed_rent       | 15% | "Ground floor retail (base)" |
--   | percentage_rent  |  5% | "Ground floor retail (overage)" |
--   | unit_sale        | 35% | "For-sale townhomes"         |
--
-- allocation_pct values should sum to 100 per deal.
-- Application layer validates the sum — deals in drafting state
-- are permitted to have incomplete allocations.
--
-- display_order controls consistent ordering in the UI without
-- relying on insert order.
-- =============================================================

CREATE TABLE public.deal_revenue_allocations (
  id                uuid         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id           uuid         NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  revenue_mechanism text         NOT NULL
                      CHECK (revenue_mechanism IN (
                        'fixed_rent', 'percentage_rent', 'nightly_rate',
                        'membership', 'unit_sale'
                      )),
  allocation_pct    numeric(5,2) NOT NULL
                      CHECK (allocation_pct > 0 AND allocation_pct <= 100),
  label             text,        -- distinguishes multiple rows of same mechanism
  notes             text,
  display_order     smallint     NOT NULL DEFAULT 0,
  created_at        timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.deal_revenue_allocations ENABLE ROW LEVEL SECURITY;


-- =============================================================
-- INDEXES
-- =============================================================

-- Core: every deal list query is org-scoped
CREATE INDEX idx_deals_org_id
  ON public.deals(org_id);

-- Deal list filtered by status (pipeline view)
CREATE INDEX idx_deals_org_status
  ON public.deals(org_id, status);

-- Deal list filtered by asset class
CREATE INDEX idx_deals_org_asset_class
  ON public.deals(org_id, asset_class);

-- Revenue allocation lookups for a deal
CREATE INDEX idx_deal_revenue_allocations_deal_id
  ON public.deal_revenue_allocations(deal_id);


-- =============================================================
-- RLS POLICIES: deals
-- Org-scoped using public.user_org_ids() from MMC-13 migration.
-- =============================================================

CREATE POLICY "deals_select"
  ON public.deals FOR SELECT
  TO authenticated
  USING (org_id = ANY(public.user_org_ids()));

CREATE POLICY "deals_insert"
  ON public.deals FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id = ANY(public.user_org_ids())
    AND created_by = auth.uid()
  );

CREATE POLICY "deals_update"
  ON public.deals FOR UPDATE
  TO authenticated
  USING (org_id = ANY(public.user_org_ids()))
  WITH CHECK (org_id = ANY(public.user_org_ids()));

CREATE POLICY "deals_delete"
  ON public.deals FOR DELETE
  TO authenticated
  USING (org_id = ANY(public.user_org_ids()));


-- =============================================================
-- RLS POLICIES: deal_revenue_allocations
-- Inherits org scope via a subquery to deals.
-- =============================================================

CREATE POLICY "deal_revenue_allocations_select"
  ON public.deal_revenue_allocations FOR SELECT
  TO authenticated
  USING (
    deal_id IN (
      SELECT id FROM public.deals WHERE org_id = ANY(public.user_org_ids())
    )
  );

CREATE POLICY "deal_revenue_allocations_insert"
  ON public.deal_revenue_allocations FOR INSERT
  TO authenticated
  WITH CHECK (
    deal_id IN (
      SELECT id FROM public.deals WHERE org_id = ANY(public.user_org_ids())
    )
  );

CREATE POLICY "deal_revenue_allocations_update"
  ON public.deal_revenue_allocations FOR UPDATE
  TO authenticated
  USING (
    deal_id IN (
      SELECT id FROM public.deals WHERE org_id = ANY(public.user_org_ids())
    )
  );

CREATE POLICY "deal_revenue_allocations_delete"
  ON public.deal_revenue_allocations FOR DELETE
  TO authenticated
  USING (
    deal_id IN (
      SELECT id FROM public.deals WHERE org_id = ANY(public.user_org_ids())
    )
  );


-- =============================================================
-- TRIGGER: updated_at on deals
-- Reuses set_updated_at() from the MMC-13 migration.
-- =============================================================

CREATE TRIGGER set_deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
