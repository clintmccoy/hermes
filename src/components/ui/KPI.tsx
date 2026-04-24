interface KPIProps {
  eyebrow: string;
  value: string | number;
  unit?: string;
  sub?: string;
  /** Positive = up (green chip), negative = down (red chip) */
  delta?: number;
  /** Renders with amber gradient — use for the primary/hero metric */
  hero?: boolean;
}

export function KPI({ eyebrow, value, unit, sub, delta, hero }: KPIProps) {
  return (
    <div
      style={{
        background: hero
          ? "linear-gradient(180deg, var(--accent-tint), rgba(208,115,30,0.02) 60%)"
          : "var(--surface-1)",
        border: hero ? "1px solid rgba(208,115,30,0.35)" : "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        minHeight: 90,
      }}
    >
      <span
        style={{
          font: "600 10px/14px var(--font-sans)",
          letterSpacing: ".08em",
          textTransform: "uppercase",
          color: "var(--fg-3)",
        }}
      >
        {eyebrow}
      </span>

      <span
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: 28,
          lineHeight: "32px",
          letterSpacing: "-0.02em",
          color: "var(--amber-600)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
        {unit && (
          <span
            style={{
              fontSize: 16,
              color: "var(--fg-3)",
              fontWeight: 500,
              marginLeft: 2,
            }}
          >
            {unit}
          </span>
        )}
      </span>

      {sub && (
        <span
          style={{
            font: "400 11px/14px var(--font-sans)",
            color: "var(--fg-3)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: "auto",
          }}
        >
          {delta !== undefined && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10.5,
                padding: "1px 5px",
                borderRadius: 2,
                color: delta > 0 ? "var(--positive)" : "var(--critical)",
                background: delta > 0 ? "var(--positive-tint)" : "var(--critical-tint)",
              }}
            >
              {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}
            </span>
          )}
          {sub}
        </span>
      )}
    </div>
  );
}
