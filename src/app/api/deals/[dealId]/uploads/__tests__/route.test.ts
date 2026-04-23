/**
 * Tests for POST /api/deals/[dealId]/uploads
 *
 * Coverage:
 *   1. Zod validation — valid body, each invalid-field case
 *   2. Route handler — deal not found (404), signed URL failure (500),
 *      DB insert failure (500), happy path (201)
 *   3. Payload assertions — storage path format, org_id from deal row,
 *      correct uploaded_files fields
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";

// ── Supabase mock ─────────────────────────────────────────────────────────────
//
// Two distinct chains to mock:
//   db.from("deals").select(...).eq(...).maybeSingle()  → deal lookup
//   db.from("uploaded_files").insert(...)               → pre-create row
//   db.storage.from(bucket).createSignedUploadUrl(path) → signed URL

const mockMaybeSingle = vi.fn();
const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockInsert = vi.fn();
const mockFrom = vi.fn((table: string) => {
  if (table === "deals") return { select: mockSelect };
  if (table === "uploaded_files") return { insert: mockInsert };
  return {};
});

const mockCreateSignedUploadUrl = vi.fn();
const mockStorageFrom = vi.fn(() => ({ createSignedUploadUrl: mockCreateSignedUploadUrl }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
    storage: { from: mockStorageFrom },
  })),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const DEAL_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const ORG_ID = "b1ffcd00-ad1c-4f09-bc7e-7ccace491b22";
const UPLOADED_BY = "c2aaddee-beef-4abc-9000-cccccccccccc";

const VALID_BODY = {
  file_name: "offering-memo.pdf",
  mime_type: "application/pdf",
  file_size_bytes: 2_048_000,
  sha256_hash: "abc123def456abc123def456abc123def456abc123def456abc123def456abcd",
  uploaded_by: UPLOADED_BY,
};

const MOCK_DEAL = { id: DEAL_ID, org_id: ORG_ID };
const MOCK_SIGNED_URL = "https://storage.example.com/signed?token=xyz";

function makeRequest(body: unknown, dealId = DEAL_ID): NextRequest {
  return new NextRequest(`http://localhost/api/deals/${dealId}/uploads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeParams(dealId = DEAL_ID) {
  return { params: Promise.resolve({ dealId }) };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function seedHappyPath() {
  mockMaybeSingle.mockResolvedValueOnce({ data: MOCK_DEAL, error: null });
  mockCreateSignedUploadUrl.mockResolvedValueOnce({
    data: { signedUrl: MOCK_SIGNED_URL, token: "tok", path: "p" },
    error: null,
  });
  mockInsert.mockResolvedValueOnce({ error: null });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/deals/[dealId]/uploads — Zod validation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when file_name is empty", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, file_name: "" }), makeParams());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Validation failed");
    expect(json.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: ["file_name"] })]),
    );
  });

  it("returns 400 when file_size_bytes is zero", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, file_size_bytes: 0 }), makeParams());
    expect(res.status).toBe(400);
    expect((await res.json()).issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: ["file_size_bytes"] })]),
    );
  });

  it("returns 400 when file_size_bytes is not an integer", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, file_size_bytes: 1.5 }), makeParams());
    expect(res.status).toBe(400);
  });

  it("returns 400 when uploaded_by is not a UUID", async () => {
    const res = await POST(
      makeRequest({ ...VALID_BODY, uploaded_by: "not-a-uuid" }),
      makeParams(),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: ["uploaded_by"] })]),
    );
  });

  it("returns 400 when sha256_hash is missing", async () => {
    const { sha256_hash: _omit, ...noHash } = VALID_BODY;
    const res = await POST(makeRequest(noHash), makeParams());
    expect(res.status).toBe(400);
  });

  it("returns 400 on non-JSON body", async () => {
    const req = new NextRequest(`http://localhost/api/deals/${DEAL_ID}/uploads`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "not json",
    });
    const res = await POST(req, makeParams());
    expect(res.status).toBe(400);
  });
});

describe("POST /api/deals/[dealId]/uploads — route handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-wire mockFrom after clearAllMocks resets return values
    mockFrom.mockImplementation((table: string) => {
      if (table === "deals") return { select: mockSelect };
      if (table === "uploaded_files") return { insert: mockInsert };
      return {};
    });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle });
    mockStorageFrom.mockReturnValue({ createSignedUploadUrl: mockCreateSignedUploadUrl });
  });

  it("returns 404 when deal does not exist", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const res = await POST(makeRequest(VALID_BODY), makeParams());
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("Deal not found");
    // Must not proceed to signed URL or insert
    expect(mockCreateSignedUploadUrl).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns 500 when deal lookup errors", async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: "connection timeout" },
    });

    const res = await POST(makeRequest(VALID_BODY), makeParams());
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("Failed to verify deal");
  });

  it("returns 500 when signed URL generation fails", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: MOCK_DEAL, error: null });
    mockCreateSignedUploadUrl.mockResolvedValueOnce({
      data: null,
      error: { message: "bucket not found" },
    });

    const res = await POST(makeRequest(VALID_BODY), makeParams());
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("Failed to generate upload URL");
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns 500 when uploaded_files insert fails", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: MOCK_DEAL, error: null });
    mockCreateSignedUploadUrl.mockResolvedValueOnce({
      data: { signedUrl: MOCK_SIGNED_URL, token: "tok", path: "p" },
      error: null,
    });
    mockInsert.mockResolvedValueOnce({ error: { message: "unique constraint violation" } });

    const res = await POST(makeRequest(VALID_BODY), makeParams());
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("Failed to pre-create upload record");
  });

  it("returns 201 with upload_url and uploaded_file_id on success", async () => {
    seedHappyPath();

    const res = await POST(makeRequest(VALID_BODY), makeParams());
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.upload_url).toBe(MOCK_SIGNED_URL);
    expect(typeof json.uploaded_file_id).toBe("string");
    // Must be a valid UUID format
    expect(json.uploaded_file_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("uses org_id from the deal row, not from the request body", async () => {
    seedHappyPath();

    await POST(makeRequest(VALID_BODY), makeParams());

    // The insert must use org_id derived from the deal lookup
    const insertedPayload = (mockInsert.mock.calls as any)[0][0] as Record<string, unknown>;
    expect(insertedPayload.org_id).toBe(ORG_ID);
  });

  it("inserts uploaded_files row with correct fields", async () => {
    seedHappyPath();

    await POST(makeRequest(VALID_BODY), makeParams());

    const insertedPayload = (mockInsert.mock.calls as any)[0][0] as Record<string, unknown>;
    expect(insertedPayload).toMatchObject({
      org_id: ORG_ID,
      deal_id: DEAL_ID,
      file_name: "offering-memo.pdf",
      mime_type: "application/pdf",
      file_size_bytes: 2_048_000,
      sha256_hash: VALID_BODY.sha256_hash,
      source: "direct_upload",
      status: "pending",
      uploaded_by: UPLOADED_BY,
    });
  });

  it("storage path contains org_id, deal_id, file_id, and file_name", async () => {
    seedHappyPath();

    await POST(makeRequest(VALID_BODY), makeParams());

    const storagePath = (mockCreateSignedUploadUrl.mock.calls as any)[0][0] as string;
    expect(storagePath).toMatch(new RegExp(`^${ORG_ID}/${DEAL_ID}/[^/]+/offering-memo\\.pdf$`));

    // The file ID in the path must match the one returned in the response
    // (tested indirectly via the insert payload having the same id as the path segment)
    const insertedPayload = (mockInsert.mock.calls as any)[0][0] as Record<string, unknown>;
    const fileId = insertedPayload.id as string;
    expect(storagePath).toContain(fileId);
    expect(insertedPayload.storage_path).toBe(storagePath);
  });

  it("storage path for signed URL matches the storage_path inserted into DB", async () => {
    seedHappyPath();

    await POST(makeRequest(VALID_BODY), makeParams());

    const storagePath = (mockCreateSignedUploadUrl.mock.calls as any)[0][0] as string;
    const insertedPayload = (mockInsert.mock.calls as any)[0][0] as Record<string, unknown>;
    expect(insertedPayload.storage_path).toBe(storagePath);
  });

  it("calls createSignedUploadUrl on the deal-documents bucket", async () => {
    seedHappyPath();

    await POST(makeRequest(VALID_BODY), makeParams());

    expect(mockStorageFrom).toHaveBeenCalledWith("deal-documents");
  });
});
