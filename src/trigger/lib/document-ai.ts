/**
 * Google Document AI client — OCR and table extraction.
 *
 * ADR 006: Document AI handles mixed-format PDFs (native-text + scanned),
 * which is essential for T12s, rent rolls, and appraisals.
 *
 * Bounding box coordinates are preserved in the raw extraction output so
 * that provenance pointers (page + bbox) can be stored on extracted_inputs.
 */

import { DocumentProcessorServiceClient } from "@google-cloud/documentai";

// ── Client ──────────────────────────────────────────────────────────────────

let _client: DocumentProcessorServiceClient | null = null;

function getClient(): DocumentProcessorServiceClient {
  if (!_client) {
    // GOOGLE_APPLICATION_CREDENTIALS env var is picked up automatically
    // by the Google SDK when set to a path containing a service account JSON.
    _client = new DocumentProcessorServiceClient();
  }
  return _client;
}

// ── Types ───────────────────────────────────────────────────────────────────

export interface ExtractedPage {
  pageNumber: number;
  fullText: string;
  tables: ExtractedTable[];
  /** Raw bounding box data for provenance pointers. */
  boundingBoxes: BoundingBox[];
}

export interface ExtractedTable {
  pageNumber: number;
  rows: string[][];
  /** Bounding box of the entire table on the page. */
  boundingBox: BoundingBox | null;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DocumentAiResult {
  pages: ExtractedPage[];
  fullText: string;
  /** Pages that failed extraction (partial extraction path). */
  failedPages: number[];
}

// ── Processor resource name ─────────────────────────────────────────────────

function getProcessorName(): string {
  const projectId = process.env.GOOGLE_DOCUMENT_AI_PROJECT_ID;
  const location = process.env.GOOGLE_DOCUMENT_AI_LOCATION ?? "us";
  const processorId = process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID;

  if (!projectId || !processorId) {
    throw new Error(
      "GOOGLE_DOCUMENT_AI_PROJECT_ID and GOOGLE_DOCUMENT_AI_PROCESSOR_ID must be set",
    );
  }

  return `projects/${projectId}/locations/${location}/processors/${processorId}`;
}

// ── Extraction ──────────────────────────────────────────────────────────────

/**
 * Send a PDF (as a Buffer) to Document AI and return structured extraction.
 *
 * Implements the graceful degradation pattern from ADR 010: if individual
 * page processing fails, we log and continue rather than failing the whole job.
 */
export async function extractDocument(pdfBytes: Buffer): Promise<DocumentAiResult> {
  const client = getClient();
  const processorName = getProcessorName();

  const response = await client.processDocument({
    name: processorName,
    rawDocument: {
      content: pdfBytes.toString("base64"),
      mimeType: "application/pdf",
    },
  });

  // processDocument returns [IProcessResponse, operation, rawResponse]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = (response as any)[0] ?? response;
  const document = result.document;

  if (!document) {
    throw new Error("Document AI returned no document in response");
  }

  const fullText = document.text ?? "";
  const pages: ExtractedPage[] = [];
  const failedPages: number[] = [];

  for (const page of document.pages ?? []) {
    const pageNumber = (page.pageNumber ?? 0) + 1; // Document AI is 0-indexed

    try {
      const tables = extractTables(page, fullText);
      const pageText = extractPageText(page, fullText);
      const boundingBoxes = extractBoundingBoxes(page);

      pages.push({
        pageNumber,
        fullText: pageText,
        tables,
        boundingBoxes,
      });
    } catch (err) {
      console.warn(
        `[document-ai] Failed to extract page ${pageNumber}:`,
        err instanceof Error ? err.message : err,
      );
      failedPages.push(pageNumber);
    }
  }

  return { pages, fullText, failedPages };
}

// ── Private helpers ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DocumentAiPage = any;

function extractPageText(page: DocumentAiPage, fullText: string): string {
  const lines: string[] = [];

  for (const line of page.lines ?? []) {
    const text = getTextFromSegments(line.layout?.textAnchor?.textSegments ?? [], fullText);
    if (text.trim()) lines.push(text);
  }

  return lines.join("\n");
}

function extractTables(page: DocumentAiPage, fullText: string): ExtractedTable[] {
  const pageNumber = (page.pageNumber ?? 0) + 1;
  const tables: ExtractedTable[] = [];

  for (const table of page.tables ?? []) {
    const rows: string[][] = [];

    // Header rows
    for (const row of table.headerRows ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cells = (row.cells ?? []).map((cell: any) =>
        getTextFromSegments(cell.layout?.textAnchor?.textSegments ?? [], fullText).trim(),
      );
      rows.push(cells);
    }

    // Body rows
    for (const row of table.bodyRows ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cells = (row.cells ?? []).map((cell: any) =>
        getTextFromSegments(cell.layout?.textAnchor?.textSegments ?? [], fullText).trim(),
      );
      rows.push(cells);
    }

    const bbox = normalizeBoundingBox(table.layout?.boundingPoly?.normalizedVertices ?? []);

    tables.push({ pageNumber, rows, boundingBox: bbox });
  }

  return tables;
}

function extractBoundingBoxes(page: DocumentAiPage): BoundingBox[] {
  const boxes: BoundingBox[] = [];

  for (const block of page.blocks ?? []) {
    const bbox = normalizeBoundingBox(block.layout?.boundingPoly?.normalizedVertices ?? []);
    if (bbox) boxes.push(bbox);
  }

  return boxes;
}

function getTextFromSegments(
  segments: Array<{ startIndex?: number | string | null; endIndex?: number | string | null }>,
  fullText: string,
): string {
  return segments
    .map((seg) => {
      const start = Number(seg.startIndex ?? 0);
      const end = Number(seg.endIndex ?? 0);
      return fullText.slice(start, end);
    })
    .join("");
}

function normalizeBoundingBox(
  vertices: Array<{ x?: number | null; y?: number | null }>,
): BoundingBox | null {
  if (vertices.length < 4) return null;

  const xs = vertices.map((v) => v.x ?? 0);
  const ys = vertices.map((v) => v.y ?? 0);
  const x = Math.min(...xs);
  const y = Math.min(...ys);

  return {
    x,
    y,
    width: Math.max(...xs) - x,
    height: Math.max(...ys) - y,
  };
}
