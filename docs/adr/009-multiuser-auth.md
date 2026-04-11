# ADR 009 — Multi-User Auth and Shared Link Access from Day One

**Date**: 2026-04-10
**Status**: Decided
**Deciders**: Clinton McCoy

---

## Context

The PRD's viral growth loops depend on shared model links working for
recipients who do not have a Hermes account. A broker sends an interactive
model link to 20 prospective buyers — those buyers must be able to view
and interact with the model without signing up first. This is the Figma
model: sharing is embedded in the workflow because recipients need it to
do their job.

Additionally, CRE deals inherently involve multiple parties (analyst, PM,
IC members, lender, broker). Multi-user access is a Day 1 product reality,
not a future enterprise feature.

## Decision

Multi-user from day one.

- **Authenticated users**: Supabase Auth handles all registered users.
  Authentication methods TBD (email/password, magic link, OAuth — see
  ADR 001 for Supabase Auth context).
- **Shared link access**: Deal models are shareable via unique links with
  tiered permissions: View-only (no account required), Comment (account
  required), Edit (account required). View-only recipients can explore
  the model — assumptions, scenarios, provenance — without any Hermes
  account.
- **Org-level RLS**: All deal data is scoped to an organization from day
  one using Supabase Row Level Security. Cross-org data is never accessible
  regardless of auth state.
- **Anonymous viewer sessions**: Tracked for conversion metrics (shared
  link views → signups) per the PLG strategy.

## Rationale

- The broker distribution loop (Loop 2 in the PRD) does not function if
  recipients need an account to view a model; this is non-negotiable for
  the growth strategy
- Retrofitting multi-user and shared links after a single-user v0 would
  require significant RLS and data model changes — far more expensive than
  designing for it correctly from the start
- Org-level data isolation is a security and compliance requirement that
  institutional CRE clients will ask about before signing; must be correct
  from day one

## Consequences

- RLS policies must be designed carefully using `auth.uid()` and an org
  membership table — every table that holds deal data needs org-scoped
  policies
- Shared link tokens need secure generation (cryptographically random),
  expiry logic, and revocation capability
- Anonymous viewer sessions must not be able to trigger any write operations
  or expose any data outside the specific shared deal
- Auth methods (email/password vs. magic link vs. OAuth) remain TBD per
  ADR 001 — decide before the auth UI is built
