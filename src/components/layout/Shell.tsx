"use client";

import { Icon } from "@/components/ui/Icon";
import { Logomark } from "@/components/ui/Logomark";
import { Button } from "@/components/ui/Button";

type NavId = "deals" | "review" | "outputs" | "exports";

const NAV_ITEMS: { id: NavId; label: string; icon: string }[] = [
  { id: "deals", label: "Deals", icon: "deals" },
  { id: "review", label: "Gate review", icon: "review" },
  { id: "outputs", label: "Model outputs", icon: "outputs" },
  { id: "exports", label: "Exports", icon: "exports" },
];

interface ShellProps {
  activeNav: NavId;
  onNav: (id: NavId) => void;
  /** Deal name shown in the topbar breadcrumb */
  dealName?: string;
  /** Breadcrumb prefix, e.g. "Deals" */
  breadcrumb?: string;
  children: React.ReactNode;
  /** Optional right inspector panel */
  inspector?: React.ReactNode;
}

export function Shell({ activeNav, onNav, dealName, breadcrumb, children, inspector }: ShellProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "var(--surface-0)",
      }}
    >
      {/* Topbar */}
      <div
        style={{
          height: 46,
          borderBottom: "1px solid var(--border)",
          background: "var(--surface-1)",
          display: "flex",
          alignItems: "center",
          padding: "0 14px",
          gap: 14,
          flexShrink: 0,
        }}
      >
        {/* Wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <Logomark size={18} />
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 500,
              fontSize: 14,
              letterSpacing: "-0.015em",
              color: "var(--fg-1)",
            }}
          >
            hermes
          </span>
        </div>

        <div style={{ width: 1, height: 18, background: "var(--border)" }} aria-hidden="true" />

        {/* Breadcrumb */}
        {dealName && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {breadcrumb && (
              <>
                <span
                  style={{
                    font: "500 12px/1 var(--font-sans)",
                    color: "var(--fg-3)",
                  }}
                >
                  {breadcrumb}
                </span>
                <Icon name="chev-r" size={11} style={{ color: "var(--fg-3)" }} />
              </>
            )}
            <span style={{ font: "500 13px/1 var(--font-sans)", color: "var(--fg-1)" }}>
              {dealName}
            </span>
            <Icon name="chev-d" size={12} style={{ color: "var(--fg-3)" }} />
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* Search */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 10px",
            background: "var(--surface-0)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            width: 260,
            cursor: "text",
          }}
        >
          <Icon name="search" size={13} style={{ color: "var(--fg-3)" }} />
          <span style={{ font: "400 12px/1 var(--font-sans)", color: "var(--fg-3)" }}>
            Search deals, fields, docs…
          </span>
          <span
            style={{
              marginLeft: "auto",
              font: "500 10px/1 var(--font-mono)",
              color: "var(--fg-3)",
              padding: "1px 5px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
            }}
          >
            ⌘K
          </span>
        </div>

        <Button variant="secondary" size="sm" icon="upload">
          Upload
        </Button>

        {/* Avatar */}
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: "var(--surface-3)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            font: "600 11px/1 var(--font-sans)",
            color: "var(--fg-1)",
            flexShrink: 0,
          }}
          aria-label="User menu"
        >
          CM
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Sidebar nav */}
        <nav
          style={{
            width: 52,
            borderRight: "1px solid var(--border)",
            background: "var(--surface-1)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: 6,
            gap: 2,
            flexShrink: 0,
          }}
        >
          {NAV_ITEMS.map((item) => {
            const active = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNav(item.id)}
                title={item.label}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "var(--radius-sm)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  background: active ? "var(--accent-tint)" : "transparent",
                  color: active ? "var(--amber-600)" : "var(--fg-3)",
                  border: "none",
                  transition: `background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)`,
                }}
              >
                <Icon name={item.icon} size={17} />
              </button>
            );
          })}

          <div style={{ flex: 1 }} />

          <button
            title="Settings"
            aria-label="Settings"
            style={{
              width: 38,
              height: 38,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--fg-3)",
              marginBottom: 8,
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            <Icon name="settings" size={17} />
          </button>
        </nav>

        {/* Main content */}
        <main style={{ flex: 1, overflow: "auto", minWidth: 0 }}>{children}</main>

        {/* Inspector panel */}
        {inspector && (
          <aside
            style={{
              width: 340,
              borderLeft: "1px solid var(--border)",
              background: "var(--surface-1)",
              overflow: "auto",
              flexShrink: 0,
            }}
          >
            {inspector}
          </aside>
        )}
      </div>
    </div>
  );
}
