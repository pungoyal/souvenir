"use client";

import Link from "next/link";
import { timeAgo } from "@/lib/format";
import { piesText, toCents } from "@/lib/pies";
import { routes } from "@/lib/routes";
import type { MarketView } from "@/lib/views";
import { BetPanel } from "./bet-panel";
import { PoolBar } from "./pool-bar";
import { Verdict } from "./side-chip";
import { useTrip } from "./trip-store";
import { tone } from "./ui";

/**
 * One prediction, wherever a list shows it. An open one is answered right here — the question,
 * who is on which side, and the two buttons — so calling never needs a second page. A resolved
 * one carries its verdict and what it did to you.
 */
export function MarketCard({
  view,
  myProfitC,
  maxStakePies,
}: {
  view: MarketView;
  /** On a resolved card: what the verdict did to the viewer, if they were in. */
  myProfitC?: number;
  maxStakePies: number;
}) {
  const { tripId, me, lingo, t } = useTrip();
  const { market, creator, participants } = view;
  const href = routes.market(tripId, market.id);
  const open = market.status === "open";
  const mine = market.creatorId === me.id;
  const asker = mine ? "You asked" : `${creator.name} asks`;
  const talk =
    view.commentCount > 0
      ? `${view.commentCount} comment${view.commentCount === 1 ? "" : "s"}`
      : null;

  return (
    <article className="card flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2 text-[13px] text-soft">
        <span className="min-w-0 truncate">
          {open
            ? asker
            : `${mine ? "You" : creator.name} ${market.status === "refunded" ? "voided" : "resolved"} it`}{" "}
          · {timeAgo(open ? market.createdAt : (market.resolvedAt ?? market.createdAt))}
        </span>
        {market.status !== "open" && <Verdict status={market.status} />}
      </div>

      <Link href={href} className="display break-words text-lg font-semibold leading-tight">
        {market.question}
      </Link>

      {(open || view.yesPoolC + view.noPoolC > 0) && (
        <PoolBar
          yesPoolC={view.yesPoolC}
          noPoolC={view.noPoolC}
          participants={participants}
          meId={me.id}
          lingo={lingo}
        />
      )}

      {open && (
        <BetPanel
          marketId={market.id}
          mySide={view.mySide}
          myStakeC={view.myStakeC}
          maxStakeC={toCents(maxStakePies)}
          detailHref={href}
        />
      )}

      {open && mine && view.yesPoolC + view.noPoolC > 0 && (
        <Link href={`${href}#resolve`} className="btn btn-line text-sm">
          Yours to resolve
        </Link>
      )}

      {!open && myProfitC !== undefined && (
        <p className={`mono text-sm font-bold ${tone(myProfitC)}`}>
          {myProfitC === 0
            ? t.brokeEven
            : (myProfitC > 0 ? t.youWon : t.youLost)(piesText(Math.abs(myProfitC)))}
        </p>
      )}

      {talk && (
        <Link
          href={`${href}#talk`}
          className="-my-2 flex min-h-11 items-center text-[13px] text-soft"
        >
          {talk}
        </Link>
      )}
    </article>
  );
}
