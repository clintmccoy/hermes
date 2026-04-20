# ADR 014 — Adopt Adapted Shape Up as Hermes Development Methodology

**Date**: 2026-04-20
**Status**: Decided
**Deciders**: Clinton McCoy

---

## Context

Project Hermes is approaching the end of its initial exploratory phase. The
schema foundation (MMC-25 through MMC-33) is nearly complete, and we are about
to begin the first cycle of coordinated feature development that produces an
end-to-end usable product. Before that cycle starts, we need to codify *how*
we develop — a shared methodology that will govern cadence, planning artifacts,
and scope discipline through v1 and beyond.

The development context for Hermes is unusual and is the dominant factor in
methodology selection:

**Team composition is a solo non-technical founder paired with an AI
developer.** Clint (founder, designer, decision-maker, primary user) provides
product direction, shapes the work, and makes all product decisions. Claude
(the AI developer) writes code, co-authors specifications, and makes technical
decisions within agreed constraints. Future human developers are expected to
join only after v1 ships and real usage data exists.

**The product is novel.** Commercial real estate underwriting as an
AI-native, agentic product has no precedent to copy. Market-standard ARGUS
Enterprise is the status quo we are displacing, but we are deliberately not
replicating its workflow — we are redesigning the category. This means we
cannot fully specify v1 upfront; core product decisions can only be made after
we've built enough of the system to see what it becomes.

**Context continuity works differently for AI developers.** A human developer
carries state between sessions in memory — they resume Monday still knowing
what they were figuring out Friday. Claude's context does not persist that
way. Everything load-bearing must be written down, or it is lost between
sessions. Methodology choices that deprioritize documentation do not work for
us.

**Clint's time is the binding constraint on product direction.** Clint is
simultaneously running the Hermes build, evaluating real estate investments,
doing CRE consulting for income, and networking to build the product's
distribution. Every hour spent speculatively planning work two weeks in
advance is an hour not spent on work only Clint can do. Methodology must
minimize planning overhead relative to planning value.

**Future scalability matters.** Though we are a team of two today, the method
must be one that human developers joining later can onboard to and run. A
methodology that only works for two people creates a transition crisis later.

No methodology was previously codified. The CLAUDE.md file captured
session-startup discipline and commit/Linear hygiene, but not how cycles,
scopes, or planning artifacts work. Decisions were being made ad hoc.

---

## Decision

**Hermes adopts an adapted version of Shape Up (37signals / Ryan Singer) as
its development methodology.** The full methodology is codified in
`/docs/WORKFLOW.md`, which is the operational source of truth. This ADR
captures the decision to adopt it, the alternatives considered, and the
reasoning that future contributors should be able to recover when they ask
"why did Hermes choose to work this way?"

The adoption carries two deliberate adaptations to the canonical Shape Up
method. Both are direct responses to the context above.

### 1. Fixed 6-weeks-on, 2-weeks-off cadence

Cycles are 6 weeks of build time followed by 2 weeks of cool-down. This is
non-negotiable; cycle length may never be extended to accommodate unfinished
work. When a cycle's bet runs long, scope is cut — not time. Cool-down is
protected time during which no new feature work begins; it is used for
product dogfooding, shaping candidate pitches, and running the betting table
that selects the next bet.

The cool-down's dual purpose — rest from building *and* space to use the
product as a critical user — is deliberate and specific to Clint's
situation. Clint's parallel work as a CRE investor and consultant provides
both income and a real-world test environment for Hermes. Cool-down creates
the gap between "builder" and "user" modes that generates the insight needed
to shape the next bet.

### 2. Shape Up at the cycle level; waterfall-grade specs inside each scope, written just-in-time

Canonical Shape Up leaves detailed work decomposition to the build phase and
deliberately avoids upfront task lists. We agree with that at the cycle
level: the full cycle is never decomposed into tickets upfront, and the pitch
is the only planning artifact that exists at kickoff.

However, *inside* each scope, we write a detailed specification — outcome,
acceptance criteria, tech design, open questions, explicit out-of-scope
guardrails — before any code is written for that scope. These specs are
saved to `/docs/scopes/cycle-{N}/{scope-slug}.md` and versioned with the
repo.

This looks like waterfall inside the scope, and that is intentional. Written
specs are the primary mechanism by which Claude maintains context across
sessions. What feels like process overhead to a human team is, for our
team, the only way the work can be executed consistently. Just-in-time
timing prevents the specs from becoming speculative fiction — a spec is
written when its scope is the next thing to build, not weeks in advance.

