# Scope Spec — Deal Intake

**Cycle:** 1 — 2026 (Ingest → Review → Structured Output)
**Linear parent:** [MMC-40](https://linear.app/mccoymc/issue/MMC-40)
**Status:** Approved, awaiting implementation tickets
**Author:** Clint + Claude
**Date:** 2026-04-21

---

## 1. Outcome

A user can create a deal, upload one or more documents to it, classify the deal's asset type and business plan at create time, and click **Analyze** when they're ready to kick off extraction — with the agent ingesting all uploaded documents as a single batch.

---

## 2. Acceptance criteria

- **Deal creation** — A signed-in user can create a new deal from the dashboard. The create form captures (at minimum):
  - Deal name (free text, required)
  - Asset type (one of `office`, `industrial`, `retail`, `multifamily` — enum, required)
  - Business plan (one of `ground_up`, `acquire_lease_hold` — enum, required)
  - The deal row lands with `status = 'drafting'`, scoped to the user's `org_id`.
- **Document upload** — From a deal's detail page, the user can upload one or more PDFs. Each upload creates an `uploaded_files` row with `deal_id` set and `status = 'pending'`. Uploads are **not** auto-analyzed.
- **Analyze action** — The deal detail page shows an **Analyze** button. It is disabled until at least one document with `status = 'pending'` exists. Clicking it:
  - Creates exactly one `analysis_jobs` row (`deal_id` set, `job_type = 'analysis'`, `analysis_depth = 'first_run'`, `status = 'queued'`).
  - Kicks off the Trigger.dev `analysis-job` task with a payload referencing the deal — the executor receives the set of all pending documents for that deal, not a single file.
  - Atomically transitions each included `uploaded_files` row to `status = 'queued'` so a subsequent click can't double-submit.
  - Returns the `analysis_jobs.id` and redirects the user to the existing review UI (`/jobs/[jobId]/review`) once the first gate is reached.
- **Idempotency / re-analysis** — If all previously-uploaded docs are already `processed`, the user can upload more documents and click Analyze again to run a new `analysis_jobs` row against only the new pending docs. Never re-run against docs already committed to another job.
- **Org isolation** — RLS enforces that users can only read/mutate deals, uploads, and analysis jobs belonging to an org they are a member of (existing `organization_members` pattern).
- **CB2 flag-of-record** — Asset type is stored as a string that matches the existing `deals.asset_class` CHECK constraint. If we're forced to cut the retail variant (per Cycle 1 bet-table CB2), we disable `retail` in the UI picker only — no schema change needed.

---

## 3. Tech design

### 3.1 Schema change

Adding one column to an existing table. Per `CLAUDE.md` Schema Change Protocol, this requires: flag → approved design (this spec serves as the approval doc) → migration SQL → types regeneration → app code.

- **New column:** `deals.business_plan text CHECK (business_plan IS NULL OR business_plan IN ('ground_up', 'acquire_lease_hold'))`
- **Nullable**, no backfill needed. Existing rows (v0 seed data) stay `NULL`.
- **Migration file:** `supabase/migrations/20260421000001_deals_business_plan.sql`
- **Rollback:** drop the column; ship the rollback in `supabase/migrations/rollback/` alongside the forward migration.
- **Types regen:** `supabase gen types typescript` after merge; resolve type errors before shipping app code.
- **No new tables.** `deals`, `uploaded_files`, `analysis_jobs` all already exist and are deal-aware.

### 3.2 API surface

- `POST /api/deals` — create deal. Body: `{ name, asset_class, business_plan }`. Returns `{ deal_id }`.
- `POST /api/deals/[dealId]/uploads` — signed-URL issuer for direct-to-Storage uploads (the existing storage path). Accepts `{ file_name, mime_type, file_size_bytes, sha256_hash }`. Pre-creates the `uploaded_files` row with `status = 'pending'` and `deal_id` set, returns the signed URL. This matches the v0 upload flow — the only change is that it's now always scoped to a deal.
- `POST /api/deals/[dealId]/analyze` — user-initiated analyze. Server-side:
  - Read all `uploaded_files` for the deal with `status = 'pending'`; error if empty.
  - In a transaction: insert `analysis_jobs` row with `deal_id`, `job_type = 'analysis'`, `analysis_depth = 'first_run'`, `status = 'queued'`; set those `uploaded_files.status = 'queued'`.
  - Fire Trigger.dev `analysis-job` task with payload `{ analysis_job_id, deal_id, uploaded_file_ids: [...] }`.
  - Return `{ analysis_job_id }`.

### 3.3 Storage webhook — deprecate for analyze path

Today `POST /api/webhooks/storage` fires an analysis job on every `uploaded_files` INSERT. That is the exact behavior the pitch says to replace. Proposed action:

- **Remove the "fire analysis" behavior.** The webhook should still exist as a hook point (for future email-inbound flows to run pre-classification), but it must **not** create an `analysis_jobs` row anymore.
- Until email inbound ships (future scope), the webhook becomes a no-op that just logs "received INSERT for uploaded_file X" and returns 200.
- Tear down the Supabase dashboard webhook registration as part of the cutover so no request loss risk during deploy.

### 3.4 Frontend

- **Dashboard landing** — add a "New deal" button + list of deals (name, asset class, business plan, status, updated_at). Clicking a row opens the deal detail page.
- **Deal create form** — simple modal or `/deals/new` page with the three required fields. Submit calls `POST /api/deals`; on success redirect to `/deals/[dealId]`.
- **Deal detail page** `/deals/[dealId]` — shows:
  - Metadata header (name, asset class, business plan, status)
  - Drag-and-drop upload zone (reuses existing upload component)
  - List of uploaded documents grouped by status (`pending` / `queued` / `processed`)
  - **Analyze** button (disabled unless ≥1 pending doc)
  - Link to most recent `analysis_jobs` row (to reach the review UI)
- **Review UI** — no change in this scope. `/jobs/[jobId]/review` already works from MMC-35.

### 3.5 Executor payload shape

The Trigger.dev `analysis-job` task currently receives a single `uploaded_file_id`. This scope changes the payload to an array-of-files keyed by `analysis_job_id`. The executor must be updated to:
- Fetch all `uploaded_file_ids` in the payload
- Run document-type classification (OM / RR / T12) across the set
- Feed them to the extraction agent together, so cross-document context is available

Gate contract (MMC-35 `GateReview`) stays the same — the review UI is unaware of whether inputs came from one or many source docs.

### 3.6 Observability

- Log `[deal-intake]` prefix on every new endpoint for easy filter in Vercel logs.
- On `POST /api/deals/[dealId]/analyze`, emit a `agent_events` row (`event_type = 'analysis_kicked_off'`) so the agent event log captures user-initiated starts — will matter for SLIP metrics later.

---

## 4. Open questions

1. **Does the storage webhook get fully removed, or kept as a no-op stub?** Leaning stub to preserve the URL + secret for the future email-inbound scope. Need Clint's read on whether keeping dormant infrastructure is worth the clarity cost.
2. **Upload UX when Analyze is already running** — should the upload zone be disabled while a job is `queued` or `running`, or allow new pending docs to queue up for a future Analyze click? Leaning allow-queueing; flag in-review.
3. **Document-type classification placement** — does it run as a pre-step inside the Trigger.dev task, or as a separate step on upload completion? Either works. Will decide during implementation based on Claude API latency budget; decision must land in an ADR if it diverges from ADR-010.
4. **Duplicate-detection re-use** — `uploaded_files` already has a `duplicate_of_id` column. Does the Analyze path exclude files where this is set? Assuming yes for now; confirm during impl.
5. **Asset type labels** — pitch says "apartments" but schema says `multifamily`. Using `multifamily` internally and labeling the UI picker "Apartments / Multifamily" so both audiences recognize it.

---

## 5. Out of scope for this scope

Explicit guardrails to prevent "while we're in there" creep. Pushback-eligible items:

- **Deal archive / listing filters.** Agreed as nice-to-have for end-of-cycle, tracked separately.
- **Deal edit after create.** No UX to change asset class or business plan post-create. If the user picked wrong, they re-create the deal for now.
- **Multi-user collaboration on a deal.** Org-scoped read/write is enough; no comments, presence, or ownership transfer in this scope.
- **Re-uploading a failed document.** If a doc fails extraction, it stays `failed` — the user deletes + re-uploads. No in-place retry UI this cycle.
- **Email-inbound intake.** Postmark/Resend integration is its own future scope.
- **Non-PDF document formats.** Only PDFs. XLSX rent rolls come later.
- **Deal-level business-plan inference from the docs.** User picks it at create time, period. The agent does not try to infer or override.
- **Retail-specific extraction tuning.** If CB2 is triggered and retail is cut, we only hide it in the UI — no extraction-agent pruning work.
- **The review UI itself.** `/jobs/[jobId]/review` stays as MMC-35 shipped it. Polish and guided-walkthrough lift is a separate scope (Option B from the 2026-04-21 scope selection).

---

## 6. Sequencing

Proposed implementation tickets (to be created as children of MMC-40 once this spec lands):

1. **Schema migration** — add `deals.business_plan` column + rollback. Supabase branch, CI migration run, type regen.
2. **API — `POST /api/deals`** — create endpoint + zod validation + RLS test.
3. **API — `POST /api/deals/[dealId]/uploads`** — refactor existing signed-URL flow to require `dealId` in route.
4. **API — `POST /api/deals/[dealId]/analyze`** — new endpoint + Trigger.dev task payload update.
5. **Trigger.dev — multi-file executor** — update `analysis-job` task to accept `uploaded_file_ids: string[]`.
6. **Webhook cutover** — neutralize `POST /api/webhooks/storage` analysis-job creation, update route comment.
7. **UI — dashboard + deal create** — list + new deal modal.
8. **UI — deal detail page** — uploads list + Analyze button + job link.
9. **End-to-end test** — Playwright walkthrough: create deal → upload 2 PDFs → click Analyze → reach review page.

Each ticket is small enough to land in a single PR. The order above is the safe order — schema first, APIs before UI, webhook cutover last to avoid a window with two analyze paths live.

---

## 7. References

- **Pitch** — Cycle 1 bet in Notion Pitches DB (status = Bet On, 2026-04-21)
- **ADR-010** — Agentic executor/advisor architecture (Trigger.dev payload shape)
- **ADR-013** — Computed/override split (review-gate override contract — unchanged by this scope)
- **ADR-014** — Shape Up methodology (this spec exists because of §6)
- **WORKFLOW.md §8** — Scope spec template (this file)
- **CLAUDE.md** — Schema Change Protocol (followed in §3.1)
- **MMC-35** — Gate review UI (upstream dependency, already landed)
- **MMC-40** — Linear parent for this scope
