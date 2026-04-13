# ADR 010 — v0 Agentic Architecture

**Date**: 2026-04-13
**Status**: Decided
**Deciders**: Clinton McCoy
**Revisit trigger**: First live pilot customers — real cost and latency data will inform whether these decisions hold

---

## Context

Hermes is an AI-orchestrated underwriting platform. Every core workflow —
document ingestion, financial model construction, scenario analysis — involves
AI reasoning. Before building the orchestration layer, we need to lock five
architectural decisions:

1. Which model serves as the primary executor
2. How we access higher-order reasoning without blowing the cost model
3. How many agents we run for v0
4. Where humans remain in the loop
5. How async execution fits together

The decisions below were informed by Anthropic's Advisor Strategy pattern
(published April 9, 2026), which introduced a native API primitive for
pairing a capable advisor model with a faster executor model within a single
request context — no handoffs, no coherence breaks.

The agentic architecture brief (docs/agentic-architecture-brief.md) provided
the research foundation for these decisions. Refer to it for the full option
analysis.

---

## Decision 1 — Primary Executor: Claude Sonnet (version-pinned)

**Decision:** `claude-sonnet-4-6` is the v0 executor for all agent workflows.

**Rationale:** Sonnet handles the majority of Hermes's AI work well — structured
extraction, pro forma composition, standard financial reasoning, user-facing
conversation. Opus-class reasoning is overkill for these tasks and would
destroy margin. Haiku is too weak for the document complexity we're handling.
Sonnet is the right default.

Version pinning rules from ADR 007 apply without exception. Every AI action
records the exact model version string (`claude-sonnet-4-6`, not
`claude-sonnet-latest`) as part of its provenance record.

**Consequences:**
- Model version must be a required field on every agent action event stored
  in Supabase, not an optional annotation
- When we upgrade to a newer Sonnet version, existing records remain tied to
  the model that produced them — the upgrade is an explicit decision, not a
  silent drift

---

## Decision 2 — Advisor Model: Claude Opus via the Advisor Strategy

**Decision:** Declare `claude-opus-4-6` as the advisor using Anthropic's
`advisor_20260301` tool primitive. The advisor is available to the Sonnet
executor but never calls tools or produces user-facing output directly.

**Where the advisor is invoked:**
- Ambiguous or structurally unusual document extraction (flex office
  agreements, STR revenue structures, management agreements — anything that
  falls outside standard lease-by-lease paradigm)
- Novel operating model composition decisions (which financial modules to
  assemble, and how)
- Strategic mix optimization analysis (the highest-value, highest-complexity
  use case)
- Any step where the executor expresses uncertainty or encounters a structure
  it hasn't seen

**`max_uses` caps by workflow type:**

| Workflow                        | `max_uses` cap |
|---------------------------------|----------------|
| Back-of-Envelope Screen         | 2              |
| First-Run Analysis              | 5              |
| IC-Grade Scenario Analysis      | 10             |
| Strategic Mix Optimization      | 20             |
| Stochastic / Monte Carlo        | TBD at build   |

Caps are tunable internally without changing customer-facing pricing. They are
a cost-protection lever, not a capability limit — raise them if real data shows
the defaults are too conservative.

**Provenance requirement:** Every analysis job records advisor model version,
number of advisor invocations, and advisor tokens consumed alongside executor
tokens. This feeds internal cost-per-credit calibration and surfaces if Opus
is being called more than expected.

**Rationale:** The Advisor Strategy gives us Opus-quality reasoning exactly
where it's needed, within a single coherent context window, at a fraction of
the cost of routing all work through Opus. This is the right architecture for
a credit-priced product — cost scales with the complexity of what the user
is actually doing, not a flat Opus rate on everything.

**Alternatives considered:**
- **Opus everywhere for v0:** Simpler, but cost model breaks under any real
  usage volume. Monte Carlo runs alone would make this untenable.
- **Complexity routing (Haiku → Sonnet → Opus):** Adds routing logic, produces
  coherence breaks at handoffs, and requires a routing classifier that itself
  needs to be maintained. The Advisor Strategy is strictly better.
