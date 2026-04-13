# ADR 011 — Schema v0.6 Structural Patterns

**Date**: 2026-04-13
**Status**: Decided
**Deciders**: Clinton McCoy

---

## Context

The v0.5 → v0.6 schema review session (April 2026) identified ten gaps between
the data schema and the requirements stated in the PRD and ADRs 004, 005, 007,
and 010. Several of those gaps required structural decisions — not just new
tables, but choices about how the schema should behave as a system. Those
decisions are recorded here. The full table-level changelog is in Notion:
[CRE Schema v0.6 - Change Log](https://www.notion.so/341fde19a81d81afb328d736daa8ee5a).

---

## Decisions

### 1. Computed/override split — universal pattern

**Decision**: Anywhere the schema has a computed or AI-derived value, a
corresponding override mechanism exists that lets the user substitute their
own number without destroying the computed value. Both coexist permanently.
Every override table carries three audit columns: `overridden_by` (user FK,
NOT NULL), `overridden_at` (timestamp, NOT NULL), `override_reason` (text,
optional).

**Rationale**: CRE practitioners routinely override computed values regardless
of what the model says. This is not a product failure — it is how experienced
analysts work. They have strong priors and need control. If the computed value
is discarded, the system can no longer answer "what did the model think vs. what
did the analyst choose," which destroys training signal and audit value. Override
patterns are also leading indicators of model error: if users consistently
override a computed value in the same direction, the model is wrong about
something. The audit columns ensure accountability for IC review, LP reporting,
and team QA.

**Applied in v0.6**: `carry_cost_overrides` vs. `carry_cost_calculated`;
`capex_spend_lines` for custom curves vs. engine-computed curves for
standard modes. The pattern will recur throughout the schema.

---

### 2. Spaces as required FK for all monetary events

**Decision**: `sale_products.space_id` is NOT NULL. Every sale event must be
traceable to a specific space in the space registry. No exceptions.

**Rationale**: The spaces model is the foundational lego block of the schema.
Every monetary event — rent, recovery, capex, disposition — must trace to a
space to enable coherent partial-sale modeling, continued-ops modeling after
a partial disposition, and BOE-to-IC-grade promotion without schema changes.
A nullable `space_id` on sale events creates a class of records that cannot
participate in the space model, breaking the composability guarantee.

**For whole-asset exits**: a single `sale_products` row points to a
building-level or asset-level space, which encompasses all child spaces.
No need to enumerate every suite. **For BOE analysis**: stub spaces with
`lifecycle_status = under_construction` and approximate RSF are created in
`spaces_master`. The registry mechanism is the same at all analysis depths;
only the fidelity of the space records differs.

---

### 3. Flexible human gate system

**Decision**: Human review gates are modeled as a normalized `job_gates` table
(one row per gate event per job) rather than hardcoded `gate_1_*` / `gate_2_*`
columns on `analysis_jobs`. Gate configuration is managed via `gate_config_profiles`
and `gate_config_entries`, supporting 0–N gates per job at any analysis depth.
All gates are user-overridable by default; org-level policy controls are deferred.

**Rationale**: ADR 010 specifies Gate 1 (post-extraction) and Gate 2
(post-construction) as v0 defaults, but hardcoding these as columns would make
the schema brittle against the near-certain evolution of gate requirements as
the product matures. Different analysis depths, org preferences, and future
product tiers will want different gate configurations. A normalized model with
named profiles also enables gate configuration to be a product surface (user
settings, org defaults) rather than a code change.

**The `job_gate_corrections` table** (one row per field corrected at a gate)
is structured as queryable training data — each row is a labeled signal about
where the agent got something wrong. This is a first-class data asset, not
just an audit log.

---

### 4. Portfolio hierarchy via self-referential parent_asset_id

**Decision**: `assets` has a nullable `parent_asset_id` FK pointing to itself.
A portfolio or campus deal is modeled as a parent asset (the deal envelope)
with N child assets (one per building or parcel). Each child has its own space
registry, lease stack, and liquidation tranches. Portfolio-level analysis
aggregates up from children; building-level analysis runs on a child directly.

**Rationale**: Multi-building deals (industrial parks, office campuses, mixed-use
parcels) are common in CRE and cannot be modeled as a single asset without
losing the ability to underwrite and dispose of individual buildings. A
self-referential FK is the minimal structure that supports this: no new tables,
no polymorphic joins, no fan-out queries. The parent is the acquisition wrapper;
the children are the operational units.

**Contrast with condo regime**: A condo building (many small units sold via
absorption) is a single asset + `sale_products` per unit type. Portfolio
hierarchy applies to discrete multi-building deals where each building is
underwritten semi-independently. The distinction is granularity and intent.

---

### 5. Ownership structure is orthogonal to asset type

**Decision**: `assets.ownership_structure` is a separate enum field from
`asset_type`. `mixed_use` is removed from the `asset_type` enum entirely.

**Rationale**: Asset type describes the use (office, retail, multifamily).
Ownership structure describes the legal/ownership form (fee simple, condo
regime, ground lease, TIC). These are independent dimensions: an office condo
and a residential condo have the same ownership structure but different
underwriting paths. A ground lease retail asset has the same asset type as a
fee simple retail asset but fundamentally different cash flow modeling.
Conflating them into one field forces illogical combinations and makes
analytics bucketing unreliable.

`mixed_use` was removed because it is a derived descriptor — an asset is
mixed-use because its spaces span multiple use types, which the space registry
already captures. Storing it as an `asset_type` value would duplicate
information already implicit in `spaces_master`.

---

### 6. Source quality at the source level, not the field level

**Decision**: `source_quality` (strong / reasonable / weak) lives on
`document_refs` and `conversation_refs` — one value per source document or
conversation. It does not live per-field on `data_provenance`. A
`source_quality_override` escape hatch on `data_provenance` handles edge cases
where a specific value has materially different quality than its source.

**Rationale**: Source quality is a property of the source, not the value. When
a broker OM is promoted to an executed lease, one update to `document_refs`
propagates correctly to all extracted fields. If source quality were stored
per-field on `data_provenance`, a document promotion would require updating
potentially hundreds of rows — a maintenance and consistency problem. DRY
applies to schema design as much as to code.

---

### 7. Three-dimensional health score, computed not stored

**Decision**: The model health score is computed at query time from three
independent dimensions: extraction confidence (up to 3 pts), source quality
(up to 3 pts), and human review level (up to 4 pts), for a maximum of 10.
The score is not stored in any table. Dimension weights are stored as jsonb
config at the org level with deal-level override, so they can be tuned without
a schema migration.

**Rationale**: Storing a derived value violates the single source of truth
principle and creates stale-data risk. The three dimensions are genuinely
independent signals: a value can have high extraction confidence (the AI
read it correctly) but weak source quality (it came from a broker OM), or
strong source quality but no human review. Collapsing them into one field
loses diagnostic information. Storing weights as config rather than constants
allows calibration as user behavior data accumulates.

---

## Alternatives Considered

- **Single `confidence` field on `data_provenance`**: Simpler, but loses the
  distinction between "the AI extracted it correctly" and "the source document
  is trustworthy." Field was renamed `extraction_confidence` to clarify its
  scope.

- **Hardcoded Gate 1 / Gate 2 columns**: Simpler initial implementation, but
  brittle against product evolution and makes gate configuration a code change
  rather than a data change.

- **`mixed_use` as asset type, `condo` as asset type**: Intuitive labels that
  practitioners use, but semantically incorrect — mixed-use and condo are
  descriptors of structure and composition, not of underwriting path. Encoding
  them as asset types creates query-time ambiguity.

- **Source quality per field on `data_provenance`**: More granular, but
  violates DRY and creates update anomalies when source documents are promoted.

---

## Consequences

- Every override table in the schema must be reviewed for the three audit
  columns before migration SQL is written.
- The space registry must be populated (even with stubs) before any
  liquidation module data can be entered; the required `space_id` on
  `sale_products` enforces this.
- Gate configuration is a product surface from day one; a system default
  profile must be seeded before any analysis job can run.
- Health score computation requires a join across `data_provenance`,
  `document_refs` / `conversation_refs`, and `field_review_events`; this
  query path should be indexed and tested for performance at scale.
- Portfolio parent/child relationships must be resolved before deal-level
  KPI aggregation is implemented in the output module.
