/**
 * One-off script: resume pipeline after post_extraction gate was confirmed
 * but the orchestrator run crashed (worker was down during wait.for).
 *
 * Triggers module-selection → model-construction directly, then creates
 * the post_construction gate so the analyst can review KPIs.
 *
 * Run: node scripts/resume-from-module-selection.mjs
 */

import { tasks } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local manually (Trigger SDK reads TRIGGER_SECRET_KEY from env)
const envPath = join(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf8");
for (const line of envContent.split("\n")) {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) {
    process.env[key.trim()] = rest.join("=").trim();
  }
}

const JOB_ID = "d656a8a3-48c2-4193-b325-05489b57e1ba";
const DEAL_ID = "33333333-3333-3333-3333-333333333333";
const ORG_ID = "22222222-2222-2222-2222-222222222222";
const ANALYSIS_DEPTH = "first_run";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

async function main() {
  console.log(`Resuming pipeline for job ${JOB_ID} from module-selection...`);

  // Reset job to running so the UI doesn't show stale awaiting_gate
  await db.from("analysis_jobs").update({ status: "running" }).eq("id", JOB_ID);
  console.log("✓ Job status reset to running");

  // Trigger module-selection
  const handle = await tasks.trigger("module-selection", {
    jobId: JOB_ID,
    dealId: DEAL_ID,
    orgId: ORG_ID,
    analysisDepth: ANALYSIS_DEPTH,
    startingSequence: 11, // offset past ingestion/extraction/module_selection.started events
    currentAdvisorInvocationCount: 0,
    currentAdvisorTokensUsed: 0,
    currentExecutorTokensUsed: 13909,
  });

  console.log(`✓ module-selection triggered: run ID ${handle.id}`);
  console.log("The worker will now run module-selection → model-construction.");
  console.log("Refresh the review page in ~60s to see the post_construction gate.");
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
