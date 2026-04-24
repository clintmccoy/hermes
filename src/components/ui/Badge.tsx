type BadgeTone =
  | "neutral"
  | "accent"
  | "positive"
  | "caution"
  | "critical"
  | "info";

interface BadgeProps {
  tone?: BadgeTone;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

const TONE_STYLES: Record<
  BadgeTone,
  { bg: string; fg: string; bd: string }
> = {
  neutral: { bg: "var(--surface-3)", fg: "var(--fg-2)", bd: "var(--border)" },
  accent: {
    bg: "var(--accent-tint)",
    fg: "var(--amber-600)",
    bd: "rgba(177,94,24,0.35)",
  },
  positive: {
    bg: "var(--positive-tint)",
    fg: "var(--positive)",
    bd: "rgba(53,122,80,0.35)",
  },
  caution: {
    bg: "var(--caution-tint)",
    fg: "var(--caution)",
    bd: "rgba(160,120,40,0.35)",
  },
  critical: {
    bg: "var(--critical-tint)",
    fg: "var(--critical)",
    bd: "rgba(159,55,34,0.35)",
  },
  info: {
    bg: "var(--info-tint)",
    fg: "var(--info)",
    bd: "rgba(74,98,120,0.35)",
  },
};

export function Badge({ tone = "neutral", dot, children, className }: BadgeProps) {
  const t = TONE_STYLES[tone];
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "2px 8px",
        borderRadius: "var(--radius-sm)",
        background: t.bg,
        color: t.fg,
        border: `1px solid ${t.bd}`,
        font: "500 11px/16px var(--font-sans)",
        whiteSpace: "nowrap",
      }}
    >
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "currentColor",
            opacity: 0.9,
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </span>
  );
}
