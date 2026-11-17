"use client";

import Link from "next/link";
import { fmtPct } from "@/lib/pies";
import { routes } from "@/lib/routes";
import { leaderboard, type MemberStats } from "@/lib/views";
import { Avatar } from "./avatar";
import { Pies } from "./pies";
import { KeyStatus } from "./sealed";
import { useOpenTrip } from "./trip-store";
import { tone } from "./ui";

/** Its only stats source is `leaderboard`; passkeys are the server's, as a prop. */
export function Leaderboard({
  minResolved,
  passkeys,
}: {
  minResolved: number;
  passkeys: string[];
}) {
  const { tripId, me, t, roster, state, unreadable } = useOpenTrip();
  const { ranked, unranked } = leaderboard(state, roster, minResolved);
  const held = new Set(passkeys);
  const rowOf = (s: MemberStats, rank: number | null) => (
    <Row
      key={s.member.id}
      s={s}
      rank={rank}
      isMe={s.member.id === me.id}
      hasPasskey={held.has(s.member.id)}
      tripId={tripId}
      minResolved={minResolved}
    />
  );

  return (
    <section className="mt-5">
      <h2 className="display text-xl font-bold">{t.leaderboardTitle}</h2>
      <p className="mt-0.5 text-[13px] text-soft">{t.leaderboardSub(minResolved)}</p>
      <ul className="card list mt-2 overflow-hidden">
        {ranked.map((s, i) => rowOf(s, i + 1))}
        {unranked.length > 0 && (
          <li className="eyebrow bg-paper px-4 py-2">Still warming up · {t.calibratingSub}</li>
        )}
        {unranked.map((s) => rowOf(s, null))}
      </ul>
      {unreadable > 0 && (
        <p className="mt-2 text-xs text-soft">
          {unreadable} {unreadable === 1 ? "entry" : "entries"} on this trip wouldn't open on this
          phone.
        </p>
      )}
    </section>
  );
}

/** `rank` is null below the line, where the cell shows progress towards being ranked instead. */
function Row({
  s,
  rank,
  isMe,
  hasPasskey,
  tripId,
  minResolved,
}: {
  s: MemberStats;
  rank: number | null;
  isMe: boolean;
  hasPasskey: boolean;
  tripId: string;
  minResolved: number;
}) {
  return (
    <li className={`flex items-center gap-3 px-4 py-3 ${isMe ? "bg-sun-tint" : ""}`}>
      <span className="mono w-7 shrink-0 text-center text-soft">
        {rank === null ? (
          <span className="text-xs">
            {s.resolvedCount}/{minResolved}
          </span>
        ) : (
          <span className="text-lg font-bold text-ink">{rank}</span>
        )}
      </span>
      <Avatar member={s.member} size={40} />
      <div className="min-w-0 flex-1">
        <Link
          href={routes.member(tripId, s.member.id)}
          className="flex min-h-11 flex-col justify-center"
        >
          <span className="truncate font-semibold">
            {isMe ? "You" : s.member.name}
            {s.role === "organiser" && (
              <span className="ml-1.5 text-xs font-normal text-soft">organiser</span>
            )}
          </span>
          <span className="mono truncate text-[13px] text-soft">
            {s.resolvedCount === 0
              ? "no verdicts yet"
              : `${s.wins} right, ${s.losses} wrong${s.roi === null ? "" : ` · ${fmtPct(s.roi)}`}`}
          </span>
        </Link>
        {!hasPasskey && <p className="text-xs text-soft">no passkey yet</p>}
        <KeyStatus memberId={s.member.id} name={s.member.name} />
      </div>
      <span
        className={`mono shrink-0 text-lg font-bold ${tone(s.netC)}`}
        title="Net stamps on this trip"
      >
        <Pies c={s.netC} sign />
      </span>
    </li>
  );
}
