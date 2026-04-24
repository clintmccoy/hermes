interface LogomarkProps {
  size?: number;
  color?: string;
  className?: string;
}

export function Logomark({ size = 18, color = "var(--accent)", className }: LogomarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      style={{ flexShrink: 0 }}
      aria-label="Hermes"
    >
      <path
        d="M4 4 V36 M4 4 H12 M4 36 H12 M36 4 V36 M28 4 H36 M28 36 H36 M4 20 H36"
        stroke={color}
        strokeWidth="2.5"
      />
    </svg>
  );
}
