/**
 * E2E — deal-intake happy path (Playwright)
 *
 * Full walkthrough: create deal → upload 2 PDFs → click Analyze → land on the
 * review page → verify the 409 idempotency guard via the UI.
 *
 * ## Environment
 * Runs against `next dev` (see playwright.config.ts webServer) using the real
 * dev Supabase project. Service-role bypass is in place (MMC-22 pending), so
 * no login step. Env is read from `.env.local` for the cleanup client.
 *
 * ## Trigger.dev note
 * Clicking Analyze fires the real Trigger.dev task. If no dev worker is
 * running, the job stays `queued` and the review page renders the no-gate
 * InfoPage — both the gate UI and the InfoPage render the "Gate review"
 * heading, which is what we assert. The 409 check *relies* on the job staying
 * active (`queued` | `running`), which holds in both cases.
 *
 * ## Cleanup
 * `afterAll` deletes everything the test created, children first:
 * agent_events → job_gates → analysis_jobs → storage objects →
 * uploaded_files → deals.
 *
 * ## References
 * - MMC-54 — this ticket (closing gate for MMC-40)
 * - Scope spec §6 — sequencing
 */

import { test, expect, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

// ── Env (parsed from .env.local — Playwright does not load it) ────────────────

function loadEnvLocal(): Record<string, string> {
  const envPath = path.resolve(__dirname, "../../.env.local");
  const out: Record<string, string> = {};
  if (!fs.existsSync(envPath)) return out;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = { ...loadEnvLocal(), ...process.env };

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY!;

const FIXTURES = path.resolve(__dirname, "../fixtures");
const OM_PDF = path.join(FIXTURES, "om-stub.pdf");
const RENT_ROLL_PDF = path.join(FIXTURES, "rent-roll-stub.pdf");

/** Unique deal name per run so cleanup can never collide with real data. */
const DEAL_NAME = `E2E Intake ${Date.now()}`;

// ── Shared state across serial steps ──────────────────────────────────────────

let db: SupabaseClient;
let dealId: string | null = null;
let jobId: string | null = null;

/**
 * A tiny valid single-page PDF with unique content per run. Used for the 409
 * step — re-using a fixture would trip the SHA-256 dedupe in the uploads API
 * (duplicates are excluded from analysis, leaving no pending file to enable
 * the Analyze button).
 */
function uniquePdfBuffer(tag: string): Buffer {
  const text = `E2E extra doc ${tag} ${Date.now()}`;
  const content = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`;
  const pdf = [
    "%PDF-1.3",
    "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj",
    "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj",
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj",
    `4 0 obj<</Length ${content.length}>>stream\n${content}\nendstream endobj`,
    "5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj",
    "trailer<</Root 1 0 R>>",
    "%%EOF",
  ].join("\n");
  return Buffer.from(pdf, "latin1");
}

async function uploadViaZone(page: Page, files: Parameters<Page["setInputFiles"]>[1]) {
  await page.locator('input[type="file"]').setInputFiles(files);
}

// ── Suite ─────────────────────────────────────────────────────────────────────

test.describe.configure({ mode: "serial" });

test.describe("deal intake — create → upload → analyze → review", () => {
  test.beforeAll(() => {
    db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
  });

  test.afterAll(async () => {
    // Children first — FK order. Best-effort: every step runs even if a
    // prior one fails, so a mid-test crash still gets cleaned up.
    if (dealId) {
      const { data: jobs } = await db.from("analysis_jobs").select("id").eq("deal_id", dealId);
      const jobIds = (jobs ?? []).map((j) => j.id);

      if (jobIds.length > 0) {
        await db.from("agent_events").delete().in("job_id", jobIds);
        await db.from("job_gates").delete().in("job_id", jobIds);
        await db.from("analysis_jobs").delete().in("id", jobIds);
      }

      const { data: files } = await db
        .from("uploaded_files")
        .select("id, storage_path")
        .eq("deal_id", dealId);

      const paths = (files ?? []).map((f) => f.storage_path).filter(Boolean) as string[];
      if (paths.length > 0) {
        await db.storage.from("deal-documents").remove(paths);
      }
      await db.from("uploaded_files").delete().eq("deal_id", dealId);
      await db.from("deals").delete().eq("id", dealId);
    }
  });

  test("creates a new deal via the dashboard UI", async ({ page }) => {
    await page.goto("/deals/new");

    await page.locator("#name").fill(DEAL_NAME);
    await page.locator("#asset_class").selectOption("office");
    await page.locator("#business_plan").selectOption("acquire_lease_hold");

    await page.getByRole("button", { name: "Create deal" }).click();

    // Redirects to /deals/[dealId]
    await page.waitForURL(/\/deals\/[0-9a-f-]{36}$/, { timeout: 15_000 });
    dealId = page.url().match(/\/deals\/([0-9a-f-]{36})$/)![1];

    await expect(page.getByRole("heading", { name: DEAL_NAME })).toBeVisible();
  });

  test("uploads 2 PDFs and sees them in the pending list", async ({ page }) => {
    expect(dealId, "deal must exist from previous step").toBeTruthy();
    await page.goto(`/deals/${dealId}`);

    await uploadViaZone(page, [OM_PDF, RENT_ROLL_PDF]);

    // Both docs appear in the grouped list under "Pending"
    await expect(page.getByText("om-stub.pdf")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("rent-roll-stub.pdf")).toBeVisible();
    await expect(page.getByText("Pending", { exact: true })).toBeVisible();
    await expect(page.getByText("2 files")).toBeVisible();
  });

  test("Analyze disables while submitting and redirects to review", async ({ page }) => {
    expect(dealId).toBeTruthy();
    await page.goto(`/deals/${dealId}`);

    const analyze = page.getByRole("button", { name: "Analyze" });
    await expect(analyze).toBeEnabled();
    await analyze.click();

    // While the job is being submitted the button is disabled and relabelled.
    await expect(page.getByRole("button", { name: "Starting analysis…" })).toBeDisabled();

    // 201 → redirect to the review page
    await page.waitForURL(/\/jobs\/[0-9a-f-]{36}\/review$/, { timeout: 30_000 });
    jobId = page.url().match(/\/jobs\/([0-9a-f-]{36})\/review$/)![1];
  });

  test("review page loads without crashing", async ({ page }) => {
    expect(jobId).toBeTruthy();
    await page.goto(`/jobs/${jobId}/review`);

    // Both the pending-gate UI and the no-gate InfoPage render this heading.
    await expect(page.getByRole("heading", { name: "Gate review" })).toBeVisible({
      timeout: 15_000,
    });
  });

  test("second Analyze while job is active shows the 409 inline message", async ({ page }) => {
    expect(dealId).toBeTruthy();

    // Confirm the job is still active (queued | running) — the guard the 409
    // depends on. If a Trigger.dev worker already completed it, skip: the
    // idempotency window has closed and a second run would be legitimate.
    const { data: activeJob } = await db
      .from("analysis_jobs")
      .select("id, status")
      .eq("deal_id", dealId)
      .in("status", ["queued", "running"])
      .maybeSingle();
    test.skip(!activeJob, "job already completed — 409 window closed");

    await page.goto(`/deals/${dealId}`);

    // A fresh pending doc is needed to enable the Analyze button (the first
    // two files are already 'queued'). Unique bytes avoid the SHA dedupe.
    await uploadViaZone(page, [
      {
        name: "extra-doc.pdf",
        mimeType: "application/pdf",
        buffer: uniquePdfBuffer("409-check"),
      },
    ]);
    await expect(page.getByText("extra-doc.pdf")).toBeVisible({ timeout: 15_000 });

    const analyze = page.getByRole("button", { name: "Analyze" });
    await expect(analyze).toBeEnabled();
    await analyze.click();

    // API returns 409 → inline alert, no navigation
    await expect(page.getByRole("alert")).toContainText("Analysis already in progress", {
      timeout: 15_000,
    });
    expect(page.url()).toContain(`/deals/${dealId}`);
  });
});
