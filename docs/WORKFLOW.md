# Hermes Development Workflow

**Status:** Active as of 2026-04-20
**Owner:** Clint McCoy
**Applies to:** All development work on Project Hermes

This document defines how we plan and build Project Hermes. It is the shared rulebook between Clint (founder, designer, decision-maker, primary user) and Claude (AI development partner), and it will be the starting point for onboarding any future human contributor. Read this before proposing a cycle plan, drafting a pitch, or changing the process.

---

## 1. Why Shape Up

Shape Up, developed at 37signals by Ryan Singer, is a product development method built around three disciplines we believe in.

**Fixed time, variable scope.** We commit to a duration — a cycle — not to a list of features. When work takes longer than expected, we cut scope; we never extend time. The cycle is a circuit breaker that forces honest prioritization.

**Shaping before betting.** No work starts until a rough solution has been sketched and its boundaries drawn. We bet on a shaped pitch, not on a vague idea and not on a detailed task plan. Shaping is deliberately lossy: enough detail to commit, not so much that we pretend to know the answer upfront.

**No backlog.** We don't carry an ever-growing list of "someday" work. Each cycle starts from a fresh betting table. Ideas that matter will come back; ideas that don't, won't. This is a feature, not a bug.

Shape Up was designed for small human product teams. Our context is different: a solo non-technical founder paired with an AI developer, with possible human contributors later. Two adaptations follow.

### Adaptation 1 — Waterfall-grade specs inside each scope, written just-in-time

Claude's context does not persist between sessions the way a human developer's does. Written acceptance criteria and tech-design notes are not ceremony — they are Claude's memory. So while we do not plan the whole cycle upfront, we do write a detailed spec for each scope *at the moment it becomes the next thing to build*. This gives us Shape Up's discovery at the cycle level and waterfall's precision at the execution level.

### Adaptation 2 — Solo-team structure

Solo operators need more structure, not less. There is no ambient team learning — no overheard hallway conversations, no shared lunch context. Everything that matters is written down. Notion holds pitches, bets, and cycle narrative. Linear holds executable work. The repo holds code, ADRs, and this document.

---

## 2. Cycle Cadence

Our rhythm is **6 weeks on, 2 weeks off**.

### Build cycle (6 weeks)
- Work the current bet.
- Write scope specs just-in-time as each scope starts.
- Update the hill chart weekly.
- Scope-hammer when scopes turn out to be bigger, harder, or wronger than expected.
- Week 5: no new scopes — only finish what's in flight.
- Week 6: polish, tests, docs, ship.

### Cool-down (2 weeks)
- **Step away from building.** Clint uses Hermes as a real user during CRE investment work, consulting, and networking. Product insight comes from dogfooding, not from meetings.
- Claude helps draft and pressure-test candidate pitches for the next cycle, runs research on open questions, tidies the repo, and updates docs — but does not start new feature work.
- Run the betting table at the end of cool-down. Pick the next bet. Prepare cycle kickoff.

Cool-down is not optional. It is where the next bet gets shaped, and it is where the product gets tested by its most critical user.

---

## 3. Roles

**Clint** — founder, designer, product decision-maker, primary user. Shapes pitches. Approves bets. Owns product direction. Non-technical by default, but in the loop on technical trade-offs when they're load-bearing to product.

**Claude** — development partner. Writes code, co-authors scope specs, makes technical decisions within agreed constraints, maintains the repo, flags scope creep. Holds the fixed-time discipline on behalf of the cycle — will push back when we're tempted to extend rather than cut.

**Future human developers (eventually)** — expected to join after v1 ships and we need more velocity. Their onboarding runs off this document + the repo + Linear.

No one plays "product manager." We don't have the overhead budget for it, and Shape Up doesn't need it.

---

## 4. Key Terms

**Pitch** — A written artifact proposing a problem to solve in the upcoming cycle. Lives in Notion. Approved at the betting table. See §7 for template.

**Appetite** — How much time the problem is worth. Not an estimate. The question is: *is this problem worth 6 weeks of our only cycle?* If yes, we bet. If no, we don't — and we do not then ask "well, how long would it take?"

**Bet** — An approved pitch. Once bet on, it becomes the cycle's work. Lives in Notion, linked to its Linear project.

**Scope** — A named unit of meaningful work inside a bet. Scopes have outcomes, not task lists. Examples: "Deal intake from PDF," "Underwriting model export." A cycle will have some number of scopes — we do not prescribe how many. The right number will emerge after a few cycles.

**Scope spec** — Written just before we start a scope. Contains acceptance criteria and rough tech design. Lives in the repo so it's versioned alongside the code. See §8 for template.

