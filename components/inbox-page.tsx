"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { markInboxSeenAction } from "@/app/actions";
import { timeAgo } from "@/lib/format";
import type { Lingo } from "@/lib/lingo";
import { piesText } from "@/lib/pies";
import { routes } from "@/lib/routes";
import { type InboxItem, inbox } from "@/lib/views";
import { Avatar } from "./avatar";
import { useOpenTrip } from "./trip-store";
import { BackLink, EmptyState, tone } from "./ui";

/**
 * What happened that concerns me. Opening it moves the cursor — the one
 * stored thing about an inbox — but this visit still highlights what was
 * unread when it opened, so the items are judged against the cursor as it was.
 */
export function InboxPage() {
  const { tripId, me, t, people, state, seenAt, markSeen } = useOpenTrip();
  const [cursor] = useState(seenAt);
  const marked = useRef(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once per visit
  useEffect(() => {
    if (marked.current) return;
    marked.current = true;
    void markInboxSeenAction(tripId).then(() => markSeen());
  }, [tripId]);

  const { items } = inbox(state, people, me.id, cursor);

  return (
    <div>
      <BackLink href={routes.trip(tripId)}>Today</BackLink>
      <h1 className="display text-[28px] font-bold">Activity</h1>
      <p className="mt-1 text-sm text-soft">{t.inboxSub}</p>

      {items.length === 0 ? (
        <div className="mt-5">
          <EmptyState title={t.inboxEmptyTitle} sub={t.inboxEmptySub} />
        </div>
      ) : (
        <div className="mt-5">
          <InboxRows items={items} />
        </div>
      )}
    </div>
  );
}

/** `plain` drops the unread tint, for a list that is all unread. */
export function InboxRows({ items, plain = false }: { items: InboxItem[]; plain?: boolean }) {
  const { tripId, t } = useOpenTrip();
  return (
    <ul className="card list overflow-hidden">
      {items.map((item) => (
        <Item
          key={itemKey(item)}
          item={plain ? { ...item, unread: false } : item}
          t={t}
          tripId={tripId}
        />
      ))}
    </ul>
  );
}

function itemKey(item: InboxItem): string {
  if (item.kind === "activity") return `a-${item.row.id}`;
  if (item.kind === "comment" || item.kind === "mention") return `c-${item.commentId}`;
  return `${item.kind}-${item.market.id}`;
}

function itemHref(tripId: string, item: InboxItem): string {
  return item.market ? routes.market(tripId, item.market.id) : routes.bills(tripId);
}

function itemSubject(item: InboxItem): string {
  if (item.kind === "mention" || item.kind === "comment") {
    return item.market?.question ?? item.bill?.label ?? "";
  }
  return item.market.question;
}

function Item({ item, t, tripId }: { item: InboxItem; t: Lingo; tripId: string }) {
  return (
    <li className={item.unread ? "bg-sun-tint" : undefined}>
      <Link href={itemHref(tripId, item)} className="flex min-h-11 items-start gap-3 px-4 py-3">
        <span className="mt-0.5">
          <Avatar member={item.actor} size={26} />
        </span>
        <span className="min-w-0 flex-1 text-sm">
          <Line item={item} t={t} />
          {(item.kind === "comment" || item.kind === "mention") && (
            <span className="mt-0.5 block truncate text-xs">“{item.body}”</span>
          )}
          <span className="mt-0.5 block truncate text-xs text-soft">{itemSubject(item)}</span>
        </span>
        <span className="flex items-center gap-2 whitespace-nowrap text-xs text-soft">
          {item.unread && <span className="h-2 w-2 rounded-full bg-no" title="New" />}
          {timeAgo(item.at)}
        </span>
      </Link>
    </li>
  );
}

function Line({ item, t }: { item: InboxItem; t: Lingo }) {
  const name = <span className="font-semibold">{item.actor.name}</span>;
  switch (item.kind) {
    case "new_market":
      return <>{name} asked the group</>;
    case "comment":
      return (
        <>
          {name} commented{item.bill ? " on a bill" : ""}
        </>
      );
    case "mention":
      return (
        <>
          {name} tagged you{item.bill ? " on a bill" : ""}
        </>
      );
    case "activity":
      return (
        <>
          {name}{" "}
          {item.row.kind === "switch"
            ? `switched to ${item.row.side}`
            : `put ${piesText(item.row.amountC)} on ${item.row.side}`}
        </>
      );
    case "resolved":
      return (
        <>
          {name}{" "}
          {item.market.status === "refunded" ? "voided it" : `resolved it ${item.market.status}`}
          {item.myProfitC !== null && (
            <span className={`mono ml-1.5 font-bold ${tone(item.myProfitC)}`}>
              {item.myProfitC === 0
                ? "(stamps back)"
                : `(${(item.myProfitC > 0 ? t.youWon : t.youLost)(piesText(Math.abs(item.myProfitC)))})`}
            </span>
          )}
        </>
      );
  }
}
