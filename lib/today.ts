// The Today page: what is waiting on one member, and where they stand.

import type { FxRate } from "./fx.ts";
import { type MarketState, netByMember, type TripState } from "./replay.ts";
import type { Currency } from "./split.ts";
import {
  billsOverview,
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
  /** 1 is the top; members level on stamps share a place. */
  place: number;
  of: number;
  netC: number;
  /** Whoever is in first place, the viewer included. */
  leaders: RosterMember[];
  leadC: number;
}

/** Where one member stands on net stamps. Null until a verdict has moved any. */
export function standing(
  state: TripState,
  roster: readonly RosterMember[],
  viewerId: string,
): Standing | null {
  if (!roster.some((m) => m.id === viewerId)) return null;
  const nets = netByMember(state);
  const netOf = (id: string) => nets.get(id) ?? 0;
  if (roster.every((m) => netOf(m.id) === 0)) return null;
  const netC = netOf(viewerId);
  const leadC = Math.max(...roster.map((m) => netOf(m.id)));
  return {
    place: 1 + roster.filter((m) => netOf(m.id) > netC).length,
    of: roster.length,
    netC,
    leaders: roster
      .filter((m) => netOf(m.id) === leadC)
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
