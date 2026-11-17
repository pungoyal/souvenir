// The Today page: what is waiting on one member, and where they stand.

import type { FxRate } from "./fx.ts";
import type { MarketState, TripState } from "./replay.ts";
import type { Currency } from "./split.ts";
import {
  billsOverview,
  leaderboard,
  listMarkets,
  type MarketView,
  type People,
  type Person,
  type RosterMember,
  tripSettlement,
  who,
} from "./views.ts";

export type Need =
  /** Somebody tagged you and you have neither answered nor caught up since. */
  | {
      kind: "mention";
      at: Date;
      actor: Person;
      commentId: string;
      body: string;
      /** Exactly one of these is set. */
      market: MarketState | null;
      bill: { id: string; label: string } | null;
    }
  /** An open prediction somebody else asked that you have not called. */
  | { kind: "call"; view: MarketView }
  /** An open prediction of yours with stamps on it: only you can resolve it. */
  | { kind: "resolve"; view: MarketView };

/** Most pressing first. `seenAt` is the inbox cursor; `seen` is components/seen. */
export function needsYou(
  state: TripState,
  people: People,
  viewerId: string,
  seenAt: Date | null,
  now: Date,
  seen: ReadonlySet<string> = new Set(),
): Need[] {
  const cursor = seenAt?.getTime() ?? 0;
  // A tag from before the viewer last spoke in its thread has been answered.
  const spokeAt = new Map<string, number>();
  for (const c of state.comments) {
    if (c.authorId !== viewerId) continue;
    const thread = c.marketId ?? c.billId;
    if (thread) spokeAt.set(thread, Math.max(spokeAt.get(thread) ?? 0, c.at.getTime()));
  }
  const mentions: Need[] = [];
  for (const c of state.comments) {
    if (c.authorId === viewerId || !c.mentions.includes(viewerId)) continue;
    const thread = c.marketId ?? c.billId;
    const at = c.at.getTime();
    if (!thread || at <= cursor || at <= (spokeAt.get(thread) ?? 0)) continue;
    const market = c.marketId ? (state.markets.get(c.marketId) ?? null) : null;
    const bill = c.billId ? state.bills.get(c.billId) : undefined;
    if (!market && !bill) continue;
    mentions.push({
      kind: "mention",
      at: c.at,
      actor: who(people, c.authorId),
      commentId: c.id,
      body: c.body,
      market,
      bill: bill ? { id: bill.id, label: bill.revisions.at(-1)?.description || "a payment" } : null,
    });
  }
  mentions.sort((a, b) => (a.kind === "mention" && b.kind === "mention" ? +b.at - +a.at : 0));

  const { open, forYou } = listMarkets(state, people, viewerId, now, seen);
  const uncalled = open.filter((v) => v.mySide === null && v.market.creatorId !== viewerId);
  const ranked = forYou.filter((v) => uncalled.includes(v));
  const calls: Need[] = [...ranked, ...uncalled.filter((v) => !ranked.includes(v))].map((view) => ({
    kind: "call",
    view,
  }));

  const resolves: Need[] = open
    .filter((v) => v.market.creatorId === viewerId && v.yesPoolC + v.noPoolC > 0)
    .sort((a, b) => +a.market.createdAt - +b.market.createdAt)
    .map((view) => ({ kind: "resolve", view }));

  return [...mentions, ...calls, ...resolves];
}

export interface Standing {
  /** Stamps won or lost on resolved predictions; an open call is not yet a loss. */
  profitC: number;
  /** Whoever is furthest ahead, the viewer included. */
  leaders: RosterMember[];
  leadC: number;
}

/** Null until a verdict has moved stamps, or for somebody with no seat. */
export function standing(
  state: TripState,
  roster: readonly RosterMember[],
  viewerId: string,
): Standing | null {
  const { ranked, unranked } = leaderboard(state, roster, 0);
  const all = [...ranked, ...unranked];
  const mine = all.find((s) => s.member.id === viewerId);
  if (!mine || all.every((s) => s.profitC === 0)) return null;
  const leadC = Math.max(...all.map((s) => s.profitC));
  return {
    profitC: mine.profitC,
    leaders: all
      .filter((s) => s.profitC === leadC)
      .map((s) => s.member)
      .sort((a, b) => a.name.localeCompare(b.name)),
    leadC,
  };
}

/**
 * Owed (positive) or owing (negative): one home-currency figure with a rate, else one per
 * currency. Empty when square.
 */
export function myMoney(
  state: TripState,
  people: People,
  viewerId: string,
  currencies: readonly Currency[],
  rate: FxRate | null,
): { currency: Currency; netC: number }[] {
  const settlement =
    rate && currencies.includes(rate.from) && currencies.includes(rate.to)
      ? tripSettlement(state, people, rate.to, rate)
      : null;
  if (settlement) {
    const mine = settlement.nets.find((n) => n.member.id === viewerId);
    return mine && mine.netC !== 0 ? [{ currency: settlement.home, netC: mine.netC }] : [];
  }
  return billsOverview(state, people).balances.flatMap((b) => {
    const mine = b.nets.find((n) => n.member.id === viewerId);
    return mine ? [{ currency: b.currency, netC: mine.netC }] : [];
  });
}
