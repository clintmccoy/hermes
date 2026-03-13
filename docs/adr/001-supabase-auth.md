# ADR 001 — Supabase Auth for Authentication

**Date**: 2026-03-13
**Status**: Decided
**Deciders**: Clinton McCoy

---

## Context

Hermes requires user authentication. We needed to choose an auth solution
that integrates cleanly with our existing backend choice (Supabase) and
minimises third-party dependencies.

## Decision

Use Supabase Auth as the sole authentication provider.

## Rationale

- Already using Supabase for the database — same platform reduces complexity
- Supabase Auth supports multiple methods: email/password, magic link, OAuth providers
- Row-level security (RLS) in Supabase Postgres integrates directly with Supabase Auth users
- No additional service, billing, or SDK to manage
- Free tier is sufficient for launch-scale usage

## Alternatives Considered

- **Auth0**: More features but adds cost, complexity, and a third-party dependency
- **NextAuth / Auth.js**: Framework-level solution, more flexible but more code to maintain
- **Clerk**: Good DX but another paid dependency; overkill for this stage

## Consequences

- Auth is tightly coupled to Supabase — migrating away from Supabase later would require
  replacing auth at the same time
- RLS policies must be designed carefully using `auth.uid()` from day one
- Auth methods to enable: [ TBD — decide email/password vs magic link vs OAuth ]
