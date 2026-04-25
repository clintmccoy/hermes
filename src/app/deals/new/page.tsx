"use client";

/**
 * /deals/new — Deal create form with optional document upload tray
 *
 * ## Flow
 * 1. User fills in name, asset_class, business_plan.
 * 2. User optionally stages files in the upload tray (drag-drop or click).
 * 3. On submit:
 *    a. Validate form fields.
 *    b. POST /api/deals → deal_id.
 *    c. For each staged file (parallel):
 *       i.  Read ArrayBuffer → SHA-256 via crypto.subtle.
 *       ii. POST /api/deals/[dealId]/uploads → { upload_url, uploaded_file_id }.
 *       iii.PUT upload_url with raw bytes.
 *    d. Redirect to /deals/[dealId].
 *       If any upload failed, show a soft error for 2 s then redirect anyway.
 *
 * ## Client-side limits (upload tray)
 * - Max file size: 50 MB
 * - Max file count: 10
 * - Accepted types: all (pipeline validates downstream)
 *
 * ## Auth bypass
 * org_id / created_by / uploaded_by sourced from env vars during pre-auth
 * bypass period. TODO(MMC-22): remove once cookie-based auth lands.
 *
 * References:
 * - MMC-58 — this ticket
 * - MMC-52 — deal create form (parent UI)
 * - MMC-48 — upload API (POST /api/deals/[dealId]/uploads)
 * - MMC-22 — auth (pending)
 */

import { useState, useRef, useCallback, useId } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

// ── Constants ──────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
const MAX_FILE_COUNT = 10;

// ── Types ──────────────────────────────────────────────────────────────────────

type AssetClass = "office" | "industrial" | "retail" | "multifamily";
type BusinessPlan = "ground_up" | "acquire_lease_hold";

interface FormState {
  name: string;
  asset_class: AssetClass | "";
  business_plan: BusinessPlan | "";
}

interface FieldErrors {
  name?: string;
  asset_class?: string;
  business_plan?: string;
}

interface StagedFile {
  id: string; // client-only key for React list
  file: File;
}

interface TrayRejection {
  fileName: string;
  reason: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const ASSET_CLASS_OPTIONS: { value: AssetClass; label: string }[] = [
  { value: "office", label: "Office" },
  { value: "industrial", label: "Industrial" },
  { value: "multifamily", label: "Multifamily" },
  { value: "retail", label: "Retail" },
];

const BUSINESS_PLAN_OPTIONS: { value: BusinessPlan; label: string }[] = [
  { value: "ground_up", label: "Ground Up" },
  { value: "acquire_lease_hold", label: "Acquire / Lease / Hold" },
];

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

// ── Validation ─────────────────────────────────────────────────────────────────

function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.name.trim()) errors.name = "Deal name is required.";
  if (!form.asset_class) errors.asset_class = "Asset type is required.";
  if (!form.business_plan) errors.business_plan = "Business plan is required.";
  return errors;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        display: "block",
        font: "500 12px/16px var(--font-sans)",
        color: "var(--fg-2)",
        marginBottom: 6,
      }}
    >
      {children}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      style={{
        font: "400 12px/16px var(--font-sans)",
        color: "var(--critical)",
        marginTop: 5,
      }}
    >
      {message}
    </p>
  );
}

const INPUT_BASE: React.CSSProperties = {
  width: "100%",
  height: 34,
  padding: "0 10px",
  background: "var(--surface-0)",
  border: "1px solid var(--border-strong)",
  borderRadius: "var(--radius-sm)",
  font: "400 13px/1 var(--font-sans)",
  color: "var(--fg-1)",
  outline: "none",
  boxSizing: "border-box",
  transition: `border-color var(--dur-fast) var(--ease-out)`,
};

function TextInput({
  id,
  value,
  onChange,
  placeholder,
  hasError,
  autoFocus,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hasError?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <input
      id={id}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      style={{
        ...INPUT_BASE,
        borderColor: hasError ? "var(--critical)" : undefined,
      }}
      onFocus={(e) => {
        if (!hasError) e.currentTarget.style.borderColor = "var(--border-focus)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = hasError ? "var(--critical)" : "var(--border-strong)";
      }}
    />
  );
}

