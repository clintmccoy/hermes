# HYP-T002 — v1 multi-agent topology with four agent categories is the right architecture

**Category:** Technical
**Status:** Untested
**Risk Level:** Medium
**Confidence Score:** 2
**Last Reviewed:** 2026-04-13
**Linear Validation Tickets:** —

---

## Statement

We believe that when we graduate from the v0 single-orchestrating-agent model
to a multi-agent system, the right topology is four distinct agent categories
— pipeline agents, a conversational co-analyst, proactive background agents,
and internal ops agents — such that separating these concerns by trigger model
and responsibility produces a more maintainable, cost-effective, and capable
system than alternative topologies.

## Rationale

The four categories reflect fundamentally different trigger models and
execution characteristics:

- **Pipeline agents** run on-demand within an analysis job, sequenced by an
  orchestrator, with hard human gates. They care about accuracy, provenance,
  and cost-per-run.
- **The co-analyst** is reactive and conversational — it responds to user input,
  holds deal context across a session, and relays insights from background agents.
  Its memory model and latency requirements differ from pipeline agents.
- **Proactive background agents** run on time or event triggers independently of
  user action. They must be cheap (running continuously) and produce actionable
  signal, not noise.
- **Internal ops agents** serve Hermes the business — activation, retention,
  viral distribution — and are largely invisible to the end user.

Separating these categories prevents architectural muddiness (a single monolithic
agent trying to do all four things), makes cost attribution clear, and lets each
category evolve independently.

The risk is over-engineering: v0 may reveal that the natural seams are in
different places than we expect, or that two categories can share enough
infrastructure that separation isn't worth the overhead.

## Hypothesized Specialist Roles

**Category 1 — Pipeline Agents**
- `document-parser`: ingestion and structured extraction
- `model-maker`: financial module assembly and pro forma composition
- `financial-analyst`: scenario analysis, sensitivity, strategic mix
- `formatter`: output rendering and export
- `orchestrator`: routes work, manages gates, emits progress events

**Category 2 — Conversational Agent**
- `co-analyst`: reactive conversational interface; receives proactive insights
  from Category 3 and relays to user; maintains deal context across sessions

**Category 3 — Proactive Background Agents**
- `cs-agent` (clawdbot): monitors live deals; detects staleness; surfaces market
  changes; flags risks; hands insights to co-analyst for user delivery
- `deal-quality-agent`: pre-delivery sanity check; benchmarks assumptions against
  historical Hermes data; flags statistical outliers

**Category 4 — Internal Ops Agents**
- `onboarding-agent`: detects incomplete onboarding; triggers re-engagement
- `sharing-agent`: surfaces export/sharing at deal completion; generates
  branded one-pager; creates organic distribution surface

## How to Validate

- V0 usage data will reveal where the single agent is doing the most work and
  where natural seams appear — this is the primary input to the v1 topology decision.
- Cost per analysis job will reveal whether pipeline agent isolation is worth the
  overhead or whether some specialists can share context more cheaply.
- User behavior around the co-analyst (if it gets implemented in v0) will reveal
  whether the conversational context model needs to be isolated or can live within
  the same job context as pipeline agents.
- Monitor whether proactive-style features (staleness flags, benchmarking) get
  requested by early users — demand signal will prioritize Category 3 investment.

## Evidence Log

| Date | Signal | Direction | Source |
|------|--------|-----------|--------|
| — | No evidence yet | — | — |

## Status Notes

This hypothesis is codified in ADR 010 as the v1 multi-agent topology section.
It is explicitly a hypothesis pending v0 pilot data. The revisit trigger is
first live pilot customers. Risk is Medium (not High) because if this
topology turns out to be wrong, it affects architecture but not the core
value proposition of the product.