### 3. Source-of-truth split: Notion / Linear / repo

- **Notion** holds pitches, bets, and cycle narrative.
- **Linear** holds executable work — scopes, tickets, cycle projects.
- **Repo** holds code, ADRs, scope specs, and this workflow methodology.
- **FigJam (or equivalent)** holds the hill chart for the life of each cycle.

No artifact lives in more than one system. Cross-system references are by
link, never by sync. This rule is motivated by the solo-team observation
that every duplicated artifact is a future source of confusion for a human
contributor joining later.

Linear is deliberately load-bearing even though the team is currently
Clint + Claude. A future developer joining Hermes should be able to
understand the current cycle's structure from Linear alone, with Notion as
deeper context.

### 4. Codification in /docs/WORKFLOW.md

The operational rules — pitch template, scope spec template, hill chart
ritual, scope-hammering triggers, cool-down activities, week-by-week cycle
lifecycle — live in `/docs/WORKFLOW.md`. That file is referenced from
`/CLAUDE.md` and loaded at the start of every Claude session. It is a
living document that evolves through PRs with reasoning, not through
silent edits.

---

## Rationale

**Why a methodology decision warrants an ADR.**
ADRs exist to record load-bearing decisions whose reasoning should be
recoverable later. How we choose to plan and execute work is as
consequential as any architectural choice, and future contributors will
ask "why 6 weeks and not 4? why Shape Up and not Scrum?" Writing this
down now, when the reasoning is fresh, preserves it.

**Why Shape Up over other agile variants.**
Shape Up's three core disciplines — fixed time, shaping before betting,
and no backlog — directly address the three failure modes most likely to
kill a solo founder's product: infinite scope drift, building the wrong
thing from an unshaped idea, and being owned by a never-shrinking list of
"someday" work. These are not failure modes Scrum or kanban protect
against; in fact, Scrum's story-point estimation and kanban's continuous
flow can quietly accelerate all three.

**Why not canonical Shape Up.**
Canonical Shape Up assumes a small human product team with ambient
learning — designers and developers who overhear each other, share a
physical or virtual room, and carry context forward through daily
interaction. Our team has none of that. Adaptation 2 (just-in-time
waterfall specs inside each scope) is the minimal accommodation that
preserves Shape Up's cycle-level discipline while giving Claude the
written memory it actually needs to execute.

**Why 6+2 and not 6+1 (Shape Up's canonical ratio).**
Canonical Shape Up uses a 6-week build cycle followed by a 2-week
cool-down at 37signals scale, but most public descriptions reference a
1-week cool-down for smaller teams. We chose 2 weeks deliberately: Clint's
parallel work requires dedicated "not building" time for CRE investing,
consulting income, and networking, *and* it provides the user-mode
dogfooding window that generates the insight needed to shape the next
bet. A 1-week cool-down is insufficient to fully disengage from builder
mode.

**Why name this adaptation explicitly rather than claim it's "just Shape
Up."**
Calling it adapted, and documenting the adaptations, matters for two
reasons. First, future contributors reading the Shape Up book will find
differences and should understand *why* we deviated — without the ADR,
they may "correct" the method back toward canonical form and break what
was load-bearing for us. Second, if we hire a human developer later and
find the waterfall-inside-scope adaptation no longer serves us, we want
the ability to revisit it cleanly rather than treat it as received
doctrine.

---

## Alternatives Considered

**Pure waterfall with a fixed v1 spec.**
Rejected. A full v1 specification written today would be fiction. Hermes
as an agentic CRE underwriting product has no precedent; the shape of the
right product is not knowable from the armchair. Month 2 of the build
will teach us something that invalidates the month-1 plan, and we will
either ignore the learning (ship the wrong thing) or trash the plan (and
feel bad about it). Additionally, the cost of producing a detailed v1
spec would consume weeks of Clint's scarcest resource — his attention —
with no commensurate benefit over iterative shaping.

**Canonical Shape Up (no waterfall adaptation inside scopes).**
Rejected on context-continuity grounds. Claude's lack of persistent
memory means undocumented in-cycle decisions are re-litigated every
session. For a human team, "we'll figure it out during the cycle" works
because people remember what they figured out. For our team, it doesn't.
The spec-per-scope adaptation is the minimal patch that makes Shape Up
workable with an AI developer as the dev seat.

**Scrum with 2-week sprints.**
Rejected. Scrum's 2-week cadence is too short to contain a meaningful
bet — most Hermes scopes will be 2–4 weeks by themselves, meaning a
Scrum sprint either splits scopes artificially (creating false
milestones) or becomes a cycle of 1 scope (indistinguishable from
kanban with ceremony added). Scrum's estimation rituals (story points,
velocity) also optimize for predictability of throughput, which is not
our primary concern — we already have fixed time; we don't need a proxy
metric for it.