**Hill chart** — A visual showing each scope's position on the "figuring-it-out (uphill)" vs. "executing (downhill)" curve. Updated weekly. Lives in FigJam for the life of the cycle; archived at cycle end.

**Cool-down** — The 2-week gap between cycles. Used for dogfooding, shaping, and betting.

**Betting table** — The meeting (just Clint and Claude for now) at the end of cool-down where the next cycle's bet is chosen. Lightweight; no theater.

**Scope hammering** — Cutting or reshaping a scope mid-cycle when we discover it's bigger, harder, or wronger than we thought. A core discipline, not a failure.

**Circuit breaker** — The 6-week timer. If a bet doesn't ship in 6 weeks, it doesn't get an extension. We cut scope enough to ship something real, or we kill the bet and learn from it.

---

## 5. Artifacts & Where They Live

| Artifact | Location | Why |
|---|---|---|
| Pitch (draft and approved) | Notion | Shared thinking space, rich formatting, comment threads |
| Bet (approved pitch, linked to cycle) | Notion, linked to Linear project | Notion is narrative; Linear tracks execution |
| Scope (name + outcome) | Linear (parent issue or project) | So future devs see cycle structure in the execution tool |
| Scope spec (acceptance criteria + tech design) | `/docs/scopes/cycle-{N}/{scope-slug}.md` | Versioned alongside the code that implements it |
| Individual tickets | Linear | Standard ticket flow; see CLAUDE.md for Linear hygiene |
| Hill chart | FigJam (or equivalent visual tool) | Visual, disposable, a conversation artifact |
| ADRs | `/docs/adr/` | Already established |
| This workflow doc | `/docs/WORKFLOW.md` | Versioned; CLAUDE.md points here |
| Cycle retro notes | Notion | Format deliberately unspecified until we know what we need |
| Changelog | `/CHANGELOG.md` | Release history; updated per CLAUDE.md triggers |

**Rule:** each artifact has one home. We do not duplicate pitches into Linear, tickets into Notion, or tech designs into FigJam. Link between systems when necessary; don't sync.

**Why Linear matters even though Notion holds the narrative:** Linear is the execution source of truth for any future developer. They should be able to understand the current cycle's structure from Linear alone, with Notion as deeper context.

---

## 6. Lifecycle of a Cycle (Week-by-Week)

**Cool-down Week A (dogfooding)**
- Clint uses Hermes for real CRE underwriting and captures frustrations, gaps, and wins.
- Claude does not start new feature work. Cleanup, docs, research only.

**Cool-down Week B (shaping and betting)**
- Clint drafts candidate pitches in Notion.
- Claude pressure-tests each pitch: rabbit holes, technical risk, scope realism.
- Betting table at the end of the week: one pitch is chosen. Named scopes are drafted (best guess — they will change).
- Linear project created for the cycle, linked from the Notion bet page.

**Build Week 1**
- Spec scope #1 together (§8 template). Save to `/docs/scopes/cycle-{N}/{scope-1-slug}.md`.
- Generate Linear issues for scope #1 only (devplan, Claude, or hand-written).
- Start building.
- First hill chart entry on Monday (or at kickoff) — all scopes start uphill.

**Build Weeks 2–4**
- Execute scopes in sequence. Spec each scope *when it becomes next*, not in advance.
- Weekly hill chart update, 10 minutes.
- Scope-hammer when triggered (§9).

**Build Week 5 — freeze**
- No new scopes. Only finish what's in flight.
- If a scope won't finish, decide: cut, kill, or defer.

**Build Week 6 — polish and ship**
- Testing, bug fixes, documentation, release.
- Merge to main and deploy.
- Update `/CHANGELOG.md`.
- Archive the hill chart.
- Close the Linear cycle and the Notion bet page with outcomes noted.

Then 2 weeks of cool-down. Repeat.

---

## 7. Pitch Template

Every pitch has six sections. Keep each short — target under one page of Notion.

1. **Problem** — What real-world thing is broken or missing? Who feels it? Why now? Evidence: customer quotes, dogfooding observations, competitor gaps.
2. **Appetite** — 6 weeks. Always 6 weeks. The question is whether this problem is worth 6 weeks of our only cycle, not how long it would take.
3. **Solution sketch** — Rough idea of what we'll build. Breadboards or fat-marker sketches. Enough for Claude to see the shape — not full designs.
4. **Rabbit holes** — Known traps to avoid during the cycle. Example: "Don't try to support every PDF format — only the ones from the Top 10 brokers by deal flow."
5. **No-gos** — What's explicitly out of scope. Example: "Waterfall distributions are not included. That's a future cycle."
6. **Named scopes (best-guess)** — Candidate scopes we expect to work. Will change once the cycle starts. Don't over-invest here.

