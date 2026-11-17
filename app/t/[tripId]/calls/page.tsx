import { CallsPage } from "@/components/calls-page";
import { Sealed } from "@/components/sealed";
import { requireTrip } from "@/lib/session";
import { starterTrip } from "@/lib/starters";

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
        starterTrip={starterTrip(trip)}
      />
    </Sealed>
  );
}
