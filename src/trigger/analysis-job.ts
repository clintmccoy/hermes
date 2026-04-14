/**
 * analysis-job — the main Trigger.dev orchestrator task.
 *
 * This is the single orchestrating agent per job (ADR 010, Decision 3).
 * It wires together all six pipeline steps and enforces the human
 * checkpoints defined by the org's gate_config_profile (ADR 010, Decision 4;
 * ADR 011, §3).
 *
 * Pipeline:
 *   Step 1: Document ingestion (Document AI)
 *   Step 2: Extraction + advisor consultation → Gate (if configured)
 *   Step 3: Module selection
 *   Step 4: Model construction + Gate (if configured)
 *   Step 5: Output generation + version lock
 *   Step 6: Credit deduction (ONLY on success)
 *
 * Gate system (normalized, not hardcoded):
 *   - Gate configuration is loaded from gate_config_profiles +
 *     gate_config_entries at job start.
 *   - BOE analysis_depth has no gates in the system default profile.
 *   - Each gate creates a job_gates row and polls it for confirmation.
 *   - The UI confirms a gate by updating job_gates.status = 'confirmed'
 *     or 'skipped' via an authenticated API route.
 *   - analysis_jobs.status is set to 'awaiting_gate' during any gate;
 *     set back to 'running' once the gate passes.
 *
 * Provenance: every analysis_jobs update records exact model version strings,
 * token counts, and gate confirmation timestamps. ADR 010 non-negotiable.
 */

import { task, wait } from "@trigger.dev/sdk/v3";
import { getSupabaseAdmin, emitEvent, EventSequencer } from "./lib/events";
import { documentIngestionTask } from "./subtasks/document-ingestion";
import { extractionTask } from "./subtasks/extraction";
import { moduleSelectionTask } from "./subtasks/module-selection";
import { modelConstructionTask } from "./subtasks/model-construction";
import { creditDeductionTask } from "./subtasks/credit-deduction";
import {
  EXECUTOR_MODEL,
  ADVISOR_MODEL,
  type AnalysisJobPayload,
  type ProvenanceTotals,
  type ExtractionSummaryItem,
  type ModelSummaryItem,
} from "./lib/types";

// Gate timeout: 48 hours. After this, the job is cancelled and no credits deducted.
const GATE_TIMEOUT_SECONDS = 48 * 60 * 60;

// System default gate config profile UUID — seeded in migration
const SYSTEM_DEFAULT_PROFILE_ID = "00000000-0000-0000-0000-000000000001";

interface GateConfigEntry {
  gate_name: string;
  gate_sequence: number;
  is_skippable: boolean;
}

