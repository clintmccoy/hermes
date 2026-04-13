# HYP-P001 — Buyers want direct ARGUS file translation

**Category:** Product
**Status:** Untested
**Risk Level:** High
**Confidence Score:** 2
**Last Reviewed:** 2026-04-13
**Linear Validation Tickets:** —

---

## Statement

We believe that a significant portion of prospective Hermes buyers will require
the ability to import and translate existing ARGUS (.argus / .xcf) files into
Hermes — such that the absence of this feature would be a blocker to adoption
for firms with large libraries of existing models.

## Rationale

CRE firms have years of deal history in ARGUS. Switching costs aren't just
behavioral — they're data. An analyst who needs to revisit a 2022 acquisition
model to run new scenarios can't do that in Hermes if the original model lives
in ARGUS. Firms will also have standard templates built in ARGUS that they're
not going to rebuild from scratch. Without translation, Hermes is "new deal
only" which limits adoption at established firms.

On the other hand: ARGUS file formats are proprietary and not publicly
documented. Building a reliable parser is a non-trivial engineering investment.
It's possible that the real unlock is not full model translation but selective
data migration (extracting assumptions and inputs, not preserving the ARGUS
model structure itself), which is more tractable.

## How to Validate

- Ask in discovery: "You have existing ARGUS models — what would it take for
  you to not need them in ARGUS anymore?"
- Run a demand test: put ARGUS import on the Hermes roadmap/waitlist and see
  how many users request it unprompted.
- Identify if the blocker is actually ARGUS files or if it's output format
  compatibility (lenders, LPs expecting ARGUS-formatted outputs).

## Evidence Log

| Date | Signal | Direction | Source |
|------|--------|-----------|--------|
| — | No evidence yet | — | — |

## Status Notes

Untested as of 2026-04-13. Note the distinction between import (reading ARGUS
files into Hermes) vs. output compatibility (generating ARGUS-formatted exports).
These are different problems with different engineering costs and different
buyer motivations. Validate which one is actually the blocker before committing
to either.
