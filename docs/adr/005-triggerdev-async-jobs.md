# ADR 005 — Trigger.dev for Async Job Infrastructure

**Date**: 2026-04-10
**Status**: Decided
**Deciders**: Clinton McCoy

---

## Context

Several core Hermes workflows are long-running async processes that cannot
execute within a synchronous request/response cycle:

- Document ingestion and parsing (large PDFs, OCR pipelines)
- AI extraction agent runs (per-document, potentially minutes per document)
- Multi-scenario model execution
- Excel export pack generation

These processes need queue management, retry logic, observability, and the
ability to stream progress updates back to the analyst's UI in real time.

## Decision

Use Trigger.dev v3 as the async job infrastructure.

## Rationale

- **Persistent task runners**: Unlike serverless functions, Trigger.dev v3
  tasks are not subject to execution time limits — critical for large
  document ingestion that may run for several minutes
- **Realtime streaming**: Built-in ability to emit progress events from
  running tasks directly to the UI — exactly what's needed for "ingesting
  a 200-page appraisal" feedback loops
- **Self-hosting option**: Trigger.dev is open source and can be self-hosted;
  important for future enterprise customers with data residency requirements
- **AI workflow primitives**: Native support for AI agent orchestration
  patterns in the SDK
- **TypeScript/Next.js native**: First-class integration with the Hermes stack

## Alternatives Considered

- **Inngest**: Clean event-driven model, excellent DX, but cloud-only (no
  self-hosting) and serverless function time limits would constrain large
  document processing; rejected on the time-limit constraint alone
- **Supabase Edge Functions**: Too limited for complex, long-running workflows
- **Custom queue (BullMQ, etc.)**: More control but significant engineering
  overhead for retries, observability, and UI streaming

## Consequences

- Trigger.dev is a managed service dependency for v0; self-hosting is
  available if needed for enterprise
- All long-running processes must be designed as Trigger.dev tasks from day
  one — not retrofitted later
- Progress streaming to the Analyst Studio UI requires the Realtime feature;
  design the UI components to consume task events
