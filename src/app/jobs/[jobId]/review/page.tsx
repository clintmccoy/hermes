/**
 * /app/jobs/[jobId]/review
 *
 * Stub gate review page. Surfaces the pending gate checkpoint for a job so
 * an analyst can review extracted inputs or model KPIs and confirm/skip.
 *
 * This is a functional stub — not a designed UI surface. The real analyst
 * review interface is a v1 deliverable (MMC-35 / MMC-36).
 *
 * Renders:
 *   - post_extraction gate: extracted_inputs table with override inputs
 *   - post_construction gate: model_run_kpis summary
 *   - Other gate names: generic confirm/skip with no domain-specific display
 *
 * Route params:
 *   jobId — the analysis_jobs.id (UUID)
 */

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { GateReview, type ExtractedInputRow, type KpiRow } from "./GateReview";

interface PageProps {
  params: Promise<{ jobId: string }>;
}

export default async function GateReviewPage({ params }: PageProps) {
  const { jobId } = await params;
  // Use service role to bypass RLS for integration test (no auth session)
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // ── Auth ──────────────────────────────────────────────────────────────────
  // TODO(MMC-35): enforce auth once login flow exists. Bypassed for integration testing.
  // const { data: { user } } = await supabase.auth.getUser();
  // if (!user) redirect("/login");

  // ── Fetch job ─────────────────────────────────────────────────────────────
  const { data: job } = await supabase
    .from("analysis_jobs")
    .select("id, status, org_id, deal_id, analysis_depth")
    .eq("id", jobId)
    .maybeSingle();

  if (!job) {
    return <ErrorPage message="Job not found." />;
  }

  // ── Fetch pending gate ────────────────────────────────────────────────────
  const { data: gate } = await supabase
    .from("job_gates")
    .select("id, gate_name, gate_sequence, status")
    .eq("job_id", jobId)
    .eq("status", "pending")
    .order("gate_sequence")
    .limit(1)
    .maybeSingle();

  if (!gate) {
    // No pending gate — job may not be at a checkpoint, or already resolved
    return <InfoPage jobId={jobId} jobStatus={job.status} analysisDepth={job.analysis_depth} />;
  }

  // ── Skippability ──────────────────────────────────────────────────────────
  // Check if the gate_config_entries row for this gate marks it skippable.
  // Falls back to true if no config entry found (lenient default for stub).
  const { data: configEntry } = await supabase
    .from("gate_config_entries")
    .select("is_skippable")
    .eq("gate_name", gate.gate_name)
    .limit(1)
    .maybeSingle();

  const isSkippable = configEntry?.is_skippable ?? true;

  // ── Gate-specific data ────────────────────────────────────────────────────
  let extractedInputs: ExtractedInputRow[] | undefined;
  let kpis: KpiRow | null | undefined;

  if (gate.gate_name === "post_extraction") {
    const { data: inputs } = await supabase
      .from("extracted_inputs")
      .select(
        "id, field_name, extracted_value, unit, confidence_score, source_page_number, source_text_excerpt, advisor_invoked, user_override_value",
      )
      .eq("analysis_job_id", jobId)
      .order("field_name");

    extractedInputs = (inputs ?? []).map((row) => ({
      id: row.id,
      field_name: row.field_name,
      extracted_value: row.extracted_value,
      unit: row.unit,
      confidence_score: row.confidence_score,
      source_page_number: row.source_page_number,
      source_text_excerpt: row.source_text_excerpt,
      advisor_invoked: row.advisor_invoked,
      user_override_value: row.user_override_value,
    }));
  }

  if (gate.gate_name === "post_construction") {
    // Get the latest model_result for this job, then its KPIs
    const { data: modelResult } = await supabase
      .from("model_results")
      .select("id")
      .eq("analysis_job_id", jobId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (modelResult) {
      const { data: kpiRow } = await supabase
        .from("model_run_kpis")
        .select(
          "unlevered_irr_pct, levered_irr_pct, equity_multiple, going_in_cap_rate_pct, exit_cap_rate_pct, noi_year1, gross_sale_price",
        )
        .eq("model_result_id", modelResult.id)
        .maybeSingle();

      kpis = kpiRow;
    }
  }

  return (
    <GateReview
      gateId={gate.id}
      gateName={gate.gate_name}
      isSkippable={isSkippable}
      extractedInputs={extractedInputs}
      kpis={kpis}
    />
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ErrorPage({ message }: { message: string }) {
  return (
    <div style={{ fontFamily: "system-ui", padding: 32 }}>
      <p style={{ color: "#dc2626" }}>{message}</p>
    </div>
  );
}

function InfoPage({
  jobId,
  jobStatus,
  analysisDepth,
}: {
  jobId: string;
  jobStatus: string;
  analysisDepth: string | null;
}) {
  return (
    <div style={{ fontFamily: "system-ui", padding: 32, maxWidth: 600 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Gate review</h1>
      <p style={{ color: "#666", fontSize: 14 }}>
        Job <code>{jobId}</code> is not currently waiting at a gate.
      </p>
      <dl style={{ marginTop: 16, fontSize: 14 }}>
        <dt style={{ fontWeight: 500 }}>Status</dt>
        <dd style={{ marginLeft: 0, marginBottom: 8 }}>
          <code>{jobStatus}</code>
        </dd>
        {analysisDepth && (
          <>
            <dt style={{ fontWeight: 500 }}>Analysis depth</dt>
            <dd style={{ marginLeft: 0 }}>
              <code>{analysisDepth}</code>
            </dd>
          </>
        )}
      </dl>
      <p style={{ marginTop: 24, fontSize: 13, color: "#999" }}>
        If the job is still running, refresh this page when it reaches the next gate checkpoint
        (status: <code>awaiting_gate</code>).
      </p>
    </div>
  );
}
