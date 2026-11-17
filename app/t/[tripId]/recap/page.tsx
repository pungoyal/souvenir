import { RecapPage } from "@/components/recap-page";
import { Sealed } from "@/components/sealed";
import { env } from "@/lib/env";
import { requireTrip } from "@/lib/session";
import { placeOf, tripPhase, tripToday } from "@/lib/trips";

export default async function RecapRoute({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const { trip } = await requireTrip(tripId);
  const over = tripPhase(trip, tripToday(trip)) === "after";
  const eyebrow = `${over ? "The season is over" : "The season so far"} · ${placeOf(trip)}`;
  return (
    <Sealed>
      <RecapPage eyebrow={eyebrow} minResolved={env.RANKED_MIN_RESOLVED} />
    </Sealed>
  );
}
