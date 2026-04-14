"use client";

/**
 * GateReview — client component for the stub gate review page.
 *
 * Handles the interactive parts: override inputs, confirm/skip buttons,
 * and the fetch calls to the gate API routes.
 *
 * This is intentionally minimal — a functional stub, not a designed surface.
 * The real analyst review UI is a v1 deliverable.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ExtractedInputRow {
  id: string;
  field_name: string;
  extracted_value: unknown;
  unit: string | null;
  confidence_score: number | null;
  source_page_number: number | null;
  source_text_excerpt: string | null;
  advisor_invoked: boolean;
  user_override_value: unknown;
}

export interface KpiRow {
  unlevered_irr_pct: number | null;
  levered_irr_pct: number | null;
  equity_multiple: number | null;
  going_in_cap_rate_pct: number | null;
  exit_cap_rate_pct: number | null;
  noi_year1: number | null;
  gross_sale_price: number | null;
}

interface Props {
  gateId: string;
  gateName: string;
  isSkippable: boolean;
  // post_extraction gate data
  extractedInputs?: ExtractedInputRow[];
  // post_construction gate data
  kpis?: KpiRow | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatValue(value: unknown, unit: string | null): string {
  if (value === null || value === undefined) return "—";
  const str = typeof value === "object" ? JSON.stringify(value) : String(value);
  return unit ? `${str} ${unit}` : str;
}

function confidenceBadge(score: number | null): string {
  if (score === null) return "—";
  const pct = Math.round(score * 100);
  if (pct >= 80) return `${pct}% ✓`;
  if (pct >= 60) return `${pct}% ⚠`;
  return `${pct}% ✗`;
}

// ── Post-extraction review ────────────────────────────────────────────────────

function ExtractionTable({
  inputs,
  overrides,
  onOverrideChange,
}: {
  inputs: ExtractedInputRow[];
  overrides: Record<string, string>;
  onOverrideChange: (id: string, value: string) => void;
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ background: "#f5f5f5", textAlign: "left" }}>
            <th style={th}>Field</th>
            <th style={th}>Extracted value</th>
            <th style={th}>Confidence</th>
            <th style={th}>Source (page)</th>
            <th style={th}>Override</th>
          </tr>
        </thead>
        <tbody>
          {inputs.map((row) => (
            <tr key={row.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={td}>
                <code style={{ fontSize: 12 }}>{row.field_name}</code>
                {row.advisor_invoked && (
                  <span
                    style={{ marginLeft: 6, fontSize: 11, color: "#7c3aed" }}
                    title="Advisor was consulted on this field"
                  >
                    [advisor]
                  </span>
                )}
              </td>
              <td style={td}>
                <span title={row.source_text_excerpt ?? undefined}>
                  {formatValue(row.extracted_value, row.unit)}
                </span>
              </td>
              <td style={{ ...td, color: confidenceColor(row.confidence_score) }}>
                {confidenceBadge(row.confidence_score)}
              </td>
              <td style={{ ...td, color: "#666" }}>
                {row.source_page_number != null ? `p.${row.source_page_number}` : "—"}
              </td>
              <td style={td}>
                <input
                  type="text"
                  placeholder={
                    row.user_override_value != null
                      ? formatValue(row.user_override_value, row.unit)
                      : "Leave blank to keep extracted value"
                  }
                  value={overrides[row.id] ?? ""}
                  onChange={(e) => onOverrideChange(row.id, e.target.value)}
                  style={{
                    width: "100%",
                    padding: "4px 6px",
                    border: "1px solid #ccc",
                    borderRadius: 4,
                    fontSize: 13,
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function confidenceColor(score: number | null): string {
  if (score === null) return "#999";
  if (score >= 0.8) return "#16a34a";
  if (score >= 0.6) return "#ca8a04";
  return "#dc2626";
}

// ── Post-construction review ──────────────────────────────────────────────────

function KpiTable({ kpis }: { kpis: KpiRow }) {
  const rows: [string, number | null, string][] = [
    ["Unlevered IRR", kpis.unlevered_irr_pct, "%"],
    ["Levered IRR", kpis.levered_irr_pct, "%"],
    ["Equity Multiple", kpis.equity_multiple, "×"],
    ["Going-In Cap Rate", kpis.going_in_cap_rate_pct, "%"],
    ["Exit Cap Rate", kpis.exit_cap_rate_pct, "%"],
    ["NOI Year 1", kpis.noi_year1, "USD"],
    ["Gross Sale Price", kpis.gross_sale_price, "USD"],
  ];

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
      <thead>
        <tr style={{ background: "#f5f5f5" }}>
          <th style={th}>KPI</th>
          <th style={{ ...th, textAlign: "right" }}>Value</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, value, unit]) => (
          <tr key={label} style={{ borderBottom: "1px solid #eee" }}>
            <td style={td}>{label}</td>
            <td style={{ ...td, textAlign: "right" }}>
              {value != null ? `${value.toFixed(2)} ${unit}` : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function GateReview({ gateId, gateName, isSkippable, extractedInputs, kpis }: Props) {
  const router = useRouter();
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<"confirm" | "skip" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleOverrideChange(id: string, value: string) {
    setOverrides((prev) => ({ ...prev, [id]: value }));
  }

  async function handleConfirm() {
    setLoading("confirm");
    setError(null);

    // Build overrides payload — only entries with a non-empty value
    const overrideEntries = Object.entries(overrides)
      .filter(([, v]) => v.trim() !== "")
      .map(([extractedInputId, value]) => ({ extractedInputId, value }));

    try {
      const res = await fetch(`/api/gates/${gateId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrides: overrideEntries }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      // Reload page — the pipeline will resume; job status will update on next visit
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirm failed");
    } finally {
      setLoading(null);
    }
  }

  async function handleSkip() {
    setLoading("skip");
    setError(null);

    try {
      const res = await fetch(`/api/gates/${gateId}/skip`, { method: "POST" });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Skip failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div
      style={{ fontFamily: "system-ui, sans-serif", maxWidth: 960, margin: "0 auto", padding: 32 }}
    >
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Gate review</h1>
      <p style={{ color: "#666", marginBottom: 24, fontSize: 14 }}>
        Checkpoint: <code>{gateName}</code>
      </p>

      {gateName === "post_extraction" && extractedInputs && (
        <>
          <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 12 }}>
            Extracted inputs ({extractedInputs.length} fields)
          </h2>
          <p style={{ color: "#666", fontSize: 13, marginBottom: 16 }}>
            Review the extracted values. Enter an override in the last column to correct any field
            before model construction runs. Leave blank to accept the extracted value. Hover a value
            to see the source excerpt.
          </p>
          <ExtractionTable
            inputs={extractedInputs}
            overrides={overrides}
            onOverrideChange={handleOverrideChange}
          />
        </>
      )}

      {gateName === "post_construction" && (
        <>
          <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 12 }}>Model KPIs</h2>
          <p style={{ color: "#666", fontSize: 13, marginBottom: 16 }}>
            Review the model outputs before the result is version-locked and credits are deducted.
          </p>
          {kpis ? (
            <KpiTable kpis={kpis} />
          ) : (
            <p style={{ color: "#dc2626" }}>KPI data not available.</p>
          )}
        </>
      )}

      {/* Unknown checkpoint — show gate name, let analyst decide */}
      {gateName !== "post_extraction" && gateName !== "post_construction" && (
        <p style={{ color: "#666", fontSize: 14 }}>
          Gate <code>{gateName}</code> — no custom review UI for this checkpoint yet. Confirm or
          skip to continue.
        </p>
      )}

      {error && <p style={{ color: "#dc2626", marginTop: 16, fontSize: 14 }}>Error: {error}</p>}

      <div style={{ marginTop: 32, display: "flex", gap: 12 }}>
        <button onClick={handleConfirm} disabled={loading !== null} style={primaryBtn}>
          {loading === "confirm" ? "Confirming…" : "Confirm"}
        </button>

        {isSkippable && (
          <button onClick={handleSkip} disabled={loading !== null} style={secondaryBtn}>
            {loading === "skip" ? "Skipping…" : "Skip"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Inline styles (stub — no Tailwind here intentionally) ────────────────────

const th: React.CSSProperties = {
  padding: "8px 12px",
  fontWeight: 600,
  fontSize: 13,
  borderBottom: "1px solid #ddd",
};

const td: React.CSSProperties = {
  padding: "8px 12px",
  verticalAlign: "top",
};

const primaryBtn: React.CSSProperties = {
  padding: "10px 24px",
  background: "#111",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 500,
};

const secondaryBtn: React.CSSProperties = {
  padding: "10px 24px",
  background: "#fff",
  color: "#111",
  border: "1px solid #ccc",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 14,
};
