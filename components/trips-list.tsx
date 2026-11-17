"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Trip } from "@/lib/db/schema";
import { fmtDate } from "@/lib/format";
import { openName, tripCryptoKey } from "@/lib/keys";
import { routes } from "@/lib/routes";
import { DESTINATIONS } from "@/lib/talk";
import { tripPhase, tripToday } from "@/lib/trips";
import { useKeyring } from "./keyring";
import { Postmark } from "./postmark";

export interface TripRow {
  trip: Trip;
  role: "organiser" | "member";
  memberCount: number;
}

export function TripsList({ trips, sealedName }: { trips: TripRow[]; sealedName: string }) {
  const { status, keyring } = useKeyring();
  const [names, setNames] = useState<Record<string, string>>({});
  useEffect(() => {
    if (status === "loading") return;
    let cancelled = false;
    (async () => {
      const next: Record<string, string> = {};
      for (const { trip } of trips) {
        if (!trip.nameEnc) continue;
        const key = await tripCryptoKey(keyring, trip.id, trip.keyEpoch);
        if (!key) continue;
        try {
          next[trip.id] = await openName(key, trip.id, trip.nameEnc);
        } catch {
          // A name this key does not open: the trip page will say so.
        }
      }
      if (!cancelled) setNames(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [status, keyring, trips]);

  return (
    <ul className="mt-6 grid gap-3">
      {trips.map(({ trip, role, memberCount }) => {
        const there = DESTINATIONS[trip.destination];
        const phase = tripPhase(trip, tripToday(trip));
        return (
          <li key={trip.id}>
            <Link href={routes.trip(trip.id)} className="card flex items-center gap-4 p-4">
              <Postmark
                place={there?.place ?? trip.destination}
                year={(trip.startsOn ?? tripToday(trip)).slice(0, 4)}
                top={phase === "after" ? "Home" : phase === "during" ? "Now" : "Soon"}
                size={64}
                className="text-sun-deep"
              />
              <span className="min-w-0 flex-1">
                <span className="display block truncate text-xl font-bold">
                  {names[trip.id] ?? (status === "loading" ? "…" : sealedName)}
                </span>
                <span className="block text-[13px] text-soft">
                  {there?.place ?? trip.destination}
                  {trip.startsOn && ` · ${fmtDate(trip.startsOn)}`}
                  {trip.endsOn && ` – ${fmtDate(trip.endsOn)}`}
                  {phase === "after" && " · home"}
                </span>
              </span>
              <span className="text-right text-xs text-soft">
                <span className="block">
                  {memberCount} {memberCount === 1 ? "person" : "people"}
                </span>
                {role === "organiser" && <span className="block">organiser</span>}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
