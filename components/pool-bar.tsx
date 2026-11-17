import { lingoOf } from "@/lib/lingo";
import { fmtPies } from "@/lib/pies";
import type { ParticipantPosition } from "@/lib/views";

/**
 * The signature element: a tug-of-war between YES and NO. Width is share of committed stamps —
 * the group's revealed belief, with no odds or probabilities calculated for anyone — and under
 * each end, who is pulling on it.
 */
export function PoolBar({
  yesPoolC,
  noPoolC,
  participants = [],
  meId,
  lingo = "english",
}: {
  yesPoolC: number;
  noPoolC: number;
  participants?: ParticipantPosition[];
  meId?: string;
  lingo?: string;
}) {
  const t = lingoOf(lingo);
  const total = yesPoolC + noPoolC;
  if (total === 0) {
    return (
      <div>
        <div className="h-2.5 rounded-full border border-dashed border-line" />
        <p className="mt-1.5 text-[13px] text-soft">{t.poolEmpty}</p>
      </div>
    );
  }
  const names = (side: "yes" | "no") =>
    participants
      .filter((p) => p.side === side)
      .map((p) => (p.member.id === meId ? "you" : p.member.name))
      .join(", ");
  const yes = names("yes");
  const no = names("no");
  return (
    <div>
      <div
        className="flex h-2.5 gap-0.5 overflow-hidden rounded-full"
        role="img"
        aria-label={`${fmtPies(yesPoolC)} stamps on yes, ${fmtPies(noPoolC)} on no`}
      >
        {yesPoolC > 0 && <div className="pool-fill bg-yes" style={{ flexGrow: yesPoolC }} />}
        {noPoolC > 0 && <div className="pool-fill bg-no" style={{ flexGrow: noPoolC }} />}
      </div>
      <div className="mt-1.5 flex justify-between gap-3 text-[13px] font-semibold">
        <span className="min-w-0 truncate text-yes-deep">
          Yes <span className="mono">{fmtPies(yesPoolC)}</span>
          {yes && ` · ${yes}`}
        </span>
        <span className="min-w-0 truncate text-right text-no-deep">
          No <span className="mono">{fmtPies(noPoolC)}</span>
          {no && ` · ${no}`}
        </span>
      </div>
    </div>
  );
}
