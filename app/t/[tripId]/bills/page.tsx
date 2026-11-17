import { Bills } from "@/components/bills";
import { Sealed } from "@/components/sealed";
import { FX_SURCHARGE_BPS } from "@/lib/fx";
import { lingoOf } from "@/lib/lingo";
import { tripRate } from "@/lib/rates";
import { requireTrip } from "@/lib/session";
import { currencyName, isDomestic, tripCurrencies } from "@/lib/trips";

export default async function BillsPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const { me, trip } = await requireTrip(tripId);
  const t = lingoOf(me.lingo);
  const currencies = tripCurrencies(trip);
  // The rate is public and names only the pair; the bills stay on the phone.
  const rate = await tripRate(currencies);

  const note = isDomestic(trip)
    ? `Everything in ${currencyName(currencies[0])}.`
    : rate
      ? `${currencyName(currencies[0])} there, ${currencyName(currencies[1])} at home, settled together in ${currencyName(currencies[1])} at the day's rate plus ${FX_SURCHARGE_BPS / 100}% to cover the exchange.`
      : `${currencyName(currencies[0])} there, ${currencyName(currencies[1])} at home. Each settles on its own.`;

  return (
    <div>
      <h1 className="display text-[28px] font-bold">{t.billsTitle}</h1>
      <Sealed>
        <Bills currencies={currencies} rate={rate} note={note} />
      </Sealed>
    </div>
  );
}
