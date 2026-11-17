"use client";

import Link from "next/link";
import { routes } from "@/lib/routes";
import type { StarterTrip } from "@/lib/starters";
import { listMarkets, memberResults } from "@/lib/views";
import { AskBox } from "./ask-box";
import { MarketCard } from "./market-card";
import { Starters, useStarters } from "./starters";
import { useOpenTrip } from "./trip-store";
import { EmptyState } from "./ui";

type Tab = "open" | "yours" | "done";

export function CallsPage({ tab, starterTrip }: { tab: Tab; starterTrip: StarterTrip }) {
  const { tripId, me, t, people, state, maxStakePies } = useOpenTrip();
  const { open, resolved } = listMarkets(state, people, me.id, new Date());
  const yours = [...open, ...resolved].filter((v) => v.market.creatorId === me.id);
  const profitByMarket = new Map(memberResults(state, me.id).map((r) => [r.market.id, r.profitC]));
  const shown = tab === "open" ? open : tab === "yours" ? yours : resolved;

  const drafts = useStarters(starterTrip);

  const tabs: { key: Tab; label: string; count: number; href: string }[] = [
    { key: "open", label: "Open", count: open.length, href: routes.calls(tripId) },
    { key: "yours", label: "Yours", count: yours.length, href: routes.calls(tripId, "yours") },
    { key: "done", label: "Done", count: resolved.length, href: routes.calls(tripId, "done") },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="display text-[28px] font-bold">Calls</h1>
        <span className="text-[13px] text-soft">Up to {maxStakePies} stamps a call</span>
      </div>

      <nav aria-label="Predictions" className="grid grid-cols-3 gap-1 rounded-2xl bg-line p-1">
        {tabs.map((x) => (
          <Link
            key={x.key}
            href={x.href}
            replace
            scroll={false}
            aria-current={tab === x.key ? "page" : undefined}
            className={`flex h-11 items-center justify-center rounded-xl font-semibold ${
              tab === x.key ? "bg-surface" : "text-soft hover:text-ink"
            }`}
          >
            {x.label}
            {x.count > 0 && <span className="mono ml-1.5">· {x.count}</span>}
          </Link>
        ))}
      </nav>

      <AskBox tripId={tripId} placeholder={t.questionPlaceholder} />

      <div className="flex flex-col gap-3">
        {shown.map((v) => (
          <MarketCard key={v.market.id} view={v} myProfitC={profitByMarket.get(v.market.id)} />
        ))}
      </div>

      {tab === "open" && open.length === 0 && (
        <EmptyState title={t.openEmptyTitle} sub={t.openEmptySub} />
      )}
      {tab === "yours" && yours.length === 0 && (
        <EmptyState
          title="You haven't asked anything yet."
          sub="Whoever asks a question is the one who resolves it."
        />
      )}
      {tab === "done" && resolved.length === 0 && (
        <p className="px-1 text-sm text-soft">{t.resolvedEmpty}</p>
      )}

      {tab === "open" && drafts.length > 0 && (
        <section className="mt-2 flex flex-col gap-1">
          <h2 className="display text-xl font-bold">{t.startersHeading}</h2>
          <p className="text-sm text-soft">{t.startersSub}</p>
          <Starters tripId={tripId} drafts={drafts} />
        </section>
      )}
    </div>
  );
}
