# ADR 007 — Anthropic Claude as AI Provider with Model Version Pinning

**Date**: 2026-04-10
**Status**: Decided
**Deciders**: Clinton McCoy

---

## Context

Hermes requires an AI provider for document extraction, model orchestration,
AI-inferred assumptions, and user-facing conversational interfaces. Because
Hermes's core promise is auditability and provenance, extraction results must
be reproducible — re-running an extraction later must not silently produce
different values due to a model upgrade.

## Decision

Use Anthropic Claude as the primary AI provider for v0.

Every AI-generated value (extracted, inferred, or reasoned) must record the
exact model version string that produced it (e.g., `claude-sonnet-4-6`) as
part of its provenance record. Model upgrades are explicit events — a re-
extraction under a new model version creates a new ExtractedInput record
rather than overwriting the existing one.

## Rationale

- Best-in-class document understanding and structured output quality for the
  CRE document types Hermes handles
- Native development environment integration
- Model version pinning is straightforward via the API's model parameter —
  Anthropic maintains older model versions for a defined period

**Why version pinning matters (user-facing):** If an analyst extracts a rent
figure today and re-runs the extraction six months later after a model
upgrade, the new model might read the same document differently. Without
pinning, the analyst has no way to know whether their model changed because
the document changed or because the AI "thinks differently now." Pinning
makes the provenance record trustworthy across time.

## Model Selection and Advisor Strategy

Model selection for v0 — which Claude model serves as executor, and how the
Opus advisor is invoked — is covered in ADR 010 (v0 Agentic Architecture).
This ADR covers the provider choice and version pinning principle; ADR 010
covers how those models are deployed in practice.

## Future Direction

- Different specialist agents may use different providers (e.g., Google
  Gemini for Google-native document types)
- Build in provider redundancy over time
- Potentially allow users to link their own AI provider accounts, with
  compute billed directly to their account rather than through Hermes
  (see PRODUCT_NOTES.md — Pricing Model Ideas)

## Alternatives Considered

- **OpenAI GPT-4o**: Comparable quality; rejected for v0 in favor of
  native environment integration; may be added as redundancy provider
- **Google Gemini**: Strong document understanding, natural fit with
  Google Document AI; candidate for future specialist agents
- **Multi-provider from day one**: Premature for v0; adds orchestration
  complexity before the core product is proven

## Consequences

- Model version string must be a required field on every AI action, extracted
  input, and reasoned assumption in the data schema
- When Anthropic deprecates a model version, existing provenance records
  remain valid — they describe historical extraction events, not live
  capabilities
- Monitor token costs carefully; document ingestion for large deal packages
  can generate significant volume
