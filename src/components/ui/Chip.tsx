interface ChipProps {
  on?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function Chip({ on, onClick, children, className }: ChipProps) {
  return (
    <button
      onClick={onClick}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "0 10px",
        height: 26,
        border: `1px solid ${on ? "rgba(177,94,24,0.5)" : "var(--border-strong)"}`,
        borderRadius: 13,
        font: "500 12px/1 var(--font-sans)",
        color: on ? "var(--amber-600)" : "var(--fg-1)",
        background: on ? "var(--accent-tint)" : "var(--surface-1)",
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: `background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)`,
      }}
    >
      {children}
    </button>
  );
}
