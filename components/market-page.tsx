"use client";

import Link from "next/link";
import { useEffect } from "react";
import { fmtDate, timeAgo } from "@/lib/format";
import { toCents } from "@/lib/pies";
import { routes } from "@/lib/routes";
import { marketActivity, marketCard, marketComments, marketView, reactors } from "@/lib/views";
import { ActivityFeed } from "./activity";
import { Avatar } from "./avatar";
import { BetPanel } from "./bet-panel";
import { CommentsSection } from "./comments";
import { Pies } from "./pies";
import { PoolBar } from "./pool-bar";
import { ReactionBar } from "./reaction-bar";
import { ReopenPanel } from "./reopen-panel";
import { ResolvePanel } from "./resolve-panel";
import { markMarketSeen } from "./seen";
import { ShareCard } from "./share-card";
import { SideChip, StatusChip } from "./side-chip";
import { useOpenTrip } from "./trip-store";

const heading = "display text-xl font-bold";

export function MarketPage({
  marketId,
  maxStakePies,
  published,
}: {
  marketId: string;
  maxStakePies: number;
  /** Whether a card is up for it — the one thing about a prediction the server knows. */
  published: boolean;
}) {
  const { tripId, me, lingo, t, people, state, append } = useOpenTrip();
  const m = state.markets.get(marketId);

  // Noted on this phone in an effect, so a link prefetch never counts.
  const opened = !!m;
  useEffect(() => {
    if (opened) markMarketSeen(tripId, marketId);
  }, [opened, tripId, marketId]);

  if (!m) {
    return (
      <div>
        <Link href={routes.calls(tripId)} className="flex min-h-11 items-center text-sm text-soft">
          ← Calls
        </Link>
        <p className="mt-6 text-sm text-soft">No such prediction on this trip.</p>
      </div>
    );
  }

  const view = marketView(state, people, m, me.id);
  const { market, creator } = view;
  const { activity, settlements } = marketActivity(state, people, marketId);
  const isOpen = market.status === "open";
  const totalPoolC = view.yesPoolC + view.noPoolC;
  const mine = market.creatorId === me.id;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href={routes.calls(tripId)} className="flex min-h-11 items-center text-sm text-soft">
          ← Calls
        </Link>
        <div className="flex items-center justify-between gap-3 text-[13px] text-soft">
          <span>
            {mine ? "You asked" : `${creator.name} asks`} · {timeAgo(market.createdAt)}
          </span>
          <StatusChip status={market.status} />
        </div>
        <h1 className="display mt-2 break-words text-[28px] font-bold leading-tight">
          {market.question}
        </h1>
      </div>

      <div className="card flex flex-col gap-4 p-4">
        <PoolBar
          yesPoolC={view.yesPoolC}
          noPoolC={view.noPoolC}
          participants={view.participants}
          meId={me.id}
          lingo={lingo}
        />
        {isOpen && (
          <BetPanel
            marketId={market.id}
            mySide={view.mySide}
            myStakeC={view.myStakeC}
            maxStakeC={toCents(maxStakePies)}
          />
        )}
      </div>

      {!isOpen && (
        <div className="card p-4">
          <p className="display text-lg font-bold">
            {market.status === "refunded"
              ? "Voided. Every stamp went back."
              : `${mine ? "You" : creator.name} resolved it ${market.status}.`}
          </p>
          {market.resolvedAt && (
            <p className="mt-0.5 text-[13px] text-soft">{fmtDate(market.resolvedAt)}</p>
          )}
          {market.resolutionNote && (
            <p className="mt-2 whitespace-pre-wrap break-words text-sm">{market.resolutionNote}</p>
          )}
          {settlements.length > 0 && (
            <div className="mt-3 border-t border-line pt-3">
              <p className="eyebrow">
                Where the <Pies c={totalPoolC} /> pool went
              </p>
              <ul className="mt-2 space-y-2">
                {settlements.map((s) => (
                  <li key={s.row.id} className="flex items-center gap-2 text-sm">
                    <Avatar member={s.member} size={24} />
                    <span className="font-semibold">{s.member.name}</span>
                    <span className="text-soft">
                      {s.row.kind === "payout" ? "collected" : "got back"}
                    </span>
                    <span className="mono ml-auto font-bold">
                      <Pies c={s.row.amountC} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <ShareCard
            card={marketCard(state, people, marketId)}
            marketId={marketId}
            published={published}
          />
          {state.organiserIds.has(me.id) && <ReopenPanel marketId={market.id} />}
        </div>
      )}

      <div className="card p-4">
        <p className="eyebrow">How it's decided</p>
        <p className="mt-1.5 whitespace-pre-wrap break-words text-sm">{market.criteria}</p>
      </div>

      {isOpen && mine && (
        <div id="resolve" className="scroll-mt-4">
          <ResolvePanel marketId={market.id} />
        </div>
      )}

      <ReactionBar
        marketId={market.id}
        meId={me.id}
        upvoters={reactors(state, people, marketId, "upvote")}
        watchers={reactors(state, people, marketId, "watch")}
        open={isOpen}
      />

      <section>
        <h2 className={heading}>Who called what</h2>
        {view.participants.length === 0 ? (
          <p className="mt-2 text-sm text-soft">{t.betsEmpty}</p>
        ) : (
          <ul className="card list mt-2">
            {view.participants.map((p) => (
              <li key={p.member.id} className="flex items-center gap-3 px-4 py-2.5">
                <Avatar member={p.member} size={32} />
                <Link
                  href={routes.member(tripId, p.member.id)}
                  className="flex min-h-11 min-w-0 items-center truncate font-semibold"
                >
                  {p.member.id === me.id ? "You" : p.member.name}
                </Link>
                <span className="ml-auto flex shrink-0 items-center gap-2">
                  <span className="mono font-bold">
                    <Pies c={p.stakeC} />
                  </span>
                  <SideChip side={p.side} small />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="talk" className="scroll-mt-4">
        <h2 className={heading}>{t.commentsHeading}</h2>
        <div className="card mt-2 p-4">
          <CommentsSection
            comments={marketComments(state, people, marketId)}
            members={[...people.values()]}
            meId={me.id}
            lingo={lingo}
            onPost={(body, mentions) =>
              append({ t: "comment", id: crypto.randomUUID(), marketId, body, mentions })
            }
          />
        </div>
      </section>

      {activity.length > 0 && (
        <section>
          <h2 className={heading}>{t.activitySoFarHeading}</h2>
          <div className="card mt-2 p-4">
            <ActivityFeed items={activity} tripId={tripId} lingo={lingo} />
          </div>
        </section>
      )}
    </div>
  );
}
