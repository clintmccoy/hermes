/**
 * extraction subtask — Step 2 of the analysis pipeline.
 *
 * Responsibilities:
 * 1. Fetch the raw Document AI extraction from Supabase Storage
 * 2. Run the Sonnet executor to parse raw text/tables into structured deal inputs
 * 3. Consult the Opus advisor for: complex leases, novel operating models,
 *    ambiguous financial line items (ADR 010, Decision 2)
 * 4. Write each extracted field to extracted_inputs with full provenance
 * 5. Emit extraction events for Realtime streaming
 *
 * Provenance non-negotiable (ADR 010):
 * - extraction_model: exact model string
 * - source_document_ref_id: which document this value came from
 * - analysis_job_id: which job produced it
 * - confidence_score: model's stated confidence
 * - source_page_number: page the value was found on
 */

import { task } from "@trigger.dev/sdk/v3";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin, emitEvent, EventSequencer } from "../lib/events";
import { createAdvisorState, runWithAdvisor, type AdvisorState } from "../lib/advisor";
import { EXECUTOR_MODEL, type AnalysisDepth, type ExtractionResult } from "../lib/types";

export interface ExtractionPayload {
  jobId: string;
  dealId: string;
  orgId: string;
  documentRefId: string;
  rawExtractionStoragePath: string;
  analysisDepth: AnalysisDepth;
  startingSequence: number;
  /** Carry advisor state in from orchestrator for global cap enforcement. */
  currentAdvisorInvocationCount: number;
  currentAdvisorTokensUsed: number;
  currentExecutorTokensUsed: number;
}

// ── Structured extraction schema ────────────────────────────────────────────

interface ExtractedField {
  field_name: string;
  extracted_value: unknown;
  confidence_score: number | null; // 0.0–1.0
  source_page_number: number | null;
  source_text_excerpt: string | null;
  unit: string | null;
  advisor_invoked: boolean;
  needs_advisor: boolean; // True if executor flagged uncertainty
}

interface ExtractionToolInput {
  fields: ExtractedField[];
  extraction_notes: string | null;
}

const EXTRACTION_TOOL: Anthropic.Tool = {
  name: "submit_extracted_fields",
  description:
    "Submit all extracted CRE financial fields from the document. " +
    "Set needs_advisor=true on any field where you are uncertain or where " +
    "the structure is novel (flex leases, management agreements, STR revenue, etc.).",
  input_schema: {
    type: "object" as const,
    properties: {
      fields: {
        type: "array",
        items: {
          type: "object",
          properties: {
            field_name: { type: "string" },
            extracted_value: {},
            confidence_score: { type: "number", minimum: 0, maximum: 1 },
            source_page_number: { type: "number" },
            source_text_excerpt: { type: "string" },
            unit: { type: "string" },
            advisor_invoked: { type: "boolean" },
            needs_advisor: { type: "boolean" },
          },
          required: ["field_name", "extracted_value", "needs_advisor"],
        },
      },
      extraction_notes: {
        type: "string",
        description: "Any notes about the document structure or extraction quality.",
      },
    },
    required: ["fields"],
  },
};

// ── Task ────────────────────────────────────────────────────────────────────

