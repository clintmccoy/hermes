# Product Notes — Parking Lot

Informal notes, future ideas, and nice-to-haves. These are not committed to the roadmap.
Items here should be reviewed periodically and either promoted to Linear tickets or discarded.

---

## In-App Chat and Voice as Provenance Sources

Eventually, intelligence gathered from in-app chat and voice conversations with users should be treated as a first-class source type in the data provenance model — same as an email or a document. When a user tells the AI something in a session ("the market rent is $45/SF"), that statement should be capturable as a "User-Stated (In-App)" source with conversation ID, timestamp, and the specific statement as the provenance record. This is distinct from "User-Entered" (manually typing into a field) — the source is conversational, not a form input.

This will require the provenance pointer schema to include a conversation/session source type from day one in the data model design, even if the in-app chat/voice capture isn't built until later.

---

## Pricing Model Ideas

**Hybrid compute + SaaS pricing:** Base SaaS fee per user, plus a markup on AI compute spend.
Two configurations to evaluate:
- Customer brings their own Anthropic/Google AI account and links it → lower markup, pass-through model
- We bundle compute in our own billing → higher markup, simpler for the customer

Interesting because it aligns our revenue with usage (more deals = more compute = more revenue) and avoids the "flat fee for heavy users" problem common in SaaS. Would require customers to have or create accounts with AI providers if using the self-service track.

---

## Summary Pro Forma Layout — TBD

Decision on how prescriptive to be on the one-pager format is shelved. Required annual outputs are locked: EGR, OpEx, NOI, cash flows after debt service, returns, return metrics (YOC, debt yield), credit metrics (DSCR, LTV, LTC). Visual layout and sectioning TBD.

## IC-Ready Designation Criteria — TBD

"IC-Ready" should have specific enforceable criteria: key deal points with supporting documentation, diligence checklist items checked off, and critical inputs refined beyond AI inference. This is the analyst "tightening up" the model as a deal approaches IC. Define exact criteria per deal type before this feature is built.

---

## IC Output Narrative Format — TBD

Decision-ready outputs include AI-drafted and/or user-drafted narrative elements (investment thesis, deal risks, market context). Format for this narrative content is undecided — options are Word export, Google Docs, or an in-app text editor. Shelved until core financial output is built. User-uploaded narrative drafts (e.g., existing investment memos) should feed into the ingestion layer as context and as editable starting points.

---

## Level 4 — Stochastic / Monte Carlo Analysis

Monte Carlo / range simulation on key model variables. Return distributions, downside risk quantification, probable scenario clusters, VaR-style risk metrics.

Noted as **explicitly out of scope for MVP**. Rarely used in CRE practice. Will require significant compute infrastructure and would be a natural pricing-tier upgrade when built. Revisit post-launch when core platform is proven.

---
