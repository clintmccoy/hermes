/**
 * document-ingestion subtask — Step 1 of the analysis pipeline.
 *
 * Responsibilities:
 * 1. Download the uploaded PDF from Supabase Storage
 * 2. Send to Google Document AI for OCR and table extraction
 * 3. Store raw extraction JSON back to Supabase Storage
 * 4. Create/resolve a document_refs row
 * 5. Emit ingestion events with partial-failure handling
 *
 * ADR 006: Bounding boxes are preserved in raw extraction so provenance
 * pointers (page + bbox) are available for extracted_inputs later.
 * ADR 010: Partial extraction is a graceful degradation path, not a failure.
 */

import { task } from "@trigger.dev/sdk/v3";
import { getSupabaseAdmin, emitEvent, EventSequencer } from "../lib/events";
import { extractDocument } from "../lib/document-ai";
import type { IngestionResult } from "../lib/types";

export interface DocumentIngestionPayload {
  jobId: string;
  uploadedFileId: string;
  dealId: string;
  orgId: string;
  /** External sequencer passed from orchestrator so event seq is global. */
  startingSequence: number;
}

export const documentIngestionTask = task({
  id: "document-ingestion",
  retry: { maxAttempts: 2 },

  run: async (payload: DocumentIngestionPayload): Promise<IngestionResult> => {
    const { jobId, uploadedFileId, dealId, orgId, startingSequence } = payload;
    const db = getSupabaseAdmin();

    // Sequencer starts where the orchestrator left off
    const sequencer = new EventSequencer();
    // Fast-forward to correct position (crude but safe for subtask isolation)
    for (let i = 0; i < startingSequence; i++) sequencer.next();

    await emitEvent(jobId, sequencer, "ingestion.started", { uploadedFileId });

    // ── 1. Fetch uploaded file metadata ─────────────────────────────────────
    const { data: file, error: fileError } = await db
      .from("uploaded_files")
      .select("id, storage_path, file_name, mime_type")
      .eq("id", uploadedFileId)
      .single();

    if (fileError || !file) {
      throw new Error(
        `uploaded_files row not found for id=${uploadedFileId}: ${fileError?.message}`,
      );
    }

    // ── 2. Download PDF bytes from Supabase Storage ─────────────────────────
    const { data: fileBlob, error: downloadError } = await db.storage
      .from("deal-documents")
      .download(file.storage_path);

    if (downloadError || !fileBlob) {
      throw new Error(`Failed to download file from storage: ${downloadError?.message}`);
    }

    const pdfBytes = Buffer.from(await fileBlob.arrayBuffer());

    // ── 3. Run Google Document AI extraction ─────────────────────────────────
    const extraction = await extractDocument(pdfBytes);

    // ── 4. Store raw extraction JSON in Supabase Storage ─────────────────────
    const rawExtractionPath = `raw-extractions/${orgId}/${dealId}/${jobId}/${uploadedFileId}.json`;
    const rawJson = JSON.stringify({
      extractedAt: new Date().toISOString(),
      uploadedFileId,
      jobId,
      pages: extraction.pages,
      failedPages: extraction.failedPages,
    });

    const { error: uploadError } = await db.storage
      .from("deal-documents")
      .upload(rawExtractionPath, new Blob([rawJson], { type: "application/json" }), {
        upsert: true,
      });

    if (uploadError) {
      // Non-fatal — we still have the extraction in memory. Log and continue.
      console.warn(
        `[document-ingestion] Failed to store raw extraction JSON: ${uploadError.message}`,
      );
    }

    // ── 5. Create document_refs row ──────────────────────────────────────────
    // Check if a document_refs row already exists for this uploaded_file_id.
    const { data: existingRef } = await db
      .from("document_refs")
      .select("id")
      .eq("uploaded_file_id", uploadedFileId)
      .maybeSingle();

    let documentRefId: string;

    if (existingRef) {
      documentRefId = existingRef.id;
    } else {
      const { data: newRef, error: refError } = await db
        .from("document_refs")
        .insert({
          uploaded_file_id: uploadedFileId,
          document_type: inferDocumentType(file.file_name),
          source_quality:
            extraction.failedPages.length > 3
              ? "weak"
              : extraction.failedPages.length > 0
                ? "reasonable"
                : "strong",
        })
        .select("id")
        .single();

      if (refError || !newRef) {
        throw new Error(`Failed to create document_refs row: ${refError?.message}`);
      }

      documentRefId = newRef.id;
    }

    // ── 6. Mark uploaded_file as processed ───────────────────────────────────
    await db.from("uploaded_files").update({ status: "processed" }).eq("id", uploadedFileId);

    // ── 7. Emit completion event ─────────────────────────────────────────────
    const hasPartialExtraction = extraction.failedPages.length > 0;

    if (hasPartialExtraction) {
      await emitEvent(jobId, sequencer, "ingestion.partial_failure", {
        failedPages: extraction.failedPages,
        totalPages: extraction.pages.length + extraction.failedPages.length,
      });
    }

    await emitEvent(jobId, sequencer, "ingestion.completed", {
      documentRefId,
      pagesExtracted: extraction.pages.length,
      hasPartialExtraction,
      rawExtractionPath,
    });

    return {
      documentRefId,
      rawExtractionStoragePath: rawExtractionPath,
      pagesExtracted: extraction.pages.length,
      hasPartialExtraction,
      failedPages: extraction.failedPages,
    };
  },
});

// ── Helpers ─────────────────────────────────────────────────────────────────

function inferDocumentType(fileName: string): string {
  const lower = fileName.toLowerCase();

  if (lower.includes("rent_roll") || lower.includes("rentroll")) return "rent_roll";
  if (lower.includes("t12") || lower.includes("trailing_12")) return "t12";
  if (
    lower.includes("offering_mem") ||
    lower.includes(" om ") ||
    lower.includes("_om_") ||
    lower.includes("-om-")
  )
    return "offering_memorandum";
  if (lower.includes("appraisal")) return "appraisal";
  if (lower.includes("budget")) return "budget";
  if (lower.includes("lease")) return "lease";
  if (lower.includes("loan")) return "loan_documents";
  if (lower.includes("construction")) return "construction_budget";

  return "other";
}
