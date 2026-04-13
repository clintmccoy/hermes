# ADR 013 — Calculation Engine Architecture: Dual-Track DCF with Typed Assumption Tables

**Date**: 2026-04-13
**Status**: Decided
**Deciders**: Clinton McCoy

---

## Context

During design of the MMC-26 value driver engine, a review of ARGUS Enterprise's
calculation mechanics, professional underwriting practice, and common error patterns
revealed that the original proposed design — a generic `value_drivers` table with
7 enum-gated driver types — was structurally insufficient to produce accurate CRE
financial models at IC grade.

The original design:
- Used a single `value_drivers` table with `driver_type` enum (7 values)
- Applied a flat "uninflated base value + escalation at calc time" pattern to all inputs
- Deferred the distinction between in-place lease modeling and re-leasing assumptions
  to the calculation layer

The review identified that ARGUS — and every professional CRE modeling tool —
uses a fundamentally different architecture: **dual-track DCF**. This ADR documents
the decision to adopt that architecture and the rationale for each structural choice.

---

## Decision

### 1. Dual-track DCF: rent roll + market leasing assumptions are separate

The calculation engine operates on two distinct tracks simultaneously:

**Track 1 — In-place rent roll** (the `leases` table and trait tables from MMC-25):
What tenants are contractually paying right now, with their specific escalation
schedules, recovery structures, free rent, TI allowances, and expiration dates.
The rent roll drives cash flows from today until each lease expires.