function SelectInput<T extends string>({
  id,
  value,
  onChange,
  options,
  placeholder,
  hasError,
}: {
  id: string;
  value: T | "";
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  placeholder: string;
  hasError?: boolean;
}) {
  return (
    <div style={{ position: "relative" }}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        style={{
          ...INPUT_BASE,
          appearance: "none",
          paddingRight: 28,
          cursor: "pointer",
          color: value ? "var(--fg-1)" : "var(--fg-3)",
          borderColor: hasError ? "var(--critical)" : undefined,
        }}
        onFocus={(e) => {
          if (!hasError) e.currentTarget.style.borderColor = "var(--border-focus)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = hasError ? "var(--critical)" : "var(--border-strong)";
        }}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span
        style={{
          position: "absolute",
          right: 9,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
          color: "var(--fg-3)",
        }}
        aria-hidden="true"
      >
        <Icon name="chev-d" size={13} />
      </span>
    </div>
  );
}

// ── UploadTray ─────────────────────────────────────────────────────────────────

function UploadTray({
  staged,
  onAdd,
  onRemove,
  rejections,
  disabled,
}: {
  staged: StagedFile[];
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  rejections: TrayRejection[];
  disabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputId = useId();

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      onAdd(Array.from(files));
    },
    [onAdd],
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
    // Reset so the same file can be re-picked after removal
    e.target.value = "";
  }

  const atLimit = staged.length >= MAX_FILE_COUNT;

  return (
    <div>
      {/* Section label */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 8,
        }}
      >
        <span
          style={{
            font: "500 12px/16px var(--font-sans)",
            color: "var(--fg-2)",
          }}
        >
          Documents
        </span>
        <span
          style={{
            font: "400 11px/16px var(--font-sans)",
            color: "var(--fg-3)",
          }}
        >
          optional
        </span>
      </div>

      {/* Drop zone */}
      {!atLimit && (
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
          <span
            style={{
              font: "400 13px/20px var(--font-sans)",
              color: "var(--fg-2)",
            }}
          >
            Drop files here, or{" "}
            <span style={{ color: "var(--accent)", textDecoration: "underline" }}>browse</span>
          </span>
          <span
            style={{
              font: "400 11px/16px var(--font-sans)",
              color: "var(--fg-3)",
            }}
          >
            Any file type · max {formatBytes(MAX_FILE_SIZE_BYTES)} · up to {MAX_FILE_COUNT} files
          </span>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        multiple
        style={{ display: "none" }}
        onChange={handleInputChange}
        disabled={disabled}
      />

      {/* Rejection messages */}
      {rejections.length > 0 && (
        <div style={{ marginTop: 6 }}>
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

      {/* Staged file list */}
      {staged.length > 0 && (
        <ul
          style={{
            listStyle: "none",
            margin: "8px 0 0",
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {staged.map((sf) => (
            <li
              key={sf.id}
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
              {/* File name */}
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
                title={sf.file.name}
              >
                {sf.file.name}
              </span>
              {/* File size */}
              <span
                style={{
                  font: "400 11px/16px var(--font-sans)",
                  color: "var(--fg-3)",
                  flexShrink: 0,
                }}
              >
                {formatBytes(sf.file.size)}
              </span>
              {/* Remove button */}
              <button
                type="button"
                onClick={() => onRemove(sf.id)}
                disabled={disabled}
                aria-label={`Remove ${sf.file.name}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 18,
                  height: 18,
                  background: "none",
                  border: "none",
                  cursor: disabled ? "not-allowed" : "pointer",
                  color: "var(--fg-3)",
                  padding: 0,
                  flexShrink: 0,
                  borderRadius: "var(--radius-xs)",
                  opacity: disabled ? 0.4 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!disabled) e.currentTarget.style.color = "var(--critical)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--fg-3)";
                }}
              >
                <Icon name="x" size={11} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* At-limit notice */}
      {atLimit && (
        <p
          style={{
            font: "400 12px/16px var(--font-sans)",
            color: "var(--fg-3)",
            marginTop: 6,
          }}
        >
          Maximum of {MAX_FILE_COUNT} files reached.
        </p>
      )}
    </div>
  );
}

// ── Submit label helper ────────────────────────────────────────────────────────

type SubmitPhase = "idle" | "creating" | "uploading" | "upload-error";

function submitLabel(phase: SubmitPhase, fileCount: number, failCount: number): string {
  switch (phase) {
    case "creating":
      return "Creating…";
    case "uploading":
      return `Uploading ${fileCount} file${fileCount !== 1 ? "s" : ""}…`;
    case "upload-error":
      return `Deal created — ${failCount} upload${failCount !== 1 ? "s" : ""} failed`;
    default:
      return "Create deal";
  }
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function NewDealPage() {
  const router = useRouter();

  // ── Form state ─────────────────────────────────────────────────────────────
  const [form, setForm] = useState<FormState>({
    name: "",
    asset_class: "",
    business_plan: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  // ── Upload tray state ──────────────────────────────────────────────────────
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [rejections, setRejections] = useState<TrayRejection[]>([]);

  // ── Submit state ───────────────────────────────────────────────────────────
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>("idle");
  const [apiError, setApiError] = useState<string | null>(null);
  const [uploadFailCount, setUploadFailCount] = useState(0);

  const submitting = submitPhase !== "idle";

  // ── Tray handlers ──────────────────────────────────────────────────────────

  function handleAddFiles(files: File[]) {
    const newRejections: TrayRejection[] = [];
    const accepted: StagedFile[] = [];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        newRejections.push({
          fileName: file.name,
          reason: `exceeds ${formatBytes(MAX_FILE_SIZE_BYTES)} limit`,
        });
        continue;
      }
      if (staged.length + accepted.length >= MAX_FILE_COUNT) {
        newRejections.push({
          fileName: file.name,
          reason: `limit of ${MAX_FILE_COUNT} files reached`,
        });
        continue;
      }
      // Deduplicate by name+size (basic guard against double-drop)
      const alreadyStaged = staged.some(
        (sf) => sf.file.name === file.name && sf.file.size === file.size,
      );
      if (alreadyStaged) continue;

      accepted.push({ id: crypto.randomUUID(), file });
    }

    setRejections(newRejections);
    if (accepted.length > 0) {
      setStaged((prev) => [...prev, ...accepted]);
    }
  }

  function handleRemoveFile(id: string) {
    setStaged((prev) => prev.filter((sf) => sf.id !== id));
    setRejections([]);
  }

  // ── Form field helper ──────────────────────────────────────────────────────

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  // ── Upload a single file ───────────────────────────────────────────────────

  async function uploadFile(sf: StagedFile, dealId: string): Promise<boolean> {
    try {
      // 1. Read bytes + compute SHA-256
      const buffer = await sf.file.arrayBuffer();
      const hash = await sha256Hex(buffer);

      // 2. Pre-create uploaded_files row + get signed URL
      const metaRes = await fetch(`/api/deals/${dealId}/uploads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_name: sf.file.name,
          mime_type: sf.file.type || "application/octet-stream",
          file_size_bytes: sf.file.size,
          sha256_hash: hash,
          // Pre-auth bypass (MMC-22): remove once auth lands
          uploaded_by: process.env.NEXT_PUBLIC_DEV_USER_ID,
        }),
      });

      if (!metaRes.ok) return false;

      const { upload_url } = await metaRes.json();

      // 3. PUT bytes directly to Supabase Storage
      const putRes = await fetch(upload_url, {
        method: "PUT",
        headers: { "Content-Type": sf.file.type || "application/octet-stream" },
        body: buffer,
      });

      return putRes.ok;
    } catch {
      return false;
    }
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);
    setRejections([]);

    // 1. Validate form fields
    const fieldErrors = validate(form);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    // 2. Create deal
    setSubmitPhase("creating");
    let dealId: string;
    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          asset_class: form.asset_class,
          business_plan: form.business_plan,
          // Pre-auth bypass (MMC-22)
          org_id: process.env.NEXT_PUBLIC_DEV_ORG_ID,
          created_by: process.env.NEXT_PUBLIC_DEV_USER_ID,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setApiError(body.error ?? `Server error (${res.status})`);
        setSubmitPhase("idle");
        return;
      }

      ({ deal_id: dealId } = await res.json());
    } catch {
      setApiError("Network error — please try again.");
      setSubmitPhase("idle");
      return;
    }

    // 3. Upload staged files (if any)
    if (staged.length > 0) {
      setSubmitPhase("uploading");
      const results = await Promise.all(staged.map((sf) => uploadFile(sf, dealId)));
      const failCount = results.filter((ok) => !ok).length;

      if (failCount > 0) {
        setUploadFailCount(failCount);
        setSubmitPhase("upload-error");
        // Non-blocking: deal exists. Redirect after 2 s.
        setTimeout(() => router.push(`/deals/${dealId}`), 2000);
        return;
      }
    }

    // 4. Redirect
    router.push(`/deals/${dealId}`);
  }

  function handleNav(id: string) {
    const routes: Record<string, string> = {
      deals: "/deals",
      review: "/jobs",
      outputs: "/deals",
      exports: "/deals",
    };
    router.push(routes[id] ?? "/deals");
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Shell activeNav="deals" onNav={handleNav} breadcrumb="Deals" dealName="New deal">
      <div
        style={{
          maxWidth: 520,
          margin: "0 auto",
          padding: "40px 24px",
        }}
      >
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

        {/* Header */}
        <h1
          style={{
            font: "500 24px/32px var(--font-display)",
            letterSpacing: "-0.012em",
            color: "var(--fg-1)",
            marginBottom: 8,
          }}
        >
          New deal
        </h1>
        <p
          style={{
            font: "400 13px/20px var(--font-sans)",
            color: "var(--fg-3)",
            marginBottom: 32,
          }}
        >
          Enter the basics and optionally stage documents for upload.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Deal name */}
            <div>
              <FieldLabel htmlFor="name">Deal name</FieldLabel>
              <TextInput
                id="name"
                value={form.name}
                onChange={(v) => set("name", v)}
                placeholder="e.g. 550 Madison Ave"
                hasError={!!errors.name}
                autoFocus
              />
              <FieldError message={errors.name} />
            </div>

            {/* Asset type */}
            <div>
              <FieldLabel htmlFor="asset_class">Asset type</FieldLabel>
              <SelectInput
                id="asset_class"
                value={form.asset_class}
                onChange={(v) => set("asset_class", v)}
                options={ASSET_CLASS_OPTIONS}
                placeholder="Select asset type…"
                hasError={!!errors.asset_class}
              />
              <FieldError message={errors.asset_class} />
            </div>

            {/* Business plan */}
            <div>
              <FieldLabel htmlFor="business_plan">Business plan</FieldLabel>
              <SelectInput
                id="business_plan"
                value={form.business_plan}
                onChange={(v) => set("business_plan", v)}
                options={BUSINESS_PLAN_OPTIONS}
                placeholder="Select business plan…"
                hasError={!!errors.business_plan}
              />
              <FieldError message={errors.business_plan} />
            </div>

            {/* Upload tray */}
            <div
              style={{
                paddingTop: 4,
                borderTop: "1px solid var(--border-base)",
              }}
            >
              <UploadTray
                staged={staged}
                onAdd={handleAddFiles}
                onRemove={handleRemoveFile}
                rejections={rejections}
                disabled={submitting}
              />
            </div>

            {/* API error */}
            {apiError && (
              <div
                role="alert"
                style={{
                  padding: "10px 12px",
                  background: "var(--critical-tint)",
                  border: "1px solid rgba(216,74,41,0.25)",
                  borderRadius: "var(--radius-sm)",
                  font: "400 13px/20px var(--font-sans)",
                  color: "var(--critical)",
                }}
              >
                {apiError}
              </div>
            )}

            {/* Actions */}
            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
                marginTop: 8,
              }}
            >
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => router.push("/deals")}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={submitting}
              >
                {submitLabel(submitPhase, staged.length, uploadFailCount)}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Shell>
  );
}
