# Changelog

All notable changes to Hermes will be documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versions follow [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added
- Initial repo structure and documentation scaffolding
- CLAUDE.md project instructions for Claude Code sessions
- .gitignore, .env.example, README.md
- /docs folder with placeholder files
- Architecture Decision Records: 001-supabase-auth, 002-vercel-deployment

---

## [Schema v0.6] — 2026-04-13

Full PRD + ADR gap review against data schema v0.5. Agreed changes are documented in Notion: [CRE Schema v0.6 - Change Log](https://www.notion.so/341fde19a81d81afb328d736daa8ee5a). ERD updated in Notion: [CRE Schema v0.5 - Entity Relationship Diagram](https://www.notion.so/311fde19a81d8134988cd8ec6c0f4f9b).

**v0.6 totals: 64 tables across 15 domains (+17 tables, +4 domains from v0.5)**

### Schema — New Tables (17)

**New domain: Agentic Job Tracking** (Row 1 — ADR 010 / ADR 007)
- `analysis_jobs` — Trigger.dev job lifecycle record; separates job tracking from financial output
- `job_gates` — one row per gate event per job; replaces hardcoded Gate 1/Gate 2 columns; supports 0–N gates
- `job_gate_corrections` — per-field analyst corrections at gate; queryable training data
- `gate_config_profiles` — named gate configuration profiles; org-level defaults with user overrides
- `gate_config_entries` — gate settings per analysis depth per gate type per profile

**New domain: Confidence / Review** (Row 3 — PRD Section 10)
- `field_review_events` — one row per reviewer per field; multi-reviewer sign-off chains; drives "who signed off" UX

**New domain: Investment Basis** (Row 6 — PRD Section 7)
- `acquisition_costs` — one row per cost line at acquisition; purchase price is a row here, not a field on assets
- `carry_cost_overrides` — explicit analyst carry cost inputs for BOE/first-run; includes override audit columns
- `carry_cost_calculated` — engine config for IC-grade carry costs; amounts derived at runtime, never stored

**New domain: Liquidation** (Row 5 — PRD Section 7)
- `liquidation_tranches` — top-level exit record; one row per distinct liquidation event or for-sale program
- `sale_products` — for-sale unit or product types; `space_id` required (not nullable)
- `absorption_assumptions` — sales velocity and pre-sale assumptions per product type
- `presale_contracts` — executed and spec pre-sale contracts

**Leasing additions** (Rows 8–9)
- `lease_recovery_exclusions` — per-tenant cost pool exclusions; surgical, does not touch existing recovery structure
- `lease_recovery_caps` — YOY growth rate caps and base year stops per lease recovery agreement

**CapEx addition** (Row 7)
- `capex_spend_lines` — custom capex spend curve detail lines; only populated when `spend_schedule_mode = custom`

**Documents / Provenance addition** (Row 2 — ADR 007)
- `conversation_refs` — conversational/session sources (email threads, chat sessions, call transcripts)

### Schema — Modified Tables (8)

- `assets` — add `ownership_structure` (enum), `parent_asset_id` (self-referential FK for portfolio hierarchy), `apn` (text); remove `mixed_use` from `asset_type` enum; expand `asset_type` with hotel, self_storage, senior_housing, land, sfr, life_science, medical_office, manufactured_housing, data_center
- `capex_budget_lines` — rename `draw_schedule_mode` → `spend_schedule_mode`; add `s_curve` enum value
- `data_provenance` — rename `source_confidence` → `extraction_confidence`; add `source_quality_override`, `model_input_category`, `conversation_ref_id`
- `document_refs` — add `source_quality` (enum: strong / reasonable / weak)
- `model_run_results` — add `job_id` FK → `analysis_jobs`
- `users` — add `gate_profile_id` FK → `gate_config_profiles`
- `organizations` — add `confidence_weight_config` (jsonb)
- `model_config` — add `confidence_weight_config` (jsonb)

### Schema — Structural Conventions Established

- **Override table audit columns** — every override table must carry `overridden_by` (user FK NOT NULL), `overridden_at` (timestamp NOT NULL), `override_reason` (text). Computed values must never be discarded when overridden; both coexist.
- **`mixed_use` removed from asset_type** — mixed-use character is implicit in the space registry, not a stored flag
- **`condo_regime` on `ownership_structure`** — condo is an ownership/legal structure, not an asset type
- **Portfolio hierarchy via `parent_asset_id`** — parent asset = deal envelope; child assets = individual buildings/parcels

### Process

- `CLAUDE.md` — added Schema Change Protocol (migration gate, safety rules, implementation sequence, ADR threshold) and Linear ticket priority guidelines
- `docs/PRODUCT_NOTES.md` — added Computed vs. Override Pattern section documenting the user behavior insight from this session

### Documentation (prior session, committed together)

- `docs/adr/010-v0-agentic-architecture.md` — new ADR: agentic architecture v0 design (Sonnet executor + Opus advisor, two mandatory human gates, single orchestrating agent, Trigger.dev)
- `docs/adr/007-claude-ai-provider.md` — added cross-reference to ADR 010 for model selection and advisor strategy
- `docs/RESEARCH.md` — added JV waterfall structures research (tier sequence, carried interest, clawback, IRR hurdles, promote structures)
- `docs/agentic-architecture-brief.md` — agentic architecture design brief (prior session)
