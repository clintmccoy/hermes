/**
 * model-construction subtask — Step 4 of the analysis pipeline.
 *
 * Responsibilities:
 * 1. Load the confirmed deal_model_compositions row
 * 2. Load all confirmed extracted_inputs (including user overrides from the post-extraction gate)
 * 3. Run the hybrid calculation engine (server-side authoritative path)
 * 4. Write model_results, model_run_kpis, and model_run_monthly_cashflows
 *
 * ADR 004 (hybrid calc engine) / ADR 013 (dual-track DCF):
 * The authoritative path runs server-side. The executor assembles the input
 * vector from extracted_inputs, drives the calc engine, and writes results.
 * The advisor is available for scenario-level reasoning (e.g. which discount
 * rate to apply for a novel asset class), but the calculation itself is
 * deterministic and handled by the engine.
 */

import { task } from "@trigger.dev/sdk/v3";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin, emitEvent, EventSequencer } from "../lib/events";
import { createAdvisorState, runWithAdvisor, type AdvisorState } from "../lib/advisor";
import type { AnalysisDepth, ModelConstructionResult } from "../lib/types";

export interface ModelConstructionPayload {
  jobId: string;
  dealId: string;
  orgId: string;
  compositionId: string;
  analysisDepth: AnalysisDepth;
  startingSequence: number;
  currentAdvisorInvocationCount: number;
  currentAdvisorTokensUsed: number;
  currentExecutorTokensUsed: number;
}

// ── Assumption assembly tool ─────────────────────────────────────────────────

interface ModelAssumptions {
  discount_rate: number;
  exit_cap_rate: number;
  hold_period_years: number;
  rent_growth_rate: number;
  expense_growth_rate: number;
  vacancy_rate: number;
  capital_expenditure_pct: number;
  debt_service_coverage_ratio: number | null;
  notes: string | null;
  needs_advisor: boolean;
  advisor_question: string | null;
}

const ASSUMPTION_TOOL: Anthropic.Tool = {
  name: "submit_model_assumptions",
  description:
    "Submit the financial model assumptions for the DCF calculation. " +
    "These drive the authoritative server-side calculation engine. " +
    "Set needs_advisor=true if you are uncertain about discount rate or exit cap for this asset class.",
  input_schema: {
    type: "object" as const,
    properties: {
      discount_rate: { type: "number", description: "Unlevered discount rate (e.g. 0.08 for 8%)" },
      exit_cap_rate: { type: "number", description: "Exit cap rate (e.g. 0.055 for 5.5%)" },
      hold_period_years: { type: "number", description: "Hold period in years (typically 3–10)" },
      rent_growth_rate: { type: "number", description: "Annual rent growth rate assumption" },
      expense_growth_rate: { type: "number", description: "Annual expense growth rate assumption" },
      vacancy_rate: { type: "number", description: "Stabilized vacancy rate assumption" },
      capital_expenditure_pct: { type: "number", description: "CapEx as pct of EGI" },
      debt_service_coverage_ratio: { type: "number" },
      notes: { type: "string" },
      needs_advisor: { type: "boolean" },
      advisor_question: { type: "string" },
    },
    required: [
      "discount_rate",
      "exit_cap_rate",
      "hold_period_years",
      "rent_growth_rate",
      "expense_growth_rate",
      "vacancy_rate",
      "capital_expenditure_pct",
      "needs_advisor",
    ],
  },
};

// ── Task ────────────────────────────────────────────────────────────────────

