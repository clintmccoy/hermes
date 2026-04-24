# CLAUDE.md — Project Hermes

## Session startup

Before anything else:

1. `rm -f .git/index.lock` — clear any stale lock left by the previous sandbox session, then `git status` and `git log --oneline -10`.
2. Check Linear for open/in-progress tickets in the current cycle.
3. Confirm the session goal with Clint before writing code.
4. First session of a new cycle: re-read `/docs/WORKFLOW.md` and the current bet page in Notion.

## Workflow

Adapted Shape Up. 6 weeks on, 2 weeks cool-down. Fixed time, variable scope — cut, don't extend. No cross-cycle backlog. Specs are written just-in-time per scope and saved to `/docs/scopes/cycle-{N}/{scope-slug}.md` before any code. Full rules in `/docs/WORKFLOW.md` — re-read when the cycle state is unclear.

## Source-of-truth split

- **Notion** — pitches, bets, cycle narrative, raw daily research log.
- **Linear** — execution (tickets, cycles). Ticket prefix: `MMC-`.
- **Repo** — code, ADRs, scope specs, workflow docs, curated research synthesis.

## Research locations

- **Raw daily research** → Notion: [Autonomous Research Log](https://www.notion.so/c0dd97723d414c999e4a706773282636) (one page per scheduled task run; auto-generated; time-ordered).
- **Curated synthesis** → `docs/RESEARCH.md` in the repo (hand-edited; updated when a finding is worth keeping permanently; never auto-appended).

## Load-on-demand protocols

- **Commits** — Conventional Commits; subject ends with `[MMC-N]`. Full spec: `/docs/COMMITS.md`.
- **Linear hygiene** — at end of every session, update ticket states, comment progress, and create tickets for discovered work. Full rules: `/docs/LINEAR.md`.
- **Schema changes** — STOP. Read `/docs/SCHEMA-PROTOCOL.md` before writing any migration SQL. Design is approved in plain English before any SQL is written.

## Stack

Supabase (Postgres + Auth). Vercel. Repo `clintmccoy/hermes`.

## Doc update triggers

Create an ADR in `/docs/adr/` for significant architectural decisions. Update `/docs/PRD.md` on scope changes, `.env.example` on new env vars, `/docs/ONBOARDING.md` on setup changes, `CHANGELOG.md` on releases, and `/docs/ARCHITECTURE.md` on structural changes. Workflow-rule changes go through a PR to `/docs/WORKFLOW.md` with reasoning.

## Principles

Flag surprises immediately. Never commit secrets. Push back on scope creep inside a cycle — scope hammering is a feature.