export const analysisJobTask = task({
  id: "analysis-job",
  // No retry at the orchestrator level — subtasks handle their own retries.
  // A failed orchestrator run leaves the job in a failed state; the user
  // can re-trigger from the UI.
  retry: { maxAttempts: 1 },

  run: async (payload: AnalysisJobPayload): Promise<void> => {
    const { jobId, uploadedFileId, dealId, orgId, userId, analysisDepth } = payload;

    const db = getSupabaseAdmin();
    const sequencer = new EventSequencer();

    // ── Mark job as started ───────────────────────────────────────────────────
    await db
      .from("analysis_jobs")
      .update({
        status: "running",
        started_at: new Date().toISOString(),
        executor_model: EXECUTOR_MODEL,
        advisor_model: ADVISOR_MODEL,
        trigger_dev_job_id: jobId, // Trigger.dev run ID = our job ID for v0
      })
      .eq("id", jobId);

    await emitEvent(jobId, sequencer, "job.started", {
      uploadedFileId,
      dealId,
      analysisDepth,
      executorModel: EXECUTOR_MODEL,
      advisorModel: ADVISOR_MODEL,
    });

    // ── Load gate config for this org + analysis depth ────────────────────────
    // Resolves the org's gate profile (or falls back to system default).
    // BOE has no gate entries in the default profile — it runs uninterrupted.
    const gateEntries = await loadGateConfig(db, orgId, analysisDepth);
    const gateByName = new Map(gateEntries.map((e) => [e.gate_name, e]));

    // Provenance accumulator — updated after each subtask
    const provenance: ProvenanceTotals = {
      executorTokensUsed: 0,
      advisorTokensUsed: 0,
      advisorInvocationCount: 0,
    };

    try {
      // ── STEP 1: Document ingestion ──────────────────────────────────────────
      const ingestionResult = await documentIngestionTask.triggerAndWait({
        jobId,
        uploadedFileId,
        dealId,
        orgId,
        startingSequence: sequencer.current(),
      });

      if (!ingestionResult.ok) {
        throw new Error(`document-ingestion subtask failed: ${ingestionResult.error}`);
      }

      // Advance orchestrator sequencer past subtask events
      advanceSequencer(sequencer, 3); // ingestion emits up to 3 events

      // ── STEP 2: Extraction ─────────────────────────────────────────────────
      const extractionResult = await extractionTask.triggerAndWait({
        jobId,
        dealId,
        orgId,
        documentRefId: ingestionResult.output.documentRefId,
        rawExtractionStoragePath: ingestionResult.output.rawExtractionStoragePath,
        analysisDepth,
        startingSequence: sequencer.current(),
        currentAdvisorInvocationCount: provenance.advisorInvocationCount,
        currentAdvisorTokensUsed: provenance.advisorTokensUsed,
        currentExecutorTokensUsed: provenance.executorTokensUsed,
      });

      if (!extractionResult.ok) {
        throw new Error(`extraction subtask failed: ${extractionResult.error}`);
      }

      mergeProvenance(provenance, extractionResult.output);
      advanceSequencer(sequencer, 5); // extraction emits up to 5 events

      // Update analysis_jobs with running provenance counts
      await updateJobProvenance(db, jobId, provenance);

      // ── POST-EXTRACTION GATE (if configured for this depth) ─────────────────
      const postExtractionGate = gateByName.get("post_extraction");
      if (postExtractionGate) {
        const extractionSummary = await buildExtractionSummary(db, jobId);

        await emitEvent(jobId, sequencer, "gate.presented", {
          gateName: postExtractionGate.gate_name,
          gateSequence: postExtractionGate.gate_sequence,
          extractionSummaryCount: extractionSummary.length,
          expiresInSeconds: GATE_TIMEOUT_SECONDS,
        });

        const { passed } = await runGate(db, jobId, postExtractionGate, GATE_TIMEOUT_SECONDS);

        if (!passed) {
          await cancelJob(db, jobId, sequencer, `${postExtractionGate.gate_name}_timeout`);
          return;
        }

        // Read any user overrides written to extracted_inputs before gate confirm
        const gate1Overrides = await readPendingOverrides(db, jobId);
        if (gate1Overrides.length > 0) {
          await applyUserOverrides(db, jobId, userId, gate1Overrides);
        }

        await emitEvent(jobId, sequencer, "gate.confirmed", {
          gateName: postExtractionGate.gate_name,
          gateSequence: postExtractionGate.gate_sequence,
          userId,
          overridesApplied: gate1Overrides.length,
        });

        await db.from("analysis_jobs").update({ status: "running" }).eq("id", jobId);
      }

      // ── STEP 3: Module selection ────────────────────────────────────────────
      const moduleResult = await moduleSelectionTask.triggerAndWait({
        jobId,
        dealId,
        orgId,
        analysisDepth,
        startingSequence: sequencer.current(),
        currentAdvisorInvocationCount: provenance.advisorInvocationCount,
        currentAdvisorTokensUsed: provenance.advisorTokensUsed,
        currentExecutorTokensUsed: provenance.executorTokensUsed,
      });

      if (!moduleResult.ok) {
        throw new Error(`module-selection subtask failed: ${moduleResult.error}`);
      }

      mergeProvenance(provenance, moduleResult.output);
      advanceSequencer(sequencer, 4);
      await updateJobProvenance(db, jobId, provenance);

      // ── STEP 4: Model construction ──────────────────────────────────────────
      const constructionResult = await modelConstructionTask.triggerAndWait({
        jobId,
        dealId,
        orgId,
        compositionId: moduleResult.output.compositionId,
        analysisDepth,
        startingSequence: sequencer.current(),
        currentAdvisorInvocationCount: provenance.advisorInvocationCount,
        currentAdvisorTokensUsed: provenance.advisorTokensUsed,
        currentExecutorTokensUsed: provenance.executorTokensUsed,
      });

      if (!constructionResult.ok) {
        throw new Error(`model-construction subtask failed: ${constructionResult.error}`);
      }

      mergeProvenance(provenance, constructionResult.output);
      advanceSequencer(sequencer, 3);
      await updateJobProvenance(db, jobId, provenance);

      // ── POST-CONSTRUCTION GATE (if configured for this depth) ───────────────
      const postConstructionGate = gateByName.get("post_construction");
      if (postConstructionGate) {
        const modelSummary = await buildModelSummary(db, constructionResult.output.modelResultId);

        await emitEvent(jobId, sequencer, "gate.presented", {
          gateName: postConstructionGate.gate_name,
          gateSequence: postConstructionGate.gate_sequence,
          modelSummaryItems: modelSummary.length,
          modulesSelected: moduleResult.output.modulesSelected,
          expiresInSeconds: GATE_TIMEOUT_SECONDS,
        });

        const { passed } = await runGate(db, jobId, postConstructionGate, GATE_TIMEOUT_SECONDS);

        if (!passed) {
          await cancelJob(db, jobId, sequencer, `${postConstructionGate.gate_name}_timeout`);
          return;
        }

        await emitEvent(jobId, sequencer, "gate.confirmed", {
          gateName: postConstructionGate.gate_name,
          gateSequence: postConstructionGate.gate_sequence,
          userId,
        });

        await db.from("analysis_jobs").update({ status: "running" }).eq("id", jobId);
      }

      // ── STEP 5: Output generation ───────────────────────────────────────────
      // Version-lock the model result
      await db
        .from("deal_model_compositions")
        .update({
          composition_status: "confirmed",
          confirmed_at: new Date().toISOString(),
          confirmed_by: userId,
        })
        .eq("id", moduleResult.output.compositionId);

      // ── STEP 6: Credit deduction (ONLY on success) ──────────────────────────
      await creditDeductionTask.triggerAndWait({
        jobId,
        dealId,
        orgId,
        analysisDepth,
        creditCost: creditCostForDepth(analysisDepth),
        startingSequence: sequencer.current(),
      });

      advanceSequencer(sequencer, 2);

      // ── Final provenance flush ──────────────────────────────────────────────
      await db
        .from("analysis_jobs")
        .update({
          status: "complete",
          completed_at: new Date().toISOString(),
          advisor_invocation_count: provenance.advisorInvocationCount,
          advisor_tokens_used: provenance.advisorTokensUsed,
          executor_tokens_used: provenance.executorTokensUsed,
        })
        .eq("id", jobId);

      await emitEvent(jobId, sequencer, "job.completed", {
        analysisDepth,
        modelResultId: constructionResult.output.modelResultId,
        compositionId: moduleResult.output.compositionId,
        advisorInvocationCount: provenance.advisorInvocationCount,
        executorTokensUsed: provenance.executorTokensUsed,
        advisorTokensUsed: provenance.advisorTokensUsed,
      });
    } catch (err) {
      // ── Error path — NO credit deduction ─────────────────────────────────
      // The credit deduction subtask is only reachable via the happy path above.
      // Any exception here means the job failed before credits are owed.
      const errorMessage = err instanceof Error ? err.message : "Unknown error";

      console.error(`[analysis-job] Job ${jobId} failed:`, errorMessage);

      await db
        .from("analysis_jobs")
        .update({
          status: "failed",
          failed_at: new Date().toISOString(),
          error_message: errorMessage,
          // Flush whatever provenance we've accumulated
          advisor_invocation_count: provenance.advisorInvocationCount,
          advisor_tokens_used: provenance.advisorTokensUsed,
          executor_tokens_used: provenance.executorTokensUsed,
        })
        .eq("id", jobId);

      await emitEvent(jobId, sequencer, "job.failed", {
        errorMessage,
        advisorInvocationCount: provenance.advisorInvocationCount,
      });

      // Re-throw so Trigger.dev marks the run as failed
      throw err;
    }
  },
});