**Kanban / continuous flow.**
Rejected. Continuous flow has no circuit breaker. Scope creep — the
single most likely failure mode for a solo founder — is not prevented
by any discipline in kanban; it is tolerated as "just another card."
The absence of a cadence also means there is no natural gap for
dogfooding or strategic re-thinking, which Clint's situation actively
requires.

**Ad hoc / "just keep shipping."**
Rejected. This is where we were before this decision, and it was
producing decisions that could not be defended or explained two weeks
later. The methodology question becomes more important, not less, as the
project approaches a stage where real users will hold us accountable to
a consistent product direction.

---

## Consequences

**Positive consequences.**

- The 6-week circuit breaker provides an enforced mechanism for cutting
  scope that neither pure waterfall nor continuous flow offers.
- Written scope specs give Claude consistent cross-session context and
  will serve as historical record for future human contributors reading
  the code months later.
- The no-backlog rule forces every cycle's bet to be chosen on its
  current merits rather than carried forward out of sunk-cost momentum.
- The Notion/Linear/repo split matches the natural shape of the
  artifacts and will make future-dev onboarding legible in Linear alone.
- The 2-week cool-down creates a structural gap for product-as-user
  insight that Clint's parallel CRE work makes uniquely valuable.
- The methodology is documented and referenceable (`/docs/WORKFLOW.md`
  + this ADR), so it can be debated, updated, or formally replaced
  rather than eroded silently.

**Negative consequences and mitigations.**

- Cool-down feels unproductive when a cycle has momentum. Mitigation:
  cool-down is codified as non-negotiable; Claude's job includes pushing
  back if Clint proposes shortening it.
- The betting table with only two people risks feeling theatrical.
  Mitigation: keep it lightweight until team size warrants more
  structure. WORKFLOW.md §11 explicitly leaves the betting ritual
  under-specified for this reason.
- Pre-v1 cool-downs cannot include product dogfooding because the
  product is not yet usable. The first and possibly second cool-downs
  will be skewed toward shaping-only. Mitigation: WORKFLOW.md should be
  updated after cycle 1 to note this transition, once we have real
  experience with it.
- Just-in-time scope specs create a latency cost at the start of each
  scope (30–60 minutes of spec writing before any code). Mitigation:
  this cost is paid in exchange for Claude's cross-session consistency
  and is meaningfully smaller than the cost of re-litigating decisions
  mid-build.
- The methodology requires Claude to actively push back against scope
  extensions, which can feel adversarial. Mitigation: frame pushback as
  a named role function, not a disagreement. Both parties have agreed in
  advance that Claude will hold this line.

**Neutral consequences deliberately left open.**

- The target number of scopes per cycle is undefined. It will emerge
  after 2–3 cycles of experience.
- The cycle retrospective format is undefined. It will be invented the
  first time we run one.
- The criteria for graduating the betting table to a more structured
  ritual are undefined. They will be set when we hire a first human
  developer.

---

## Revisit Triggers

This ADR should be revisited when any of the following occur:

- **After cycle 3.** A retrospective on the methodology itself, not
  just the product work. By cycle 3 we will have enough signal to
  distinguish adaptations that are load-bearing from adaptations that
  were cargo-culted.
- **First human developer hire.** Some adaptations (especially
  waterfall-grade specs inside scopes) were motivated specifically by
  Claude's context continuity needs and may be excessive for a team
  with human memory.
- **First paying customer at scale.** Customer commitments may impose
  cadence constraints (release timing, deprecation windows) that
  interact with the 6+2 rhythm.
- **Any cycle where the fixed-time rule is broken.** If we extend a
  cycle rather than cut scope, the methodology has either failed us or
  we have failed it. Either way the decision needs fresh review.
- **Team growth past four people.** Several of the "undefined"
  consequences above become binding at that scale and need explicit
  rules.

---

## References

- Ryan Singer, *Shape Up: Stop Running in Circles and Ship Work that
  Matters*, 37signals. [basecamp.com/shapeup](https://basecamp.com/shapeup)
- `/docs/WORKFLOW.md` — operational source of truth for the methodology
- `/CLAUDE.md` — session-startup protocol referencing WORKFLOW.md
- Conversation dated 2026-04-20 between Clint and Claude that surfaced
  the methodology trade-offs and settled the adaptations recorded here.
