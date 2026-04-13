# HYP-P002 — CRE professionals will trust AI underwriting only with full explainability

**Category:** Product
**Status:** Untested
**Risk Level:** Critical
**Confidence Score:** 3
**Last Reviewed:** 2026-04-13
**Linear Validation Tickets:** —

---

## Statement

We believe that CRE investment professionals will not trust or rely on
AI-generated underwriting unless every assumption, inference, and calculation
is fully auditable and explainable — such that black-box AI output is a
non-starter for this market regardless of its accuracy.

## Rationale

CRE investment decisions involve large amounts of capital and carry personal
career risk for the analysts and decision-makers involved. Professionals in
this market are trained to be skeptical of numbers they can't trace. ARGUS,
for all its flaws, is trusted partly because analysts built the model — they
know exactly where every number came from. An AI that produces a pro forma
without showing its work will be dismissed as untrustworthy regardless of
output quality.

This hypothesis is why ADR 010 mandates two human review gates: they exist
not just to catch errors but to make the agent's reasoning visible. The
explainability requirement is also a competitive moat — it's harder to copy
than the underlying AI capability.

Scored at 3 (not lower) because this belief is corroborated by broad patterns
in high-stakes professional AI adoption (legal, medical, financial) where
explainability is consistently found to be a prerequisite for trust.

## How to Validate

- In early user testing, present an AI-generated pro forma with and without
  full provenance (source document references, inference explanations, flagged
  assumptions). Measure whether users engage differently, push back, or accept
  the output.
- Ask in discovery: "If Hermes produced a completed pro forma and you couldn't
  see how it got to each number — would you use it? Present it to IC?"
- Track how often users engage with Gate 1 / Gate 2 review in v0: are they
  reading it or rubber-stamping it?

## Evidence Log

| Date | Signal | Direction | Source |
|------|--------|-----------|--------|
| — | No evidence yet | — | — |

## Status Notes

Scored at 3 due to strong analogy signal from adjacent markets (legal AI,
financial AI). The two-gate design in ADR 010 is a direct architectural
response to this hypothesis. If validation shows users actually don't care
about provenance (rubber-stamp every gate), we should revisit whether the
gate UX is adding friction without building trust.
