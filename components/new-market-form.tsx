"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { polishAction } from "@/app/actions";
import { lingoOf } from "@/lib/lingo";
import type { PolishedDraft } from "@/lib/llm";
import { routes } from "@/lib/routes";
import { draftError } from "@/lib/views";
import { useTrip } from "./trip-store";
import { useAct } from "./use-act";

export function NewMarketForm({
  tripId,
  polishAvailable,
  lingo = "english",
  initial,
}: {
  tripId: string;
  polishAvailable: boolean;
  lingo?: string;
  initial?: { question: string; criteria: string };
}) {
  const t = lingoOf(lingo);
  const router = useRouter();
  const { append } = useTrip();
  const { pending: publishing, error, setError, act } = useAct("Couldn't publish.");
  const [polishing, startPolish] = useTransition();

  const [question, setQuestion] = useState(initial?.question ?? "");
  const [criteria, setCriteria] = useState(initial?.criteria ?? "");
  const [suggestion, setSuggestion] = useState<PolishedDraft | null>(null);
  const [feedback, setFeedback] = useState("");

  const polish = () =>
    startPolish(async () => {
      setError(null);
      const res = await polishAction(question, criteria, feedback);
      if (!res.ok || !res.draft) {
        setError(res.error ?? "Couldn't rewrite it. Try again.");
      } else {
        setSuggestion(res.draft);
        setFeedback("");
      }
    });

  const publish = () =>
    act(async () => {
      const refused = draftError(question, criteria);
      if (refused) return { ok: false, error: refused };
      const id = crypto.randomUUID();
      const res = await append({
        t: "market.create",
        id,
        question: question.trim(),
        criteria: criteria.trim(),
      });
      if (res.ok) router.push(routes.market(tripId, id));
      return res;
    });

  const busy = publishing || polishing;

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="eyebrow">The question</span>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={200}
          placeholder={t.questionPlaceholder}
          className="field mt-1.5 font-semibold"
        />
      </label>

      <label className="block">
        <span className="eyebrow">How you'll decide it</span>
        <textarea
          value={criteria}
          onChange={(e) => setCriteria(e.target.value)}
          maxLength={2000}
          rows={4}
          placeholder={t.criteriaPlaceholder}
          className="field mt-1.5"
        />
      </label>

      {polishAvailable && (
        <div className="rounded-[20px] bg-sun-tint p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">
              <span className="font-semibold">Want it tightened up?</span>{" "}
              <span className="text-soft">{t.magicPitch}</span>
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={polish}
              className="btn btn-line shrink-0 px-4 text-sm"
            >
              {polishing ? "Rewriting…" : suggestion ? "Try again" : "Suggest a rewrite"}
            </button>
          </div>

          {suggestion && (
            <div className="mt-3 min-w-0 rounded-md border border-line bg-surface p-3">
              <p className="display break-words text-lg font-bold leading-snug">
                {suggestion.question}
              </p>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm">{suggestion.criteria}</p>
              <p className="mt-2 break-words text-xs italic text-soft">{suggestion.rationale}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setQuestion(suggestion.question);
                    setCriteria(suggestion.criteria);
                    setSuggestion(null);
                  }}
                  className="btn btn-ink px-3 py-1.5 text-sm"
                >
                  Use this version
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setSuggestion(null)}
                  className="btn btn-line px-3 py-1.5 text-sm"
                >
                  Keep mine
                </button>
                <input
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Say what to change, then try again"
                  className="field min-w-0 flex-1"
                />
              </div>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={publish}
        className="btn btn-ink h-14 w-full text-base"
      >
        {publishing ? "Asking…" : "Ask the group"}
      </button>

      {error && <p className="text-sm font-semibold text-no-deep">{error}</p>}
    </div>
  );
}
