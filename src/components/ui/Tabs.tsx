export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: (TabItem | string)[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, active, onChange, className }: TabsProps) {
  return (
    <div
      className={className}
      style={{ display: "flex", borderBottom: "1px solid var(--border)" }}
    >
      {tabs.map((t) => {
        const id = typeof t === "string" ? t : t.id;
        const label = typeof t === "string" ? t : t.label;
        const count = typeof t === "object" ? t.count : undefined;
        const on = active === id;

        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "11px 16px",
              font: "500 13px/1 var(--font-sans)",
              color: on ? "var(--fg-1)" : "var(--fg-2)",
              cursor: "pointer",
              background: "transparent",
              border: "none",
              borderBottom: on
                ? "2px solid var(--accent)"
                : "2px solid transparent",
              marginBottom: -1,
              transition: `color var(--dur-fast) var(--ease-out)`,
            }}
          >
            {label}
            {count !== undefined && (
              <span
                style={{
                  font: "500 11px/1 var(--font-mono)",
                  color: on ? "var(--amber-600)" : "var(--fg-3)",
                  padding: "2px 6px",
                  background: on ? "var(--accent-tint)" : "var(--surface-2)",
                  border: on
                    ? "1px solid rgba(177,94,24,0.35)"
                    : "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
