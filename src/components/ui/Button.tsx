import { Icon } from "./Icon";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  children?: React.ReactNode;
}

const VARIANT_STYLES: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: "var(--accent)",
    color: "var(--accent-fg)",
    fontWeight: 600,
    border: "1px solid transparent",
  },
  secondary: {
    background: "var(--surface-1)",
    color: "var(--fg-1)",
    border: "1px solid var(--border-strong)",
  },
  ghost: {
    background: "transparent",
    color: "var(--fg-2)",
    border: "1px solid transparent",
  },
};

const SIZE_HEIGHT: Record<ButtonSize, number> = { sm: 26, md: 30, lg: 36 };
const SIZE_PADDING: Record<ButtonSize, string> = {
  sm: "0 10px",
  md: "0 12px",
  lg: "0 16px",
};

export function Button({
  variant = "primary",
  size = "md",
  icon,
  children,
  style,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        height: SIZE_HEIGHT[size],
        padding: SIZE_PADDING[size],
        borderRadius: "var(--radius-sm)",
        font: `500 13px/1 var(--font-sans)`,
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: `background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)`,
        ...VARIANT_STYLES[variant],
        ...style,
      }}
    >
      {icon && <Icon name={icon} size={14} />}
      {children}
    </button>
  );
}
