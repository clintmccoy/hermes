/**
 * credit-deduction subtask — Step 6 of the analysis pipeline.
 *
 * Fires ONLY at successful job completion. Failed or cancelled jobs
 * never reach this subtask.
 *
 * ADR 010 Decision 5 (non-negotiable): credits deducted at step 6,
 * not at job start. This is enforced by the orchestrator — this subtask
 * is never called on an error path.
 *
 * Implementation:
 * - Uses idempotency_key = "credit-deduction:{jobId}" on the credit_ledger table
 * - Safe to retry — duplicate deductions are blocked by the unique constraint
 *   on idempotency_key
 */

import { task } from "@trigger.dev/sdk/v3";
import { getSupabaseAdmin, emitEvent, EventSequencer } from "../lib/events";
import type { AnalysisDepth } from "../lib/types";

export interface CreditDeductionPayload {
  jobId: string;
  dealId: string;
  orgId: string;
  analysisDepth: AnalysisDepth;
  creditCost: number;
  startingSequence: number;
}

const CREDIT_COST_BY_DEPTH: Record<AnalysisDepth, number> = {
  boe: 1,
  first_run: 3,
  ic_grade: 10,
  strategic_mix: 25,
};

export const creditDeductionTask = task({
  id: "credit-deduction",
  // High retry tolerance — idempotency key prevents double-deductions.
  retry: { maxAttempts: 5 },

  run: async (payload: CreditDeductionPayload): Promise<void> => {
    const { jobId, dealId, orgId, analysisDepth, startingSequence } = payload;

    const db = getSupabaseAdmin();
    const sequencer = new EventSequencer();
    for (let i = 0; i < startingSequence; i++) sequencer.next();

    const creditCost = payload.creditCost ?? CREDIT_COST_BY_DEPTH[analysisDepth];
    const idempotencyKey = `credit-deduction:${jobId}`;

    // ── 1. Check current balance ──────────────────────────────────────────────
    // monthly_credit_allowance lives on org_subscriptions, not organizations
    const { data: subscription, error: subError } = await db
      .from("org_subscriptions")
      .select("monthly_credit_allowance")
      .eq("org_id", orgId)
      .eq("status", "active")
      .maybeSingle();

    if (subError) {
      throw new Error(`Failed to fetch org subscription: ${subError.message}`);
    }

    const creditAllowance = subscription?.monthly_credit_allowance ?? 0;

    // ── 2. Compute current balance from ledger ────────────────────────────────
    const { data: lastEntry } = await db
      .from("credit_ledger")
      .select("balance_after")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const currentBalance = lastEntry?.balance_after ?? creditAllowance;

    // ── 3. Idempotent insert — skip if already deducted ───────────────────────
    // The unique constraint on idempotency_key means this is safe to retry.
    const { error: ledgerError } = await db.from("credit_ledger").insert({
      org_id: orgId,
      analysis_job_id: jobId,
      deal_id: dealId,
      entry_type: "debit",
      amount: -creditCost,
      balance_after: currentBalance - creditCost,
      description: `Analysis job completed: ${analysisDepth} (${jobId})`,
      idempotency_key: idempotencyKey,
    });

    if (ledgerError) {
      // Check if this is a duplicate key error (already deducted — idempotent success)
      if (
        ledgerError.code === "23505" || // PostgreSQL unique violation
        ledgerError.message.includes("idempotency_key")
      ) {
        console.log(`[credit-deduction] Already deducted for job ${jobId} — skipping (idempotent)`);
        return;
      }

      throw new Error(`Credit deduction failed: ${ledgerError.message}`);
    }

    // ── 4. Update analysis_jobs with deduction timestamp ─────────────────────
    await db
      .from("analysis_jobs")
      .update({
        credits_deducted_at: new Date().toISOString(),
        credit_cost: creditCost,
      })
      .eq("id", jobId);

    await emitEvent(jobId, sequencer, "credit_deduction.completed", {
      creditCost,
      balanceAfter: currentBalance - creditCost,
      idempotencyKey,
    });
  },
});
