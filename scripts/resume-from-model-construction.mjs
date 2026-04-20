/**
 * One-off script: trigger model-construction after module-selection completed
 * but the orchestrator is no longer running.
 *
 * Run: node scripts/resume-from-model-construction.mjs
 */

import { tasks } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local manually
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
const COMPOSITION_ID = "2431ae0c-e542-477c-9054-bdd6f1e57d6a";
const ANALYSIS_DEPTH = "first_run";

async function main() {
  console.log(`Triggering model-construction for job ${JOB_ID}...`);
  console.log(`  Composition: ${COMPOSITION_ID}`);

  const handle = await tasks.trigger("model-construction", {
    jobId: JOB_ID,
    dealId: DEAL_ID,
    orgId: ORG_ID,
    compositionId: COMPOSITION_ID,
    analysisDepth: ANALYSIS_DEPTH,
    startingSequence: 13, // offset past events through module_selection.completed (seq=13)
    currentAdvisorInvocationCount: 0,
    currentAdvisorTokensUsed: 0,
    currentExecutorTokensUsed: 0, // module-selection tokens not tracked here; fresh count
  });

  console.log(`✓ model-construction triggered: run ID ${handle.id}`);
  console.log("Refresh the review page in ~60s to see the post_construction gate.");
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
