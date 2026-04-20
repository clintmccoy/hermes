/**
 * POST /api/webhooks/storage
 *
 * Receives Supabase Storage webhook events and triggers the analysis-job
 * Trigger.dev task when a new deal document is uploaded.
 *
 * ## Setup (one-time, in Supabase dashboard)
 * Dashboard → Database → Webhooks → Create new webhook:
 *   - Table: uploaded_files
 *   - Events: INSERT
 *   - URL: https://<your-vercel-domain>/api/webhooks/storage
 *   - HTTP headers: { "x-webhook-secret": <SUPABASE_WEBHOOK_SECRET> }
 *
 * ## Security
 * Requests are validated against SUPABASE_WEBHOOK_SECRET. Unauthenticated
 * requests are rejected with 401.
 *
 * ## Trigger condition
 * Only triggers an analysis job if the uploaded_files row has:
 * - status = "pending" (not a duplicate or already-processed file)
 * - deal_id is set (orphaned uploads don't trigger analysis)
 * - mime_type = "application/pdf" (only PDFs go through the pipeline for v0)
 */

import { NextRequest, NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";
import { analysisJobTask } from "@/trigger/analysis-job";
import type { AnalysisJobPayload } from "@/trigger/lib/types";

// Default analysis depth for upload-triggered jobs.
// In v1 this will be user-configurable at upload time.
const DEFAULT_ANALYSIS_DEPTH = "first_run" as const;

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── 1. Authenticate the webhook ──────────────────────────────────────────
  const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[storage-webhook] SUPABASE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const incomingSecret = request.headers.get("x-webhook-secret");

  if (!incomingSecret || incomingSecret !== webhookSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 2. Parse the webhook payload ─────────────────────────────────────────
  let body: SupabaseWebhookPayload;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Supabase table webhooks send { type, table, record, old_record, schema }
  if (body.type !== "INSERT" || body.table !== "uploaded_files") {
    // Not a file upload event — ignore silently
    return NextResponse.json({ ok: true, skipped: true });
  }

  const file = body.record;

  // ── 3. Apply trigger conditions ───────────────────────────────────────────
  if (!file) {
    return NextResponse.json({ error: "Missing record" }, { status: 400 });
  }

  if (file.status !== "pending") {
    // Duplicate or already-processed file — don't re-trigger
    return NextResponse.json({ ok: true, skipped: true, reason: "not_pending" });
  }

  if (!file.deal_id) {
    // Orphaned upload (not yet associated with a deal) — don't trigger
    return NextResponse.json({ ok: true, skipped: true, reason: "no_deal_id" });
  }

  if (file.mime_type !== "application/pdf") {
    // Non-PDF — v0 pipeline only handles PDFs
    return NextResponse.json({ ok: true, skipped: true, reason: "not_pdf" });
  }

  // ── 4. Create the analysis_jobs record in Supabase ───────────────────────
  // We create the record here (not in the task) so the job ID is available
  // immediately for the UI to track — before the Trigger.dev worker picks it up.
  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const { data: job, error: jobError } = await db
    .from("analysis_jobs")
    .insert({
      org_id: file.org_id,
      deal_id: file.deal_id,
      created_by: file.uploaded_by,
      executor_model: "claude-sonnet-4-6",
      advisor_model: "claude-opus-4-6",
      analysis_depth: DEFAULT_ANALYSIS_DEPTH,
      job_type: "analysis",
      status: "queued",
    })
    .select("id")
    .single();

  if (jobError || !job) {
    console.error("[storage-webhook] Failed to create analysis_jobs row:", jobError?.message);
    return NextResponse.json({ error: "Failed to create job record" }, { status: 500 });
  }

  // ── 5. Trigger the Trigger.dev task ───────────────────────────────────────
  const taskPayload: AnalysisJobPayload = {
    jobId: job.id,
    uploadedFileId: file.id,
    dealId: file.deal_id,
    orgId: file.org_id,
    userId: file.uploaded_by,
    analysisDepth: DEFAULT_ANALYSIS_DEPTH,
  };

  try {
    const handle = await tasks.trigger<typeof analysisJobTask>("analysis-job", taskPayload);

    // Store the Trigger.dev run ID back on the job for tracking
    await db.from("analysis_jobs").update({ trigger_dev_job_id: handle.id }).eq("id", job.id);

    console.log(
      `[storage-webhook] Triggered analysis-job ${job.id} for file ${file.id} (run: ${handle.id})`,
    );

    return NextResponse.json({
      ok: true,
      jobId: job.id,
      triggerRunId: handle.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[storage-webhook] Failed to trigger task:", message);

    // Mark job as failed so it doesn't sit in "queued" indefinitely
    await db
      .from("analysis_jobs")
      .update({ status: "failed", error_message: `Trigger failed: ${message}` })
      .eq("id", job.id);

    return NextResponse.json({ error: "Failed to trigger job" }, { status: 500 });
  }
}

// ── Types ────────────────────────────────────────────────────────────────────

interface SupabaseWebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: UploadedFileRecord | null;
  old_record: UploadedFileRecord | null;
}

interface UploadedFileRecord {
  id: string;
  org_id: string;
  deal_id: string | null;
  uploaded_by: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  status: string;
  sha256_hash: string;
  file_size_bytes: number;
  source: string;
  uploaded_at: string;
}
