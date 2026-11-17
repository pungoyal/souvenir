"use client";

import Link from "next/link";
import { useState } from "react";
import type { Side } from "@/lib/engine";
import { fmtPies, stampsWord, toCents } from "@/lib/pies";
import { useTrip } from "./trip-store";
import { useAct } from "./use-act";

const DEFAULT_PIES = 3;

/** One side per member (lib/replay): once a side is taken this adds to it or switches. */
export function BetPanel({
  marketId,
  mySide,
  myStakeC,
  detailHref,
}: {
  marketId: string;
  mySide: Side | null;
  myStakeC: number;
  /** On a card: show the call that stands and leave changing it to the prediction's page. */
  detailHref?: string;
}) {
  const { t, append, maxStakePies } = useTrip();
  const { pending, error, act } = useAct(t.oops);

  // Infinite bank: the per-prediction exposure cap is the only ceiling.
  const maxPies = Math.floor((toCents(maxStakePies) - myStakeC) / 100);
  const [pies, setPies] = useState(DEFAULT_PIES);
  const clamped = Math.min(Math.max(pies, 1), Math.max(maxPies, 1));

  const call = (side: Side) =>
    act(() => append({ t: "call", marketId, side, amountC: toCents(clamped) }));
  const switchSide = () => act(() => append({ t: "switch", marketId }));
  const other: Side = mySide === "yes" ? "no" : "yes";

  const stepper = (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-soft">
        {mySide ? "Add stamps" : "Stamps"}
        <span className="sr-only">, up to {maxPies}</span>
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="One stamp less"
          className="btn btn-line h-11 w-11 text-xl"
          disabled={clamped <= 1 || pending}
          onClick={() => setPies(clamped - 1)}
        >
          −
        </button>
        <span className="mono w-10 text-center text-xl font-bold" aria-live="polite">
          {clamped}
        </span>
        <button
          type="button"
          aria-label="One stamp more"
          className="btn btn-line h-11 w-11 text-xl"
          disabled={clamped >= maxPies || pending}
          onClick={() => setPies(clamped + 1)}
        >
          +
        </button>
      </div>
    </div>
  );

  const mine = mySide && (
    <div
      className={`flex items-center justify-between gap-2 rounded-xl px-3 py-1 text-sm font-semibold ${
        mySide === "yes" ? "bg-yes-tint text-yes-deep" : "bg-no-tint text-no-deep"
      }`}
    >
      <span className="py-2">
        You: {fmtPies(myStakeC)} {stampsWord(myStakeC)} on {mySide}
      </span>
      {detailHref ? (
        <Link href={detailHref} className="flex min-h-11 items-center underline">
          Change
        </Link>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={switchSide}
          className="min-h-11 underline disabled:opacity-40"
        >
          Switch to {other}
        </button>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {mine}
      {mySide && detailHref ? null : maxPies < 1 ? (
        <p className="text-sm text-soft">{t.stakeLimit}</p>
      ) : (
        <>
          {stepper}
          {mySide ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => call(mySide)}
              className={`btn h-[52px] text-base ${mySide === "yes" ? "btn-yes" : "btn-no"}`}
            >
              Add {clamped} to {mySide}
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => call("yes")}
                className="btn btn-yes h-[52px] text-base"
              >
                Yes · {clamped}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => call("no")}
                className="btn btn-no h-[52px] text-base"
              >
                No · {clamped}
              </button>
            </div>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="text-sm font-semibold text-no-deep">
          {error}
        </p>
      )}
      {pending && <p className="text-sm text-soft">{t.recording}</p>}
    </div>
  );
}