// ── Gate system ──────────────────────────────────────────────────────────────

/**
 * Load gate config entries for this org + analysis depth.
 *
 * Precedence: org-specific profile → system default profile.
 * Entries are filtered to those whose analysis_depths array includes
 * the current depth. BOE is excluded from the v0 default config.
 */
async function loadGateConfig(
  db: ReturnType<typeof getSupabaseAdmin>,
  orgId: string,
  analysisDepth: string,
): Promise<GateConfigEntry[]> {
  // Prefer org-specific profile; fall back to system default
  const { data: orgProfile } = await db
    .from("gate_config_profiles")
    .select("id")
    .eq("org_id", orgId)
    .eq("is_default", true)
    .maybeSingle();

  const profileId = orgProfile?.id ?? SYSTEM_DEFAULT_PROFILE_ID;

  const { data: entries } = await db
    .from("gate_config_entries")
    .select("gate_name, gate_sequence, is_skippable, analysis_depths")
    .eq("profile_id", profileId)
    .order("gate_sequence");

  if (!entries) return [];

  // Filter to entries that apply to this analysis depth
  return entries
    .filter((e) => {
      const depths = e.analysis_depths as string[];
      return Array.isArray(depths) && depths.includes(analysisDepth);
    })
    .map((e) => ({
      gate_name: e.gate_name,
      gate_sequence: e.gate_sequence,
      is_skippable: e.is_skippable,
    }));
}

