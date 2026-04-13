# Hermes Hypothesis Tracker

This directory is Hermes's system for tracking assumptions, beliefs, and bets —
and measuring them against reality. Every hypothesis here represents something
we believe to be true that, if wrong, would materially affect the product,
business, or architecture.

The goal is to **de-risk the company** by systematically validating or
invalidating our most load-bearing assumptions before we've bet everything on them.

---

## Philosophy

Most startup failures aren't execution failures — they're hypothesis failures.
The team executed on something that turned out not to be true. This tracker
exists so we know which assumptions are carrying the most weight, which ones
we've confirmed, and which ones we're still flying blind on.

A hypothesis is not a todo item. It's a belief we're actively trying to stress-test.

---

## Hypothesis File Format

Each hypothesis lives in its own file, named `HYP-[ID]-[short-slug].md`.

```markdown
# HYP-XXX — [Title]

**Category:** Market | Product | Technical | Go-to-Market
**Status:** Untested | In Progress | Validated | Invalidated | Partially Validated
**Risk Level:** Critical | High | Medium | Low
**Confidence Score:** 1–5  (1 = pure assumption, 5 = strongly validated)
**Last Reviewed:** YYYY-MM-DD
**Linear Validation Tickets:** HER-XXX, HER-XXX

---

## Statement

One clear, falsifiable sentence. "We believe that [X] is true, such that [Y]."

## Rationale

Why we hold this belief. What signals, analogies, or early evidence point to it
being true. Be honest about how thin or strong the foundation is.

## How to Validate

Specific, observable experiments or signals that would confirm or refute this.
"We would know this is true if..." / "We would know this is false if..."

## Evidence Log

Running log of signals that bear on this hypothesis. Add entries as they arrive —
customer interviews, usage data, market research, competitor moves, etc.

| Date | Signal | Direction | Source |
|------|--------|-----------|--------|
| — | — | — | — |

## Status Notes

Narrative explanation of current status. Updated at each review cycle.
```

---

## Scoring Rubric

### Confidence Score (1–5)

| Score | Meaning |
|-------|---------|
| 1 | Pure assumption — no external signal, no validation effort yet |
| 2 | Directional — analogous markets, secondary research, or strong intuition |
| 3 | Partial — one or two customer signals, but not yet systematic |
| 4 | Solid — multiple confirming data points, minimal contradicting evidence |
| 5 | Validated — sufficient evidence to treat as a known fact; de-risked |

### Risk Level

| Level | Meaning |
|-------|---------|
| Critical | If this is false, the core business model fails |
| High | If this is false, a major product or go-to-market pivot is required |
| Medium | If this is false, a significant feature or strategy changes |
| Low | If this is false, a minor adjustment is required |

---

## Review Cadence

| Cycle | Scope | Output |
|-------|-------|--------|
| **Weekly** | Flag any hypothesis where new evidence arrived this week | Update Evidence Log |
| **Monthly** | Review all In Progress hypotheses; update Confidence Scores | Revise Status Notes |
| **Quarterly** | Full review of all hypotheses; graduate Validated ones; kill dead-weight Low/Invalidated ones | Promote validated beliefs to CLAUDE.md, PRD, or ADRs |

Validated hypotheses should be codified as facts in the appropriate place
(PRD, ADR, ONBOARDING.md) and marked Validated here, not deleted. The history
of how we came to know what we know is valuable.

---

## Hypothesis Index

| ID | Title | Category | Status | Risk | Confidence |
|----|-------|----------|--------|------|------------|
| [HYP-B001](HYP-B001-analysts-want-argus-replacement.md) | CRE analysts want a better alternative to ARGUS | Market | Untested | Critical | 2 |
| [HYP-B002](HYP-B002-senior-pros-struggle-training-analysts.md) | Senior CRE professionals struggle to train analysts effectively | Market | Untested | High | 2 |
| [HYP-B003](HYP-B003-large-firm-procurement.md) | Large firm procurement for analyst tools follows a predictable pattern | Go-to-Market | Untested | High | 1 |
| [HYP-P001](HYP-P001-argus-file-translation.md) | Buyers want direct ARGUS file translation | Product | Untested | High | 2 |
| [HYP-P002](HYP-P002-trust-requires-explainability.md) | CRE professionals will trust AI underwriting only with full explainability | Product | Untested | Critical | 3 |
| [HYP-P003](HYP-P003-slip-motion.md) | Individual analyst (SLIP) is the right initial go-to-market entry point | Go-to-Market | Untested | High | 2 |
| [HYP-T001](HYP-T001-credit-pricing-model.md) | Credit-based pricing maps well to deal-based CRE workflows | Product | Untested | High | 2 |
| [HYP-T002](HYP-T002-v1-agent-roles.md) | v1 multi-agent topology with four agent categories is the right architecture | Technical | Untested | Medium | 2 |
