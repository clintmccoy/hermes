/**
 * POST /api/deals
 *
 * Creates a new deal in the `drafting` state.
 *
 * ## Request body
 * ```json
 * {
 *   "name": "550 Madison Ave",
 *   "asset_class": "office",
 *   "business_plan": "acquire_lease_hold",
 *   "org_id": "<uuid>",
 *   "created_by": "<uuid>"
 * }
 * ```
 *
 * `org_id` and `created_by` are accepted from the body during the service-role
 * bypass period. Once auth lands (MMC-22), both will be derived from the
 * authenticated session and removed from the public API surface.
 *
 * ## Responses
 * - `201` — deal created successfully; body: `{ "deal_id": "<uuid>" }`
 * - `400` — validation error; body: `{ "error": "Validation failed", "issues": [...] }`
 * - `500` — unexpected server error
 *
 * ## Auth
 * Service-role bypass in place. Real auth tracked in MMC-22.
 *
 * ## References
 * - Scope spec §3.2 — API surface
 * - MMC-40 — parent scope
 * - MMC-47 — this ticket
 * - MMC-22 — auth (replaces service-role bypass)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";

// ── Schema ────────────────────────────────────────────────────────────────────

const CreateDealSchema = z.object({
  name: z.string().min(1, "name must be a non-empty string"),
  asset_class: z.enum(["office", "industrial", "retail", "multifamily"]),
  business_plan: z.enum(["ground_up", "acquire_lease_hold"]),

  // TODO(MMC-22): remove from public API once auth lands.
  // These will be derived from the authenticated session (org_id from
  // user_metadata, created_by from auth.uid()).
  org_id: z.string().uuid("org_id must be a valid UUID"),
  created_by: z.string().uuid("created_by must be a valid UUID"),
});

// ── Derived fields ─────────────────────────────────────────────────────────────

/**
 * Derives `primary_revenue_mechanism` from `asset_class`.
 *
 * The `deals` table requires this field (NOT NULL CHECK constraint) but the
 * deal-intake API surface (scope spec §3.2) only exposes asset_class. This
 * mapping encodes the dominant revenue mechanism for each CRE asset type.
 *
 * TODO: make configurable in the deal-create form if granularity is needed.
 */
const PRIMARY_REVENUE_MECHANISM_BY_ASSET: Record<
  z.infer<typeof CreateDealSchema>["asset_class"],
  Database["public"]["Tables"]["deals"]["Insert"]["primary_revenue_mechanism"]
> = {
  office: "fixed_rent",
  industrial: "fixed_rent",
  retail: "percentage_rent",
  multifamily: "fixed_rent",
};

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── 1. Parse request body ────────────────────────────────────────────────
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // ── 2. Validate with Zod ────────────────────────────────────────────────
  const parsed = CreateDealSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { name, asset_class, business_plan, org_id, created_by } = parsed.data;

  // ── 3. Service-role client — bypasses RLS for pre-auth period ────────────
  // TODO(MMC-22): replace with cookie-based session client once auth lands.
  const db = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // ── 4. Insert deal row ────────────────────────────────────────────────────
  const { data: deal, error } = await db
    .from("deals")
    .insert({
      name,
      asset_class,
      business_plan,
      org_id,
      created_by,
      status: "drafting",
      primary_revenue_mechanism: PRIMARY_REVENUE_MECHANISM_BY_ASSET[asset_class],
    })
    .select("id")
    .single();

  if (error || !deal) {
    console.error("[deal-intake] Failed to insert deal:", error?.message);
    return NextResponse.json({ error: "Failed to create deal" }, { status: 500 });
  }

  console.log(`[deal-intake] deal created deal_id=${deal.id}`);

  // ── 5. Return 201 with deal_id ────────────────────────────────────────────
  return NextResponse.json({ deal_id: deal.id }, { status: 201 });
}
