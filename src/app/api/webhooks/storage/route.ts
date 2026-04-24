/**
 * POST /api/webhooks/storage
 *
 * NO-OP STUB — the analysis-job enqueue logic was removed as part of the
 * Cycle 1 deal-intake scope (MMC-40). Analysis now starts only when the user
 * explicitly clicks Analyze (POST /api/deals/[dealId]/analyze — MMC-49).
 *
 * ## Why this stub exists instead of a full removal
 * The Supabase webhook registration, URL, and signing secret are intentionally
 * preserved. The email-inbound scope (Cycle 2+) is expected to re-use the same
 * auth path, avoiding Supabase reconfiguration work at that time.
 *
 * See MMC-41 for the deferred reactivate-or-remove decision. When MMC-41 is
 * actioned, one of two paths closes it:
 *   Reactivate: replumb this handler to the email-inbound pipeline
 *   Remove: delete this file + unregister the Supabase webhook + delete
 *           SUPABASE_WEBHOOK_SECRET from environment secrets
 *
 * ## Original Supabase dashboard setup (preserved — do not unregister)
 * Dashboard → Database → Webhooks:
 *   - Table: uploaded_files
 *   - Events: INSERT
 *   - URL: https://<your-vercel-domain>/api/webhooks/storage
 *   - HTTP headers: { "x-webhook-secret": <SUPABASE_WEBHOOK_SECRET> }
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── 1. Authenticate the webhook ──────────────────────────────────────────
  // Secret validation is kept so the dormant endpoint isn't open to arbitrary
  // POSTs. The registration is still active in Supabase (see header above).
  const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[storage-webhook] SUPABASE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const incomingSecret = request.headers.get("x-webhook-secret");

  if (!incomingSecret || incomingSecret !== webhookSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 2. Parse the webhook payload ─────────────────────────────────────────
  let body: SupabaseWebhookPayload;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // ── 3. No-op ──────────────────────────────────────────────────────────────
  // Analysis is no longer triggered by upload. The user explicitly initiates
  // it via POST /api/deals/[dealId]/analyze. See MMC-41 for the future
  // reactivate-or-remove decision when the email-inbound scope begins.
  const fileId = body.record?.id ?? "unknown";
  console.log(`[storage-webhook] received INSERT for uploaded_file ${fileId} — no-op (see MMC-41)`);

  return new NextResponse(null, { status: 204 });
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface SupabaseWebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: { id: string } | null;
  old_record: unknown;
}
