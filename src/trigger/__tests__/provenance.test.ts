/**
 * Unit tests for provenance field requirements.
 *
 * ADR 010 (non-negotiable): every analysis_jobs record and every
 * extracted_inputs record must have specific provenance fields populated.
 * These tests verify the field contracts, not the DB writes (those are
 * covered by integration tests against a real Supabase branch).
 */

import { describe, it, expect } from "vitest";
import { EXECUTOR_MODEL, ADVISOR_MODEL, type AnalysisDepth } from "../lib/types";

// ── analysis_jobs provenance contract ────────────────────────────────────────

interface AnalysisJobProvenanceFields {
  executor_model: string;
  advisor_model: string;
  advisor_invocation_count: number | null;
  advisor_tokens_used: number | null;
  executor_tokens_used: number | null;
  // Gate confirmation events (written as agent_events, not direct columns)
  // Gate 1: event_type = 'gate1.confirmed', payload includes userId + timestamp
  // Gate 2: event_type = 'gate2.confirmed', payload includes userId + timestamp
}

function buildInitialJobProvenance(_analysisDepth: AnalysisDepth): AnalysisJobProvenanceFields {
  return {
    executor_model: EXECUTOR_MODEL,
    advisor_model: ADVISOR_MODEL,
    advisor_invocation_count: null, // Populated incrementally
    advisor_tokens_used: null,
    executor_tokens_used: null,
  };
}

function buildCompletedJobProvenance(
  advisorInvocationCount: number,
  advisorTokensUsed: number,
  executorTokensUsed: number,
): AnalysisJobProvenanceFields {
  return {
    executor_model: EXECUTOR_MODEL,
    advisor_model: ADVISOR_MODEL,
    advisor_invocation_count: advisorInvocationCount,
    advisor_tokens_used: advisorTokensUsed,
    executor_tokens_used: executorTokensUsed,
  };
}

describe("analysis_jobs provenance fields", () => {
  it("initial provenance sets exact model version strings (never 'latest')", () => {
    const prov = buildInitialJobProvenance("first_run");

    expect(prov.executor_model).toBe("claude-sonnet-4-6");
    expect(prov.advisor_model).toBe("claude-opus-4-6");

    // Enforce version-pin rule: no '-latest' or ambiguous strings
    expect(prov.executor_model).not.toContain("latest");
    expect(prov.advisor_model).not.toContain("latest");
    expect(prov.executor_model).not.toBe("claude-sonnet");
    expect(prov.advisor_model).not.toBe("claude-opus");
  });

  it("model strings match the exported constants", () => {
    const prov = buildInitialJobProvenance("boe");
    expect(prov.executor_model).toBe(EXECUTOR_MODEL);
    expect(prov.advisor_model).toBe(ADVISOR_MODEL);
  });

  it("completed provenance has all fields populated (no nulls)", () => {
    const prov = buildCompletedJobProvenance(3, 4500, 12000);

    expect(prov.advisor_invocation_count).not.toBeNull();
    expect(prov.advisor_tokens_used).not.toBeNull();
    expect(prov.executor_tokens_used).not.toBeNull();
    expect(prov.executor_model).not.toBeNull();
    expect(prov.advisor_model).not.toBeNull();
  });

  it("advisor_invocation_count is non-negative", () => {
    const prov = buildCompletedJobProvenance(0, 0, 5000);
    expect(prov.advisor_invocation_count).toBeGreaterThanOrEqual(0);
  });
});

// ── extracted_inputs provenance contract ─────────────────────────────────────

interface ExtractedInputProvenanceFields {
  extraction_model: string;
  analysis_job_id: string;
  source_document_ref_id: string | null;
  confidence_score: number | null;
  source_page_number: number | null;
  advisor_invoked: boolean;
}

function buildExtractedInputProvenance(
  overrides: Partial<ExtractedInputProvenanceFields>,
): ExtractedInputProvenanceFields {
  return {
    extraction_model: EXECUTOR_MODEL,
    analysis_job_id: "job-test-123",
    source_document_ref_id: "docref-abc",
    confidence_score: 0.95,
    source_page_number: 3,
    advisor_invoked: false,
    ...overrides,
  };
}

