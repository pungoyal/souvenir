import { NewMarketForm } from "@/components/new-market-form";
import { Sealed } from "@/components/sealed";
import { BackLink } from "@/components/ui";
import { lingoOf } from "@/lib/lingo";
import { llmEnabled } from "@/lib/llm";
import { routes } from "@/lib/routes";
import { requireTrip } from "@/lib/session";

export default async function NewMarketPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ q?: string; c?: string }>;
}) {
  const { tripId } = await params;
  const { me, trip } = await requireTrip(tripId);
  const { q, c } = await searchParams;
  const t = lingoOf(me.lingo);
  const initial = q ? { question: q.slice(0, 200), criteria: (c ?? "").slice(0, 2000) } : undefined;
  return (
    <div>
      <BackLink href={routes.calls(tripId)}>Calls</BackLink>
      <h1 className="display text-[28px] font-bold leading-tight">{t.newTitle}</h1>
      <p className="mt-1 text-sm text-soft">
        One yes-or-no question, and exactly how you'll decide it. You're the one who resolves it.
        Everyone can put up to {trip.maxStakePies} stamps on either side.
      </p>
      <div className="mt-5">
        <Sealed>
          <NewMarketForm
            tripId={tripId}
            polishAvailable={llmEnabled}
            lingo={me.lingo}
            initial={initial}
          />
        </Sealed>
      </div>
    </div>
  );
}
