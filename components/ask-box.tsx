import { routes } from "@/lib/routes";

/**
 * Asking the group something, from wherever the thought arrives: type the question, and the
 * next screen only wants to know how it will be decided. A plain GET form, so it works before
 * the page has woken up.
 */
export function AskBox({ tripId, placeholder }: { tripId: string; placeholder: string }) {
  return (
    <form action={routes.newMarket(tripId)} className="card flex flex-col gap-2.5 p-3">
      <label htmlFor="ask" className="eyebrow px-1 pt-1">
        Ask the group
      </label>
      <div className="flex gap-2">
        <input
          id="ask"
          name="q"
          type="text"
          required
          maxLength={200}
          autoComplete="off"
          placeholder={placeholder}
          className="field min-w-0 flex-1"
        />
        <button type="submit" className="btn btn-ink shrink-0 px-4">
          Ask
        </button>
      </div>
    </form>
  );
}
