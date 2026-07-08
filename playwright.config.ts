/**
 * Playwright config — E2E tests for the deal-intake flow.
 *
 * Runs against `next dev` on :3000 (auto-started via webServer unless one is
 * already running). Env comes from `.env.local` — the E2E suite talks to the
 * real Supabase project and Trigger.dev, so run it against a dev environment
 * only.
 *
 * ## References
 * - MMC-54 — this ticket
 * - MMC-40 — parent scope (this test is its closing gate)
 * - Scope spec §6 — sequencing
 */

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  // Deal-intake specs share DB state (deal rows); keep runs serial.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
