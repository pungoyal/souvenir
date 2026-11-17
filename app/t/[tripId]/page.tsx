import { Sealed } from "@/components/sealed";
import { Today } from "@/components/today";
import { isOrganiser } from "@/lib/data";
import { tripRate } from "@/lib/rates";
import { requireTrip } from "@/lib/session";
import { starterTrip } from "@/lib/starters";
import { DESTINATIONS, pairFor } from "@/lib/talk";
import { placeOf, tripClock, tripCurrencies, tripToday } from "@/lib/trips";

const MONTH = new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" });

export default async function TodayPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const ctx = await requireTrip(tripId);
  const { trip } = ctx;
  const today = tripToday(trip);
  const pair = pairFor(trip);
  const currencies = tripCurrencies(trip);
  const rate = await tripRate(currencies);
  const there = DESTINATIONS[trip.destination]?.them;
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
        starterTrip={starterTrip(trip)}
      />
    </Sealed>
  );
}
