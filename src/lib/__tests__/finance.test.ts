/**
 * Seed tests for the Hermes calculation engine.
 * These are intentionally simple — they establish the test harness is working
 * and will grow as the engine is built out.
 *
 * IMPORTANT: Every financial formula added to src/lib/ must have a corresponding
 * test here with known inputs and expected outputs verified against a trusted source.
 */

import { describe, it, expect } from "vitest";

// Placeholder: replace with real imports as the engine is built
// import { calculateCapRate, calculateDSCR, calculateIRR } from "@/lib/finance";

describe("Finance calculation engine", () => {
  it("placeholder — test harness is working", () => {
    // This test will be replaced with real formula tests.
    // It exists to confirm vitest + the @/* alias resolver are both working.
    expect(1 + 1).toBe(2);
  });

  // Example of what a real test looks like — uncomment and fill in as you build:
  //
  // it("calculates cap rate correctly", () => {
  //   const noi = 500_000;
  //   const purchasePrice = 6_250_000;
  //   expect(calculateCapRate({ noi, purchasePrice })).toBeCloseTo(0.08, 4);
  // });
  //
  // it("calculates DSCR correctly", () => {
  //   const noi = 500_000;
  //   const annualDebtService = 350_000;
  //   expect(calculateDSCR({ noi, annualDebtService })).toBeCloseTo(1.43, 2);
  // });
});