- **Sonnet only, no advisor:** Fine for standard assets; fails on the edge
  cases that are Hermes's primary wedge. Not acceptable.

---

## Decision 3 — Agent Topology for v0: Single Orchestrating Agent

**Decision:** v0 runs one orchestrating agent per analysis job, not a
multi-agent system.

The agent is a Trigger.dev background job with a defined tool set:
- Read and parse ingested documents (via Google Document AI output in Supabase)
- Query deal context from Supabase
- Write extracted inputs and provenance records to Supabase
- Invoke the hybrid calculation engine (client-side for preview, server-side
  for authoritative results)
- Emit progress events for real-time streaming to the Analyst Studio UI

**Rationale:** We do not yet know where the natural seams in the orchestration
are — what sub-tasks benefit from isolation, what requires shared context, what
can run in parallel. Building a multi-agent topology now would mean
architecting around assumptions we can't validate before going live. A single
orchestrating agent is simpler to build, debug, audit, and iterate on. We
graduate to multi-agent in v1, informed by real usage patterns.

**Revisit condition:** Multi-agent becomes worth pursuing when we can observe:
(a) specific sub-tasks where a dedicated agent would run faster or cheaper in
isolation, or (b) workflows that genuinely benefit from parallel agent execution
(e.g., simultaneous extraction of multiple documents in a large deal package).

---

## Decision 4 — Human Checkpoints: Two Mandatory Gates in v0

**Decision:** Every analysis job has two hard human checkpoints before
producing final output.

**Gate 1 — Post-Extraction Review (before model construction):**
The agent surfaces everything it extracted: rent rolls, lease terms, operating
assumptions, any inferred values. The user confirms, corrects, or adds context
before the agent proceeds to build the financial model. The agent does not
proceed until the user explicitly approves or edits this output.

**Gate 2 — Post-Construction Review (before final output):**
The agent presents its composition logic and key assumptions — which modules
it assembled, what growth rates and discount rates it applied, what it
couldn't determine and left as defaults. The user can override before the
model is finalized and stored.

**Rationale:** v0's primary trust-building job is proving to analysts that
Hermes isn't a black box. Two explicit review gates make the agent's reasoning
visible and correctable. They also generate structured feedback data — every
correction at Gate 1 or Gate 2 is a labeled training signal about where the
agent got something wrong.

Automated validation (self-auditing agent checking for hallucinations and
logical coherence) is deferred to v1. Human checkpoints are the audit
mechanism for v0.

**Consequences:**
- The Analyst Studio UI must support a "review and confirm" interaction state
  for both gates — not just output display
- Analysis jobs cannot be fully fire-and-forget in v0; they require user
  presence at two points
- Gate 1 and Gate 2 confirmation events must be stored with timestamps in
  Supabase — they are part of the provenance record

---

## Decision 5 — Async Execution: All Analysis Jobs via Trigger.dev

**Decision:** Every analysis job — ingestion, extraction, model construction,
scenario runs — executes as a Trigger.dev v3 background job. Confirmed in
ADR 005; this ADR records how that decision applies to the agentic layer
specifically.

**Streaming:** Trigger.dev Realtime streams progress events to the Analyst
Studio UI. The user sees job status, current step, and gate prompts in real
time — they are never staring at a spinner with no feedback.

**Job structure for a standard First-Run Analysis:**

```
1. Ingest & parse documents          [Trigger.dev step]
2. Extract inputs (Sonnet + Opus)    [Trigger.dev step + Realtime events]
   → Gate 1: user review & confirm
3. Compose financial model           [Trigger.dev step]
   → Gate 2: user review & confirm
4. Run authoritative calculation     [Trigger.dev step]
5. Store results + provenance        [Trigger.dev step]
6. Notify user, unlock output        [Trigger.dev step]
```

**Consequences:**
- Human gates (Decision 4) are implemented as Trigger.dev wait steps — the
  job suspends and resumes on user confirmation, consuming no compute while
  waiting
- Deducting analysis credits happens at step 6 (after successful completion),
  not at job start — failed jobs do not consume credits
- BOE screens may be fast enough to run synchronously; evaluate at build time

