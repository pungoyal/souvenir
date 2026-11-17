import { useId } from "react";

/** Decoration, in the text colour: everything it says is also said in words beside it. */
export function Postmark({
  place,
  year,
  top,
  bottom,
  size = 84,
  className = "",
}: {
  place: string;
  year: string;
  top: string;
  bottom?: string;
  size?: number;
  className?: string;
}) {
  const id = useId();
  // A short place goes round twice, so the rim is never stretched thin.
  const once = `${place} · ${year} · `.toUpperCase();
  const rim = (once.length < 18 ? once + once : once).trimEnd();
  return (
    <svg
      role="img"
      aria-label={`Postmark: ${place}, ${year}`}
      width={size}
      height={size}
      viewBox="0 0 84 84"
      className={`shrink-0 -rotate-12 ${className}`}
    >
      <defs>
        <path id={id} d="M42 42 m-30 0 a30 30 0 1 1 60 0 a30 30 0 1 1 -60 0" />
      </defs>
      <circle cx="42" cy="42" r="39" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle
        cx="42"
        cy="42"
        r="23"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="2 3"
      />
      <text fontFamily="var(--font-display)" fontSize="9" fontWeight="700" fill="currentColor">
        <textPath href={`#${id}`} textLength="182" lengthAdjust="spacing">
          {rim}
        </textPath>
      </text>
      <text
        x="42"
        y={bottom ? 41 : 46}
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontSize={top.length > 5 ? 10 : 13}
        fontWeight="700"
        fill="currentColor"
      >
        {top.toUpperCase()}
      </text>
      {bottom && (
        <text
          x="42"
          y="53"
          textAnchor="middle"
          fontFamily="var(--font-display)"
          fontSize="9"
          fontWeight="700"
          letterSpacing="1"
          fill="currentColor"
        >
          {bottom.toUpperCase()}
        </text>
      )}
    </svg>
  );
}
