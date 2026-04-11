# ADR 003 — Next.js (App Router) as Frontend Framework

**Date**: 2026-04-10
**Status**: Decided
**Deciders**: Clinton McCoy

---

## Context

Hermes needs a React-based frontend framework. Vercel is the hosting platform.
The Analyst Studio is a complex, data-heavy UI requiring SSR for initial load
performance, real-time updates for the calculation engine, and API routes for
server-side logic.

## Decision

Use Next.js with the App Router and TypeScript as the frontend framework.

## Rationale

- First-party Vercel integration — zero-config deployments, preview environments,
  edge function support
- App Router handles complex nested layouts and server-side data fetching patterns
  well, which maps directly to the Analyst Studio's module-based structure
- TypeScript is non-negotiable for a financial product where type safety prevents
  silent calculation errors
- Largest React ecosystem — component libraries, data-fetching, and tooling all
  have Next.js-native support
- Shadcn/ui (chosen component library) is designed around Next.js

## Alternatives Considered

- **Remix**: Strong data model, good DX, but less native Vercel integration and
  smaller ecosystem
- **Vite + React SPA**: Faster dev server, but loses SSR/SSG benefits and
  requires separate API layer
- **SvelteKit**: Excellent performance, but smaller ecosystem and team familiarity
  risk for a complex financial UI

## Consequences

- App Router is relatively new — some third-party libraries may lag on RSC support;
  evaluate on a case-by-case basis
- Server Components vs. Client Components distinction requires deliberate
  architecture decisions per feature
- Preview deployments on every branch via Vercel are a significant workflow benefit
