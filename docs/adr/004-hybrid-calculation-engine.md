# ADR 004 — Hybrid Calculation Engine

**Date**: 2026-04-10
**Status**: Decided
**Deciders**: Clinton McCoy

---

## Context

Hermes's financial calculation engine must be both interactive (real-time
responsiveness in the Analyst Studio UI, where analysts adjust inputs and
see outputs update immediately) and authoritative (server-side execution
for provenance recording, stored results, and reproducible exports). These
two requirements are in tension: pure server-side execution creates latency
that makes the UI feel like a form, not an analytical tool.

## Decision

Use a hybrid execution model:

- **Client-side engine**: Declarative module specs executed in the browser
  for real-time UI responsiveness during interactive editing
- **Server-side engine**: Authoritative execution of the same specs for all
  stored results, provenance records, and export generation
- **Background jobs**: Trigger.dev tasks for compute-intensive runs
  (multi-scenario batch, future stochastic modeling)

Module specs are the shared artifact — a declarative definition of each
financial module's typed inputs, outputs, and computation logic that can
be executed in both environments.

## Rationale

- Client-side execution gives analysts spreadsheet-like responsiveness;
  critical for adoption among Excel-trained users
- Server-side execution guarantees that all stored results are reproducible
  and that provenance records are generated under controlled conditions
- Declarative module specs enable the AI orchestration layer to compose
  model configurations without executing arbitrary code
- Background jobs handle the compute ceiling without blocking the UI

## Alternatives Considered

- **Pure server-side**: Correct provenance, poor interactive UX; every
  input change requires a round-trip
- **Pure client-side**: Fast UX, but no server-side provenance guarantee;
  synchronization between client state and stored results is fragile
- **Separate Python microservice**: Better numerical computing library
  support (NumPy, pandas), but premature architectural complexity for v0;
  revisit if stochastic modeling requires it

## Consequences

- Module execution logic must be maintained in two environments; keep a
  single canonical spec format and generate/compile for each target
- Client-server sync requires careful design — the server is always the
  source of truth for stored results; client state is ephemeral until
  the analyst saves or exports
- Module interface spec (typed inputs/outputs) must be locked before the
  engine is built — it is the foundation of the data schema
