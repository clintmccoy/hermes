# PRD — Hermes
<!-- Version history is maintained in the table below. Bump version on every meaningful change. -->

| Version | Date | Author | Summary |
|---|---|---|---|
| v0.1 | 2026-03-13 | Clinton McCoy | Initial stub |
| v0.2 | 2026-04-10 | Clinton McCoy | All 8 MVP decisions locked; module taxonomy defined; ADRs 003–009 created |

**Status**: In Progress
**Full narrative version**: See `docs/hermes_prd_v4.docx`

---

## 1. Problem Statement

CRE underwriting today is fragmented, manual, and opaque. Deal materials arrive as PDFs,
spreadsheets, broker emails, and data-room dumps. Analysts spend disproportionate time on
extraction and normalization, not analysis. Tools are either rigid Excel templates limited
to narrow deal types, or general-purpose AI with no financial modeling depth. ARGUS is the
entrenched standard — but it is a black box, single-user, and requires a license to open
its own output files.

Project Hermes solves three linked problems:
1. Turn messy real-world deal materials into structured underwriting inputs automatically,
   with confidence scoring, provenance, and human-in-the-loop review.
2. Run universal, modular financial analysis with full transparency, depth-graduation,
   and exportability.
3. Generate insightful, concise outputs that turn best-in-class financial analysis into
   elegantly simple figures and plain English.

---

## 2. Users & Personas

| Persona | Role | Primary Need | MVP Priority |
|---|---|---|---|
| Investment Analyst | Junior-to-mid analyst at buyer, lender, or developer | Extract inputs fast, run models, produce exports | P0 |
| Investment Sales Broker | IS / Capital Markets broker | Fast deal packaging, shareable outputs, professional distribution | P0 |
| Portfolio Manager / Principal | Senior PM, VP, or GP | Scenario comparison, IC prep, version control | P0 |
| Developer / Operator | Principal or GP running development projects | Full deal lifecycle: entitlement → refi → disposition | P0 |
| Credit Analyst | Private credit team | Debt sizing, DSCR/LTV modeling, covenant testing | P1 |
| Platform Admin | IT / ops | User management, deal org, basic permissioning | P2 |

**MVP Customer**: Small to mid-sized investment teams, developer/operators, and private credit
teams who underwrite across multiple deal types without a large analyst bench.

---

## 3. Core Use Cases

See `docs/hermes_prd_v4.docx` Section 3 for full use case detail.

---

## 4. Functional Requirements

See `docs/hermes_prd_v4.docx` Section 8 for full MVP capabilities.

---

## 5. Non-Functional Requirements

- **Auth**: Multi-user from day one; shared links with view-only access require no account
- **Performance**: Async ingestion for large documents; streaming progress to UI
- **Security**: Org-level RLS on all deal data from day one
- **Reliability**: Trigger.dev retry logic for all async jobs
- **Auditability**: Every AI-generated value records model version, timestamp, and source

---

## 6. Out of Scope (MVP)

- Level 4 stochastic / Monte Carlo analysis
- Real-time multi-user collaborative editing (Google Docs-style)
- Direct market data API integrations (CoStar, CBRE, RCA)
- Full enterprise approvals and multi-tier permissioning
- Sales comps and lease comps
- Native mobile application
- Automated investor-grade LP report generation
- ARGUS file output (ARGUS-compatible Excel exports are in scope)
- Tax / depreciation module
- Portfolio roll-up and cross-deal analytics

---

## 7. Module Taxonomy

Six abstract financial modules compose every deal type. The AI orchestration layer
proposes which modules are active based on deal context.

| Module | Description |
|---|---|
| **Space Transformation** | Building, demolishing, renovating, repositioning. Cost schedules, draw schedules, timelines. Unified for ground-up development and value-add — ground-up spec is the superset. |
| **Space Monetization** | Any non-permanent exchange of real property rights for consideration: leases, ground leases, hotel occupancy, co-working revenue share, etc. Universal across all deals with recurring revenue. |
| **Operations** | NOI engine. Gross revenue, vacancy/credit loss, all operating expense line items, NOI. Extends to community management (HOAs, master-planned communities). |
| **Investment Basis** | Running ledger of all capital deployed: purchase price, closing costs, carry costs, capex/construction draws, additional contributions. Produces unlevered and levered basis. Denominator for ROC/YOC. |
| **Capital Stack + Returns Engine** | Unified. All capital contributors regardless of form: senior debt, mezz, construction loan, bridge, perm, JV equity, co-GP slugs, LP equity, sponsor equity. Waterfalls on waterfalls. Refi/recap events. Per-investor returns. IRR, equity multiple, cash-on-cash, YOC/ROC, profit. **Build second** — after the real estate modules are stable. |
| **Liquidation** | Disposition of any portion of the investment: individual units, parcels, or whole-asset. Single-asset exit is a degenerate case of the absorption schedule. Pricing mechanisms ($/unit, $/SF, cap rate), pre-sales, timing, absorption curves. |

**Unit/Space Registry**: Foundational data layer (not a calculation module). Physical inventory
of the asset. All modules reference this layer. Schema detail in the Data Schema Document.

---

## 8. Analysis Depth Ladder

