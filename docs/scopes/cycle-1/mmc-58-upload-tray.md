# Scope: Document Upload Tray on /deals/new

**Ticket:** MMC-58  
**Cycle:** 1  
**Status:** In Progress  
**Author:** Clint McCoy  
**Date:** 2026-04-24

---

## Problem

Dogfooding MMC-52 (2026-04-24) surfaced that uploading documents and creating a deal feel like one action, not two sequential steps. The current flow sends users to the deal detail page after creation with a note that upload is coming. This friction is unnecessary — users arrive at deal creation with documents in hand (OM, rent roll, financials) and should be able to stage them at the same time.

## Proposed change

Add an optional document upload tray to `/deals/new`, below the three existing fields (deal name, asset type, business plan). Users can drop or pick files before submitting. On submit, files are uploaded after the deal row is created.

## Out of scope

- Progress bars per file (button label covers it)
- Upload from the deal detail page (future)
- File type restrictions (any type accepted; MIME validation deferred to the pipeline)
- Deduplication / sha256 collision handling (handled server-side already)

---

## Design decisions

### 1. Upload timing: post-deal-creation follow-up

The existing `POST /api/deals/[dealId]/uploads` route requires a `dealId`, so uploads are structurally a second phase. The submit sequence is:

1. Validate form fields
2. `POST /api/deals` → receive `deal_id`
3. For each staged file (in parallel):
   a. Read `ArrayBuffer` → compute SHA-256 via `crypto.subtle.digest`
   b. `POST /api/deals/[deal_id]/uploads` → receive `{ upload_url, uploaded_file_id }`
   c. `PUT upload_url` with raw bytes + `Content-Type` header
4. Redirect to `/deals/[deal_id]` (regardless of upload outcome — deal exists)

If any upload fails, surface a soft error on the form for 2 s then redirect anyway, so the user knows to retry from the deal page.

### 2. SHA-256 computed client-side

The upload route requires `sha256_hash`. We use the Web Crypto API (`crypto.subtle`) — no library, zero bundle impact. Computed from the full `ArrayBuffer` of each file just before calling the route.

### 3. Client-side limits

| Constraint | Value | Rationale |
|------------|-------|-----------|
| Max file size | 50 MB | Covers typical OM + rent roll packages |
| Max file count | 10 | Sufficient for deal intake; prevents runaway parallel uploads |
| Accepted types | All | Pipeline handles downstream validation |

Violations are surfaced inline per-file on drop/pick; they do not block the rest of the form.

### 4. Bypass-period `uploaded_by`

Same pattern as `POST /api/deals`: sourced from `NEXT_PUBLIC_DEV_USER_ID`. Removed when MMC-22 (cookie auth) lands.

---

## API surface (no changes)

All routes already exist:

- `POST /api/deals` — creates the deal row (MMC-52)
- `POST /api/deals/[dealId]/uploads` — pre-creates `uploaded_files` row + returns signed URL (MMC-48)
- Supabase Storage bucket `deal-documents` — direct PUT target (MMC-33)

No new routes, no schema changes, no migrations.

---

## UI spec

### Tray section (below business plan field, above action buttons)

```
Documents  (optional)
┌─────────────────────────────────────────────┐
│  ↑  Drop files here, or click to browse     │  ← dashed border, click opens <input type=file>
│     Any file type · max 50 MB · up to 10    │
└─────────────────────────────────────────────┘
  offering-memo.pdf            2.1 MB   ✕
  rent-roll-q1-2026.xlsx       480 KB   ✕
```

- Drop zone: dashed border (`var(--border-strong)`), hover state darkens border to `var(--border-focus)`
- File list: one row per file, name + formatted size + remove button
- Rejection messages: inline below the drop zone (e.g. "rent-roll.pdf exceeds 50 MB limit")

### Button label states

| Phase | Label |
|-------|-------|
| Idle | `Create deal` |
| Creating deal | `Creating…` |
| Uploading files | `Uploading N file(s)…` |
| Upload error (2 s) | `Deal created — N upload(s) failed` |
| → redirect | `/deals/[deal_id]` |

---

## Files changed

- `src/app/deals/new/page.tsx` — only file modified
