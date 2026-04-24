const ICON_PATHS: Record<string, string> = {
  deals:
    "M5 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16 M15 10h4a1 1 0 0 1 1 1v10 M9 8h2 M9 12h2 M9 16h2 M3 21h18",
  review: "M4 12l5 5L20 6",
  outputs: "M3 17l5-5 4 4 9-9 M15 7h6v6",
  exports:
    "M4 8v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8 M12 16V4 M7 11l5 5 5-5",
  upload:
    "M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2 M12 4v12 M7 9l5-5 5 5",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M20 20l-4-4",
  settings:
    "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M19 12h3 M2 12h3 M12 2v3 M12 19v3 M5.6 5.6l2.1 2.1 M16.3 16.3l2.1 2.1 M5.6 18.4l2.1-2.1 M16.3 7.7l2.1-2.1",
  "chev-d": "M6 9l6 6 6-6",
  "chev-r": "M9 6l6 6-6 6",
  check: "M4 12l5 5L20 6",
  plus: "M12 5v14 M5 12h14",
  file: "M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8l-5-5z M14 3v5h5",
  sheet:
    "M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z M3 9h18 M9 3v18",
  filter: "M3 5h18l-7 9v5l-4 1v-6z",
};

interface IconProps {
  name: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function Icon({ name, size = 16, className, style }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      <path d={ICON_PATHS[name] ?? ""} />
    </svg>
  );
}
