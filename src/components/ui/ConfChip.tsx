type ConfLevel = "high" | "med" | "low";

interface ConfChipProps {
  level: ConfLevel;
}

const CONF_STYLES: Record<ConfLevel, { bg: string; fg: string; bd: string; label: string }> = {
  high: {
    bg: "rgba(53,122,80,0.10)",
    fg: "var(--positive)",
    bd: "rgba(53,122,80,0.35)",
    label: "High",
  },
  med: {
    bg: "var(--caution-tint)",
    fg: "var(--caution)",
    bd: "rgba(160,120,40,0.35)",
    label: "Medium",
  },
  low: {
    bg: "var(--critical-tint)",
    fg: "var(--critical)",
    bd: "rgba(159,55,34,0.35)",
    label: "Low",
  },
};

export function ConfChip({ level }: ConfChipProps) {
  const t = CONF_STYLES[level];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: "var(--radius-sm)",
        font: "500 11px/16px var(--font-sans)",
        background: t.bg,
        color: t.fg,
        border: `1px solid ${t.bd}`,
      }}
    >
      {t.label}
    </span>
  );
}
