"use client";

import Link from "next/link";
import { useState } from "react";
import type { FxRate } from "@/lib/fx";
import { fmtPies, stampsWord } from "@/lib/pies";
import { routes } from "@/lib/routes";
import { type Currency, fmtMoney } from "@/lib/split";
import { type StarterContext, starters } from "@/lib/starters";
import { myMoney, type Need, needsYou, standing } from "@/lib/today";
import type { TripClock } from "@/lib/trips";
import { inbox, phrasebook } from "@/lib/views";
import { AskBox } from "./ask-box";
import { Avatar } from "./avatar";
import { firstName } from "./bill-label";
import { InboxRows } from "./inbox-page";
import { MarketCard } from "./market-card";
import { Postmark } from "./postmark";
import { seenMarkets } from "./seen";
import { Starters } from "./starters";
import { useOpenTrip } from "./trip-store";

// How many open calls Today puts in front of somebody before pointing at the Calls tab.
const CALLS_SHOWN = 3;

export interface Greeting {
  /** In the destination's own script. */
  native: string;
  /** How to say it, when that script is not one the group reads. */
  roman: string | null;
  /** BCP-47 language of `native`, for a screen reader and the right font. */
  lang: string;
}

/**
 * The trip's home: what is waiting on you, in the order it matters, under a greeting from the
 * place you are going. It changes with the calendar — a countdown before, the day's number
 * during, the way to the recap once home — and never asks you to go looking.
 */
