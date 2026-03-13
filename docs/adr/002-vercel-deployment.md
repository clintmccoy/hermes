# ADR 002 — Vercel for Hosting and Deployment

**Date**: 2026-03-13
**Status**: Decided
**Deciders**: Clinton McCoy

---

## Context

Hermes needs a hosting and deployment platform. We needed something with
minimal DevOps overhead, good CI/CD out of the box, and compatibility
with our likely frontend framework choices.

## Decision

Use Vercel as the hosting and deployment platform.

## Rationale

- Zero-config CI/CD — every push to `main` deploys automatically
- Preview deployments on every branch/PR — critical for testing before merging
- Native integration with Next.js (likely framework choice)
- Environment variable management built in
- Generous free tier sufficient for pre-launch and early-stage usage
- Edge functions available if needed later

## Alternatives Considered

- **Netlify**: Nearly identical feature set; Vercel preferred due to stronger
  Next.js integration and deployment performance
- **Railway / Render**: Better for server-heavy apps; overkill if using Supabase
  as the backend
- **AWS / GCP**: Far more powerful but requires significant DevOps investment
  inappropriate for this stage

## Consequences

- Deployment workflow is fully managed — less control but far less overhead
- Free tier has usage limits; will need to monitor as traffic grows
- Environment variables must be configured in Vercel dashboard for each environment
  (development, preview, production) — see .env.example for required variables
