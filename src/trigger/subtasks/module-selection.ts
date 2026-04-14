/**
 * module-selection subtask — Step 3 of the analysis pipeline.
 *
 * Responsibilities:
 * 1. Read the deal's asset_class, primary_revenue_mechanism, and operator_managed flag
 * 2. Run the executor to select the appropriate financial modules from module_specs
 * 3. Consult the advisor for novel or multi-mechanism asset classes
 * 4. Write deal_model_compositions row with selected modules
 *
 * ADR 013: Module selection feeds directly into the dual-track DCF architecture.
 * ADR 010 Decision 2: Advisor is invoked when asset class is novel or multi-mechanism.
 */

import { task } from "@trigger.dev/sdk/v3";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin, emitEvent, EventSequencer } from "../lib/events";
import { createAdvisorState, runWithAdvisor, type AdvisorState } from "../lib/advisor";
import type { AnalysisDepth, ModuleSelectionResult } from "../lib/types";

// ── Static module registry ───────────────────────────────────────────────────
// v0 placeholder — replace with a DB query when module_specs table is added.

interface ModuleSpec {
  id: string;
  name: string;
  description: string;
  asset_classes: string[];
  revenue_mechanisms: string[];
}

const MODULE_REGISTRY: ModuleSpec[] = [
  {
    id: "dcf-multifamily",
    name: "Multifamily DCF",
    description: "Unit-level rent roll DCF for garden, mid-rise, and high-rise apartments",
    asset_classes: ["multifamily"],
    revenue_mechanisms: ["residential_lease"],
  },
  {
    id: "dcf-office",
    name: "Office DCF",
    description: "Lease-by-lease NNN office DCF with TI/LC and absorption",
    asset_classes: ["office"],
    revenue_mechanisms: ["commercial_lease"],
  },
  {
    id: "dcf-retail",
    name: "Retail DCF",
    description: "Anchored and strip retail DCF with percentage rent",
    asset_classes: ["retail"],
    revenue_mechanisms: ["commercial_lease"],
  },
  {
    id: "dcf-industrial",
    name: "Industrial DCF",
    description: "Single and multi-tenant industrial/logistics DCF",
    asset_classes: ["industrial"],
    revenue_mechanisms: ["commercial_lease"],
  },
  {
    id: "dcf-hotel",
    name: "Hospitality DCF",
    description: "RevPAR-based hotel DCF with NOI margin assumptions",
    asset_classes: ["hotel", "hospitality"],
    revenue_mechanisms: ["operator_managed"],
  },
  {
    id: "module-operator-fee",
    name: "Operator Fee Module",
    description: "Management fee and incentive fee overlay for operator-managed assets",
    asset_classes: ["hotel", "senior_housing", "self_storage"],
    revenue_mechanisms: ["operator_managed"],
  },
  {
    id: "dcf-land-condo",
    name: "For-Sale Condominium",
    description: "Unit absorption schedule and sell-out waterfall for condo development",
    asset_classes: ["residential_for_sale"],
    revenue_mechanisms: ["unit_sale"],
  },
];

export interface ModuleSelectionPayload {
  jobId: string;
  dealId: string;
  orgId: string;
  analysisDepth: AnalysisDepth;
  startingSequence: number;
  currentAdvisorInvocationCount: number;
  currentAdvisorTokensUsed: number;
  currentExecutorTokensUsed: number;
}

// ── Module selection tool ────────────────────────────────────────────────────

interface ModuleSelectionInput {
  modules_selected: string[];
  selection_rationale: string;
  needs_advisor: boolean;
  advisor_question: string | null;
}

const MODULE_SELECTION_TOOL: Anthropic.Tool = {
  name: "submit_module_selection",
  description:
    "Submit the financial modules selected for this deal's model composition. " +
    "Set needs_advisor=true if the asset class is novel or involves multiple revenue mechanisms.",
  input_schema: {
    type: "object" as const,
    properties: {
      modules_selected: {
        type: "array",
        items: { type: "string" },
        description: "Module spec IDs to include in the model composition.",
      },
      selection_rationale: {
        type: "string",
        description: "Brief explanation of why these modules were selected.",
      },
      needs_advisor: {
        type: "boolean",
        description: "True if advisor consultation is needed for this composition.",
      },
      advisor_question: {
        type: "string",
        description: "Specific question for the advisor, if needs_advisor is true.",
      },
    },
    required: ["modules_selected", "selection_rationale", "needs_advisor"],
  },
};

// ── Task ────────────────────────────────────────────────────────────────────

