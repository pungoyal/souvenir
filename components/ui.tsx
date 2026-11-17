// Furniture shared across pages, so the same thing looks the same everywhere.

import Link from "next/link";

export function tone(deltaC: number): string {
  return deltaC > 0 ? "text-up" : deltaC < 0 ? "text-no-deep" : "text-soft";
}

export function EmptyState({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="card px-6 py-8 text-center">
      <p className="display text-xl font-bold">{title}</p>
      {sub && <p className="mt-1 text-sm text-soft">{sub}</p>}
    </div>
  );
}

export function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="card px-4 py-3">
      <p className="eyebrow">{label}</p>
      <p className="mono mt-0.5 truncate text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-soft">{sub}</p>}
    </div>
  );
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex min-h-11 items-center text-sm text-soft">
      ← {children}
    </Link>
  );
}

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function Chevron({ down = false }: { down?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      {...stroke}
      className="shrink-0"
      width="18"
      height="18"
      viewBox="0 0 18 18"
    >
      <path d={down ? "M5 7l4 4 4-4" : "M7 4l5 5-5 5"} />
    </svg>
  );
}

export function MicIcon({ size = 20 }: { size?: number }) {
  return (
    <svg aria-hidden="true" {...stroke} width={size} height={size} viewBox="0 0 20 20">
      <rect x="7" y="2" width="6" height="10" rx="3" />
      <path d="M4 10a6 6 0 0012 0M10 16v2" />
    </svg>
  );
}
