"use client";

import { useState } from "react";
import type { Side } from "@/lib/engine";
import { useTrip } from "./trip-store";
import { useAct } from "./use-act";

type Outcome = Side | "refunded";

const OPTIONS: { value: Outcome; label: string; hint: string | null }[] = [
  { value: "yes", label: "It happened", hint: "The yes side splits the whole pool" },
  { value: "no", label: "It didn't", hint: "The no side splits the whole pool" },
  { value: "refunded", label: "Void", hint: null },
];

export function ResolvePanel({ marketId }: { marketId: string }) {
  const { t, append } = useTrip();
  const { pending, error, act } = useAct(t.oops);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);

  const resolve = () =>
    act(async () => {
      if (!outcome) return;
      const res = await append({ t: "resolve", marketId, outcome, note });
      if (!res.ok) setConfirming(false);
      return res;
    });

  return (
    <div className="card border-sun p-4">
      <p className="eyebrow">You asked · yours to resolve</p>
      <p className="mt-1 text-sm text-soft">{t.resolveSub}</p>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            title={opt.hint ?? t.voidHint}
            onClick={() => {
              setOutcome(opt.value);
              setConfirming(false);
            }}
            aria-pressed={outcome === opt.value}
            className={`btn h-12 text-sm ${
              outcome === opt.value
                ? opt.value === "yes"
                  ? "btn-yes"
                  : opt.value === "no"
                    ? "btn-no"
                    : "btn-ink"
                : "btn-line"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="How you decided (goes on the permanent record)"
        rows={2}
        className="field mt-3"
      />

      {!confirming ? (
        <button
          type="button"
          disabled={!outcome || pending}
          onClick={() => setConfirming(true)}
          className="btn btn-ink mt-3 h-12 w-full"
        >
          Resolve this prediction
        </button>
      ) : (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={resolve}
            className="btn btn-ink h-12 flex-1"
          >
            {pending
              ? "Resolving…"
              : `Confirm ${outcome === "refunded" ? "void" : outcome}. It's final.`}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirming(false)}
            className="btn btn-line px-4"
          >
            Back
          </button>
        </div>
      )}

      {error && <p className="mt-3 text-sm font-semibold text-no-deep">{error}</p>}
    </div>
  );
}