/**
 * Run a single gate checkpoint:
 *   1. Create (or reuse) a job_gates row for this gate
 *   2. Set analysis_jobs.status = 'awaiting_gate'
 *   3. Poll job_gates.status every 30s until confirmed/skipped or timeout
 *   4. Return { passed, gateId }
 *
 * Uses upsert semantics on (job_id, gate_sequence) to survive retries
 * without creating duplicate gate rows.
 */
async function runGate(
  db: ReturnType<typeof getSupabaseAdmin>,
  jobId: string,
  entry: GateConfigEntry,
  timeoutSeconds: number,
): Promise<{ passed: boolean; gateId: string | null }> {
  // Upsert so a retry doesn't create a second pending row for the same gate
  const { data: gateRow, error } = await db
    .from("job_gates")
    .upsert(
      {
        job_id: jobId,
        gate_name: entry.gate_name,
        gate_sequence: entry.gate_sequence,
        status: "pending",
      },
      { onConflict: "job_id,gate_sequence", ignoreDuplicates: false },
    )
    .select("id, status")
    .single();

  if (error || !gateRow) {
    throw new Error(`Failed to create job_gates row for ${entry.gate_name}: ${error?.message}`);
  }

  const gateId = gateRow.id;

  // If the gate was already confirmed/skipped (retry scenario), pass immediately
  if (gateRow.status === "confirmed" || gateRow.status === "skipped") {
    return { passed: true, gateId };
  }

  // Suspend job at gate
  await db.from("analysis_jobs").update({ status: "awaiting_gate" }).eq("id", jobId);

  // Poll job_gates.status every 30s until confirmed, skipped, or timeout
  const POLL_INTERVAL = 30;
  const maxPolls = Math.ceil(timeoutSeconds / POLL_INTERVAL);

  for (let i = 0; i < maxPolls; i++) {
    await wait.for({ seconds: POLL_INTERVAL });

    const { data } = await db.from("job_gates").select("status").eq("id", gateId).single();

    if (data?.status === "confirmed" || data?.status === "skipped") {
      return { passed: true, gateId };
    }

    // Check if the job itself was cancelled externally
    const { data: job } = await db.from("analysis_jobs").select("status").eq("id", jobId).single();

    if (job?.status === "cancelled") {
      return { passed: false, gateId };
    }
  }

  return { passed: false, gateId }; // Timed out
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function mergeProvenance(
  totals: ProvenanceTotals,
  subtaskOutput: {
    executorTokensUsed?: number;
    advisorTokensUsed?: number;
    advisorInvocationCount?: number;
  },
): void {
  // Subtask outputs carry cumulative totals, not deltas — take the max
  // to avoid double-counting (subtask state includes prior subtask runs).
  totals.executorTokensUsed = Math.max(
    totals.executorTokensUsed,
    subtaskOutput.executorTokensUsed ?? 0,
  );
  totals.advisorTokensUsed = Math.max(
    totals.advisorTokensUsed,
    subtaskOutput.advisorTokensUsed ?? 0,
  );
  totals.advisorInvocationCount = Math.max(
    totals.advisorInvocationCount,
    subtaskOutput.advisorInvocationCount ?? 0,
  );
}

async function updateJobProvenance(
  db: ReturnType<typeof getSupabaseAdmin>,
  jobId: string,
  provenance: ProvenanceTotals,
): Promise<void> {
  await db
    .from("analysis_jobs")
    .update({
      advisor_invocation_count: provenance.advisorInvocationCount,
      advisor_tokens_used: provenance.advisorTokensUsed,
      executor_tokens_used: provenance.executorTokensUsed,
    })
    .eq("id", jobId);
}

async function cancelJob(
  db: ReturnType<typeof getSupabaseAdmin>,
  jobId: string,
  sequencer: EventSequencer,
  reason: string,
): Promise<void> {
  await db
    .from("analysis_jobs")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  await emitEvent(jobId, sequencer, "job.cancelled", { reason });
}

async function buildExtractionSummary(
  db: ReturnType<typeof getSupabaseAdmin>,
  jobId: string,
): Promise<ExtractionSummaryItem[]> {
  const { data: inputs } = await db
    .from("extracted_inputs")
    .select(
      "field_name, extracted_value, confidence_score, source_page_number, source_text_excerpt, advisor_invoked",
    )
    .eq("analysis_job_id", jobId)
    .order("field_name");

  return (inputs ?? []).map((i) => ({
    fieldName: i.field_name,
    extractedValue: i.extracted_value,
    confidence: i.confidence_score,
    sourcePageNumber: i.source_page_number,
    sourceTextExcerpt: i.source_text_excerpt,
    advisorInvoked: i.advisor_invoked,
  }));
}

async function buildModelSummary(
  db: ReturnType<typeof getSupabaseAdmin>,
  modelResultId: string,
): Promise<ModelSummaryItem[]> {
  const { data: kpis } = await db
    .from("model_run_kpis")
    .select(
      "unlevered_irr_pct, levered_irr_pct, equity_multiple, going_in_cap_rate_pct, exit_cap_rate_pct, noi_year1, gross_sale_price",
    )
    .eq("model_result_id", modelResultId)
    .maybeSingle();

  if (!kpis) return [];

  const items: ModelSummaryItem[] = [];
  const add = (label: string, value: number | null, unit: string) => {
    if (value !== null) items.push({ label, value, unit });
  };

  add("Unlevered IRR", kpis.unlevered_irr_pct, "pct");
  add("Levered IRR", kpis.levered_irr_pct, "pct");
  add("Equity Multiple", kpis.equity_multiple, "x");
  add("Going-In Cap Rate", kpis.going_in_cap_rate_pct, "pct");
  add("Exit Cap Rate", kpis.exit_cap_rate_pct, "pct");
  add("NOI Year 1", kpis.noi_year1, "usd");
  add("Gross Sale Price", kpis.gross_sale_price, "usd");

  return items;
}

/**
 * Read user override values written to extracted_inputs before gate confirm.
 * Convention: UI writes user_override_value without setting user_override_at.
 * The pipeline then sets user_override_at when it applies them here.
 */
async function readPendingOverrides(
  db: ReturnType<typeof getSupabaseAdmin>,
  jobId: string,
): Promise<Array<{ fieldName: string; value: unknown }>> {
  const { data } = await db
    .from("extracted_inputs")
    .select("field_name, user_override_value")
    .eq("analysis_job_id", jobId)
    .not("user_override_value", "is", null)
    .is("user_override_at", null); // Not yet applied by pipeline

  return (data ?? []).map((row) => ({
    fieldName: row.field_name,
    value: row.user_override_value,
  }));
}

async function applyUserOverrides(
  db: ReturnType<typeof getSupabaseAdmin>,
  jobId: string,
  userId: string,
  overrides: Array<{ fieldName: string; value: unknown }>,
): Promise<void> {
  const overrideAt = new Date().toISOString();

  for (const override of overrides) {
    await db
      .from("extracted_inputs")
      .update({
        user_override_value: override.value as Awaited<ReturnType<typeof db.from>>["data"],
        user_override_at: overrideAt,
        user_override_by: userId,
      })
      .eq("analysis_job_id", jobId)
      .eq("field_name", override.fieldName);
  }
}

/** Advance sequencer by N to account for events emitted inside subtasks. */
function advanceSequencer(sequencer: EventSequencer, n: number): void {
  for (let i = 0; i < n; i++) sequencer.next();
}

function creditCostForDepth(depth: string): number {
  const costs: Record<string, number> = {
    boe: 1,
    first_run: 3,
    ic_grade: 10,
    strategic_mix: 25,
  };
  return costs[depth] ?? 3;
}
