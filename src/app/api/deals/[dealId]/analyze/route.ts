/**
 * POST /api/deals/[dealId]/analyze
 *
 * User-initiated analysis trigger. Atomically creates one `analysis_jobs` row,
 * transitions all pending (non-duplicate) uploaded_files to `queued`, fires
 * the Trigger.dev `analysis-job` task, and emits an `agent_events` row for
 * SLIP metrics tracking.
 *
 * ## Flow
 * 1. Parse + validate request body (Zod).
 * 2. Verify `dealId` exists; fetch `org_id` from the deals row.
 * 3. Idempotency guard — return 409 if an active job (`queued` | `running`)
 *    already exists for this deal.
 * 4. Read all `uploaded_files` with `status = 'pending'` and
 *    `duplicate_of_id IS NULL` for this deal. Return 400 if none.
 * 5. Insert `analysis_jobs` row (`status = 'queued'`).
 * 6. Update those `uploaded_files.status` → `'queued'` (WHERE still `pending`).
 *    If 0 rows updated (lost race), compensating-delete the job row → 409.
 * 7. Insert `agent_events` row (`event_type = 'analysis_kicked_off'`).
 * 8. Fire Trigger.dev `analysis-job` task; store run ID back on the job.
 * 9. Return `201 { analysis_job_id }`.
 *
 * ## Transaction semantics
 * Supabase JS has no native multi-statement transaction support. We simulate
 * atomicity with a compensating delete on the jobs row if the file-status
 * update hits a race condition (step 6). The window for data inconsistency
 * is effectively zero under normal use (rapid double-click scenario).
 *
 * ## Auth
 * Service-role bypass in place. `user_id` accepted from request body
 * temporarily. TODO(MMC-22): derive from authenticated session.
 *
 * ## Analysis depth
 * Hardcoded to `first_run` for now.
 * TODO(product): decide whether to start at `boe` (faster magic moment) or
 * allow the caller to specify depth. See MMC-49 notes.
 *
 * ## References
 * - Scope spec §3.2, §3.6 — API surface + observability
 * - MMC-49 — this ticket
 * - MMC-40 — parent scope
 * - MMC-48 — uploads route (pattern reference)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { tasks } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";
import { analysisJobTask } from "@/trigger/analysis-job";
import { EXECUTOR_MODEL, ADVISOR_MODEL, type AnalysisJobPayload } from "@/trigger/lib/types";

// ── Constants ─────────────────────────────────────────────────────────────────

// TODO(product): decide whether to expose depth as a caller option.
// See route-level doc comment above.
const ANALYSIS_DEPTH = "first_run" as const;

/** Job statuses that block a new analyze submission for the same deal. */
const ACTIVE_JOB_STATUSES = ["queued", "running"] as const;

// ── Schema ────────────────────────────────────────────────────────────────────

