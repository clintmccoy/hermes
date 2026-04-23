# ADR 015 — Deal vs. Scenario Entity Split

**Date**: 2026-04-23
**Status**: Decided
**Deciders**: Clinton McCoy
**Emerged from**: MMC-47 implementation session — thread pulled on `deals.primary_revenue_mechanism` NOT NULL constraint

---

## Context

During MMC-47 (implementing `POST /api/deals`), a NOT NULL column —
`primary_revenue_mechanism` — was found to be required at the deal level with
values (`fixed_rent`, `percentage_rent`, `nightly_rate`, `membership`,
`unit_sale`) that are too granular and too assumption-laden for a deal-level
concept. A deal can span multiple assets with different revenue mechanisms (e.g.,
a mixed-use building with hotel + office + apartments). Forcing a single answer at
deal creation is the wrong constraint.

Similarly, `business_plan` (added to `deals` in MMC-43) encodes an investment
*thesis* — what you intend to do with the asset — not a fact about the asset
itself. A deal may support multiple theses evaluated in parallel before a decision
is made.

The discussion surfaced a cleaner conceptual split that resolves both problems.

---

## Decision

### The Deal is a physical fact

`deals` records what the asset **is today** — the durable envelope for a property
or opportunity. Its fields describe the present-day physical and organizational
reality:

- `name` — deal name (free text)
- `asset_class` — what the asset is **right now** (`office`, `industrial`,
  `retail`, `multifamily`, `land`, …)
- `status`, `org_id`, `created_by`, timestamps

`asset_class` is intentionally the *current* state. An office-to-resi
redevelopment carries `asset_class = 'office'`; a greenfield build-to-rent
carries `asset_class = 'land'`. What it becomes is a scenario-level concern.

**`deals` does NOT carry thesis-level fields** (`business_plan`,
`revenue_model`, or any descendant of `primary_revenue_mechanism`).

### The Scenario is a thesis

A new `scenarios` entity carries the investment thesis — the specific bet being
modeled. A deal can have many scenarios (e.g., "model as rental housing" vs.
"model as for-sale townhomes"):

- `deal_id` — FK to `deals`
- `business_plan` — `ground_up`, `acquire_lease_hold`, … (moves here from
  `deals`)
- `revenue_model` — `for_rent | for_sale | both` (replaces
  `primary_revenue_mechanism` at deal level; deliberately higher-abstraction)
- `target_asset_class` — what the business plan intends to build or convert the
  asset TO; may differ from `deal.asset_class`

The `target_asset_class` distinction matters: a deal on an office building being
evaluated for residential conversion has `deal.asset_class = 'office'` and
`scenario.target_asset_class = 'multifamily'`. These are genuinely different
facts.

### Deal creation creates the first scenario atomically

The deal intake form captures both deal fields and first-scenario fields in a
single step. `POST /api/deals` atomically inserts a `deals` row and a `scenarios`
row. The first scenario is implicit — not a separate user action. Additional
scenarios are added later from the deal detail page.

This keeps the UX simple (one form, one submit) while the data model correctly
separates facts from theses.

---

## Consequences

### Immediate schema changes required

1. **Roll back `deals.business_plan`** (added in MMC-43) — this column is at the
   wrong level. Migration drops it from `deals`.
2. **Drop `deals.primary_revenue_mechanism`** — wrong abstraction, wrong
   granularity. Dropped without replacement at the deal level.
3. **Create `scenarios` table** — new migration. Full schema to be designed in
   the Scenario scope spec before any SQL is written (per schema protocol in
   `CLAUDE.md`).

### In-flight work affected

- **MMC-47** (`POST /api/deals` route): currently inserts `business_plan` into
  `deals` and derives `primary_revenue_mechanism` from `asset_class`. Both are
  temporary; the route will be updated to atomically insert `deals` +
  `scenarios` rows once the Scenario migration lands.
- **`analysis_jobs`**: currently scoped to `deal_id`. Expected to gain a
  `scenario_id` FK — an analysis run is a run against a specific thesis, not
  just a property. This affects the executor payload (ADR-010) and the review UI.
  Decision deferred to the Scenario scope spec.

### Deferred

- **Revenue mechanism at space/lease level** — the granular values
  (`fixed_rent`, `percentage_rent`, `nightly_rate`, `membership`, `unit_sale`)
  belong on the space or lease entity, not the deal or scenario. To be designed
  when space/lease entities are built out. This must not be forgotten — track in
  the Scenario scope spec as an explicit out-of-scope item with a forward
  reference.
- **Multi-scenario comparison UI** — data model first; comparison views later.
- **Scenario branching / forking** — future.

---

## Alternatives considered

**Keep thesis fields on `deals`, allow nulls** — rejected. Nulls are an
escape hatch, not a model. The deal-vs-scenario distinction is real and will only
become more important as the product grows (scenario comparison, what-if
analysis, parallel modeling).

**`revenue_model` on `deals` with coarser values (`for_rent | for_sale |
both`)** — considered briefly. Rejected once it became clear that a single deal
might legitimately be evaluated as both for-rent and for-sale simultaneously.
Coarser values at the deal level still force premature commitment.

**Separate Scenario entity but defer to Cycle 2** — possible, but risks shipping
Cycle 1 with a data model known to be wrong. The scope spec will determine
whether the Scenario migration fits in Cycle 1 (4 weeks remaining) or must ship
early in Cycle 2.

---

## References

- [Notion design note — 2026-04-23](https://www.notion.so/34bfde19a81d81b59c64c57c163e7e3f)
- ADR-010 — Agentic executor/advisor architecture (executor payload, affected by
  `scenario_id`)
- ADR-011 — Schema v0.6 structural patterns
- MMC-40 — Deal intake scope (parent)
- MMC-43 — `deals.business_plan` migration (to be rolled back)
- MMC-47 — `POST /api/deals` route (temporary; will be updated post-Scenario migration)
