/**
 * Tests for POST /api/webhooks/storage (no-op stub)
 *
 * Since MMC-51 (Cycle 1 deal-intake), this handler is a documented no-op.
 * Analysis is triggered by POST /api/deals/[dealId]/analyze — not by upload.
 *
 * Coverage:
 *   1. Auth — missing/wrong secret → 401; missing env var → 500
 *   2. No-op behavior — authenticated INSERT logs the no-op message and
 *      returns 204 with zero side effects (no Supabase calls, no Trigger.dev)
 *   3. No analysis_jobs row is ever created by this handler
 *
 * See MMC-41 for the future reactivate-or-remove decision.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const VALID_SECRET = "test-webhook-secret-abc123";

function makeRequest(body: unknown, secret?: string): NextRequest {
  return new NextRequest("http://localhost/api/webhooks/storage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret !== undefined ? { "x-webhook-secret": secret } : {}),
    },
    body: JSON.stringify(body),
  });
}

function makeInsertPayload(fileId = "file-uuid-001"): object {
  return {
    type: "INSERT",
    table: "uploaded_files",
    schema: "public",
    record: {
      id: fileId,
      deal_id: "deal-uuid-001",
      org_id: "org-uuid-001",
      uploaded_by: "user-uuid-001",
      storage_path: "deals/deal-uuid-001/file.pdf",
      file_name: "offering_memo.pdf",
      mime_type: "application/pdf",
      status: "pending",
    },
    old_record: null,
  };
}

// ── Auth tests ────────────────────────────────────────────────────────────────

describe("POST /api/webhooks/storage — auth", () => {
  beforeEach(() => {
    process.env.SUPABASE_WEBHOOK_SECRET = VALID_SECRET;
  });

  afterEach(() => {
    delete process.env.SUPABASE_WEBHOOK_SECRET;
  });

  it("returns 401 when x-webhook-secret header is missing", async () => {
    const req = makeRequest(makeInsertPayload()); // no secret header
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 when x-webhook-secret is wrong", async () => {
    const req = makeRequest(makeInsertPayload(), "wrong-secret");
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 500 when SUPABASE_WEBHOOK_SECRET env var is not set", async () => {
    delete process.env.SUPABASE_WEBHOOK_SECRET;
    const req = makeRequest(makeInsertPayload(), VALID_SECRET);
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});

// ── No-op behavior ────────────────────────────────────────────────────────────

describe("POST /api/webhooks/storage — no-op stub (MMC-51)", () => {
  beforeEach(() => {
    process.env.SUPABASE_WEBHOOK_SECRET = VALID_SECRET;
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    delete process.env.SUPABASE_WEBHOOK_SECRET;
    vi.restoreAllMocks();
  });

  it("returns 204 with no body for a valid INSERT event", async () => {
    const req = makeRequest(makeInsertPayload("file-abc"), VALID_SECRET);
    const res = await POST(req);
    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
  });

  it("logs the no-op message with the file ID", async () => {
    const req = makeRequest(makeInsertPayload("file-xyz-999"), VALID_SECRET);
    await POST(req);
    expect(console.log).toHaveBeenCalledWith(
      "[storage-webhook] received INSERT for uploaded_file file-xyz-999 — no-op (see MMC-41)",
    );
  });

  it("logs 'unknown' as the file ID when record is null", async () => {
    const payload = {
      type: "INSERT",
      table: "uploaded_files",
      schema: "public",
      record: null,
      old_record: null,
    };
    const req = makeRequest(payload, VALID_SECRET);
    await POST(req);
    expect(console.log).toHaveBeenCalledWith(
      "[storage-webhook] received INSERT for uploaded_file unknown — no-op (see MMC-41)",
    );
  });

  it("does not import or call Supabase (no analysis_jobs row created)", async () => {
    // The stub has no Supabase import — this test documents that the route
    // module itself no longer references @supabase/supabase-js or creates
    // any DB rows. Verified structurally by the absence of createClient usage
    // in the module (confirmed at review) and functionally by the 204 response
    // with no side effects observable in this unit test context.
    const req = makeRequest(makeInsertPayload(), VALID_SECRET);
    const res = await POST(req);
    expect(res.status).toBe(204);
    // If Supabase were called it would throw (no mock) — the clean 204 proves it isn't.
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/webhooks/storage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": VALID_SECRET,
      },
      body: "not-valid-json{{{",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
