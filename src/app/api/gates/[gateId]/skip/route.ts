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
import { createClient } from "@/lib/supabase/server";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ gateId: string }> }) {
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

  // ── Skippability check ───────────────────────────────────────────────────────
  // Check the gate_config_entries row(s) for this gate_name. If any entry
  // for this org (or the system default profile) marks it non-skippable, deny.
  const { data: configEntry } = await supabase
    .from("gate_config_entries")
    .select("is_skippable, gate_config_profiles(org_id)")
    .eq("gate_name", gate.gate_name)
    .or(`gate_config_profiles.org_id.eq.${job.org_id},gate_config_profiles.org_id.is.null`)
    .order("gate_config_profiles(org_id)", { ascending: false }) // org-specific profile wins
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
      skipped_by: user.id,
    })
    .eq("id", gateId);

  if (updateError) {
    console.error("[gates/skip] Update failed:", updateError.message);
    return NextResponse.json({ error: "Failed to skip gate" }, { status: 500 });
  }

  return NextResponse.json({ gateId, status: "skipped" });
}