const AnalyzeRequestSchema = z.object({
  // TODO(MMC-22): remove from public API once auth lands.
  // Will be derived from the authenticated session (auth.uid()).
  user_id: z.string().uuid("user_id must be a valid UUID"),
});

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ dealId: string }> },
): Promise<NextResponse> {
  const { dealId } = await params;

  // ── 1. Parse request body ────────────────────────────────────────────────
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // ── 2. Validate with Zod ─────────────────────────────────────────────────
  const parsed = AnalyzeRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { user_id } = parsed.data;

  // ── 3. Service-role client ───────────────────────────────────────────────
  // TODO(MMC-22): replace with cookie-based session client once auth lands.
  const db = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // ── 4. Verify deal exists, get org_id ────────────────────────────────────
  const { data: deal, error: dealError } = await db
    .from("deals")
    .select("id, org_id")
    .eq("id", dealId)
    .maybeSingle();

  if (dealError) {
    console.error(`[deal-intake] Failed to look up deal ${dealId}:`, dealError.message);
    return NextResponse.json({ error: "Failed to verify deal" }, { status: 500 });
  }

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  const { org_id } = deal;

  // ── 5. Idempotency guard — reject if an active job already exists ─────────
  const { data: activeJob, error: activeJobError } = await db
    .from("analysis_jobs")
    .select("id, status")
    .eq("deal_id", dealId)
    .in("status", [...ACTIVE_JOB_STATUSES])
    .maybeSingle();

  if (activeJobError) {
    console.error(
      `[deal-intake] Failed to check for active jobs on deal ${dealId}:`,
      activeJobError.message,
    );
    return NextResponse.json({ error: "Failed to check job status" }, { status: 500 });
  }

  if (activeJob) {
    console.log(
      `[deal-intake] analyze rejected — active job exists job_id=${activeJob.id} status=${activeJob.status} deal_id=${dealId}`,
    );
    return NextResponse.json(
      { error: "An analysis job is already active for this deal", analysis_job_id: activeJob.id },
      { status: 409 },
    );
  }

  // ── 6. Read pending files (excluding duplicates) ──────────────────────────
  // Duplicates (duplicate_of_id IS NOT NULL) are never included in a new job
  // — they share content with an already-tracked file and would produce
  // redundant extraction results. See scope spec §4 Q4.
  const { data: pendingFiles, error: filesError } = await db
    .from("uploaded_files")
    .select("id")
    .eq("deal_id", dealId)
    .eq("status", "pending")
    .is("duplicate_of_id", null);

  if (filesError) {
    console.error(
      `[deal-intake] Failed to read pending files for deal ${dealId}:`,
      filesError.message,
    );
    return NextResponse.json({ error: "Failed to read pending files" }, { status: 500 });
  }

  if (!pendingFiles || pendingFiles.length === 0) {
    return NextResponse.json(
      { error: "No pending files to analyze for this deal" },
      { status: 400 },
    );
  }

  const uploadedFileIds = pendingFiles.map((f) => f.id);

  // ── 7. Insert analysis_jobs row ───────────────────────────────────────────
  const { data: job, error: jobError } = await db
    .from("analysis_jobs")
    .insert({
      org_id,
      deal_id: dealId,
      created_by: user_id,
      job_type: "analysis",
      analysis_depth: ANALYSIS_DEPTH,
      status: "queued",
      executor_model: EXECUTOR_MODEL,
      advisor_model: ADVISOR_MODEL,
    })
    .select("id")
    .single();

  if (jobError || !job) {
    console.error(
      `[deal-intake] Failed to create analysis_jobs row for deal ${dealId}:`,
      jobError?.message,
    );
    return NextResponse.json({ error: "Failed to create analysis job" }, { status: 500 });
  }

  const analysisJobId = job.id;

  // ── 8. Transition uploaded_files to 'queued' ──────────────────────────────
  // WHERE status = 'pending' is the idempotency guard — a concurrent request
  // that already flipped these rows will cause 0 rows to be updated here.
  const { data: updatedFiles, error: updateError } = await db
    .from("uploaded_files")
    .update({ status: "queued" })
    .in("id", uploadedFileIds)
    .eq("status", "pending") // guard against race
    .select("id");

  if (updateError) {
    console.error(
      `[deal-intake] Failed to update uploaded_files status for deal ${dealId}:`,
      updateError.message,
    );
    // Compensating delete — roll back the job row so state stays clean.
    await db.from("analysis_jobs").delete().eq("id", analysisJobId);
    return NextResponse.json({ error: "Failed to queue files for analysis" }, { status: 500 });
  }

  if (!updatedFiles || updatedFiles.length === 0) {
    // Lost a race — another request queued these files between steps 6 and 8.
    // Compensating delete to leave no orphaned job row.
    await db.from("analysis_jobs").delete().eq("id", analysisJobId);
    console.log(
      `[deal-intake] analyze race condition — 0 files updated, compensating delete job_id=${analysisJobId} deal_id=${dealId}`,
    );
    return NextResponse.json(
      { error: "An analysis job is already active for this deal" },
      { status: 409 },
    );
  }

  // ── 9. Emit agent_events row (§3.6 observability) ─────────────────────────
  // sequence_number = 0: this is the pre-pipeline user-action event, emitted
  // before the Trigger.dev task has started its own event stream.
  const { error: eventError } = await db.from("agent_events").insert({
    job_id: analysisJobId,
    event_type: "analysis_kicked_off",
    sequence_number: 0,
    payload: {
      deal_id: dealId,
      file_count: uploadedFileIds.length,
      uploaded_file_ids: uploadedFileIds,
      analysis_depth: ANALYSIS_DEPTH,
      initiated_by: user_id,
    },
  });

  if (eventError) {
    // Non-fatal — SLIP metrics will have a gap but the job proceeds.
    console.error(
      `[deal-intake] Failed to emit analysis_kicked_off event for job ${analysisJobId}:`,
      eventError.message,
    );
  }

  // ── 10. Fire Trigger.dev task ─────────────────────────────────────────────
  const taskPayload: AnalysisJobPayload = {
    jobId: analysisJobId,
    uploadedFileIds,
    dealId,
    orgId: org_id,
    userId: user_id,
    analysisDepth: ANALYSIS_DEPTH,
  };

  try {
    const handle = await tasks.trigger<typeof analysisJobTask>("analysis-job", taskPayload);

    // Store the Trigger.dev run ID back on the job for tracing.
    await db
      .from("analysis_jobs")
      .update({ trigger_dev_job_id: handle.id })
      .eq("id", analysisJobId);

    console.log(
      `[deal-intake] analysis kicked off job_id=${analysisJobId} deal_id=${dealId} file_count=${uploadedFileIds.length} run_id=${handle.id}`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(
      `[deal-intake] Failed to trigger analysis-job task for job ${analysisJobId}:`,
      message,
    );

    // Mark job failed — don't leave it in 'queued' with no worker picking it up.
    await db
      .from("analysis_jobs")
      .update({ status: "failed", error_message: `Trigger failed: ${message}` })
      .eq("id", analysisJobId);

    return NextResponse.json({ error: "Failed to start analysis task" }, { status: 500 });
  }

  // ── 11. Return 201 ────────────────────────────────────────────────────────
  return NextResponse.json({ analysis_job_id: analysisJobId }, { status: 201 });
}
