"use client";

/**
 * /deals/[dealId] — Deal detail page
 *
 * Primary working surface for the intake flow. Shows deal metadata, an
 * upload zone, documents grouped by status, and the user-initiated Analyze
 * button.
 *
 * ## Upload flow (immediate — not staged)
 * On drop/select:
 * 1. Read ArrayBuffer → SHA-256 via crypto.subtle.
 * 2. POST /api/deals/[dealId]/uploads → { upload_url, uploaded_file_id }.
 * 3. PUT raw bytes directly to Supabase Storage.
 * 4. Refresh the document list on completion.
 *
 * ## Analyze flow
 * 1. POST /api/deals/[dealId]/analyze
 * 2. On 201: redirect to /jobs/[analysisJobId]/review.
 * 3. On 409: show inline "Analysis already in progress".
 *
 * ## Auth
 * Service-role bypass in place. TODO(MMC-22): derive user from session.
 *
 * ## References
 * - MMC-53 — this ticket
 * - MMC-58 — upload tray pattern (from /deals/new)
 * - MMC-40 — parent scope
 * - Scope spec §3.4 — frontend design
 */

import { useState, useEffect, useRef, useCallback, useId, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

// ── Types ──────────────────────────────────────────────────────────────────────

type Deal = Database["public"]["Tables"]["deals"]["Row"];
type UploadedFile = Database["public"]["Tables"]["uploaded_files"]["Row"];
type AnalysisJob = Database["public"]["Tables"]["analysis_jobs"]["Row"];

type FileStatus = "pending" | "queued" | "processed" | "failed";

const FILE_STATUS_ORDER: FileStatus[] = ["pending", "queued", "processed", "failed"];

interface UploadingEntry {
  /** Client-only key for React list rendering. */
  id: string;
  file: File;
  phase: "hashing" | "registering" | "uploading" | "done" | "error";
  error?: string;
}

interface Rejection {
  fileName: string;
  reason: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
const MAX_FILE_COUNT = 10;

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function labelForStatus(status: FileStatus): string {
  const map: Record<FileStatus, string> = {
    pending: "Pending",
    queued: "Queued",
    processed: "Processed",
    failed: "Failed",
  };
  return map[status];
}

type BadgeTone = "neutral" | "accent" | "positive" | "critical" | "caution" | "info";

function toneForFileStatus(status: FileStatus): BadgeTone {
  const map: Record<FileStatus, BadgeTone> = {
    pending: "neutral",
    queued: "accent",
    processed: "positive",
    failed: "critical",
  };
  return map[status];
}

function toneForJobStatus(status: string): BadgeTone {
  switch (status) {
    case "completed":
      return "positive";
    case "failed":
      return "critical";
    case "running":
      return "accent";
    case "queued":
      return "caution";
    default:
      return "neutral";
  }
}

function labelForAssetClass(v: string): string {
  const map: Record<string, string> = {
    office: "Office",
    industrial: "Industrial",
    multifamily: "Multifamily",
    retail: "Retail",
  };
  return map[v] ?? v;
}

function labelForBusinessPlan(v: string): string {
  const map: Record<string, string> = {
    ground_up: "Ground Up",
    acquire_lease_hold: "Acquire / Lease / Hold",
  };
  return map[v] ?? v;
}

function phaseLabel(phase: UploadingEntry["phase"], error?: string): string {
  switch (phase) {
    case "hashing":
      return "Hashing…";
    case "registering":
      return "Registering…";
    case "uploading":
      return "Uploading…";
    case "done":
      return "Done";
    case "error":
      return error ?? "Failed";
  }
}

// ── UploadZone ─────────────────────────────────────────────────────────────────

function UploadZone({
  onFiles,
  disabled,
}: {
  onFiles: (files: File[]) => void;
  disabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputId = useId();

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      onFiles(Array.from(files));
    },
    [onFiles],
  );

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (!disabled) setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) handleFiles(e.target.files);
    // Reset so the same file can be re-picked after an error
    e.target.value = "";
  }

  return (
    <>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Drop files or click to browse"
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled) {
            inputRef.current?.click();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          height: 72,
          border: `1.5px dashed ${dragOver ? "var(--border-focus)" : "var(--border-strong)"}`,
          borderRadius: "var(--radius-sm)",
          background: dragOver ? "var(--surface-1)" : "var(--surface-0)",
          cursor: disabled ? "not-allowed" : "pointer",
          transition: `border-color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out)`,
          outline: "none",
          opacity: disabled ? 0.5 : 1,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--border-focus)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = dragOver
            ? "var(--border-focus)"
            : "var(--border-strong)";
        }}
      >
        <span style={{ font: "400 13px/20px var(--font-sans)", color: "var(--fg-2)" }}>
          Drop files here, or{" "}
          <span style={{ color: "var(--accent)", textDecoration: "underline" }}>browse</span>
        </span>
        <span style={{ font: "400 11px/16px var(--font-sans)", color: "var(--fg-3)" }}>
          Any file type · max {formatBytes(MAX_FILE_SIZE_BYTES)} · up to {MAX_FILE_COUNT} files
        </span>
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        multiple
        style={{ display: "none" }}
        onChange={handleInputChange}
        disabled={disabled}
      />
    </>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function DealDetailPage() {
  const { dealId } = useParams<{ dealId: string }>();
  const router = useRouter();

  // Supabase browser client — memoised so it's stable across re-renders
  const db = useMemo(() => createClient(), []);

  // ── Data state ─────────────────────────────────────────────────────────────
  const [deal, setDeal] = useState<Deal | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [latestJob, setLatestJob] = useState<AnalysisJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── Upload state ───────────────────────────────────────────────────────────
  const [uploading, setUploading] = useState<UploadingEntry[]>([]);
  const [rejections, setRejections] = useState<Rejection[]>([]);

  // ── Analyze state ──────────────────────────────────────────────────────────
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoadError(null);

    const [dealRes, filesRes, jobRes] = await Promise.all([
      db.from("deals").select("*").eq("id", dealId).maybeSingle(),
      db
        .from("uploaded_files")
        .select("*")
        .eq("deal_id", dealId)
        .order("uploaded_at", { ascending: false }),
      db
        .from("analysis_jobs")
        .select("*")
        .eq("deal_id", dealId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (dealRes.error || filesRes.error || jobRes.error) {
      setLoadError("Failed to load deal data. Please refresh.");
      setLoading(false);
      return;
    }

    if (!dealRes.data) {
      setLoadError("Deal not found.");
      setLoading(false);
      return;
    }

    setDeal(dealRes.data);
    setFiles(filesRes.data ?? []);
    setLatestJob(jobRes.data ?? null);
    setLoading(false);
  }, [dealId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── File-list refresh (called after each successful upload) ────────────────

  const refreshFiles = useCallback(async () => {
    const { data } = await db
      .from("uploaded_files")
      .select("*")
      .eq("deal_id", dealId)
      .order("uploaded_at", { ascending: false });
    if (data) setFiles(data);
  }, [dealId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Upload handler ─────────────────────────────────────────────────────────

  function handleFileDrop(dropped: File[]) {
    const newRejections: Rejection[] = [];
    const accepted: File[] = [];

    // Count non-error in-flight uploads toward the cap
    const inFlightCount = uploading.filter((u) => u.phase !== "error").length;

    for (const file of dropped) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        newRejections.push({
          fileName: file.name,
          reason: `exceeds ${formatBytes(MAX_FILE_SIZE_BYTES)} limit`,
        });
        continue;
      }
      if (files.length + inFlightCount + accepted.length >= MAX_FILE_COUNT) {
        newRejections.push({
          fileName: file.name,
          reason: `limit of ${MAX_FILE_COUNT} files reached`,
        });
        continue;
      }
      accepted.push(file);
    }

    setRejections(newRejections);
    if (accepted.length === 0) return;

    const entries: UploadingEntry[] = accepted.map((f) => ({
      id: crypto.randomUUID(),
      file: f,
      phase: "hashing" as const,
    }));

    setUploading((prev) => [...prev, ...entries]);

    // Kick off each upload independently
    for (const entry of entries) {
      doUpload(entry);
    }
  }

  async function doUpload(entry: UploadingEntry) {
    const patch = (update: Partial<UploadingEntry>) =>
      setUploading((prev) => prev.map((u) => (u.id === entry.id ? { ...u, ...update } : u)));

    try {
      // 1. Hash
      patch({ phase: "hashing" });
      const buffer = await entry.file.arrayBuffer();
      const hash = await sha256Hex(buffer);

      // 2. Pre-create uploaded_files row + get signed URL
      patch({ phase: "registering" });
      const metaRes = await fetch(`/api/deals/${dealId}/uploads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_name: entry.file.name,
          mime_type: entry.file.type || "application/octet-stream",
          file_size_bytes: entry.file.size,
          sha256_hash: hash,
          // Pre-auth bypass (MMC-22): remove once auth lands
          uploaded_by: process.env.NEXT_PUBLIC_DEV_USER_ID,
        }),
      });

      if (!metaRes.ok) {
        const body = await metaRes.json().catch(() => ({}));
        patch({ phase: "error", error: body.error ?? `Server error (${metaRes.status})` });
        return;
      }

      const { upload_url } = await metaRes.json();

      // 3. PUT bytes directly to Supabase Storage
      patch({ phase: "uploading" });
      const putRes = await fetch(upload_url, {
        method: "PUT",
        headers: { "Content-Type": entry.file.type || "application/octet-stream" },
        body: buffer,
      });

      if (!putRes.ok) {
        patch({ phase: "error", error: "Storage upload failed" });
        return;
      }

      patch({ phase: "done" });

      // 4. Refresh document list
      await refreshFiles();

      // 5. Auto-clear the "done" entry after a short delay
      setTimeout(() => {
        setUploading((prev) => prev.filter((u) => u.id !== entry.id));
      }, 1500);
    } catch {
      patch({ phase: "error", error: "Network error" });
    }
  }

  function dismissUploadError(id: string) {
    setUploading((prev) => prev.filter((u) => u.id !== id));
  }

  // ── Analyze handler ────────────────────────────────────────────────────────

  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalyzeError(null);

    try {
      const res = await fetch(`/api/deals/${dealId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Pre-auth bypass (MMC-22): remove once auth lands
          user_id: process.env.NEXT_PUBLIC_DEV_USER_ID,
        }),
      });

      if (res.status === 409) {
        setAnalyzeError("Analysis already in progress");
        setAnalyzing(false);
        // Refresh so the latest job banner reflects current state
        await fetchData();
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setAnalyzeError(body.error ?? `Error (${res.status})`);
        setAnalyzing(false);
        return;
      }

      const { analysis_job_id } = await res.json();
      router.push(`/jobs/${analysis_job_id}/review`);
    } catch {
      setAnalyzeError("Network error — please try again.");
      setAnalyzing(false);
    }
  }

  // ── Nav handler ────────────────────────────────────────────────────────────

  function handleNav(id: string) {
    const routes: Record<string, string> = {
      deals: "/deals",
      review: "/jobs",
      outputs: "/deals",
      exports: "/deals",
    };
    router.push(routes[id] ?? "/deals");
  }

  // ── Computed ───────────────────────────────────────────────────────────────

  const hasPendingFiles = files.some((f) => f.status === "pending");
  const groupedFiles = FILE_STATUS_ORDER.reduce(
    (acc, status) => {
      acc[status] = files.filter((f) => f.status === status);
      return acc;
    },
    {} as Record<FileStatus, UploadedFile[]>,
  );
  const activeUploading = uploading.filter((u) => u.phase !== "done");

  // ── Loading state ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Shell activeNav="deals" onNav={handleNav} breadcrumb="Deals" dealName="Loading…">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            color: "var(--fg-3)",
            font: "400 13px/20px var(--font-sans)",
          }}
        >
          Loading…
        </div>
      </Shell>
    );
  }

  if (loadError || !deal) {
    return (
      <Shell activeNav="deals" onNav={handleNav} breadcrumb="Deals" dealName="Error">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            gap: 12,
          }}
        >
          <p style={{ font: "400 13px/20px var(--font-sans)", color: "var(--critical)" }}>
            {loadError ?? "Deal not found."}
          </p>
          <Button variant="secondary" size="sm" onClick={() => router.push("/deals")}>
            ← Back to deals
          </Button>
        </div>
      </Shell>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Shell activeNav="deals" onNav={handleNav} breadcrumb="Deals" dealName={deal.name}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "40px 24px" }}>
        {/* Back link */}
        <button
          type="button"
          onClick={() => router.push("/deals")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            font: "400 12px/1 var(--font-sans)",
            color: "var(--fg-3)",
            background: "none",
            border: "none",
            cursor: "pointer",
            marginBottom: 24,
            padding: 0,
          }}
        >
          <Icon
            name="chev-r"
            size={11}
            style={{ transform: "rotate(180deg)", color: "var(--fg-3)" }}
          />
          Back to deals
        </button>

        {/* ── Deal header ──────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 16,
              marginBottom: 10,
            }}
          >
            <h1
              style={{
                font: "500 24px/32px var(--font-display)",
                letterSpacing: "-0.012em",
                color: "var(--fg-1)",
                margin: 0,
              }}
            >
              {deal.name}
            </h1>
            <Badge tone={deal.status === "active" ? "positive" : "neutral"} dot>
              {deal.status}
            </Badge>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {deal.asset_class && <Badge tone="info">{labelForAssetClass(deal.asset_class)}</Badge>}
            {deal.business_plan && (
              <Badge tone="neutral">{labelForBusinessPlan(deal.business_plan)}</Badge>
            )}
          </div>
        </div>

        {/* ── Latest analysis job banner ───────────────────────────────────── */}
        {latestJob && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "10px 12px",
              background: "var(--surface-1)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              marginBottom: 28,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ font: "400 12px/16px var(--font-sans)", color: "var(--fg-3)" }}>
                Most recent analysis:
              </span>
              <Badge tone={toneForJobStatus(latestJob.status)} dot>
                {latestJob.status}
              </Badge>
            </div>
            <button
              type="button"
              onClick={() => router.push(`/jobs/${latestJob.id}/review`)}
              style={{
                font: "500 12px/1 var(--font-sans)",
                color: "var(--accent)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                flexShrink: 0,
              }}
            >
              View review →
            </button>
          </div>
        )}

        {/* ── Documents section ─────────────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          {/* Section header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <h2
              style={{
                font: "500 13px/20px var(--font-sans)",
                color: "var(--fg-2)",
                margin: 0,
              }}
            >
              Documents
            </h2>
            {files.length > 0 && (
              <span style={{ font: "400 12px/1 var(--font-sans)", color: "var(--fg-3)" }}>
                {files.length} file{files.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Upload zone */}
          <div style={{ marginBottom: 10 }}>
            <UploadZone onFiles={handleFileDrop} disabled={analyzing} />
          </div>

          {/* Rejection notices */}
          {rejections.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              {rejections.map((r, i) => (
                <p
                  key={i}
                  role="alert"
                  style={{
                    font: "400 12px/16px var(--font-sans)",
                    color: "var(--critical)",
                    marginTop: i > 0 ? 3 : 0,
                  }}
                >
                  {r.fileName}: {r.reason}
                </p>
              ))}
            </div>
          )}

          {/* In-flight upload rows */}
          {activeUploading.length > 0 && (
            <ul
              style={{
                listStyle: "none",
                margin: "0 0 10px",
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              {activeUploading.map((u) => (
                <li
                  key={u.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 10px",
                    background: "var(--surface-1)",
                    borderRadius: "var(--radius-sm)",
                    border: `1px solid ${
                      u.phase === "error" ? "rgba(159,55,34,0.35)" : "var(--border-base)"
                    }`,
                  }}
                >
                  <span
                    style={{
                      flex: 1,
                      font: "400 12px/16px var(--font-sans)",
                      color: "var(--fg-1)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      minWidth: 0,
                    }}
                    title={u.file.name}
                  >
                    {u.file.name}
                  </span>
                  <span
                    style={{
                      font: "400 11px/16px var(--font-sans)",
                      color: u.phase === "error" ? "var(--critical)" : "var(--fg-3)",
                      flexShrink: 0,
                    }}
                  >
                    {phaseLabel(u.phase, u.error)}
                  </span>
                  {u.phase === "error" && (
                    <button
                      type="button"
                      onClick={() => dismissUploadError(u.id)}
                      aria-label="Dismiss error"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 18,
                        height: 18,
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--fg-3)",
                        padding: 0,
                        flexShrink: 0,
                        borderRadius: "var(--radius-xs)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "var(--critical)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "var(--fg-3)";
                      }}
                    >
                      <Icon name="x" size={11} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* Grouped document list */}
          {files.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {FILE_STATUS_ORDER.filter((s) => groupedFiles[s].length > 0).map((status) => (
                <div key={status}>
                  {/* Group header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <Badge tone={toneForFileStatus(status)} dot>
                      {labelForStatus(status)}
                    </Badge>
                    <span style={{ font: "400 11px/1 var(--font-sans)", color: "var(--fg-3)" }}>
                      {groupedFiles[status].length}
                    </span>
                  </div>

                  {/* File rows */}
                  <ul
                    style={{
                      listStyle: "none",
                      margin: 0,
                      padding: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: 3,
                    }}
                  >
                    {groupedFiles[status].map((file) => (
                      <li
                        key={file.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "6px 10px",
                          background: "var(--surface-1)",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--border-base)",
                        }}
                      >
                        <Icon
                          name="file"
                          size={13}
                          style={{ color: "var(--fg-3)", flexShrink: 0 }}
                        />
                        <span
                          style={{
                            flex: 1,
                            font: "400 12px/16px var(--font-sans)",
                            color: "var(--fg-1)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            minWidth: 0,
                          }}
                          title={file.file_name}
                        >
                          {file.file_name}
                        </span>
                        <span
                          style={{
                            font: "400 11px/16px var(--font-sans)",
                            color: "var(--fg-3)",
                            flexShrink: 0,
                          }}
                        >
                          {formatBytes(file.file_size_bytes)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            /* Empty state — only shown when nothing is in flight either */
            activeUploading.length === 0 && (
              <p
                style={{
                  font: "400 12px/18px var(--font-sans)",
                  color: "var(--fg-3)",
                  marginTop: 4,
                }}
              >
                No documents yet. Drop files above to get started.
              </p>
            )
          )}
        </div>

        {/* ── Analyze section ───────────────────────────────────────────────── */}
        <div
          style={{
            paddingTop: 20,
            borderTop: "1px solid var(--border-base)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Button
              variant="primary"
              size="md"
              onClick={handleAnalyze}
              disabled={!hasPendingFiles || analyzing}
            >
              {analyzing ? "Starting analysis…" : "Analyze"}
            </Button>

            {!analyzing && !hasPendingFiles && (
              <span style={{ font: "400 12px/18px var(--font-sans)", color: "var(--fg-3)" }}>
                {files.length === 0
                  ? "Upload documents to enable analysis."
                  : "No pending documents to analyze."}
              </span>
            )}
          </div>

          {analyzeError && (
            <div
              role="alert"
              style={{
                padding: "8px 12px",
                background: "var(--critical-tint)",
                border: "1px solid rgba(216,74,41,0.25)",
                borderRadius: "var(--radius-sm)",
                font: "400 13px/20px var(--font-sans)",
                color: "var(--critical)",
              }}
            >
              {analyzeError}
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