export const modelConstructionTask = task({
  id: "model-construction",
  retry: { maxAttempts: 1 }, // Model construction is expensive — limit retries

  run: async (payload: ModelConstructionPayload): Promise<ModelConstructionResult> => {
    const { jobId, dealId, orgId, compositionId, analysisDepth, startingSequence } = payload;

    const db = getSupabaseAdmin();
    const sequencer = new EventSequencer();
    for (let i = 0; i < startingSequence; i++) sequencer.next();

    const advisorState: AdvisorState = createAdvisorState(analysisDepth);
    advisorState.invocationCount = payload.currentAdvisorInvocationCount;
    advisorState.advisorTokensUsed = payload.currentAdvisorTokensUsed;
    advisorState.executorTokensUsed = payload.currentExecutorTokensUsed;

    await emitEvent(jobId, sequencer, "model_construction.started", {
      compositionId,
    });

    // ── 1. Load composition and extracted inputs ───────────────────────────────
    const { data: composition, error: compError } = await db
      .from("deal_model_compositions")
      .select("id, modules_selected, override_notes")
      .eq("id", compositionId)
      .single();

    if (compError || !composition) {
      throw new Error(`Composition not found: ${compError?.message}`);
    }

    // Load extracted inputs — prefer user overrides applied at the post-extraction gate
    const { data: inputs, error: inputsError } = await db
      .from("extracted_inputs")
      .select("field_name, extracted_value, user_override_value, confidence_score, advisor_invoked")
      .eq("analysis_job_id", jobId);

    if (inputsError) {
      throw new Error(`Failed to load extracted_inputs: ${inputsError.message}`);
    }

    // Build effective input map (user overrides take precedence)
    const inputMap: Record<string, unknown> = {};
    for (const input of inputs ?? []) {
      inputMap[input.field_name] = input.user_override_value ?? input.extracted_value;
    }

    // ── 2. Executor assembles model assumptions ───────────────────────────────
    const assumptionResult = await runWithAdvisor(advisorState, {
      system: buildModelConstructionSystem(analysisDepth),
      messages: [
        {
          role: "user",
          content: buildAssumptionPrompt(inputMap, composition),
        },
      ],
      tools: [ASSUMPTION_TOOL],
      tool_choice: { type: "tool", name: "submit_model_assumptions" },
      max_tokens: 4096,
    });

    const toolUse = assumptionResult.message.content.find(
      (b) => b.type === "tool_use" && b.name === "submit_model_assumptions",
    ) as Anthropic.ToolUseBlock | undefined;

    if (!toolUse) {
      throw new Error("Executor did not call submit_model_assumptions");
    }

    let assumptions = toolUse.input as ModelAssumptions;

    // ── 3. Advisor consultation if flagged ────────────────────────────────────
    if (assumptions.needs_advisor && assumptions.advisor_question) {
      const advisorResult = await runWithAdvisor(advisorState, {
        system: buildModelConstructionSystem(analysisDepth),
        messages: [
          {
            role: "user",
            content: `${assumptions.advisor_question}\n\nDeal inputs:\n${JSON.stringify(inputMap, null, 2)}`,
          },
        ],
        tools: [ASSUMPTION_TOOL],
        tool_choice: { type: "tool", name: "submit_model_assumptions" },
        max_tokens: 2048,
      });

      const advisorToolUse = advisorResult.message.content.find(
        (b) => b.type === "tool_use" && b.name === "submit_model_assumptions",
      ) as Anthropic.ToolUseBlock | undefined;

      if (advisorToolUse) {
        assumptions = advisorToolUse.input as ModelAssumptions;
      }
    }

    // ── 4. Run the hybrid calculation engine ──────────────────────────────────
    // The calc engine is server-side and deterministic. It takes the structured
    // input map + assumptions and produces KPIs and monthly cashflows.
    // ADR 004 / ADR 013: this is the "authoritative path" — client-side preview
    // was shown during the post-construction gate review; this result is what gets stored.
    const calcResult = await runCalculationEngine(inputMap, assumptions, composition);

    // ── 5. Write model_results ────────────────────────────────────────────────
    const { data: modelResult, error: resultError } = await db
      .from("model_results")
      .insert({
        analysis_job_id: jobId,
        deal_id: dealId,
        org_id: orgId,
        composition_id: compositionId,
        analysis_depth: analysisDepth,
        calculation_engine_version: "stub-0.1.0", // Replace when real engine is wired
        credits_consumed: creditCostForDepth(analysisDepth),
        result_data: calcResult.resultData as import("../../lib/supabase/database.types").Json,
        is_base_case: true,
      })
      .select("id")
      .single();

    if (resultError || !modelResult) {
      throw new Error(`Failed to write model_results: ${resultError?.message}`);
    }

    // ── 6. Write model_run_kpis ───────────────────────────────────────────────
    // model_run_kpis uses named columns per KPI type (not a generic kpi_name/value)
    if (calcResult.kpis) {
      const { error: kpiError } = await db.from("model_run_kpis").insert({
        model_result_id: modelResult.id,
        deal_id: dealId,
        org_id: orgId,
        unlevered_irr_pct: calcResult.kpis.unlevered_irr_pct ?? null,
        levered_irr_pct: calcResult.kpis.levered_irr_pct ?? null,
        equity_multiple: calcResult.kpis.equity_multiple ?? null,
        going_in_cap_rate_pct: calcResult.kpis.going_in_cap_rate_pct ?? null,
        exit_cap_rate_pct: calcResult.kpis.exit_cap_rate_pct ?? null,
        noi_year1: calcResult.kpis.noi_year1 ?? null,
        noi_stabilized: calcResult.kpis.noi_stabilized ?? null,
        gross_revenue_year1: calcResult.kpis.gross_revenue_year1 ?? null,
        egi_year1: calcResult.kpis.egi_year1 ?? null,
        dscr_year1: calcResult.kpis.dscr_year1 ?? null,
        dscr_min: calcResult.kpis.dscr_min ?? null,
        gross_sale_price: calcResult.kpis.gross_sale_price ?? null,
        net_sale_proceeds: calcResult.kpis.net_sale_proceeds ?? null,
        profit_unlevered: calcResult.kpis.profit_unlevered ?? null,
        profit_levered: calcResult.kpis.profit_levered ?? null,
      });

      if (kpiError) {
        console.warn(`[model-construction] Failed to write KPIs: ${kpiError.message}`);
      }
    }

    // ── 7. Write monthly cashflows ─────────────────────────────────────────────
    // period_date and period_month are required fields on model_run_monthly_cashflows
    if (calcResult.monthlyCashflows.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < calcResult.monthlyCashflows.length; i += batchSize) {
        const batch = calcResult.monthlyCashflows.slice(i, i + batchSize);
        await db.from("model_run_monthly_cashflows").insert(
          batch.map((cf) => ({
            model_result_id: modelResult.id,
            deal_id: dealId,
            org_id: orgId,
            period_date: cf.period_date,
            period_month: cf.period_month,
            noi: cf.noi ?? null,
            effective_gross_income: cf.effective_gross_income ?? null,
            potential_gross_income: cf.potential_gross_income ?? null,
            operating_expenses: cf.operating_expenses ?? null,
            unlevered_cash_flow: cf.unlevered_cash_flow ?? null,
            levered_cash_flow: cf.levered_cash_flow ?? null,
          })),
        );
      }
    }

    await emitEvent(jobId, sequencer, "model_construction.completed", {
      modelResultId: modelResult.id,
      kpiCount: Object.keys(calcResult.kpis).length,
      cashflowMonths: calcResult.monthlyCashflows.length,
    });

    return {
      modelResultId: modelResult.id,
      executorTokensUsed: advisorState.executorTokensUsed,
      advisorTokensUsed: advisorState.advisorTokensUsed,
      advisorInvocationCount: advisorState.invocationCount,
    };
  },
});

