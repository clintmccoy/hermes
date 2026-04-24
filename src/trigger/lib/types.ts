/**
 * Shared types for the Hermes agentic pipeline.
 *
 * These types are used across the main analysis-job orchestrator
 * and all subtasks. Keep this file lean — domain types belong in
 * the database.types.ts generated file.
 */

// ── Analysis depth ─────────────────────────────────────────────────────────

/**
 * Analysis depth controls advisor max_uses caps and credit cost.
 * Maps directly to the analysis_depth column on analysis_jobs.
 */
export type AnalysisDepth =
  | "boe" // Back-of-Envelope Screen
  | "first_run" // First-Run Analysis
  | "ic_grade" // IC-Grade Scenario Analysis
  | "strategic_mix"; // Strategic Mix Optimization

/** Advisor max_uses caps by analysis depth (ADR 010, Decision 2). */
export const ADVISOR_MAX_USES: Record<AnalysisDepth, number> = {
  boe: 2,
  first_run: 5,
  ic_grade: 10,
  strategic_mix: 20,
};

// ── Model version strings ───────────────────────────────────────────────────

/** Version-pinned model strings (ADR 007 — never use *-latest aliases). */
export const EXECUTOR_MODEL = "claude-sonnet-4-6" as const;
export const ADVISOR_MODEL = "claude-opus-4-6" as const;

// ── Pipeline payload types ──────────────────────────────────────────────────

/** Payload passed to the top-level analysis-job task on trigger. */
export interface AnalysisJobPayload {
  /** The analysis_jobs.id created by the API before triggering this job. */
  jobId: string;
  /** Supabase uploaded_files.ids to process — all pending docs for this deal. */
  uploadedFileIds: string[];
  /** The deal this analysis belongs to. */
  dealId: string;
  /** The org this analysis belongs to. */
  orgId: string;
  /** The user who initiated the job (for Gate confirmation events). */
  userId: string;
  /** Controls advisor caps and credit cost. */
  analysisDepth: AnalysisDepth;
}

/** Structured output from the document-ingestion subtask. */
export interface IngestionResult {
  /** document_refs.id created or resolved during ingestion. */
  documentRefId: string;
  /** Storage path of the raw Document AI output (JSON) in Supabase Storage. */
  rawExtractionStoragePath: string;
  /** Number of pages successfully extracted. */
  pagesExtracted: number;
  /** True if any pages failed extraction (graceful degradation). */
  hasPartialExtraction: boolean;
  /** Pages that could not be extracted, if any. */
  failedPages: number[];
}

/** Structured output from the extraction subtask. */
export interface ExtractionResult {
  /** Number of extracted_inputs rows written. */
  inputsExtracted: number;
  /** Whether the advisor was invoked during extraction. */
  advisorInvoked: boolean;
  /** Total advisor invocations used so far in this job. */
  advisorInvocationCount: number;
  /** Running token totals (updated after each subtask). */
  executorTokensUsed: number;
  advisorTokensUsed: number;
}

/** Structured output from the module-selection subtask. */
export interface ModuleSelectionResult {
  /** deal_model_compositions.id written. */
  compositionId: string;
  /** Modules selected for this deal. */
  modulesSelected: string[];
  /** Whether the advisor was consulted for composition. */
  advisorInvoked: boolean;
  advisorInvocationCount: number;
  executorTokensUsed: number;
  advisorTokensUsed: number;
}

/** Structured output from the model-construction subtask. */
export interface ModelConstructionResult {
  /** model_results.id written. */
  modelResultId: string;
  executorTokensUsed: number;
  advisorTokensUsed: number;
  advisorInvocationCount: number;
}

/** Accumulator for provenance counters across the full pipeline. */
export interface ProvenanceTotals {
  executorTokensUsed: number;
  advisorTokensUsed: number;
  advisorInvocationCount: number;
}

// ── Gate checkpoint types ───────────────────────────────────────────────────

/**
 * Summary of a single extracted input surfaced at the post-extraction gate.
 * Displayed in the UI so the analyst can review and optionally override values
 * before the model is constructed.
 */
export interface ExtractionSummaryItem {
  fieldName: string;
  extractedValue: unknown;
  confidence: number | null;
  sourcePageNumber: number | null;
  sourceTextExcerpt: string | null;
  /** True if the advisor was consulted on this field. */
  advisorInvoked: boolean;
}

export interface ModelSummaryItem {
  label: string;
  value: number | string | null;
  unit: string | null;
}

// ── Agent event types ───────────────────────────────────────────────────────

/**
 * All event_type values written to the agent_events table.
 *
 * Gate events use gate.presented / gate.confirmed / gate.timeout rather than
 * gate1.* / gate2.* — the gate identity is carried in the event payload
 * (gateName + gateSequence) so the event schema stays stable as gate configs
 * change per org or analysis depth.
 */
export type AgentEventType =
  | "analysis_kicked_off"
  | "job.started"
  | "ingestion.started"
  | "ingestion.completed"
  | "ingestion.partial_failure"
  | "classification.completed"
  | "extraction.started"
  | "extraction.advisor_invoked"
  | "extraction.completed"
  | "gate.presented"
  | "gate.confirmed"
  | "gate.skipped"
  | "gate.timeout"
  | "module_selection.started"
  | "module_selection.advisor_invoked"
  | "module_selection.completed"
  | "model_construction.started"
  | "model_construction.completed"
  | "credit_deduction.completed"
  | "job.completed"
  | "job.failed"
  | "job.cancelled";
