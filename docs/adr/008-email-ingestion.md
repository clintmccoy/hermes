# ADR 008 — Email as Primary Ingestion Channel

**Date**: 2026-04-10
**Status**: Decided
**Deciders**: Clinton McCoy

---

## Context

The SLIP framework's target first experience is: forward a broker email
with an OM attached → receive a formatted deal screen within minutes, with
no account setup required before first value is delivered. Email is also
the primary channel through which deal materials arrive in real CRE
workflows. Hermes must treat email as a first-class input channel, not an
afterthought.

## Decision

**v0**: Single inbound email address (e.g. `deals@hermes.app`) configured
via Postmark or Resend inbound parsing. Every email to that address:
1. Triggers the deal ingestion pipeline via webhook
2. Parses the email body as Tier 4 (conversational) source content
3. Extracts and routes attachments through the appropriate ingestion tier
   based on document type detection
4. Sends the user a confirmation reply with a link to track ingestion progress

**Future**: Per-company subdomain routing (`deals@company.hermes.app`) using
the email provider's subdomain routing features — the same upgrade path used
by tools like Pipedrive and Apollo.io.

## Rationale

- Minimal v0 implementation — single address, single webhook, leverages
  existing email provider infrastructure
- Email body content is a valuable Tier 4 source (broker guidance,
  pricing notes, market commentary communicated informally)
- Subdomain routing is a natural, non-breaking upgrade path; nothing built
  for v0 blocks it
- Postmark and Resend both support inbound webhooks with attachment handling
  at no significant additional cost

## Long-term Vision

Hermes eventually functions like a deal team member cc'd on all deal
communications — building context over time from every email thread, just
as an analyst would. The v0 capability (manual forwarding to a single
address) is the first step toward that vision.

## Alternatives Considered

- **Custom SMTP server**: Full control but significant engineering for
  reliability, spam handling, and attachment parsing
- **AWS SES inbound**: Capable but adds AWS dependency and more complex
  setup than a purpose-built email API
- **Gmail API integration**: Would allow reading from the user's existing
  inbox, but requires OAuth, raises privacy concerns, and is more complex
  than an inbound webhook

## Consequences

- DNS configuration (MX record) required before launch for the inbound address
- Email body must be classified and stored as a Tier 4 source with the
  sender, timestamp, and message ID as the provenance pointer fields
- Attachment type detection must run before routing to the appropriate
  ingestion tier — not all attachments will be recognized document types
