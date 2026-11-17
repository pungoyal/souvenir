"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { routes } from "@/lib/routes";
import { MicIcon } from "./ui";

/** Client-side only for the active mark: the pathname is the one thing a layout isn't handed. */
export function TripNav({
  tripId,
  waiting,
  talkLabel,
}: {
  tripId: string;
  waiting: number;
  talkLabel: string | null;
}) {
  const pathname = usePathname();
  const home = routes.trip(tripId);
  const under = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const calls =
    under(routes.calls(tripId)) || under(`${home}/p`) || under(routes.newMarket(tripId));
  const money = under(routes.bills(tripId));
  const talk = under(routes.talk(tripId));
  const group =
    under(routes.members(tripId)) ||
    under(`${home}/member`) ||
    under(routes.recap(tripId)) ||
    under(routes.settings(tripId));
  const today = !calls && !money && !talk && !group;

  return (
    <nav
      data-trip-nav
      aria-label="Trip"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <div
        className={`mx-auto grid max-w-2xl items-end px-3 pb-3 pt-2 text-xs font-semibold ${
          talkLabel ? "grid-cols-5" : "grid-cols-4"
        }`}
      >
        <Tab href={home} label="Today" active={today} badge={waiting} />
        <Tab href={routes.calls(tripId)} label="Calls" active={calls} />
        {talkLabel && (
          <Link
            href={routes.talk(tripId)}
            aria-current={talk ? "page" : undefined}
            className={`mx-1 flex h-[60px] flex-col items-center justify-center gap-0.5 rounded-full ${
              talk ? "bg-sun text-[#12141a]" : "bg-night text-white"
            }`}
          >
            <span className={talk ? "" : "text-sun"}>
              <MicIcon />
            </span>
            <span className="max-w-full truncate px-2">{talkLabel}</span>
          </Link>
        )}
        <Tab href={routes.bills(tripId)} label="Money" active={money} />
        <Tab href={routes.members(tripId)} label="Group" active={group} />
      </div>
    </nav>
  );
}

function Tab({
  href,
  label,
  active,
  badge = 0,
}: {
  href: string;
  label: string;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative flex min-h-[52px] flex-col items-center justify-center gap-1 ${
        active ? "text-ink" : "text-soft hover:text-ink"
      }`}
    >
      <span className={`h-1 w-7 rounded-full ${active ? "bg-sun" : ""}`} />
      {label}
      {badge > 0 && (
        <span className="mono absolute right-[calc(50%-30px)] top-1 min-w-[18px] rounded-full bg-no px-1 text-center text-[11px] font-bold leading-[18px] text-white">
          {badge}
          <span className="sr-only"> waiting on you</span>
        </span>
      )}
    </Link>
  );
}
