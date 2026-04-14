/**
 * Unit tests for advisor wrapper — max_uses cap enforcement and token tracking.
 *
 * ADR 010 Decision 2: advisor caps are a cost-protection lever, not a
 * capability limit. The pipeline must continue gracefully when caps are reached.
 */

import { describe, it, expect } from "vitest";
import { createAdvisorState, isAdvisorExhausted } from "../lib/advisor";
import { ADVISOR_MAX_USES, type AnalysisDepth } from "../lib/types";

// ── AdvisorState tests ────────────────────────────────────────────────────────

describe("createAdvisorState", () => {
  it("initializes with zero counts for all depths", () => {
    const depths: AnalysisDepth[] = ["boe", "first_run", "ic_grade", "strategic_mix"];

    for (const depth of depths) {
      const state = createAdvisorState(depth);
      expect(state.invocationCount).toBe(0);
      expect(state.advisorTokensUsed).toBe(0);
      expect(state.executorTokensUsed).toBe(0);
      expect(state.analysisDepth).toBe(depth);
    }
  });

  it("sets correct max_uses for each analysis depth", () => {
    expect(createAdvisorState("boe").maxUses).toBe(2);
    expect(createAdvisorState("first_run").maxUses).toBe(5);
    expect(createAdvisorState("ic_grade").maxUses).toBe(10);
    expect(createAdvisorState("strategic_mix").maxUses).toBe(20);
  });

  it("max_uses matches the ADVISOR_MAX_USES constants", () => {
    const depths: AnalysisDepth[] = ["boe", "first_run", "ic_grade", "strategic_mix"];

    for (const depth of depths) {
      const state = createAdvisorState(depth);
      expect(state.maxUses).toBe(ADVISOR_MAX_USES[depth]);
    }
  });
});

// ── Cap enforcement tests ─────────────────────────────────────────────────────

describe("isAdvisorExhausted", () => {
  it("returns false when invocations are below cap", () => {
    const state = createAdvisorState("first_run"); // cap = 5
    state.invocationCount = 4;
    expect(isAdvisorExhausted(state)).toBe(false);
  });

  it("returns true when invocations equal the cap", () => {
    const state = createAdvisorState("first_run"); // cap = 5
    state.invocationCount = 5;
    expect(isAdvisorExhausted(state)).toBe(true);
  });

  it("returns true when invocations exceed the cap", () => {
    const state = createAdvisorState("boe"); // cap = 2
    state.invocationCount = 3; // Exceeded
    expect(isAdvisorExhausted(state)).toBe(true);
  });

  it("returns false at zero invocations", () => {
    const state = createAdvisorState("boe");
    expect(isAdvisorExhausted(state)).toBe(false);
  });
});

// ── Token accumulation tests ──────────────────────────────────────────────────

describe("advisor state token accumulation (mutation pattern)", () => {
  it("accumulates advisor tokens across multiple invocations", () => {
    const state = createAdvisorState("ic_grade");

    // Simulate three advisor invocations
    state.advisorTokensUsed += 1500;
    state.invocationCount += 1;

    state.advisorTokensUsed += 2200;
    state.invocationCount += 1;

    state.advisorTokensUsed += 800;
    state.invocationCount += 1;

    expect(state.advisorTokensUsed).toBe(4500);
    expect(state.invocationCount).toBe(3);
    expect(isAdvisorExhausted(state)).toBe(false); // cap = 10
  });

  it("accumulates executor tokens separately from advisor tokens", () => {
    const state = createAdvisorState("first_run");

    state.executorTokensUsed += 5000;
    state.advisorTokensUsed += 2000;

    expect(state.executorTokensUsed).toBe(5000);
    expect(state.advisorTokensUsed).toBe(2000);
  });

  it("tracks remaining uses correctly", () => {
    const state = createAdvisorState("boe"); // cap = 2
    state.invocationCount = 1;

    const remaining = state.maxUses - state.invocationCount;
    expect(remaining).toBe(1);
  });
});

// ── Cap limit table correctness ───────────────────────────────────────────────

describe("ADVISOR_MAX_USES table", () => {
  it("boe has the lowest cap (cost-sensitive)", () => {
    expect(ADVISOR_MAX_USES.boe).toBeLessThan(ADVISOR_MAX_USES.first_run);
  });

  it("strategic_mix has the highest cap (complexity-appropriate)", () => {
    expect(ADVISOR_MAX_USES.strategic_mix).toBeGreaterThan(ADVISOR_MAX_USES.ic_grade);
    expect(ADVISOR_MAX_USES.strategic_mix).toBeGreaterThan(ADVISOR_MAX_USES.first_run);
    expect(ADVISOR_MAX_USES.strategic_mix).toBeGreaterThan(ADVISOR_MAX_USES.boe);
  });

  it("caps are ordered: boe < first_run < ic_grade < strategic_mix", () => {
    expect(ADVISOR_MAX_USES.boe).toBeLessThan(ADVISOR_MAX_USES.first_run);
    expect(ADVISOR_MAX_USES.first_run).toBeLessThan(ADVISOR_MAX_USES.ic_grade);
    expect(ADVISOR_MAX_USES.ic_grade).toBeLessThan(ADVISOR_MAX_USES.strategic_mix);
  });
});
