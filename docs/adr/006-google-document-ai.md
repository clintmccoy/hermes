# ADR 006 — Google Document AI for OCR and Document Intelligence

**Date**: 2026-04-10
**Status**: Decided
**Deciders**: Clinton McCoy

---

## Context

Hermes ingests a wide variety of document formats, including scanned PDFs
(older appraisals, legal documents), native-text PDFs with complex table
layouts (T12s, rent rolls, OMs), and mixed content documents. A production-
grade OCR and document intelligence pipeline is required for Tier 1 and
Tier 2 document extraction. Extraction quality is the #1 risk in the PRD.

## Decision

Use Google Document AI as the OCR and document intelligence provider.

## Rationale

- Production-grade table extraction quality, which is essential for T12s,
  rent rolls, and construction budgets
- Handles mixed PDF formats (native text sections + scanned image sections)
  within the same document — common in appraisals and legal docs
- Existing Google One account provides immediate API access without new
  vendor onboarding
- Strong API with structured output that maps cleanly to provenance pointer
  format (page number + bounding box coordinates)

## Alternatives Considered

- **AWS Textract**: Comparable quality, but adds an AWS dependency and
  requires a new account/billing relationship
- **Azure Document Intelligence**: Comparable quality, same issue with
  adding a new cloud vendor dependency
- **Open-source (Tesseract + layout analysis)**: Substantially cheaper,
  but requires significant engineering investment for production-quality
  table extraction; extraction quality risk is too high given the product's
  core promise of auditability

## Consequences

- Google Document AI must be configured through the existing Google account
  before ingestion work begins
- Extraction quality must be QA'd against real deal documents (T12s, rent
  rolls, appraisals) before the ingestion pipeline is considered production-ready
- Bounding box coordinates from Document AI map directly to the PDF
  provenance pointer format (page + bounding box) — preserve these in the
  raw extraction output before normalizing
