/**
 * POST /api/deals/[dealId]/uploads
 *
 * Pre-creates an `uploaded_files` row and returns a short-lived signed URL
 * the client uses for a direct-to-Storage PUT. The client uploads the file
 * itself; this route never handles raw bytes.
 *
 * ## Flow
 * 1. Validate request body (Zod).
 * 2. Verify `dealId` exists and fetch `org_id` from the deals row.
 * 3. Pre-generate a UUID for the file; compose a deterministic storage path.
 * 4. Issue a signed upload URL via Supabase Storage (`deal-documents` bucket).
 * 5. Insert `uploaded_files` row with `status = 'pending'` and `deal_id` set.
 * 6. Return `201 { upload_url, uploaded_file_id }`.
 *
 * ## Storage path format
 * `{org_id}/{deal_id}/{uploaded_file_id}/{file_name}`
 * Keeps files org- and deal-scoped in the bucket; the file UUID ensures
 * uniqueness even if the same file_name is uploaded twice to the same deal.
 *
 * ## Storage bucket
 * `deal-documents` — configured manually in the Supabase dashboard (not in
 * migrations). See `src/trigger/subtasks/document-ingestion.ts` for download
 * usage.
 *
 * ## Auth
 * Service-role bypass in place. `uploaded_by` accepted from request body
 * temporarily. TODO(MMC-22): derive from authenticated session.
 *
 * ## References
 * - Scope spec §3.2 — API surface
 * - MMC-48 — this ticket
 * - MMC-40 — parent scope
 * - MMC-33 — v0 upload infrastructure (Storage bucket, uploaded_files table)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { randomUUID } from "crypto";
import type { Database } from "@/lib/supabase/database.types";

// ── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_BUCKET = "deal-documents";

// ── Schema ────────────────────────────────────────────────────────────────────

const UploadRequestSchema = z.object({
  file_name: z.string().min(1, "file_name must be a non-empty string"),
  mime_type: z.string().min(1, "mime_type must be a non-empty string"),
  file_size_bytes: z.number().int().positive("file_size_bytes must be a positive integer"),
  sha256_hash: z.string().min(1, "sha256_hash must be a non-empty string"),

  // TODO(MMC-22): remove from public API once auth lands.
  // Will be derived from the authenticated session (auth.uid()).
  // Loose format check — mirrors the bypass-period relaxation in POST /api/deals.
  // Dev UUIDs may use non-RFC-4122 variant nibbles, so .uuid() is too strict here.
  uploaded_by: z
    .string()
    .regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      "uploaded_by must be a valid UUID",
    ),
});

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ dealId: string }> },
): Promise<NextResponse> {
  const { dealId } = await params;

  // ── 1. Parse request body ────────────────────────────────────────────────
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // ── 2. Validate with Zod ─────────────────────────────────────────────────
  const parsed = UploadRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { file_name, mime_type, file_size_bytes, sha256_hash, uploaded_by } = parsed.data;

  // ── 3. Service-role client ───────────────────────────────────────────────
  // TODO(MMC-22): replace with cookie-based session client once auth lands.
  const db = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // ── 4. Verify deal exists, get org_id ────────────────────────────────────
  // Fetching org_id from the deal avoids requiring the caller to pass it
  // again — they already proved they know the dealId.
  const { data: deal, error: dealError } = await db
    .from("deals")
    .select("id, org_id")
    .eq("id", dealId)
    .maybeSingle();

  if (dealError) {
    console.error(`[deal-intake] Failed to look up deal ${dealId}:`, dealError.message);
    return NextResponse.json({ error: "Failed to verify deal" }, { status: 500 });
  }

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  const { org_id } = deal;

  // ── 5. Compose storage path and pre-generate file ID ────────────────────
  const uploadedFileId = randomUUID();
  const storagePath = `${org_id}/${dealId}/${uploadedFileId}/${file_name}`;

  // ── 6. Issue signed upload URL ───────────────────────────────────────────
  const { data: signedUrlData, error: signedUrlError } = await db.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(storagePath);

  if (signedUrlError || !signedUrlData) {
    console.error(
      `[deal-intake] Failed to create signed upload URL for deal ${dealId}:`,
      signedUrlError?.message,
    );
    return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
  }

  // ── 7. Pre-create uploaded_files row ─────────────────────────────────────
  const { error: insertError } = await db.from("uploaded_files").insert({
    id: uploadedFileId,
    org_id,
    deal_id: dealId,
    storage_path: storagePath,
    file_name,
    mime_type,
    file_size_bytes,
    sha256_hash,
    source: "direct_upload",
    status: "pending",
    uploaded_by,
  });

  if (insertError) {
    console.error(
      `[deal-intake] Failed to pre-create uploaded_files row for deal ${dealId}:`,
      insertError.message,
    );
    return NextResponse.json({ error: "Failed to pre-create upload record" }, { status: 500 });
  }

  console.log(`[deal-intake] upload pre-created file_id=${uploadedFileId} deal_id=${dealId}`);

  // ── 8. Return signed URL and file ID ─────────────────────────────────────
  return NextResponse.json(
    {
      upload_url: signedUrlData.signedUrl,
      uploaded_file_id: uploadedFileId,
    },
    { status: 201 },
  );
}
