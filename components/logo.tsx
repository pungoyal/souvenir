/**
 * The Souvenir mark: a postage stamp (the unit) on night ink. Perforations
 * are ink-colored dots punched along the stamp's edge; inside, the sun is marigold
 * burnt orange and the mountains YES ultramarine.
 * Kept in sync with app/icon.svg, the favicon.
 */
export function Logo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Souvenir"
      className={className}
    >
      <rect width="64" height="64" rx="14" fill="#12141a" />
      <rect x="12" y="12" width="40" height="40" rx="2.5" fill="#ffffff" />
      <rect
        x="12"
        y="12"
        width="40"
        height="40"
        rx="2.5"
        fill="none"
        stroke="#12141a"
        strokeWidth="4"
        strokeDasharray="0 8"
        strokeLinecap="round"
      />
      <circle cx="40.5" cy="26.5" r="5" fill="#ffc229" />
      <path d="M16.5 45.5 L27 30 L33.5 39 L38 33.5 L47.5 45.5 Z" fill="#2456e6" />
    </svg>
  );
}