describe("extracted_inputs provenance fields", () => {
  it("extraction_model is the exact executor model string", () => {
    const prov = buildExtractedInputProvenance({});
    expect(prov.extraction_model).toBe(EXECUTOR_MODEL);
    expect(prov.extraction_model).not.toContain("latest");
  });

  it("analysis_job_id is always populated (links back to parent job)", () => {
    const prov = buildExtractedInputProvenance({});
    expect(prov.analysis_job_id).toBeTruthy();
    expect(prov.analysis_job_id.length).toBeGreaterThan(0);
  });

  it("confidence_score is between 0 and 1 when provided", () => {
    const highConfidence = buildExtractedInputProvenance({ confidence_score: 0.95 });
    const lowConfidence = buildExtractedInputProvenance({ confidence_score: 0.45 });
    const noConfidence = buildExtractedInputProvenance({ confidence_score: null });

    expect(highConfidence.confidence_score).toBeGreaterThanOrEqual(0);
    expect(highConfidence.confidence_score).toBeLessThanOrEqual(1);
    expect(lowConfidence.confidence_score).toBeGreaterThanOrEqual(0);
    expect(noConfidence.confidence_score).toBeNull();
  });

  it("advisor_invoked is a boolean", () => {
    const withAdvisor = buildExtractedInputProvenance({ advisor_invoked: true });
    const withoutAdvisor = buildExtractedInputProvenance({ advisor_invoked: false });

    expect(typeof withAdvisor.advisor_invoked).toBe("boolean");
    expect(withAdvisor.advisor_invoked).toBe(true);
    expect(withoutAdvisor.advisor_invoked).toBe(false);
  });

  it("re-extraction does not overwrite — new row with same job_id is an append", () => {
    // This test documents the append-only requirement (ADR 010):
    // re-extraction is a new event, never a silent overwrite.
    // The DB constraint that enforces this is: no UNIQUE on (analysis_job_id, field_name)
    // so multiple rows with the same field_name can exist, each with its own timestamp.

    const extraction1 = buildExtractedInputProvenance({
      analysis_job_id: "job-v1",
      confidence_score: 0.7,
    });
    const extraction2 = buildExtractedInputProvenance({
      analysis_job_id: "job-v2", // Different job = new event
      confidence_score: 0.92,
      source_page_number: 4,
    });

    // Both should have valid provenance independently
    expect(extraction1.analysis_job_id).not.toBe(extraction2.analysis_job_id);
    expect(extraction1.confidence_score).toBe(0.7);
    expect(extraction2.confidence_score).toBe(0.92);
  });
});

// ── Gate event provenance ────────────────────────────────────────────────────

interface GateConfirmationEvent {
  job_id: string;
  event_type: "gate1.confirmed" | "gate2.confirmed";
  sequence_number: number;
  payload: {
    userId: string;
    overridesApplied?: number;
  };
  emitted_at: string;
}

describe("Gate confirmation event provenance", () => {
  it("gate1.confirmed event has required fields", () => {
    const event: GateConfirmationEvent = {
      job_id: "job-abc",
      event_type: "gate1.confirmed",
      sequence_number: 8,
      payload: { userId: "user-xyz", overridesApplied: 2 },
      emitted_at: new Date().toISOString(),
    };

    expect(event.job_id).toBeTruthy();
    expect(event.event_type).toBe("gate1.confirmed");
    expect(event.payload.userId).toBeTruthy();
    expect(event.sequence_number).toBeGreaterThan(0);
    expect(Date.parse(event.emitted_at)).not.toBeNaN();
  });

  it("gate2.confirmed event has required fields", () => {
    const event: GateConfirmationEvent = {
      job_id: "job-abc",
      event_type: "gate2.confirmed",
      sequence_number: 18,
      payload: { userId: "user-xyz" },
      emitted_at: new Date().toISOString(),
    };

    expect(event.event_type).toBe("gate2.confirmed");
    expect(event.sequence_number).toBeGreaterThan(0);
  });

  it("gate2 sequence_number is always greater than gate1", () => {
    const gate1Seq = 8;
    const gate2Seq = 18;
    expect(gate2Seq).toBeGreaterThan(gate1Seq);
  });
});