---

## What This ADR Does Not Decide

- **Automated hallucination detection / self-auditing agent:** Deferred to v1.
  Human checkpoints (Decision 4) are the v0 mechanism.
- **Multi-agent topology:** Deferred to v1 (see Decision 3 and the v1 hypothesis
  section below).
- **Stochastic / Monte Carlo advisor cap:** Left as TBD pending build — this
  workflow's cost profile needs empirical data before we set a cap.
- **Provider diversification:** Anthropic Claude is the sole provider for v0
  per ADR 007. Google Gemini and others are future candidates for specialist
  agents.
- **Proactive background agents:** A separate category of agents — time-triggered
  or event-triggered, not initiated by user action — is not addressed by this
  ADR. This includes customer success / re-engagement bots (e.g. flagging stale
  deals, surfacing market changes) and internal ops agents (e.g. onboarding
  completion, deal quality review, sharing triggers). These will run as
  independent Trigger.dev scheduled or event-driven jobs and require their own
  architectural treatment. See docs/hypotheses/HYP-T002-v1-agent-roles.md for
  the current hypothesis on agent topology.
- **Co-analyst / conversational agent architecture:** The co-analyst UX is
  in-scope for v0 as a product surface, but its agent architecture (memory
  model, context window management, handoff protocol with pipeline agents) is
  not specified here. The co-analyst is a reactive conversational agent, not a
  pipeline agent — its design constraints differ from the background job model
  this ADR governs.

---

## v1 Multi-Agent Topology Hypothesis

This section captures our current best hypothesis for the v1 agent architecture,
to be validated against real v0 usage data. It is a hypothesis, not a decision —
see docs/hypotheses/HYP-T002-v1-agent-roles.md for scoring and validation plan.

We anticipate graduating from a single orchestrating agent to a topology with
four distinct agent categories:

**Category 1 — Pipeline Agents** (analysis job execution)
These run as Trigger.dev background jobs, sequenced by an orchestrator.
Hypothesized specialist roles:
- `document-parser`: ingestion and structured extraction from deal documents
- `model-maker`: financial module assembly and pro forma composition
- `financial-analyst`: scenario analysis, sensitivity, strategic mix optimization
- `formatter`: output rendering, report generation, export formatting
- `orchestrator`: routes work to specialists, manages gates, emits progress events

**Category 2 — Conversational Agent** (co-analyst UX)
Reactive to user input; maintains deal context across a session. Receives
proactive insights surfaced by Category 3 agents and relays them to the user.
Requires a different memory and context model than pipeline agents.

**Category 3 — Proactive Background Agents** (autonomous, event/time-triggered)
Not initiated by user action. Hypothesized roles:
- `cs-agent` (clawdbot): monitors live deals; flags stale deals, surfaces market
  changes, suggests next actions; hands insights to the co-analyst for delivery
- `deal-quality-agent`: pre-delivery sanity check against historical benchmarks;
  flags outlier assumptions before the model is finalized

**Category 4 — Internal Ops Agents** (Hermes business operations)
Drive activation, retention, and organic growth. Hypothesized roles:
- `onboarding-agent`: detects accounts that haven't completed a first analysis;
  triggers re-engagement sequence
- `sharing-agent`: surfaces export and sharing options at deal completion;
  generates branded one-pager for IC/LP distribution (organic distribution vector)

The natural seams between these roles — and whether they warrant true agent
isolation or are better implemented as functions within a single orchestrator —
will be informed by v0 usage patterns. The revisit trigger for this hypothesis
is first live pilot customer data.

---

## Consequences Summary

- Data schema must include: executor model version, advisor model version,
  advisor invocation count, advisor tokens, Gate 1 confirmation event, Gate 2
  confirmation event — on every analysis job record
- Analyst Studio UI requires a "review and confirm" interaction state, not
  just output rendering
- Credit deduction logic ties to job completion, not job start
- Trigger.dev wait steps are the implementation primitive for human gates
- All five decisions carry a revisit flag: **first live pilot customers.**
  Real cost data, real latency data, and real analyst behavior will tell us
  what to change.
