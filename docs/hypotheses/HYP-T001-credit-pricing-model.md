# HYP-T001 — Credit-based pricing maps well to deal-based CRE workflows

**Category:** Product
**Status:** Untested
**Risk Level:** High
**Confidence Score:** 2
**Last Reviewed:** 2026-04-13
**Linear Validation Tickets:** —

---

## Statement

We believe that a credit-based consumption pricing model — where users purchase
credits and spend them per analysis run, with cost scaling by analysis
complexity — maps intuitively to how CRE professionals think about deal work,
and will result in willingness to pay that seat-based or subscription pricing
would not.

## Rationale

CRE professionals think in deals, not in seats or months. A $500/month
subscription feels like overhead; $50 per deal analysis feels like a deal cost,
which is already a budget line they understand. Connecting the price to the
unit of value (the deal) is both more intuitive and more defensible — it's
easy to explain ROI when you say "this analysis cost you $X, the deal is worth
$Y."

Credit-based pricing also scales naturally with complexity (BOE screen costs
fewer credits than an IC-grade Monte Carlo) and with firm size (a large fund
running 200 deals/year will self-select into a higher tier without requiring
a custom enterprise negotiation).

The risk is that credit unpredictability creates anxiety: "Am I going to run
out of credits on a deadline?" Subscription fatigue is real, but credit anxiety
is too. We may need a hybrid model (base subscription + credit overage) rather
than pure consumption.

## How to Validate

- In early beta, show users the credit cost before they run an analysis.
  Measure hesitation: do they pause, ask questions, or proceed immediately?
- Run a pricing survey with early users: present both a monthly subscription
  option and a credit option at similar expected costs. Which do they prefer?
- Track whether credit exhaustion events correlate with churn. If users run
  out of credits and don't top up, the model may be creating friction rather
  than conversion.

## Evidence Log

| Date | Signal | Direction | Source |
|------|--------|-----------|--------|
| — | No evidence yet | — | — |

## Status Notes

Untested as of 2026-04-13. Credit pricing is baked into the current product
architecture (ADR 010: credits deducted at job completion). Invalidating this
hypothesis would require significant pricing and billing architecture changes.
High priority to validate early.
