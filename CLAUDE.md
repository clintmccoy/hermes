# CLAUDE.md — Hermes Project Instructions

This file is read automatically by Claude Code at the start of every session.
Follow all instructions here before touching any code or files.

---

## Session Startup Protocol

At the start of EVERY session, before doing anything else:

1. Run `git status` to understand current repo state
2. Run `git log --oneline -10` to orient on recent history
3. Check Linear for open/in-progress tickets assigned to current cycle
4. Review any in-progress tickets and understand where work left off
5. Confirm with the user what the goal of the session is before proceeding

Never start writing code without completing this orientation first.

---

## Commit Conventions

All commits must follow Conventional Commits format:

```
<type>(scope): <short description> [LINEAR-ID]

[optional body explaining WHY, not what]
```

Types: `feat`, `fix`, `docs`, `refactor`, `chore`, `test`, `style`

Examples:
- `feat(auth): add magic link login flow [HER-12]`
- `fix(dashboard): resolve null state on empty data [HER-24]`
- `docs(adr): add decision record for Posthog integration [HER-31]`

Rules:
- Always reference the Linear ticket ID at the end of the subject line
- Body should explain WHY the change was made, not what changed
- Keep subject line under 72 characters
- Never commit with message "WIP", "fix", "update", or similar vague messages

---

## Linear Hygiene Rules

These rules apply at the end of EVERY session, without exception:

- Move any in-progress tickets to the correct state before ending
- Add a progress comment to any ticket worked on during the session
- Create new tickets for any work discovered during the session
- Never end a session with Linear in a stale or inaccurate state
- Link every ticket to its relevant commit(s) before closing

Ticket states: `Backlog` → `Todo` → `In Progress` → `In Review` → `Done`

---

## Documentation Update Triggers

Update the following docs when these events occur:

| Event | Update |
|---|---|
| New architectural decision made | Create new ADR in /docs/adr/ |
| PRD scope changes | Update /docs/PRD.md, bump version in version table |
| New environment variable added | Update .env.example with description |
| Setup process changes | Update /docs/ONBOARDING.md |
| Any release or milestone | Update CHANGELOG.md |
| System architecture changes | Update /docs/ARCHITECTURE.md |

---

## Stack Reference

- **Framework**: TBD — update this when decided
- **Database**: Supabase (Postgres)
- **Auth**: Supabase Auth
- **Hosting**: Vercel
- **Error Monitoring**: Sentry — NOT YET CONFIGURED. Create a Linear ticket when ready.
- **Analytics**: Posthog — NOT YET CONFIGURED. Create a Linear ticket when ready.
- **Repo**: clintmccoy/hermes

---

## Connected MCP Tools

The following MCP tools are available in every session:

- **GitHub** — repo management, commits, PRs, issues
- **Linear** — ticket management, cycles, project tracking
- **Supabase** — database, auth, storage management
- **Vercel** — deployments, environment variables
- **Notion** — documentation and notes if needed
- **Google Drive** — file access and sharing
- **Gmail / Google Calendar** — communications if needed

---

## Key Principles

- **Repo is source of truth** — all decisions, docs, and context live in the repo
- **Linear reflects reality** — never let tickets drift from actual state
- **Why > What** — commit messages and comments explain reasoning, not just actions
- **No surprises** — flag any scope changes, blockers, or unexpected complexity immediately
- **Security first** — never commit secrets, always use environment variables
- **ADRs are mandatory** — every significant technical decision gets a record

---

## Sensitive Files — Never Commit

- `.env` or any file containing real secrets
- Supabase service role keys
- Any API keys or tokens
- Files matching patterns in .gitignore