A pitch that can't be written in under a page probably hasn't been shaped enough. Send it back to shaping.

---

## 8. Scope Spec Template

Written by Clint + Claude together at the start of each scope — not upfront, not speculatively.

1. **Outcome** — One sentence. "A user can X."
2. **Acceptance criteria** — Bulleted, testable. What must be true for this scope to be done-enough.
3. **Tech design** — 3–10 bullets. Data model changes, new endpoints, key dependencies, risky integrations. Enough for Claude to execute consistently across sessions.
4. **Open questions** — What we don't know yet. These get resolved as we go.
5. **Out of scope for this scope** — Explicit guardrails. Prevents "while we're in there" creep.

Save to `/docs/scopes/cycle-{N}/{scope-slug}.md` before starting work. Commit it. Treat it as code.

---

## 9. During the Cycle

### Weekly hill chart update (10 minutes, Mondays)
For each scope, decide:
- **Uphill** — still figuring out the solution. Unknowns remain.
- **Over the top** — solution is clear, no more surprises expected.
- **Downhill** — executing. Mostly grinding toward done.
- **Done** — scope's acceptance criteria are met.

No status reports, no burndown charts. Just move the dots and have a conversation about any scope that hasn't moved in a week.

### Scope hammering — triggers
Cut or reshape a scope when:
- At week 3 it's still uphill — a core unknown remains, or the scope is too big.
- Estimated remaining work exceeds remaining cycle budget.
- We learn mid-cycle that the scope solves the wrong problem → kill it.

Scope hammering is the system working, not a failure. The 6-week circuit breaker only protects us if we actually use it.

### Definition of done-enough
A scope is done when it satisfies its acceptance criteria — not when it feels polished. Polish is week 6 or next cycle. Under fixed-time discipline, done-enough beats perfect every single time.

### Scope creep defenses
- If we're about to add work to a scope that wasn't in its spec, we ask: "Is this in scope for *this scope*, or is it a new scope, or is it a new cycle?" If it's not the first, it goes to the parking lot (a Notion page), not into the current work.
- Claude pushes back when Clint proposes adding to an in-flight scope. This is Claude's job.

---

## 10. Cool-down Activities

Two weeks. Rough allocation:

**Week A — use the product.** Clint dogfoods during real CRE work. Claude does not start new features. This week is for capturing insights, not building from them.

**Week B — shape and bet.** Draft candidate pitches. Pressure-test them together. Pick the next bet at the betting table.

Claude's cool-down role: pressure-test pitches, run research on open technical questions, tidy the repo, update docs, resolve low-risk tech debt. No new features. Cool-down discipline protects the cadence — without it, a 6-week cycle quietly becomes a 7-week cycle, then 8.

---

## 11. What's Intentionally Undefined

The following are deliberately left open until we have evidence from real cycles. We invent them when we need them, not before.

- **Number of scopes per cycle.** We'll find the natural number after 2–3 cycles.
- **Cycle retrospective format.** We'll invent it the first time we run it.
- **Exact betting table ritual.** It's just us for now — keep it lightweight.
- **When to hire.** Revisit once v1 is shipped and we have real usage data.
- **How to handle parallel pitches if we ever run them.** Not a concern at team-of-two scale.

If we hit a situation this document doesn't cover, we do the obvious thing, then decide afterward whether it's worth adding to the doc.

---

## 12. Evolving This Document

This doc is a living artifact, but it is not a scratchpad. Update it when:

- A cycle reveals a missing rule.
- A rule isn't working and needs to change.
- Our context changes (e.g., first human hire, first enterprise customer).

Changes go through a PR with reasoning in the commit message. Don't silently edit the rules — the *why* behind a change is the most valuable part of a process doc.

---

## 13. Further Reading

- Ryan Singer, *Shape Up: Stop Running in Circles and Ship Work that Matters* — [basecamp.com/shapeup](https://basecamp.com/shapeup). The source text. Read at least the first three chapters.
- `/docs/PRD.md` — Hermes product requirements. The what, not the how.
- `/docs/ARCHITECTURE.md` — System architecture reference.
- `/docs/adr/` — Architecture decision records. Create one for any load-bearing technical decision (see CLAUDE.md for the ADR threshold).
- `/CLAUDE.md` — Session-startup protocol, commit conventions, Linear hygiene, schema change protocol.
