"use client";

import Link from "next/link";
import { useState } from "react";
import { routes } from "@/lib/routes";
import { needsYou } from "@/lib/today";
import { Avatar } from "./avatar";
import { seenMarkets } from "./seen";
import { TripNav } from "./trip-nav";
import { useTrip } from "./trip-store";
import { Chevron } from "./ui";

export function TripHeader({
  tripId,
  place,
  when,
  talkLabel,
}: {
  tripId: string;
  place: string;
  when: string | null;
  talkLabel: string | null;
}) {
  const { state, me, people, seenAt, name, t } = useTrip();
  const [seen] = useState(() => seenMarkets(tripId));
  const waiting = state ? needsYou(state, people, me.id, seenAt, new Date(), seen).length : 0;
  return (
    <>
      <header className="mx-auto flex max-w-2xl items-center justify-between gap-3">
        <Link
          href={routes.allTrips}
          className="flex min-h-11 min-w-0 flex-col justify-center"
          title="Your trips"
        >
          <span className="eyebrow truncate">{when ? `${when} · ${place}` : place}</span>
          <span className="display flex items-center gap-1.5 text-[22px] font-bold leading-tight">
            <span className="truncate">
              {name === undefined ? "…" : (name ?? t.sealedTripName)}
            </span>
            <Chevron down />
          </span>
        </Link>
        <Link href={routes.account} aria-label="Your account" className="shrink-0 rounded-full">
          <Avatar member={me} size={44} />
        </Link>
      </header>
      <TripNav tripId={tripId} waiting={waiting} talkLabel={talkLabel} />
    </>
  );
}