| Level | Name | Goal | Hero Outputs |
|---|---|---|---|
| 1 | Back-of-Envelope Screen | Is this worth more time? | YOC/ROC vs. market cap rate ("Investment Spread"); for for-sale plans, rough MOIC. No IRR. |
| 2 | First-Run Analysis | Back into a purchase price; enough to commit to an LOI | Base case cash flows, levered/unlevered returns, debt sizing, DSCR. |
| 3 | IC-Grade Scenario Analysis | Defensible, committee-ready | All cash flows, historical financials, capital basis, multiple named scenarios, validated inputs, key risks, investment thesis. |
| 4 | Stochastic Sensitivity | **OUT OF SCOPE — MVP** | — |

Level 3 is triggered by real diligence inputs: property condition assessments, market studies,
architectural input, GC estimates, environmental reports.

---

## 9. Document Types & Extraction Tiers

**Tier 1 — Structured Field Extraction**: T12/Operating Statement, Rent Roll (30% Excel /
70% PDF — both required), Debt Term Sheet/Loan Agreement, Construction Budget/GC Estimate,
Lease Abstract.

**Tier 2 — Semi-Structured**: Offering Memorandum, Property Condition Assessment (L3),
Market Study (L3), Environmental Report (L3), Appraisal (PDF only; L3 document).

**Tier 3 — Legal/Title**: Full Lease Documents (incl. ground leases), Title Report &
Recorded Docs.

**Tier 4 — Conversational/Semantic**: Emails (body + attachments), meeting notes, texts,
call transcripts. RAG-based extraction — can produce model field values with conversational
provenance. Future: in-app chat/voice sessions (provenance pointer schema must include
session source type from day one).

**Tier 5 — Ad Hoc/Catch-All**: Any unclassified file. AI surfaces anything that looks like
a model input for analyst promotion.

**Key principle**: Extraction approach varies by tier; any tier can produce a model field
value with a full provenance record.

---

## 10. Confidence & Flag System

Every model input carries a three-tier flag based on: extraction confidence (High/Medium/Low),
source quality (Strong/Reasonable/Weak), and human review status (Approved/Pending/Flagged).

- 🔴 **Red**: Critical input unvalidated; no supporting documentation
- 🟡 **Yellow**: Human-approved but no underlying data source
- 🟢 **Green**: Strong documentation + explicit user sign-off

**Model health score**: Aggregate + category-level (Capex Costs, Development Program /
Business Strategy, Leasing Assumptions, Market Intel, Standard Due Diligence Inputs).
Gamified — score improves visibly as analyst validates inputs. No hard blocks.

---

## 11. Excel Export Packs

| Pack | Primary Use |
|---|---|
| Inputs Pack | IC review and audit. Per-field provenance, aggregate + category confidence scores. |
| Summary Pro Forma | IC presentation. Required lines: EGR, OpEx, NOI, cash flows after debt service, YOC, debt yield, DSCR, LTV, LTC. Layout TBD. |
| Scenario Comparison Pack | Side-by-side scenarios with delta vs. base case. |
| Module Schedules Pack | Diligence and lender package. One tab per active module. |
| Capital Budget Pack | Scope, line items, timing/draw schedule, capex risk assessment. |
| Full Monthly Cash Flows | Month-by-month through full hold period, all scenarios. |

---

## 12. Key MVP Decisions

| # | Decision | Status | Reference |
|---|---|---|---|
| 1 | v0 Module Taxonomy | **Decided** | Section 7 |
| 2 | Analysis Depth Ladder Input/Output Spec | **Decided** | Section 8 |
| 3 | v0 Document Types & Extraction Fields | **Decided** | Section 9 |
| 4 | Decision-Ready Output Spec | **Decided** | Section 11 |
| 5 | Excel Export Packs Spec | **Decided** | Section 11 |
| 6 | Explainability & Approval Checkpoints | **Decided** | Section 10 |
| 7 | Provenance Pointer Standards | **Decided** | ADR 007 |
| 8 | Confidence Score Thresholds | **Decided** | Section 10 |

**Technical ADRs**:

| Decision | ADR |
|---|---|
| Frontend: Next.js App Router + TypeScript | ADR 003 |
| Calculation engine: Hybrid client/server | ADR 004 |
| Async jobs: Trigger.dev v3 | ADR 005 |
| Document intelligence: Google Document AI | ADR 006 |
| AI provider: Anthropic Claude + model version pinning | ADR 007 |
| Email ingestion: Postmark/Resend inbound webhook | ADR 008 |
| Auth: Multi-user from day one, shared links | ADR 009 |

**Open**: Agentic AI architecture — dedicated session required before sprint planning on
the AI orchestration layer.

---

## 13. Open Questions

Key open items (full list in `docs/hermes_prd_v4.docx` Section 13):

1. **Agentic AI architecture** — dedicated session scheduled; must resolve before AI layer work begins
2. **IC-Ready designation criteria** — see `docs/PRODUCT_NOTES.md`
3. **Summary Pro Forma layout** — see `docs/PRODUCT_NOTES.md`
4. **Data Schema Document** — pending; required before module execution engine work begins

---

## 14. Dependencies & Integrations

| Service | Role | Status |
|---|---|---|
| Supabase | Database, Auth, RLS | Account exists |
| Vercel | Hosting, CI/CD, preview deployments | Configured (ADR 002) |
| Anthropic Claude | AI extraction, orchestration, inference | API access required |
| Google Document AI | OCR, document intelligence | Google account exists |
| Trigger.dev | Async job infrastructure | Project setup required |
| Postmark or Resend | Inbound email parsing | Evaluation required |

---

## 15. Success Metrics (MVP)

See `docs/hermes_prd_v4.docx` Section 10.

---

## 16. Glossary

See `docs/hermes_prd_v4.docx` Section 15.
