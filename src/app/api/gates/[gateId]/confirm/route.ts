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
import { createClient } from "@/lib/supabase/server";

interface OverrideEntry {
  extractedInputId: string;
  value: unknown;
}

interface ConfirmRequestBody {
  overrides?: OverrideEntry[];
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ gateId: string }> }) {
  const { gateId } = await params;
  const supabase = await createClient();

  // ── Auth ────────────────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  // ── Explicit org membership check ────────────────────────────────────────────
  // RLS handles data isolation, but we check explicitly for a clean 403.
  const { data: job } = await supabase
    .from("analysis_jobs")
    .select("org_id")
    .eq("id", gate.job_id)
    .single();

  if (!job) {
    return NextResponse.json({ error: "Gate not found" }, { status: 404 });
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("id")
    .eq("org_id", job.org_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
        user_override_by: user.id,
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
      confirmed_by: user.id,
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
