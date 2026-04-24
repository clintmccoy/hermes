import { Icon } from "./Icon";

interface SourceChipProps {
  kind?: "pdf" | "xlsx";
  name: string;
  page?: number;
}

export function SourceChip({ kind = "pdf", name, page }: SourceChipProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 8px 3px 6px",
        borderRadius: "var(--radius-sm)",
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        font: "500 11px/14px var(--font-sans)",
        color: "var(--fg-2)",
      }}
    >
      <Icon name={kind === "xlsx" ? "sheet" : "file"} size={12} style={{ opacity: 0.65 }} />
      <span style={{ color: "var(--fg-1)" }}>{name}</span>
      {page && (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--fg-3)",
            paddingLeft: 6,
            borderLeft: "1px solid var(--border)",
            marginLeft: 2,
          }}
        >
          p.{page}
        </span>
      )}
    </span>
  );
}

export function NoSource() {
  return (
    <span
      style={{
        display: "inline-flex",
        padding: "3px 8px",
        borderRadius: "var(--radius-sm)",
        border: "1px dashed var(--border-strong)",
        font: "500 11px/14px var(--font-sans)",
        color: "var(--fg-3)",
        fontStyle: "italic",
      }}
    >
      no source
    </span>
  );
}
