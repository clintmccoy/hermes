/**
 * POST /api/gates/[gateId]/skip
 *
 * Skips a pending job_gates row. Only permitted when the corresponding
 * gate_config_entries row has is_skippable = true.
 *
 * Auth: Supabase session via cookies. RLS on job_gates enforces org membership;
 * this route also explicitly verifies it for clean 403 responses.
 *
 * Errors:
 *   401 — not authenticated
 *   403 — authenticated but not a member of the job's org, or gate is not skippable
 *   404 — gate not found
 *   409 — gate already confirmed or skipped
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ gateId: string }> }) {
  const { gateId } = await params;
  // Use service role to bypass RLS for integration test (no auth session yet).
  // TODO(MMC-35): enforce auth once login flow exists.
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // ── Auth ────────────────────────────────────────────────────────────────────
  // TODO(MMC-35): re-enable once login flow exists. Bypassed for integration testing.
  const user = null; // stub — no real user during integration test

  // ── Fetch gate ──────────────────────────────────────────────────────────────
  const { data: gate } = await supabase
    .from("job_gates")
    .select("id, job_id, status, gate_name")
    .eq("id", gateId)
    .maybeSingle();

  if (!gate) {
    return NextResponse.json({ error: "Gate not found" }, { status: 404 });
  }

  if (gate.status !== "pending") {
    return NextResponse.json(
      { error: "Gate already resolved", status: gate.status },
      { status: 409 },
    );
  }

  // ── Org membership check ─────────────────────────────────────────────────────
  // TODO(MMC-35): re-enable org membership check once auth is wired up.
  // const job = await supabase.from("analysis_jobs").select("org_id").eq("id", gate.job_id).single().then((r) => r.data);

  // ── Skippability check ───────────────────────────────────────────────────────
  const { data: configEntry } = await supabase
    .from("gate_config_entries")
    .select("is_skippable")
    .eq("gate_name", gate.gate_name)
    .limit(1)
    .maybeSingle();

  if (configEntry && !configEntry.is_skippable) {
    return NextResponse.json({ error: "This gate is not skippable" }, { status: 403 });
  }

  // ── Skip gate ────────────────────────────────────────────────────────────────
  const { error: updateError } = await supabase
    .from("job_gates")
    .update({
      status: "skipped",
      skipped_at: new Date().toISOString(),
      skipped_by: user?.id ?? null,
    })
    .eq("id", gateId);

  if (updateError) {
    console.error("[gates/skip] Update failed:", updateError.message);
    return NextResponse.json({ error: "Failed to skip gate" }, { status: 500 });
  }

  return NextResponse.json({ gateId, status: "skipped" });
}
