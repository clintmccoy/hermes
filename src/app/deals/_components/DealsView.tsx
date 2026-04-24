"use client";

import { useRouter } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import type { BadgeTone } from "./types";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Deal {
  id: string;
  name: string;
  asset_class: string;
  business_plan: string | null;
  status: string;
  updated_at: string;
}

interface DealsViewProps {
  deals: Deal[];
}

// ── Display helpers ────────────────────────────────────────────────────────────

const ASSET_CLASS_LABELS: Record<string, string> = {
  office: "Office",
  industrial: "Industrial",
  retail: "Retail",
  multifamily: "Multifamily",
};

const BUSINESS_PLAN_LABELS: Record<string, string> = {
  ground_up: "Ground Up",
  acquire_lease_hold: "Acquire / Lease / Hold",
};

const STATUS_TONE: Record<string, BadgeTone> = {
  drafting: "caution",
  active: "positive",
  closed: "neutral",
  archived: "neutral",
};

function formatUpdatedAt(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = diffMs / (1000 * 60 * 60);

  if (diffH < 1) return "Just now";
  if (diffH < 24) return `${Math.floor(diffH)}h ago`;
  if (diffH < 48) return "Yesterday";

  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        color: "var(--fg-3)",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "var(--radius-md)",
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--fg-3)",
        }}
      >
        <Icon name="deals" size={22} />
      </div>
      <div style={{ textAlign: "center" }}>
        <p
          style={{
            font: "500 14px/22px var(--font-sans)",
            color: "var(--fg-2)",
            marginBottom: 4,
          }}
        >
          No deals yet
        </p>
        <p style={{ font: "400 13px/20px var(--font-sans)", color: "var(--fg-3)" }}>
          Create your first deal to get started.
        </p>
      </div>
      <Button variant="primary" size="md" icon="plus" onClick={onNew}>
        New deal
      </Button>
    </div>
  );
}

// ── Deals table ────────────────────────────────────────────────────────────────

const COL_WIDTHS = {
  name: "auto",
  assetClass: "160px",
  businessPlan: "200px",
  status: "110px",
  updated: "100px",
};

function DealsTable({ deals, onRowClick }: { deals: Deal[]; onRowClick: (id: string) => void }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          font: "400 13px/20px var(--font-sans)",
        }}
      >
        <thead>
          <tr
            style={{
              borderBottom: "1px solid var(--border)",
            }}
          >
            {(
              [
                ["Deal", COL_WIDTHS.name],
                ["Asset class", COL_WIDTHS.assetClass],
                ["Business plan", COL_WIDTHS.businessPlan],
                ["Status", COL_WIDTHS.status],
                ["Updated", COL_WIDTHS.updated],
              ] as [string, string][]
            ).map(([label, width]) => (
              <th
                key={label}
                style={{
                  padding: "8px 12px",
                  textAlign: "left",
                  font: "600 11px/14px var(--font-sans)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--fg-3)",
                  width,
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {deals.map((deal) => (
            <tr
              key={deal.id}
              onClick={() => onRowClick(deal.id)}
              style={{
                borderBottom: "1px solid var(--border)",
                cursor: "pointer",
                transition: `background var(--dur-fast) var(--ease-out)`,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLTableRowElement).style.background = "var(--surface-2)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLTableRowElement).style.background = "transparent";
              }}
            >
              <td style={{ padding: "10px 12px" }}>
                <span
                  style={{
                    font: "500 13px/20px var(--font-sans)",
                    color: "var(--fg-1)",
                  }}
                >
                  {deal.name}
                </span>
              </td>
              <td style={{ padding: "10px 12px", color: "var(--fg-2)" }}>
                {ASSET_CLASS_LABELS[deal.asset_class] ?? deal.asset_class}
              </td>
              <td style={{ padding: "10px 12px", color: "var(--fg-2)" }}>
                {deal.business_plan
                  ? (BUSINESS_PLAN_LABELS[deal.business_plan] ?? deal.business_plan)
                  : "—"}
              </td>
              <td style={{ padding: "10px 12px" }}>
                <Badge tone={STATUS_TONE[deal.status] ?? "neutral"} dot>
                  {deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}
                </Badge>
              </td>
              <td
                style={{
                  padding: "10px 12px",
                  color: "var(--fg-3)",
                  font: "400 12px/18px var(--font-sans)",
                  whiteSpace: "nowrap",
                }}
              >
                {formatUpdatedAt(deal.updated_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main view ──────────────────────────────────────────────────────────────────

export function DealsView({ deals }: DealsViewProps) {
  const router = useRouter();

  function handleNav(id: string) {
    const routes: Record<string, string> = {
      deals: "/deals",
      review: "/jobs",
      outputs: "/deals",
      exports: "/deals",
    };
    router.push(routes[id] ?? "/deals");
  }

  function goToNew() {
    router.push("/deals/new");
  }

  return (
    <Shell activeNav="deals" onNav={handleNav}>
      {/* Page header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 24px 16px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <h1
          style={{
            font: "500 17px/26px var(--font-display)",
            color: "var(--fg-1)",
            letterSpacing: "-0.01em",
          }}
        >
          Deals
        </h1>
        <Button variant="primary" size="sm" icon="plus" onClick={goToNew}>
          New deal
        </Button>
      </div>

      {/* Content */}
      {deals.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "calc(100% - 63px)",
          }}
        >
          <EmptyState onNew={goToNew} />
        </div>
      ) : (
        <DealsTable deals={deals} onRowClick={(id) => router.push(`/deals/${id}`)} />
      )}
    </Shell>
  );
}