export function Today({
  clock,
  greeting,
  place,
  year,
  month,
  currencies,
  rate,
  canInvite,
  talkLabel,
  starterTrip,
}: {
  clock: TripClock;
  greeting: Greeting;
  place: string;
  year: string;
  month: string | null;
  currencies: readonly Currency[];
  rate: FxRate | null;
  canInvite: boolean;
  talkLabel: string | null;
  starterTrip: Omit<StarterContext, "members" | "viewerId" | "name">;
}) {
  const { tripId, me, t, roster, people, state, seenAt, name, maxStakePies } = useOpenTrip();
  const [seen] = useState(() => seenMarkets(tripId));
  const needs = needsYou(state, people, me.id, seenAt, new Date(), seen);
  const mentions = needs.filter((n) => n.kind === "mention");
  const calls = needs.filter((n) => n.kind === "call");
  const resolves = needs.filter((n) => n.kind === "resolve");
  const money = myMoney(state, people, me.id, currencies, rate);
  const count = needs.length + money.length;

  const place_ = standing(state, roster, me.id);
  const news = inbox(state, people, me.id, seenAt);
  const fresh = news.items.filter((i) => i.unread && i.kind !== "mention").slice(0, 3);
  const kept = phrasebook(state).slice(0, 4);
  const marketCount = state.markets.size;
  const drafts =
    marketCount < 3 || clock.phase === "before"
      ? starters({
          ...starterTrip,
          name: name ?? starterTrip.place,
          members: roster.map((m) => ({ id: m.id, name: m.name })),
          viewerId: me.id,
        }).slice(0, 3)
      : [];

  const hello = `${greeting.roman ?? greeting.native}, ${firstName(me)}`;
  const stamp = (top: string, className = "") => (
    <Postmark
      place={place}
      year={year}
      top={top}
      bottom={month ?? undefined}
      className={className}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      {clock.phase === "before" && clock.toGo !== null ? (
        <section className="flex flex-col gap-4 rounded-3xl bg-sun p-5 text-[#12141a]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1.5">
              <p className="font-semibold">
                {greeting.roman && <span lang={greeting.lang}>{greeting.native} · </span>}
                {hello}
              </p>
              <p className="display flex items-baseline gap-2.5 font-bold">
                <span className="text-[64px] leading-none">{clock.toGo}</span>
                <span className="text-[22px] font-semibold">
                  {clock.toGo === 1 ? "day to go" : "days to go"}
                </span>
              </p>
            </div>
            {stamp("Soon")}
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center">
              {roster.slice(0, 5).map((m, i) => (
                <span key={m.id} className={`rounded-full ring-2 ring-sun ${i > 0 ? "-ml-2" : ""}`}>
                  <Avatar member={m} size={36} />
                </span>
              ))}
              <span className="ml-2.5 font-semibold">{roster.length} in</span>
            </div>
            {canInvite && (
              <Link
                href={`${routes.members(tripId)}#invite`}
                className="btn shrink-0 bg-[#12141a] px-4 text-white"
              >
                Invite more
              </Link>
            )}
          </div>
        </section>
      ) : (
        <section className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            {greeting.roman && (
              <p lang={greeting.lang} className="text-lg font-semibold text-sun-deep">
                {greeting.native}
              </p>
            )}
            <h1 className="display break-words text-[28px] font-bold leading-tight">{hello}</h1>
            {clock.phase === "undated" && canInvite && (
              <Link
                href={routes.settings(tripId)}
                className="flex min-h-11 items-center text-sm text-soft underline"
              >
                Add the trip's dates
              </Link>
            )}
          </div>
          {stamp(
            clock.phase === "after" ? "Home" : clock.day !== null ? `Day ${clock.day}` : "",
            "text-sun-deep",
          )}
        </section>
      )}

      {clock.phase === "after" && (
        <Link
          href={routes.recap(tripId)}
          className="flex items-center justify-between gap-3 rounded-3xl bg-night p-5 text-white"
        >
          <span>
            <span className="display block text-xl font-bold">{t.recapTitle}</span>
            <span className="mt-0.5 block text-sm text-night-soft">
              The whole trip, summed up and ready for the group chat.
            </span>
          </span>
          <Chevron />
        </Link>
      )}

      <section className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          {count > 0 && (
            <span className="mono rounded-[10px] bg-ink px-2.5 py-0.5 text-[13px] font-bold text-paper">
              {count}
            </span>
          )}
          <h2 className="display text-xl font-bold">Needs you</h2>
        </div>

        {count === 0 && (
          <p className="card px-4 py-5 text-sm text-soft">
            Nothing is waiting on you. Ask the group something, or go and have the trip.
          </p>
        )}

        {mentions.map((n) => n.kind === "mention" && <Mention key={n.commentId} need={n} />)}

        {calls
          .slice(0, CALLS_SHOWN)
          .map(
            (n) =>
              n.kind === "call" && (
                <MarketCard key={n.view.market.id} view={n.view} maxStakePies={maxStakePies} />
              ),
          )}
        {calls.length > CALLS_SHOWN && (
          <Link href={routes.calls(tripId)} className="btn btn-line text-sm">
            {calls.length - CALLS_SHOWN} more waiting in Calls
          </Link>
        )}

        {resolves.map(
          (n) =>
            n.kind === "resolve" && (
              <Link
                key={n.view.market.id}
                href={`${routes.market(tripId, n.view.market.id)}#resolve`}
                className="card flex items-center justify-between gap-3 p-4"
              >
                <span className="min-w-0">
                  <span className="eyebrow block">Yours to resolve</span>
                  <span className="display mt-1 block break-words text-lg font-semibold leading-tight">
                    {n.view.market.question}
                  </span>
                  <span className="mt-1 block text-[13px] text-soft">
                    {fmtPies(n.view.yesPoolC + n.view.noPoolC)}{" "}
                    {stampsWord(n.view.yesPoolC + n.view.noPoolC)} riding on your verdict
                  </span>
                </span>
                <Chevron />
              </Link>
            ),
        )}

        {money.map((m) => (
          <Link
            key={m.currency}
            href={routes.bills(tripId)}
            className="flex items-center justify-between gap-3 rounded-[20px] bg-night p-4 text-white"
          >
            <span>
              <span className="block text-[13px] text-night-soft">
                {m.netC > 0 ? "You're owed" : "You owe"}
              </span>
              <span className="display block text-[28px] font-bold leading-tight">
                {fmtMoney(m.currency, Math.abs(m.netC))}
              </span>
            </span>
            <span className="btn btn-sun shrink-0 px-4">Settle up</span>
          </Link>
        ))}
      </section>

      {count === 0 && <AskBox tripId={tripId} placeholder={t.questionPlaceholder} />}

      {fresh.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="display text-xl font-bold">Since you looked</h2>
            <Link
              href={routes.inbox(tripId)}
              className="-my-2 flex min-h-11 items-center text-sm font-semibold underline"
            >
              All {news.unreadCount} new
            </Link>
          </div>
          <InboxRows items={fresh} plain />
        </section>
      )}

      {place_ && (
        <Link
          href={routes.members(tripId)}
          className="card flex items-center justify-between gap-3 px-4 py-3.5"
        >
          <span className="min-w-0">
            <span className="block font-semibold">
              You're {ordinal(place_.place)} of {place_.of}
            </span>
            <span className="block text-[13px] text-soft">
              {place_.netC === 0
                ? "Level on stamps."
                : `${place_.netC > 0 ? "Up" : "Down"} ${fmtPies(Math.abs(place_.netC))} ${stampsWord(place_.netC)}.`}{" "}
              {place_.place > 1 &&
                `${listNames(place_.leaders.map(firstName))} ${place_.leaders.length === 1 ? "leads" : "lead"} at ${fmtPies(place_.leadC, { sign: true })}.`}
            </span>
          </span>
          <Chevron />
        </Link>
      )}

      {talkLabel && kept.length > 0 && clock.phase !== "after" && (
        <section className="flex flex-col gap-2.5">
          <h2 className="display text-xl font-bold">Say it again</h2>
          <div className="flex flex-wrap gap-2">
            {kept.map((p) => (
              <Link
                key={p.id}
                href={`${routes.talk(tripId)}#kept`}
                className="btn btn-line max-w-full rounded-full px-4 text-sm"
              >
                <span className="truncate">{p.side === "us" ? p.heard : p.slug}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {drafts.length > 0 && (
        <section className="flex flex-col gap-1">
          <h2 className="display text-xl font-bold">
            {clock.phase === "before" ? "Ask before you leave" : t.startersHeading}
          </h2>
          <p className="text-sm text-soft">{t.startersSub}</p>
          <Starters tripId={tripId} drafts={drafts} />
        </section>
      )}

      {clock.phase === "before" && money.length === 0 && (
        <Link
          href={routes.bills(tripId)}
          className="card flex items-center justify-between gap-3 px-4 py-3.5"
        >
          <span>
            <span className="block font-semibold">Already paid for something?</span>
            <span className="block text-[13px] text-soft">
              Log the deposit now, split it later.
            </span>
          </span>
          <Chevron />
        </Link>
      )}
    </div>
  );
}

function Mention({ need }: { need: Extract<Need, { kind: "mention" }> }) {
  const { tripId } = useOpenTrip();
  const href = need.market ? `${routes.market(tripId, need.market.id)}#talk` : routes.bills(tripId);
  return (
    <article className="card flex flex-col gap-3 p-4">
      <div className="flex items-start gap-3">
        <Avatar member={need.actor} size={36} />
        <div className="min-w-0">
          <p className="text-[13px] text-soft">
            {need.actor.name} tagged you{need.bill ? " on a bill" : ""}
          </p>
          <p className="mt-0.5 break-words font-semibold">“{need.body}”</p>
          <p className="mt-0.5 truncate text-[13px] text-soft">
            {need.market?.question ?? need.bill?.label}
          </p>
        </div>
      </div>
      <Link href={href} className="btn btn-ink">
        Reply
      </Link>
    </article>
  );
}

function Chevron() {
  return (
    <svg
      aria-hidden="true"
      className="shrink-0"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 4l5 5-5 5" />
    </svg>
  );
}

function ordinal(n: number): string {
  const tail = n % 100;
  if (tail >= 11 && tail <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

function listNames(names: string[]): string {
  if (names.length <= 2) return names.join(" and ");
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}