// ── Calculation engine stub ──────────────────────────────────────────────────
// TODO: Replace with real hybrid calc engine implementation (ADR 004 / ADR 013)

interface KpiRow {
  unlevered_irr_pct?: number | null;
  levered_irr_pct?: number | null;
  equity_multiple?: number | null;
  going_in_cap_rate_pct?: number | null;
  exit_cap_rate_pct?: number | null;
  noi_year1?: number | null;
  noi_stabilized?: number | null;
  gross_revenue_year1?: number | null;
  egi_year1?: number | null;
  dscr_year1?: number | null;
  dscr_min?: number | null;
  gross_sale_price?: number | null;
  net_sale_proceeds?: number | null;
  profit_unlevered?: number | null;
  profit_levered?: number | null;
}

interface MonthlyCashflowRow {
  period_date: string;
  period_month: number;
  noi?: number | null;
  effective_gross_income?: number | null;
  potential_gross_income?: number | null;
  operating_expenses?: number | null;
  unlevered_cash_flow?: number | null;
  levered_cash_flow?: number | null;
}

interface CalcResult {
  resultData: Record<string, unknown>;
  kpis: KpiRow;
  monthlyCashflows: MonthlyCashflowRow[];
}

async function runCalculationEngine(
  inputs: Record<string, unknown>,
  assumptions: ModelAssumptions,
  composition: { modules_selected: unknown },
): Promise<CalcResult> {
  // Stub: the real engine will import the hybrid calculation modules
  // specified in composition.modules_selected and run the DCF.
  // This placeholder produces structurally valid output so the pipeline
  // can be tested end-to-end before the engine is wired in.

  const noi = (inputs["noi"] as number) ?? 0;
  const goingInCapRate =
    noi > 0 && (inputs["list_price"] as number) > 0 ? noi / (inputs["list_price"] as number) : null;
  const exitCapRate = assumptions.exit_cap_rate;

  return {
    resultData: {
      assumptions_used: assumptions,
      modules_applied: composition.modules_selected,
      stub: true,
    },
    kpis: {
      unlevered_irr_pct: assumptions.discount_rate, // Stub — real engine solves for IRR
      going_in_cap_rate_pct: goingInCapRate,
      exit_cap_rate_pct: exitCapRate,
      noi_year1: noi,
    },
    monthlyCashflows: [], // Real engine produces 60–120 monthly rows
  };
}

// ── Prompt builders ──────────────────────────────────────────────────────────

function buildModelConstructionSystem(depth: AnalysisDepth): string {
  return `You are a CRE financial modeling expert assembling the assumptions for a DCF model.

Analysis depth: ${depth}

Your job is to select appropriate discount rates, exit cap rates, and growth assumptions
for the deal based on the extracted inputs and market context.

Rules:
- Use market-standard assumptions for the asset class unless the inputs suggest otherwise
- Set needs_advisor=true for: novel asset classes, operator-managed structures where
  appropriate discount rates are unclear, or multi-mechanism deals
- Always provide a notes field explaining key assumption choices`;
}

function buildAssumptionPrompt(
  inputs: Record<string, unknown>,
  composition: { modules_selected: unknown; override_notes: string | null },
): string {
  return `Please assemble the financial model assumptions for this deal.

Extracted deal inputs:
${JSON.stringify(inputs, null, 2)}

Modules selected:
${JSON.stringify(composition.modules_selected)}

Composition notes: ${composition.override_notes ?? "(none)"}

Call submit_model_assumptions with appropriate assumptions for this deal.`;
}

function creditCostForDepth(depth: AnalysisDepth): number {
  const costs: Record<AnalysisDepth, number> = {
    boe: 1,
    first_run: 3,
    ic_grade: 10,
    strategic_mix: 25,
  };
  return costs[depth];
}
