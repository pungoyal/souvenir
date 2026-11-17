import { CallsPage } from "@/components/calls-page";
import { Sealed } from "@/components/sealed";
import { requireTrip } from "@/lib/session";
import { placeOf, tripToday } from "@/lib/trips";

/** Every prediction on the trip: the open ones, the ones you asked, and the verdicts. */
export default async function CallsRoute({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tripId } = await params;
  const { trip } = await requireTrip(tripId);
  const { tab } = await searchParams;
  return (
    <Sealed>
      <CallsPage
        tab={tab === "yours" || tab === "done" ? tab : "open"}
        starterTrip={{
          destination: trip.destination,
          homeCurrency: trip.homeCurrency,
          foreignCurrency: trip.foreignCurrency,
          startsOn: trip.startsOn,
          endsOn: trip.endsOn,
          place: placeOf(trip),
          today: tripToday(trip),
        }}
      />
    </Sealed>
  );
}
