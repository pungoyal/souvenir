import { Sealed } from "@/components/sealed";
import { Today } from "@/components/today";
import { isOrganiser } from "@/lib/data";
import { latestRate } from "@/lib/rates";
import { requireTrip } from "@/lib/session";
import { DESTINATIONS, pairFor } from "@/lib/talk";
import { isDomestic, placeOf, tripClock, tripCurrencies, tripToday } from "@/lib/trips";

const MONTH = new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" });

/** Today: the trip's home, whatever day of it this is. */
export default async function TodayPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const ctx = await requireTrip(tripId);
  const { trip } = ctx;
  const today = tripToday(trip);
  const pair = pairFor(trip);
  const currencies = tripCurrencies(trip);
  // The rate is public and names only the pair; the bills stay on the phone.
  const rate = isDomestic(trip) ? null : await latestRate(currencies[0], currencies[1]);
  // The greeting is the destination's own, whether or not there is anything to interpret.
  const there = DESTINATIONS[trip.destination]?.them;
  // The postmark is dated by the trip when it has dates, by today when it doesn't.
  const dated = trip.startsOn ?? today;

  return (
    <Sealed>
      <Today
        clock={tripClock(trip, today)}
        greeting={{
          native: there?.greeting ?? "Hello",
          roman: there?.greetingRoman ?? null,
          lang: there?.code ?? "en",
        }}
        place={placeOf(trip)}
        year={dated.slice(0, 4)}
        month={trip.startsOn ? MONTH.format(new Date(`${trip.startsOn}T00:00:00Z`)) : null}
        currencies={currencies}
        rate={rate}
        canInvite={isOrganiser(ctx)}
        talkLabel={pair ? pair.them.language : null}
        starterTrip={{
          destination: trip.destination,
          homeCurrency: trip.homeCurrency,
          foreignCurrency: trip.foreignCurrency,
          startsOn: trip.startsOn,
          endsOn: trip.endsOn,
          place: placeOf(trip),
          today,
        }}
      />
    </Sealed>
  );
}