**Track 2 — Market Leasing Assumptions (MLAs)** (the new `market_leasing_assumptions`
table from MMC-26): What the engine assumes happens when each lease expires. For
every space type in the deal, MLAs define the re-leasing scenario: renewal probability,
downtime, market rent, new TI, and leasing commissions. The engine blends the renewal
and new-tenant scenarios using the renewal probability as a weighting factor
(ARGUS's standard blended MLA approach):

```
Blended Rent = (renewal_prob × renewal_rent) + ((1 − renewal_prob) × new_market_rent)
Blended Downtime = (renewal_prob × downtime_renewal) + ((1 − renewal_prob) × downtime_new)
```

The two tracks produce a continuous, realistic cash flow projection past Year 1 for
any multi-tenant property. Without Track 2, the engine cannot model lease roll, which
is the single most important driver of value change in stabilized and value-add deals.

### 2. Three typed assumption tables replace the generic driver enum

The original 7-type enum is replaced by three purpose-built tables:

**`market_leasing_assumptions`**: Track 2 inputs. One row per space type per deal.
Contains market rent, growth rate, renewal probability, downtime, new lease terms,
TI/LC for new and renewal scenarios.

**`operating_assumptions`**: NOI-layer inputs. One row per deal (base case).
Contains vacancy rate, credit loss, operating expense PSF and growth rate, management
fee, and below-NOI capital reserve. These are the inputs the Operations module
(per PRD §7) consumes to produce EGI and NOI.

**`investment_assumptions`**: Returns-layer inputs. One row per deal (base case).
Contains acquisition price, hold period, going-in cap rate, exit cap rate,
disposition costs, analysis start date, and — critically — the inflation convention
settings that govern how escalation rates are applied across the entire model.

**`value_schedule_entries`**: Custom curve override path. When an analyst wants to
input a year-by-year schedule for any assumption field (rather than a flat growth
rate), this table stores the time series. The engine checks here first; if no custom
curve exists for a given field and period, it falls back to the flat escalation logic.
This is not the primary storage path — it is the exception/override mechanism.

### 3. TI, LC, and CapEx are tracked below the NOI line

Tenant improvement allowances, leasing commissions, and capital reserves are NOT
deducted from NOI. They appear in cash flow below NOI, in the `model_run_monthly_cashflows`
output table. This is the industry-standard treatment. Conflating these with NOI-level
expenses is a known error that inflates apparent IRR by 15–20%.

Sources of TI and LC in the model:
- **In-place leases**: `leases.ti_allowance_psf` (paid at lease commencement)
- **Re-leasing events**: `market_leasing_assumptions.ti_psf_new/renewal` and `lc_pct_new/renewal`
- **Capital reserves**: `operating_assumptions.capex_reserve_psf` (recurring annual)

### 4. Monthly calculation is the canonical computation period

The calculation engine MUST produce month-by-month cash flows internally. Lease
expirations, free rent periods, TI payment timing, and debt service do not align
with calendar year boundaries. Any engine that calculates on an annual basis will
have systematic errors in IRR and NPV. Annual summaries in the output tables
(`model_run_annual_cashflows`) are roll-ups from the monthly series, not primary
calculations.

### 5. Inflation convention is explicitly configured per deal

ARGUS's single largest source of user error is inflation convention ambiguity.
This model codifies the convention as explicit fields on `investment_assumptions`:

**`inflation_convention`** (`year_1` | `year_2`):
- `year_1`: Market rent escalations apply starting in Period 1 of the model.
- `year_2`: Escalations do not apply until Period 13 (Month 2, Year 2). This is
  the ARGUS default and the industry standard for most stabilized deal modeling.

**`escalation_rate_type`** (`effective_annual` | `nominal_monthly`):
- `effective_annual`: Growth rates are stated as annual effective rates, applied
  once per 12-month period. Most commonly used.
- `nominal_monthly`: Growth rates are monthly compounding rates. Used when
  the source assumption is expressed monthly.

These settings cascade to every escalation applied in the model: market rent,
operating expenses, and MLA growth rates all honor the deal-level convention.
Never infer the convention — always read it from `investment_assumptions`.

### 6. Exit cap rate and going-in cap rate are distinct fields

`going_in_cap_rate_pct` is the implied yield at acquisition (Year 1 stabilized NOI /
acquisition price). It is an input to the investment thesis, not to the cash flow calculation.

`exit_cap_rate_pct` (or `exit_cap_spread_bps` as an alternative) is used to calculate
terminal value: `sale_price = forward_stabilized_NOI / exit_cap_rate`. Terminal value
must use *forward* stabilized NOI at the projected sale date — not Year 1 NOI. The
exit cap is typically set 25–75 bps above the going-in cap to reflect property aging
and market risk over the hold period.

Both fields are required for any returns calculation. Using one as a proxy for the
other is a material modeling error.

---

## Rationale

**Why not keep the 7-type enum?**
The enum approach treats fundamentally different categories of assumption as interchangeable
rows in a single table. Market rent, renewal probability, and exit cap rate have entirely
different semantics, calculation contexts, and downstream uses. A table with a `driver_type`
column cannot express the relationships between these values (e.g., renewal probability and
downtime are paired — they are both properties of the re-leasing scenario, not independent
scalars). Typed tables make these relationships explicit and make the calculation engine
code significantly simpler to reason about.

**Why not use ARGUS's exact data model?**
ARGUS is a desktop application with a proprietary file format. Its internal data model is
not publicly documented. What we know is its *behavior* — the dual-track DCF, the blended
MLA approach, the inflation convention options. We adopt the behavior and the calculation
semantics; we design our own relational schema to express them.

**Why monthly and not quarterly?**
Quarterly is insufficient for properties with monthly rent steps, free rent periods measured
in months, or construction draws on monthly schedules. The additional complexity of monthly
calculation is minimal; the accuracy gain is material. Storage cost for 60 months vs. 20
quarters is negligible.

---

## Alternatives Considered

**Generic `value_drivers` table with expanded enum (15+ types)**: Would address the missing
driver types but not the structural problem. A blended MLA requires renewal probability and
downtime to be co-located in the same row (they are scenario parameters, not independent
scalars). An enum table cannot express this cleanly.

**Single omnibus `deal_assumptions` table with many nullable columns**: Simpler to query
but creates a table with 60+ columns where only a subset apply to any given deal type.
The three-table split keeps each table coherent and queryable.

**Storing TI/LC in NOI**: Simpler initial implementation, but methodologically wrong.
Any lender reviewing a model exported from Hermes would immediately identify the error.
This would destroy credibility with professional users.

---

## Consequences

- The calculation engine must implement the blended MLA logic for every space expiration event.
- The `model_run_monthly_cashflows` output table (MMC-28) is the canonical source of truth
  for all cash flow figures; annual summaries are derived from it.
- `lease_traits_modified_gross` requires a follow-up migration (MMC-31) to add per-category
  base year expense amounts — the expense stop delta calculation cannot be performed without
  the base year amounts. This is currently tracked as a known gap.
- The inflation convention fields on `investment_assumptions` must be read and honored by
  every escalation calculation in the engine. Adding a new escalation type requires verifying
  it respects this convention.
- Scenario analysis (Level 3 analysis depth) will require the three assumption tables to
  support scenario-scoped overrides. For v0, one base-case row per deal is the initial scope;
  scenario support is additive (new FK column, no destructive changes).
