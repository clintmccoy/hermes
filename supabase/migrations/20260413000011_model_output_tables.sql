-- =============================================================
-- Migration: 20260413000011_model_output_tables
-- Ticket: MMC-28 — Model output tables (KPIs, monthly/annual cash flows)
--
-- Stores the calculation engine's output. Three tables:
--   model_run_kpis              — scalar summary metrics per model run
--   model_run_monthly_cashflows — month-by-month cash flow series
--                                 (canonical; per ADR 013 §4)
--   model_run_annual_cashflows  — annual roll-ups for reporting/export
--
-- All output rows are keyed to a model_results row (MMC-17), which
-- carries the composition metadata (which modules were active,
-- which scenario, calculation engine version, etc.).
--
-- model_run_kpis is the "summary_result" complement to the full
-- cash flow series — it stores the scalar outputs (IRR, EM, DSCR,
-- etc.) that appear in deal cards, scenario comparison, and IC packs.
-- These are denormalized from the cash flow series for fast lookup;
-- they are always re-derivable from the monthly series.
--
-- Rollback: supabase/migrations/rollback/20260413000011_rollback.sql
-- =============================================================


-- =============================================================
-- TABLE: model_run_kpis
--
-- Scalar summary metrics for a model run. One row per model_result.
-- All values are computed by the engine and stored for fast retrieval.
-- They are always re-derivable from model_run_monthly_cashflows.
--
-- Returns metrics:
--   unlevered_irr_pct        — IRR on unlevered cash flows (before debt)
--   levered_irr_pct          — IRR on levered equity cash flows (after debt)
--   equity_multiple          — total equity distributions / total equity invested
--   cash_on_cash_yr1_pct     — Year 1 levered cash flow / equity invested
--   avg_cash_on_cash_pct     — average annual levered cash-on-cash over hold period
--   profit_unlevered         — total unlevered profit ($)
--   profit_levered           — total levered equity profit ($)
--
-- Yield metrics:
--   going_in_cap_rate_pct    — Year 1 stabilized NOI / acquisition price
--   stabilized_cap_rate_pct  — stabilized NOI (at full occupancy) / acquisition price
--   exit_cap_rate_pct        — terminal sale price derived cap rate
--   yoc_pct                  — yield on cost (stabilized NOI / total cost basis)
--
-- Debt metrics:
--   dscr_year1               — Year 1 NOI / Year 1 debt service
--   dscr_min                 — minimum DSCR across the hold period
--   ltv_at_acquisition_pct   — loan amount / acquisition price
--   ltv_at_stabilization_pct — loan amount / stabilized value
--   ltc_pct                  — loan amount / total cost (for construction/value-add)
--   debt_yield_pct           — NOI / loan balance (lender's primary sizing metric)
--
-- NOI / income:
--   noi_year1                — Year 1 net operating income
--   noi_stabilized           — stabilized NOI (model's projected peak NOI)
--   egi_year1                — Year 1 effective gross income
--   gross_revenue_year1      — Year 1 potential gross income (before vacancy)
--
-- Sale proceeds:
--   gross_sale_price         — projected terminal sale price
--   net_sale_proceeds        — after disposition costs and debt payoff
-- =============================================================

CREATE TABLE public.model_run_kpis (
  id                          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                      uuid         NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_id                     uuid         NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  model_result_id             uuid         NOT NULL REFERENCES public.model_results(id) ON DELETE CASCADE,

  -- Returns
  unlevered_irr_pct           numeric,
  levered_irr_pct             numeric,
  equity_multiple             numeric,
  cash_on_cash_yr1_pct        numeric,
  avg_cash_on_cash_pct        numeric,
  profit_unlevered            numeric,
  profit_levered              numeric,

  -- Yield
  going_in_cap_rate_pct       numeric,
  stabilized_cap_rate_pct     numeric,
  exit_cap_rate_pct           numeric,
  yoc_pct                     numeric,     -- yield on cost

  -- Debt
  dscr_year1                  numeric,
  dscr_min                    numeric,
  ltv_at_acquisition_pct      numeric,
  ltv_at_stabilization_pct    numeric,
  ltc_pct                     numeric,
  debt_yield_pct              numeric,

  -- Income
  noi_year1                   numeric,
  noi_stabilized              numeric,
  egi_year1                   numeric,
  gross_revenue_year1         numeric,

  -- Sale
  gross_sale_price            numeric,
  net_sale_proceeds           numeric,

  -- One KPI row per model result
  CONSTRAINT uq_model_run_kpis_result UNIQUE (model_result_id),

  -- Audit
  created_at                  timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.model_run_kpis ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_model_run_kpis_deal_id        ON public.model_run_kpis(deal_id);
CREATE INDEX idx_model_run_kpis_result_id      ON public.model_run_kpis(model_result_id);
CREATE INDEX idx_model_run_kpis_org_id         ON public.model_run_kpis(org_id);


-- =============================================================
-- TABLE: model_run_monthly_cashflows
--
-- Month-by-month cash flow series. The canonical output of the
-- calculation engine per ADR 013 §4. Annual figures are derived
-- from this table — never the other way around.
--
-- period_month: 1-based index (Month 1 = first month of hold,
--   Month 60 = last month of a 5-year hold).
-- period_date: calendar date of the first day of this period.
--
-- Income stack (top-down):
--   potential_gross_income     — PGI: 100% occupancy at in-place/market rents
--   vacancy_loss               — economic vacancy deduction (negative)
--   credit_loss                — bad debt deduction (negative)
--   other_income               — parking, storage, ancillary income
--   effective_gross_income     — EGI = PGI − vacancy − credit + other
--
-- Expense stack:
--   operating_expenses         — total OpEx (all categories combined)
--   mgmt_fee                   — property management fee
--   noi                        — NOI = EGI − OpEx − mgmt_fee
--
-- Below-NOI (capital costs):
--   ti_costs                   — tenant improvement costs paid this month
--   leasing_commissions        — LC paid this month
--   capex_reserve              — capital reserve contribution
--   total_capital_costs        — sum of above three
--
--   unlevered_cash_flow        — NOI − total_capital_costs
--
-- Debt service:
--   debt_service_interest      — interest paid this month
--   debt_service_principal     — principal paid this month
--   total_debt_service         — interest + principal
--
--   levered_cash_flow          — unlevered_cash_flow − total_debt_service
--
-- Reversion (terminal month only):
--   gross_sale_price           — terminal sale proceeds (Month = hold_period_months)
--   disposition_costs          — broker + legal + transfer costs
--   debt_payoff                — outstanding loan balance paid at sale
--   net_reversion              — gross_sale − disposition − debt_payoff
-- =============================================================

CREATE TABLE public.model_run_monthly_cashflows (
  id                        uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                    uuid         NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_id                   uuid         NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  model_result_id           uuid         NOT NULL REFERENCES public.model_results(id) ON DELETE CASCADE,

  -- Period
  period_month              int          NOT NULL CHECK (period_month > 0),
  period_date               date         NOT NULL,

  -- Income
  potential_gross_income    numeric,
  vacancy_loss              numeric,     -- stored as negative value
  credit_loss               numeric,     -- stored as negative value
  other_income              numeric,
  effective_gross_income    numeric,

  -- Expenses
  operating_expenses        numeric,     -- stored as negative value
  mgmt_fee                  numeric,     -- stored as negative value
  noi                       numeric,

  -- Capital costs (below NOI)
  ti_costs                  numeric,     -- stored as negative value
  leasing_commissions       numeric,     -- stored as negative value
  capex_reserve             numeric,     -- stored as negative value
  total_capital_costs       numeric,     -- stored as negative value

  -- Unlevered
  unlevered_cash_flow       numeric,

  -- Debt service
  debt_service_interest     numeric,     -- stored as negative value
  debt_service_principal    numeric,     -- stored as negative value
  total_debt_service        numeric,     -- stored as negative value

  -- Levered
  levered_cash_flow         numeric,

  -- Reversion (non-null in terminal period only)
  gross_sale_price          numeric,
  disposition_costs         numeric,     -- stored as negative value
  debt_payoff               numeric,     -- stored as negative value
  net_reversion             numeric,

  CONSTRAINT uq_monthly_cashflow_period UNIQUE (model_result_id, period_month),

  created_at                timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.model_run_monthly_cashflows ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_monthly_cf_result_id   ON public.model_run_monthly_cashflows(model_result_id);
CREATE INDEX idx_monthly_cf_deal_id     ON public.model_run_monthly_cashflows(deal_id);
CREATE INDEX idx_monthly_cf_period      ON public.model_run_monthly_cashflows(model_result_id, period_month);


-- =============================================================
-- TABLE: model_run_annual_cashflows
--
-- Annual roll-ups of the monthly series. Computed by the engine
-- as a GROUP BY year over model_run_monthly_cashflows.
-- Stored for fast reporting, Excel export, and IC pack generation.
--
-- hold_year: 1-based (Year 1 = Months 1–12, Year 5 = Months 49–60).
-- year_start_date / year_end_date: calendar boundaries of this year.
--
-- All line items are annual sums of the corresponding monthly columns,
-- except noi and egi which are annual totals (sum of monthly).
-- =============================================================

CREATE TABLE public.model_run_annual_cashflows (
  id                        uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                    uuid         NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_id                   uuid         NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  model_result_id           uuid         NOT NULL REFERENCES public.model_results(id) ON DELETE CASCADE,

  -- Period
  hold_year                 int          NOT NULL CHECK (hold_year > 0),
  year_start_date           date         NOT NULL,
  year_end_date             date         NOT NULL,

  -- Income (annual totals)
  potential_gross_income    numeric,
  vacancy_loss              numeric,
  credit_loss               numeric,
  other_income              numeric,
  effective_gross_income    numeric,

  -- Expenses (annual totals)
  operating_expenses        numeric,
  mgmt_fee                  numeric,
  noi                       numeric,

  -- Capital costs
  ti_costs                  numeric,
  leasing_commissions       numeric,
  capex_reserve             numeric,
  total_capital_costs       numeric,

  -- Returns
  unlevered_cash_flow       numeric,
  total_debt_service        numeric,
  levered_cash_flow         numeric,

  -- Per-year yield metrics (computed at annual level for quick display)
  cash_on_cash_pct          numeric,     -- levered_cash_flow / equity_invested
  dscr                      numeric,     -- noi / total_debt_service

  -- Reversion (non-null in terminal year only)
  gross_sale_price          numeric,
  net_reversion             numeric,

  CONSTRAINT uq_annual_cashflow_year UNIQUE (model_result_id, hold_year),

  created_at                timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.model_run_annual_cashflows ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_annual_cf_result_id    ON public.model_run_annual_cashflows(model_result_id);
CREATE INDEX idx_annual_cf_deal_id      ON public.model_run_annual_cashflows(deal_id);


-- =============================================================
-- TABLE: model_run_quarterly_cashflows
--
-- Quarterly roll-ups of the monthly series. Stored alongside annual
-- roll-ups because quarterly is the standard cadence for:
--   - Lender covenant testing (DSCR, debt yield tested quarterly)
--   - LP investor reporting (quarterly distribution statements)
--   - DSCR min tracking in model_run_kpis
--
-- hold_quarter: 1-based (Q1 = Months 1–3, Q2 = Months 4–6, etc.)
-- quarter_start_date / quarter_end_date: calendar boundaries.
--
-- dscr: quarterly NOI / quarterly debt service. The primary
-- covenant-testing metric — stored here so lender reporting
-- does not require re-aggregating from monthly data at runtime.
-- =============================================================

CREATE TABLE public.model_run_quarterly_cashflows (
  id                        uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                    uuid         NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_id                   uuid         NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  model_result_id           uuid         NOT NULL REFERENCES public.model_results(id) ON DELETE CASCADE,

  -- Period
  hold_quarter              int          NOT NULL CHECK (hold_quarter > 0),
  quarter_start_date        date         NOT NULL,
  quarter_end_date          date         NOT NULL,

  -- Income
  potential_gross_income    numeric,
  vacancy_loss              numeric,
  credit_loss               numeric,
  other_income              numeric,
  effective_gross_income    numeric,

  -- Expenses
  operating_expenses        numeric,
  mgmt_fee                  numeric,
  noi                       numeric,

  -- Capital costs
  ti_costs                  numeric,
  leasing_commissions       numeric,
  capex_reserve             numeric,
  total_capital_costs       numeric,

  -- Returns
  unlevered_cash_flow       numeric,
  total_debt_service        numeric,
  levered_cash_flow         numeric,

  -- Covenant metrics (primary reason quarterly exists)
  dscr                      numeric,     -- noi / total_debt_service for this quarter
  debt_yield_pct            numeric,     -- annualized NOI / outstanding loan balance

  CONSTRAINT uq_quarterly_cashflow_period UNIQUE (model_result_id, hold_quarter),

  created_at                timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.model_run_quarterly_cashflows ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_quarterly_cf_result_id  ON public.model_run_quarterly_cashflows(model_result_id);
CREATE INDEX idx_quarterly_cf_deal_id    ON public.model_run_quarterly_cashflows(deal_id);


-- =============================================================
-- RLS POLICIES
-- =============================================================

CREATE POLICY "model_run_kpis_select" ON public.model_run_kpis FOR SELECT USING (org_id = ANY(public.user_org_ids()));
CREATE POLICY "model_run_kpis_insert" ON public.model_run_kpis FOR INSERT WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "model_run_kpis_update" ON public.model_run_kpis FOR UPDATE USING (org_id = ANY(public.user_org_ids())) WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "model_run_kpis_delete" ON public.model_run_kpis FOR DELETE USING (org_id = ANY(public.user_org_ids()));

CREATE POLICY "monthly_cf_select" ON public.model_run_monthly_cashflows FOR SELECT USING (org_id = ANY(public.user_org_ids()));
CREATE POLICY "monthly_cf_insert" ON public.model_run_monthly_cashflows FOR INSERT WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "monthly_cf_update" ON public.model_run_monthly_cashflows FOR UPDATE USING (org_id = ANY(public.user_org_ids())) WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "monthly_cf_delete" ON public.model_run_monthly_cashflows FOR DELETE USING (org_id = ANY(public.user_org_ids()));

CREATE POLICY "annual_cf_select" ON public.model_run_annual_cashflows FOR SELECT USING (org_id = ANY(public.user_org_ids()));
CREATE POLICY "annual_cf_insert" ON public.model_run_annual_cashflows FOR INSERT WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "annual_cf_update" ON public.model_run_annual_cashflows FOR UPDATE USING (org_id = ANY(public.user_org_ids())) WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "annual_cf_delete" ON public.model_run_annual_cashflows FOR DELETE USING (org_id = ANY(public.user_org_ids()));

CREATE POLICY "quarterly_cf_select" ON public.model_run_quarterly_cashflows FOR SELECT USING (org_id = ANY(public.user_org_ids()));
CREATE POLICY "quarterly_cf_insert" ON public.model_run_quarterly_cashflows FOR INSERT WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "quarterly_cf_update" ON public.model_run_quarterly_cashflows FOR UPDATE USING (org_id = ANY(public.user_org_ids())) WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "quarterly_cf_delete" ON public.model_run_quarterly_cashflows FOR DELETE USING (org_id = ANY(public.user_org_ids()));
