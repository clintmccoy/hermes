/**
 * analysis-job — the main Trigger.dev orchestrator task.
 *
 * This is the single orchestrating agent per job (ADR 010, Decision 3).
 * It wires together all six pipeline steps and enforces the two mandatory
 * human checkpoints (ADR 010, Decision 4).
 *
 * Pipeline:
 *   Step 1: Document ingestion (Document AI)
 *   Step 2: Extraction + advisor consultation → Gate 1 (user review)
 *   Step 3: Module selection
 *   Step 4: Model construction + Gate 2 (user review)
 *   Step 5: Output generation + version lock
 *   Step 6: Credit deduction (ONLY on success)
 *
 * Human gates use Trigger.dev wait tokens. The job suspends while waiting
 * (consuming no compute) and resumes when the user confirms via the UI.
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
  type Gate1Payload,
  type Gate2Payload,
  type ExtractionSummaryItem,
  type ModelSummaryItem,
} from "./lib/types";

// Gate timeout: 48 hours. After this, the job is cancelled and no credits deducted.
const GATE_TIMEOUT_SECONDS = 48 * 60 * 60;

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

      // ── GATE 1: User review of extraction ──────────────────────────────────
      // Gate implementation: set status → poll every 30s → UI confirms via API
      // route that updates status to "gate1_confirmed". wait.createToken is not
      // available in this SDK version; polling is the supported v0 pattern.
      const extractionSummary = await buildExtractionSummary(db, jobId);

      const gate1Payload: Gate1Payload = {
        jobId,
        dealId,
        resumeToken: "", // No token in polling model — UI keys off status column
        publicAccessToken: "",
        extractionSummary,
      };

      await db.from("analysis_jobs").update({ status: "awaiting_gate1" }).eq("id", jobId);

      await emitEvent(jobId, sequencer, "gate1.presented", {
        extractionSummaryCount: extractionSummary.length,
        expiresInSeconds: GATE_TIMEOUT_SECONDS,
      });

      console.log(
        "[analysis-job] Gate 1 presented. Waiting for user confirmation.",
        JSON.stringify({ gate1Payload }),
      );

      // Poll until user confirms or timeout (48h = 5760 × 30s polls)
      const gate1Confirmed = await pollForGateConfirmation(
        db,
        jobId,
        "gate1_confirmed",
        GATE_TIMEOUT_SECONDS,
      );

      if (!gate1Confirmed) {
        await cancelJob(db, jobId, sequencer, "gate1_timeout");
        return;
      }

      // Read any user overrides stored by the UI before it set gate1_confirmed
      const gate1Overrides = await readPendingOverrides(db, jobId);
      if (gate1Overrides.length > 0) {
        await applyUserOverrides(db, jobId, userId, gate1Overrides);
      }

      await emitEvent(jobId, sequencer, "gate1.confirmed", {
        userId,
        overridesApplied: gate1Overrides.length,
      });

      await db.from("analysis_jobs").update({ status: "running" }).eq("id", jobId);

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

      // ── GATE 2: User review of model construction ───────────────────────────
      const modelSummary = await buildModelSummary(db, constructionResult.output.modelResultId);

      const gate2Payload: Gate2Payload = {
        jobId,
        dealId,
        compositionId: moduleResult.output.compositionId,
        resumeToken: "",
        publicAccessToken: "",
        modulesSelected: moduleResult.output.modulesSelected,
        modelSummary,
      };

      await db.from("analysis_jobs").update({ status: "awaiting_gate2" }).eq("id", jobId);

      await emitEvent(jobId, sequencer, "gate2.presented", {
        modelSummaryItems: modelSummary.length,
        expiresInSeconds: GATE_TIMEOUT_SECONDS,
      });

      console.log(
        "[analysis-job] Gate 2 presented. Waiting for user confirmation.",
        JSON.stringify({ gate2Payload }),
      );

      const gate2Confirmed = await pollForGateConfirmation(
        db,
        jobId,
        "gate2_confirmed",
        GATE_TIMEOUT_SECONDS,
      );

      if (!gate2Confirmed) {
        await cancelJob(db, jobId, sequencer, "gate2_timeout");
        return;
      }

      await emitEvent(jobId, sequencer, "gate2.confirmed", { userId });

      await db.from("analysis_jobs").update({ status: "running" }).eq("id", jobId);

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
          status: "completed",
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
 * Poll the analysis_jobs status column until it reaches the expected gate
 * confirmation status, or until the timeout is reached.
 *
 * The UI sets the status to `gate1_confirmed` / `gate2_confirmed` via an
 * authenticated API route after the user reviews and approves.
 */
async function pollForGateConfirmation(
  db: ReturnType<typeof getSupabaseAdmin>,
  jobId: string,
  confirmedStatus: string,
  timeoutSeconds: number,
): Promise<boolean> {
  const POLL_INTERVAL = 30; // seconds
  const maxPolls = Math.ceil(timeoutSeconds / POLL_INTERVAL);

  for (let i = 0; i < maxPolls; i++) {
    await wait.for({ seconds: POLL_INTERVAL });

    const { data } = await db.from("analysis_jobs").select("status").eq("id", jobId).single();

    if (data?.status === confirmedStatus) return true;
    if (data?.status === "cancelled") return false;
  }

  return false; // Timed out
}

/**
 * Read user override values that the UI stored before confirming Gate 1.
 * Overrides are flagged by a null user_override_at (set by UI before gate confirm).
 * The actual convention is: UI writes user_override_value without setting
 * user_override_at; the pipeline then sets user_override_at when it applies them.
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