export const moduleSelectionTask = task({
  id: "module-selection",
  retry: { maxAttempts: 2 },

  run: async (payload: ModuleSelectionPayload): Promise<ModuleSelectionResult> => {
    const { jobId, dealId, analysisDepth, startingSequence } = payload;

    const db = getSupabaseAdmin();
    const sequencer = new EventSequencer();
    for (let i = 0; i < startingSequence; i++) sequencer.next();

    const advisorState: AdvisorState = createAdvisorState(analysisDepth);
    advisorState.invocationCount = payload.currentAdvisorInvocationCount;
    advisorState.advisorTokensUsed = payload.currentAdvisorTokensUsed;
    advisorState.executorTokensUsed = payload.currentExecutorTokensUsed;

    await emitEvent(jobId, sequencer, "module_selection.started", { dealId });

    // ── 1. Fetch deal characteristics ────────────────────────────────────────
    const { data: deal, error: dealError } = await db
      .from("deals")
      .select("id, asset_class, primary_revenue_mechanism, operator_managed, name")
      .eq("id", dealId)
      .single();

    if (dealError || !deal) {
      throw new Error(`Deal not found: ${dealError?.message}`);
    }

    // ── 2. Load module registry ───────────────────────────────────────────────
    // module_specs is not yet in the DB schema — use the static registry for v0.
    // When the schema gets a module_specs table, swap this for a DB query.
    const moduleSpecs = MODULE_REGISTRY;

    // ── 3. Fetch confirmed extracted inputs for context ───────────────────────
    const { data: extractedInputs } = await db
      .from("extracted_inputs")
      .select("field_name, extracted_value, user_override_value")
      .eq("analysis_job_id", jobId)
      .limit(50);

    const inputSummary = (extractedInputs ?? [])
      .map((i) => `${i.field_name}: ${JSON.stringify(i.user_override_value ?? i.extracted_value)}`)
      .join("\n");

    // ── 4. Run executor for module selection ──────────────────────────────────
    const systemPrompt = buildModuleSelectionSystem(analysisDepth);

    const selectionResult = await runWithAdvisor(advisorState, {
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: buildModuleSelectionPrompt(deal, moduleSpecs, inputSummary),
        },
      ],
      tools: [MODULE_SELECTION_TOOL],
      max_tokens: 4096,
    });

    const toolUse = selectionResult.message.content.find(
      (b) => b.type === "tool_use" && b.name === "submit_module_selection",
    ) as Anthropic.ToolUseBlock | undefined;

    if (!toolUse) {
      throw new Error("Executor did not call submit_module_selection tool");
    }

    const selection = toolUse.input as ModuleSelectionInput;

    // ── 5. Advisor consultation if flagged ────────────────────────────────────
    let advisorInvoked = selectionResult.advisorInvoked;

    if (selection.needs_advisor && selection.advisor_question) {
      const advisorResult = await runWithAdvisor(advisorState, {
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `${selection.advisor_question}\n\nDeal context:\n${buildModuleSelectionPrompt(deal, moduleSpecs, inputSummary)}`,
          },
        ],
        tools: [MODULE_SELECTION_TOOL],
        max_tokens: 2048,
      });

      if (advisorResult.advisorInvoked) {
        advisorInvoked = true;
        await emitEvent(jobId, sequencer, "module_selection.advisor_invoked", {
          question: selection.advisor_question,
          invocationCount: advisorState.invocationCount,
        });

        // Prefer the advisor-informed selection if one was returned
        const advisorToolUse = advisorResult.message.content.find(
          (b) => b.type === "tool_use" && b.name === "submit_module_selection",
        ) as Anthropic.ToolUseBlock | undefined;

        if (advisorToolUse) {
          const advisorSelection = advisorToolUse.input as ModuleSelectionInput;
          selection.modules_selected = advisorSelection.modules_selected;
          selection.selection_rationale = advisorSelection.selection_rationale;
        }
      }
    }

    // ── 6. Write deal_model_compositions ─────────────────────────────────────
    const { data: composition, error: compError } = await db
      .from("deal_model_compositions")
      .insert({
        analysis_job_id: jobId,
        deal_id: dealId,
        modules_selected: selection.modules_selected,
        composition_status: "pending_confirmation",
        override_notes: selection.selection_rationale,
      })
      .select("id")
      .single();

    if (compError || !composition) {
      throw new Error(`Failed to write deal_model_compositions: ${compError?.message}`);
    }

    await emitEvent(jobId, sequencer, "module_selection.completed", {
      compositionId: composition.id,
      modulesSelected: selection.modules_selected,
      advisorInvoked,
    });

    return {
      compositionId: composition.id,
      modulesSelected: selection.modules_selected,
      advisorInvoked,
      advisorInvocationCount: advisorState.invocationCount,
      executorTokensUsed: advisorState.executorTokensUsed,
      advisorTokensUsed: advisorState.advisorTokensUsed,
    };
  },
});

// ── Prompt builders ──────────────────────────────────────────────────────────

function buildModuleSelectionSystem(depth: AnalysisDepth): string {
  return `You are a CRE financial model architect. Your job is to select the correct
financial modules from the module_specs registry for a given deal.

Analysis depth: ${depth}

Module selection rules:
- Select modules that match the deal's asset_class and primary_revenue_mechanism
- If the deal is operator_managed, include the operator fee module
- For multi-mechanism deals, select a module for each revenue stream
- Set needs_advisor=true for: novel structures, multi-mechanism deals where
  module overlap is ambiguous, or any asset class outside standard CRE types
- Prefer precision over breadth — do not select modules that don't apply`;
}

function buildModuleSelectionPrompt(
  deal: {
    asset_class: string;
    primary_revenue_mechanism: string;
    operator_managed: boolean;
    name: string;
  },
  specs: Array<{
    id: string;
    name: string;
    description: string;
    asset_classes: unknown;
    revenue_mechanisms: unknown;
  }>,
  inputSummary: string,
): string {
  const specList = specs
    .map((s) => `ID: ${s.id}\n  Name: ${s.name}\n  Description: ${s.description}`)
    .join("\n\n");

  return `Deal: ${deal.name}
Asset class: ${deal.asset_class}
Primary revenue mechanism: ${deal.primary_revenue_mechanism}
Operator managed: ${deal.operator_managed}

Extracted deal inputs:
${inputSummary || "(none confirmed yet)"}

Available module specs:
${specList}

Please select the modules appropriate for this deal.`;
}
