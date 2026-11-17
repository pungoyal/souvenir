import Link from "next/link";
import { routes } from "@/lib/routes";
import { type StarterDraft, type StarterTrip, starters } from "@/lib/starters";
import { useOpenTrip } from "./trip-store";

/**
 * The questions every trip argues about, one tap from being on the record.
 * Plain links into the new-prediction form with the draft filled in, so the
 * member still reads and owns what they publish.
 */
export function Starters({ tripId, drafts }: { tripId: string; drafts: StarterDraft[] }) {
  return (
    <ul className="mt-2 grid gap-2">
      {drafts.map((d) => (
        <li key={d.key}>
          <Link
            href={`${routes.newMarket(tripId)}?q=${encodeURIComponent(d.question)}&c=${encodeURIComponent(d.criteria)}`}
            className="card flex min-h-14 items-center justify-between gap-3 px-4 py-2.5 font-semibold"
          >
            <span>{d.question}</span>
            <span aria-hidden className="text-xl leading-none">
              +
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Empty once the trip has predictions of its own, unless `always`. */
export function useStarters(trip: StarterTrip, always = false): StarterDraft[] {
  const { me, roster, state, name } = useOpenTrip();
  if (!always && state.markets.size >= 3) return [];
  return starters({
    ...trip,
    name: name ?? trip.place,
    members: roster.map((m) => ({ id: m.id, name: m.name })),
    viewerId: me.id,
  });
}
