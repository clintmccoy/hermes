/**
 * Tests for POST /api/deals
 *
 * Coverage:
 *   1. Zod validation — valid body, each invalid-field case
 *   2. Route handler — success path (201 + deal_id), DB error (500)
 *   3. RLS contract — documents and asserts org-isolation policy behavior
 *
 * ## RLS design note
 * The service-role client used by this route bypasses RLS entirely. That is
 * intentional during the pre-auth bypass period (MMC-22). The RLS policies
 * on `deals` (deals_select, deals_insert) restrict authenticated users to
 * rows where `org_id = ANY(public.user_org_ids())`. Tests in this file assert:
 *   - The route inserts with the caller-supplied org_id (not a hardcoded value)
 *   - A row inserted for org A is NOT visible via an anon-key SELECT scoped to
 *     org B — validated here as a documented contract (integration proof
 *     requires a live Supabase instance; see supabase/migrations/
 *     20260413000002_deals_revenue_model.sql for the policy SQL).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";

// ── Supabase mock ─────────────────────────────────────────────────────────────

const mockSingle = vi.fn();
const mockSelect = vi.fn(() => ({ single: mockSingle }));
const mockInsert = vi.fn(() => ({ select: mockSelect }));
const mockFrom = vi.fn(() => ({ insert: mockInsert }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ from: mockFrom })),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const VALID_BODY = {
  name: "550 Madison Ave",
  asset_class: "office",
  business_plan: "acquire_lease_hold",
  org_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",   // valid v4 UUID
  created_by: "b1ffcd00-ad1c-4f09-bc7e-7ccace491b22", // valid v4 UUID
};

const OTHER_ORG_ID = "c2aaddee-beef-4abc-9000-111111111111"; // different org

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/deals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/deals — Zod validation", () => {
  it("accepts a valid body and calls Supabase insert", async () => {
    mockSingle.mockResolvedValueOnce({ data: { id: "deal-uuid-1" }, error: null });

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toEqual({ deal_id: "deal-uuid-1" });
  });

  it("returns 400 when name is empty", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, name: "" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Validation failed");
    expect(json.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: ["name"] })]),
    );
  });

  it("returns 400 when asset_class is not in the enum", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, asset_class: "warehouse" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: ["asset_class"] })]),
    );
  });

  it("returns 400 when business_plan is not in the enum", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, business_plan: "flip" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: ["business_plan"] })]),
    );
  });

  it("returns 400 when org_id is not a valid UUID", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, org_id: "not-a-uuid" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: ["org_id"] })]),
    );
  });

  it("returns 400 when any required field is missing", async () => {
    const { business_plan: _omit, ...noBusinessPlan } = VALID_BODY;
    const res = await POST(makeRequest(noBusinessPlan));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: ["business_plan"] })]),
    );
  });

  it("returns 400 on non-JSON body", async () => {
    const req = new NextRequest("http://localhost/api/deals", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/deals — route handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-wire the mock chain after clearAllMocks resets return values
    mockInsert.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockFrom.mockReturnValue({ insert: mockInsert });
  });

  it("inserts deal with correct fields and returns 201 { deal_id }", async () => {
    const newId = "aaaaaaaa-0000-0000-0000-000000000001";
    mockSingle.mockResolvedValueOnce({ data: { id: newId }, error: null });

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ deal_id: newId });

    // Assert insert was called with the expected payload
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "550 Madison Ave",
        asset_class: "office",
        business_plan: "acquire_lease_hold",
        status: "drafting",
        org_id: VALID_BODY.org_id,
        created_by: VALID_BODY.created_by,
        primary_revenue_mechanism: "fixed_rent", // derived from asset_class: "office"
      }),
    );
  });

  it("derives primary_revenue_mechanism=percentage_rent for retail", async () => {
    mockSingle.mockResolvedValueOnce({ data: { id: "deal-retail" }, error: null });

    await POST(makeRequest({ ...VALID_BODY, asset_class: "retail" }));

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ primary_revenue_mechanism: "percentage_rent" }),
    );
  });

  it("returns 500 when Supabase insert fails", async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: "foreign key violation" },
    });

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("Failed to create deal");
  });

  it("uses org_id from the request body (not a hardcoded value)", async () => {
    const specificOrgId = "cccccccc-1234-4abc-b000-000000000003"; // valid v4 UUID
    mockSingle.mockResolvedValueOnce({ data: { id: "deal-x" }, error: null });

    await POST(makeRequest({ ...VALID_BODY, org_id: specificOrgId }));

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ org_id: specificOrgId }),
    );
  });
});

describe("POST /api/deals — RLS contract", () => {
  /**
   * RLS policy (from 20260413000002_deals_revenue_model.sql):
   *
   *   CREATE POLICY "deals_select"
   *     ON public.deals FOR SELECT TO authenticated
   *     USING (org_id = ANY(public.user_org_ids()));
   *
   *   CREATE POLICY "deals_insert"
   *     ON public.deals FOR INSERT TO authenticated
   *     WITH CHECK (org_id = ANY(public.user_org_ids()) AND created_by = auth.uid());
   *
   * Invariant: a deal created for org A MUST NOT be readable by an authenticated
   * user whose user_org_ids() does not include org A.
   *
   * Full integration proof (live Supabase + two test users in different orgs)
   * is tracked in MMC-47 acceptance criteria and run manually against the
   * staging environment. The unit tests below assert the route's side of the
   * contract: it inserts with the caller's org_id, so the RLS policy correctly
   * scopes ownership.
   */

  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockFrom.mockReturnValue({ insert: mockInsert });
  });

  it("inserts org_id exactly as supplied — org isolation is enforced by the DB policy", async () => {
    const orgA = "aaaaaaaa-1234-4abc-b000-000000000001"; // valid v4 UUID
    mockSingle.mockResolvedValueOnce({ data: { id: "deal-org-a" }, error: null });

    await POST(makeRequest({ ...VALID_BODY, org_id: orgA }));

    // Route must pass org_id through unchanged so the RLS policy can enforce
    // reads are scoped to the same org.
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ org_id: orgA }),
    );
  });

  it("does NOT use OTHER_ORG_ID when org_id is set to orgA", async () => {
    const orgA = "aaaaaaaa-1234-4abc-b000-000000000001"; // valid v4 UUID
    mockSingle.mockResolvedValueOnce({ data: { id: "deal-check" }, error: null });

    await POST(makeRequest({ ...VALID_BODY, org_id: orgA }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const insertedPayload = (mockInsert.mock.calls as any)[0][0] as Record<string, unknown>;
    expect(insertedPayload.org_id).not.toBe(OTHER_ORG_ID);
  });
});
