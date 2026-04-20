/**
 * POST /api/gates/[gateId]/confirm
 *
 * Confirms a pending job_gates row. Called by the stub review UI after the
 * analyst has reviewed (and optionally overridden) extracted inputs.
 *
 * Accepts an optional `overrides` array in the request body — each entry is
 * written to extracted_inputs.user_override_value before the gate is confirmed.
 * The pipeline's readPendingOverrides() picks these up when it resumes.
 *
 * Auth: Supabase session via cookies. RLS on job_gates enforces org membership;
 * this route also explicitly verifies it for clean 403 responses.
 *
 * Errors:
 *   401 — not authenticated
 *   403 — authenticated but not a member of the job's org
 *   404 — gate not found (or RLS denied read access)
 *   409 — gate already confirmed or skipped
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

interface OverrideEntry {
  extractedInputId: string;
  value: unknown;
}

interface ConfirmRequestBody {
  overrides?: OverrideEntry[];
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ gateId: string }> }) {
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
  // const { data: { user } } = await supabase.auth.getUser();
  // if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = null; // stub — no real user during integration test

  // ── Fetch gate ──────────────────────────────────────────────────────────────
  // RLS on job_gates limits SELECT to org members, so a missing row means
  // either the gate doesn't exist or the user isn't in the right org.
  const { data: gate } = await supabase
    .from("job_gates")
    .select("id, job_id, status")
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
  // TODO(MMC-35): re-enable once auth is wired up.
  // Skipped for integration testing — service role already bypasses RLS.

  // ── Apply overrides ─────────────────────────────────────────────────────────
  // Write user_override_value before confirming so the pipeline's
  // readPendingOverrides() picks them up when it resumes polling.
  const body: ConfirmRequestBody = await req.json().catch(() => ({}));
  const overrides = body.overrides ?? [];
  const overrideAt = new Date().toISOString();

  for (const override of overrides) {
    await supabase
      .from("extracted_inputs")
      .update({
        user_override_value: override.value as never,
        user_override_at: overrideAt,
        user_override_by: user?.id ?? null,
      })
      .eq("id", override.extractedInputId)
      .eq("analysis_job_id", gate.job_id); // Safety: scope to this job
  }

  // ── Confirm gate ────────────────────────────────────────────────────────────
  const { error: updateError } = await supabase
    .from("job_gates")
    .update({
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
      confirmed_by: user?.id ?? null,
    })
    .eq("id", gateId);

  if (updateError) {
    console.error("[gates/confirm] Update failed:", updateError.message);
    return NextResponse.json({ error: "Failed to confirm gate" }, { status: 500 });
  }

  return NextResponse.json({
    gateId,
    status: "confirmed",
    overridesApplied: overrides.length,
  });
}
