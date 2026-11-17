import Link from "next/link";
import { routes } from "@/lib/routes";
import type { StarterDraft } from "@/lib/starters";

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
            <svg
              aria-hidden="true"
              className="shrink-0"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <path d="M8 3v10M3 8h10" />
            </svg>
          </Link>
        </li>
      ))}
    </ul>
  );
}
