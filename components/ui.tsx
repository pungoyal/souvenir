// Furniture shared across pages, so the same thing looks the same everywhere.

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
