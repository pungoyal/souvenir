import type { Side } from "@/lib/engine";

export function SideChip({ side, small }: { side: Side; small?: boolean }) {
  const cls = side === "yes" ? "bg-yes-tint text-yes-deep" : "bg-no-tint text-no-deep";
  return (
    <span
      className={`inline-flex items-center rounded-md font-bold capitalize ${cls} ${
        small ? "px-1.5 text-xs" : "px-2 py-0.5 text-sm"
      }`}
    >
      {side}
    </span>
  );
}

export function Verdict({ status }: { status: Side | "refunded" }) {
  const tone =
    status === "yes" ? "text-yes-deep" : status === "no" ? "text-no-deep" : "text-soft rotate-3";
  return <span className={`inked ${tone}`}>{status === "refunded" ? "Void" : status}</span>;
}

export function StatusChip({ status }: { status: "open" | Side | "refunded" }) {
  if (status === "open") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-sun-tint px-2 py-0.5 text-sm font-bold text-sun-deep">
        <span className="h-1.5 w-1.5 rounded-full bg-sun-deep" />
        Open
      </span>
    );
  }
  return <Verdict status={status} />;
}