export const extractionTask = task({
  id: "extraction",
  retry: { maxAttempts: 2 },

  run: async (payload: ExtractionPayload): Promise<ExtractionResult> => {
    const {
      jobId,
      dealId,
      orgId,
      documentRefId,
      rawExtractionStoragePath,
      analysisDepth,
      startingSequence,
    } = payload;

    const db = getSupabaseAdmin();
    const sequencer = new EventSequencer();
    for (let i = 0; i < startingSequence; i++) sequencer.next();

    // Restore advisor state from orchestrator
    const advisorState: AdvisorState = createAdvisorState(analysisDepth);
    advisorState.invocationCount = payload.currentAdvisorInvocationCount;
    advisorState.advisorTokensUsed = payload.currentAdvisorTokensUsed;
    advisorState.executorTokensUsed = payload.currentExecutorTokensUsed;

    await emitEvent(jobId, sequencer, "extraction.started", { documentRefId });

    // ── 1. Fetch raw extraction from Storage ─────────────────────────────────
    const { data: rawBlob, error: fetchError } = await db.storage
      .from("deal-documents")
      .download(rawExtractionStoragePath);

    if (fetchError || !rawBlob) {
      throw new Error(`Failed to fetch raw extraction from storage: ${fetchError?.message}`);
    }

    const rawExtractionJson = await rawBlob.text();
    const rawExtraction = JSON.parse(rawExtractionJson);

    // ── 2. Prepare extraction context for executor ────────────────────────────
    const documentText = buildDocumentContext(rawExtraction);

    // ── 3. Run executor (first pass) ─────────────────────────────────────────
    const systemPrompt = buildExtractionSystemPrompt(analysisDepth);

    const firstPassResult = await runWithAdvisor(advisorState, {
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Please extract all CRE financial inputs from this document.\n\n${documentText}`,
        },
      ],
      tools: [EXTRACTION_TOOL],
      tool_choice: { type: "tool", name: "submit_extracted_fields" },
      max_tokens: 8192,
    });

    if (firstPassResult.advisorInvoked) {
      await emitEvent(jobId, sequencer, "extraction.advisor_invoked", {
        invocationCount: advisorState.invocationCount,
        remainingUses: advisorState.maxUses - advisorState.invocationCount,
      });
    }

    // ── 4. Parse tool call output ─────────────────────────────────────────────
    const toolUse = firstPassResult.message.content.find(
      (block) => block.type === "tool_use" && block.name === "submit_extracted_fields",
    ) as Anthropic.ToolUseBlock | undefined;

    if (!toolUse) {
      throw new Error("Executor did not call submit_extracted_fields tool");
    }

    const extracted = toolUse.input as ExtractionToolInput;

    // ── 5. Second pass: advisor consultation for flagged fields ───────────────
    const needsAdvisorFields = extracted.fields.filter((f) => f.needs_advisor);

    if (needsAdvisorFields.length > 0) {
      const advisorResult = await runWithAdvisor(advisorState, {
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: buildAdvisorConsultationPrompt(needsAdvisorFields, documentText),
          },
        ],
        tools: [EXTRACTION_TOOL],
        max_tokens: 4096,
      });

      if (advisorResult.advisorInvoked) {
        await emitEvent(jobId, sequencer, "extraction.advisor_invoked", {
          invocationCount: advisorState.invocationCount,
          fieldsReviewed: needsAdvisorFields.map((f) => f.field_name),
        });

        // Merge advisor-refined fields back
        const advisorToolUse = advisorResult.message.content.find(
          (block) => block.type === "tool_use" && block.name === "submit_extracted_fields",
        ) as Anthropic.ToolUseBlock | undefined;

        if (advisorToolUse) {
          const refinedFields = (advisorToolUse.input as ExtractionToolInput).fields;
          mergeRefinedFields(extracted.fields, refinedFields);
        }
      }
    }

    // ── 6. Write extracted_inputs rows ────────────────────────────────────────
    // Filter out fields with null/undefined extracted_value — the schema requires NOT NULL.
    // These represent fields the model couldn't find in the document.
    const inputsToInsert = extracted.fields
      .filter((field) => field.extracted_value !== null && field.extracted_value !== undefined)
      .map((field) => ({
        analysis_job_id: jobId,
        deal_id: dealId,
        org_id: orgId,
        source_document_ref_id: documentRefId,
        field_name: field.field_name,
        extracted_value: field.extracted_value as Awaited<ReturnType<typeof db.from>>["data"],
        extraction_model: EXECUTOR_MODEL,
        confidence_score: field.confidence_score,
        source_page_number: field.source_page_number,
        source_text_excerpt: field.source_text_excerpt,
        unit: field.unit,
        advisor_invoked: field.advisor_invoked || field.needs_advisor,
      }));

    const { error: insertError } = await db.from("extracted_inputs").insert(inputsToInsert);

    if (insertError) {
      throw new Error(`Failed to write extracted_inputs: ${insertError.message}`);
    }

    await emitEvent(jobId, sequencer, "extraction.completed", {
      inputsExtracted: inputsToInsert.length,
      advisorInvocationCount: advisorState.invocationCount,
      executorTokensUsed: advisorState.executorTokensUsed,
      advisorTokensUsed: advisorState.advisorTokensUsed,
    });

    return {
      inputsExtracted: inputsToInsert.length,
      advisorInvoked: advisorState.invocationCount > payload.currentAdvisorInvocationCount,
      advisorInvocationCount: advisorState.invocationCount,
      executorTokensUsed: advisorState.executorTokensUsed,
      advisorTokensUsed: advisorState.advisorTokensUsed,
    };
  },
});

// ── Prompt builders ──────────────────────────────────────────────────────────

function buildExtractionSystemPrompt(depth: AnalysisDepth): string {
  return `You are a CRE financial underwriting expert extracting structured data from deal documents.
Your job is to parse the provided document text and tables, then call submit_extracted_fields
with every financial input you can identify.

Analysis depth: ${depth}

Fields to extract (extract all that are present):
- Property: name, address, asset_class, gross_sf, rentable_sf, year_built, year_renovated
- Revenue: total_revenue, effective_gross_income, base_rent_per_sf, occupancy_pct
- Operating expenses: total_opex, opex_ratio, noi, caprate_implied
- Debt: loan_amount, interest_rate, amortization_years, dscr
- Lease data: lease_count, weighted_avg_lease_term_years, largest_tenant_pct_of_noi
- Sale: list_price, price_per_sf, price_per_unit
- Assumptions: market_rent_per_sf, vacancy_assumption_pct, expense_growth_pct, rent_growth_pct

Rules:
- Set confidence_score 0.9–1.0 for values explicitly stated in the document
- Set confidence_score 0.6–0.89 for calculated or inferred values
- Set confidence_score 0.0–0.59 for estimated or assumed values
- Set needs_advisor=true for any unusual structure, missing critical field, or ambiguous value
- NEVER invent values. If a field is not present, omit it rather than guessing.
- Always capture source_page_number and source_text_excerpt for audit trail.`;
}

function buildDocumentContext(rawExtraction: {
  pages: Array<{ pageNumber: number; fullText: string; tables: Array<{ rows: string[][] }> }>;
}): string {
  const parts: string[] = [];

  for (const page of rawExtraction.pages) {
    parts.push(`\n--- PAGE ${page.pageNumber} ---`);

    if (page.fullText.trim()) {
      parts.push(page.fullText);
    }

    for (const table of page.tables) {
      if (table.rows.length > 0) {
        parts.push("\n[TABLE]");
        for (const row of table.rows) {
          parts.push(row.join(" | "));
        }
        parts.push("[/TABLE]");
      }
    }
  }

  return parts.join("\n");
}

function buildAdvisorConsultationPrompt(
  flaggedFields: ExtractedField[],
  documentContext: string,
): string {
  const fieldList = flaggedFields
    .map(
      (f) =>
        `- ${f.field_name}: ${JSON.stringify(f.extracted_value)} (current confidence: ${f.confidence_score})`,
    )
    .join("\n");

  return `The following fields were flagged as uncertain or structurally unusual.
Please review them carefully with the document context and re-extract with higher confidence
or correct values where appropriate.

Flagged fields:
${fieldList}

Document context:
${documentContext.slice(0, 8000)}

Use submit_extracted_fields to return corrected/confirmed versions of these fields only.`;
}

function mergeRefinedFields(original: ExtractedField[], refined: ExtractedField[]): void {
  for (const refinedField of refined) {
    const idx = original.findIndex((f) => f.field_name === refinedField.field_name);
    if (idx !== -1) {
      original[idx] = { ...refinedField, advisor_invoked: true };
    }
  }
}
