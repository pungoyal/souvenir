"use client";

// The phone in the middle of the table: tap your side, say it, tap again. It
// comes back spoken in the other language and stays on screen big enough to
// hold out — the speaking fails first, the screen never does.
//
// Listening is the browser's own recogniser, the only one there is (solid on
// Android Chrome, absent on some iPhones, where the page says so and you type).
// Speaking prefers the device's own voice and falls back to the server's. The
// conversation is component state — close the tab and it is gone. What
// outlives the tab is a phrase somebody deliberately kept, under a name.

import { useEffect, useRef, useState } from "react";
import { interpretAction } from "@/app/actions";
import {
  keepPayload,
  MAX_PHRASE_NAME,
  PhraseError,
  type PhraseVoice,
  type SavedPhrase,
  slugify,
  voiceFor,
} from "@/lib/phrases";
import {
  appendTurn,
  clampUtterance,
  type Gender,
  otherSide,
  type Pair,
  type Particle,
  pickVoice,
  type Side,
  sideOf,
  speakerOf,
  type Turn,
  warning,
  worthSaying,
} from "@/lib/talk";
import { phrasebook as phrasesOf } from "@/lib/views";
import { useOpenTrip } from "./trip-store";
import { MicIcon } from "./ui";

/** SpeechRecognition, which is not in every DOM lib and not on every phone. */
interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
}

interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}

function recognizer(): (new () => RecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => RecognitionLike;
    webkitSpeechRecognition?: new () => RecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function Talk({
  pair,
  canInterpret,
  serverSpeaks,
}: {
  pair: Pair;
  canInterpret: boolean;
  /** A voice service is configured, for phones with no voice of their own. */
  serverSpeaks: Record<Side, boolean>;
}) {
  const { tripId, me, t, state, append } = useOpenTrip();
  // Organisers can drop anybody's phrase; everyone else only their own.
  const organiser = me.role === "organiser";
  const kept = phrasesOf(state);
  // Who is speaking, for a local language whose polite ending depends on it.
  const [speaking, setSpeaking] = useState<Gender>("male");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [listening, setListening] = useState<Side | null>(null);
  const [partial, setPartial] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [canListen, setCanListen] = useState(false);
  // Which turn is being named, if any. One at a time, wherever it was tapped.
  const [naming, setNaming] = useState<Turn | null>(null);
  const [keeping, setKeeping] = useState(false);

  const active = useRef<RecognitionLike | null>(null);
  const primed = useRef(false);
  const nextId = useRef(1);

  // Voices arrive late, and on some devices twice.
  useEffect(() => {
    if (!window.speechSynthesis) return;
    const read = () => setVoices(window.speechSynthesis.getVoices());
    read();
    window.speechSynthesis.addEventListener("voiceschanged", read);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", read);
  }, []);
  useEffect(() => setCanListen(recognizer() !== null), []);
  useEffect(() => () => active.current?.abort(), []);

  const deviceVoice = pickVoice(voices, pair.them.tag, pair.them.voice);
  const note = warning(
    { listen: canListen, speak: deviceVoice !== null || serverSpeaks.them },
    pair.them.language,
  );
  const busy = listening !== null || thinking;
  const latest = turns[turns.length - 1];

  const sideVoice = (side: Side): PhraseVoice => {
    const speaker = speakerOf(pair, side);
    return { tag: speaker.tag, prefer: speaker.voice, side };
  };

  const speak = async (text: string, target: PhraseVoice) => {
    const chosen = pickVoice(voices, target.tag, target.prefer);
    if (chosen) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = chosen.lang;
      utterance.voice = voices.find((v) => v.name === chosen.name) ?? null;
      // Full speed is a wall to a listener who expected a tourist.
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
      return;
    }
    // The voice service is told a side and looks the language up itself, so a
    // phrase kept somewhere this trip no longer goes has nothing true to tell it.
    if (!target.side || !serverSpeaks[target.side]) return;
    try {
      const response = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId, text, side: target.side }),
      });
      if (!response.ok) throw new Error(String(response.status));
      const url = URL.createObjectURL(await response.blob());
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play().catch(() => URL.revokeObjectURL(url));
    } catch {
      // Silence would look like nothing was said; the words are on screen.
      setError("Couldn't say that out loud. Show them the screen.");
    }
  };

  const replay = (turn: Turn) => speak(turn.said, sideVoice(otherSide(turn.side)));

  const put = async (heard: string, pressed: Side) => {
    const utterance = clampUtterance(heard);
    if (!worthSaying(utterance)) {
      setError("Nothing came through. Try that again.");
      return;
    }
    const from = sideOf(utterance, pressed, pair);
    const to = otherSide(from);
    setThinking(true);
    try {
      const result = await interpretAction(tripId, utterance, to, speaking);
      if (!result.ok || !result.said) {
        setError(result.error ?? "That didn't come back.");
        return;
      }
      const turn: Turn = {
        id: nextId.current++,
        side: from,
        heard: utterance,
        said: result.said.text,
        roman: result.said.roman || undefined,
        literal: result.said.literal || undefined,
      };
      setTurns((current) => appendTurn(current, turn));
      await speak(turn.said, sideVoice(to));
    } finally {
      setThinking(false);
    }
  };

  /** Keep a turn under a name: sealed on this phone, the slug decided against the book it sees. */
  const keep = async (turn: Turn, name: string) => {
    setError(null);
    setKeeping(true);
    try {
      const payload = keepPayload(
        { name, ...turn },
        pair,
        kept.map((p) => p.slug),
      );
      const result = await append(payload);
      if (!result.ok) setError(result.error ?? "That didn't save.");
      else setNaming(null);
    } catch (err) {
      setError(err instanceof PhraseError ? err.message : "That didn't save.");
    } finally {
      setKeeping(false);
    }
  };

  const forget = async (phrase: SavedPhrase) => {
    if (!confirm(`Forget “${phrase.slug}”?`)) return;
    const result = await append({ t: "phrase.drop", id: phrase.id });
    if (!result.ok) setError(result.error ?? "Couldn't forget that one.");
  };

  const press = (side: Side) => {
    setError(null);
    if (listening) {
      active.current?.stop();
      return;
    }
    const Recognition = recognizer();
    if (!Recognition) {
      setError("This phone can't listen. Type it instead.");
      return;
    }
    // iOS will not speak later unless it has spoken once inside a tap.
    if (!primed.current && window.speechSynthesis) {
      primed.current = true;
      const silence = new SpeechSynthesisUtterance("");
      silence.volume = 0;
      window.speechSynthesis.speak(silence);
    }

    const rec = new Recognition();
    active.current = rec;
    rec.lang = speakerOf(pair, side).tag;
    rec.continuous = true;
    rec.interimResults = true;
    let heard = "";
    let failure: string | null = null;

    rec.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) heard += text;
        else interim += text;
      }
      setPartial((heard + interim).trim());
    };
    rec.onerror = (event) => {
      // "no-speech" and "aborted" are somebody changing their mind, not faults.
      if (event.error && event.error !== "no-speech" && event.error !== "aborted") {
        failure = event.error === "not-allowed" ? "Microphone blocked." : "Didn't catch that.";
      }
    };
    rec.onend = () => {
      active.current = null;
      setListening(null);
      setPartial("");
      if (failure) setError(failure);
      else if (heard.trim()) void put(heard, side);
      else setError("Didn't hear anything.");
    };

    setPartial("");
    setListening(side);
    rec.start();
  };

  const send = () => {
    const text = typed;
    setTyped("");
    setError(null);
    void put(text, "us");
  };

  const keepForm = (turn: Turn, className: string) =>
    naming?.id === turn.id && (
      <div className={className}>
        <KeepForm
          busy={keeping}
          onKeep={(name) => keep(turn, name)}
          onCancel={() => setNaming(null)}
        />
      </div>
    );

  const phrasebook = kept.length > 0 && (
    <section id="kept" className="scroll-mt-4 space-y-2">
      <h2 className="display text-xl font-bold">{t.phrasebookHeading}</h2>
      <div className="card list overflow-hidden">
        {kept.map((phrase) => {
          const voice = voiceFor(phrase, pair);
          return (
            <div key={phrase.id} className="flex items-center">
              <button
                type="button"
                onClick={() => speak(phrase.said, voice)}
                className="flex min-w-0 flex-1 items-center gap-3 px-4 py-2.5 text-left"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-night text-sun">
                  {PLAY}
                </span>
                <span className="min-w-0 flex-1">
                  {/* The slug as stored, not in caps: it is the name the member holds on to. */}
                  <span className="block truncate font-semibold">
                    {phrase.slug}
                    {/* Kept somewhere this deploy is no longer pointed at. */}
                    {voice.side === null && ` · ${phrase.language}`}
                  </span>
                  <span
                    lang={phrase.tag.split("-")[0]}
                    className="block truncate text-sm text-soft"
                  >
                    {phrase.said}
                  </span>
                  <span className="block truncate text-xs text-soft">
                    {phrase.roman || phrase.heard}
                  </span>
                </span>
              </button>
              {(organiser || phrase.keptBy === me.id) && (
                <button
                  type="button"
                  onClick={() => forget(phrase)}
                  aria-label={`Forget ${phrase.slug}`}
                  className="min-h-11 shrink-0 self-stretch px-4 text-[13px] text-soft underline"
                >
                  Forget
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );

  if (!canInterpret) {
    return (
      <div className="space-y-4">
        <div className="card p-5 text-sm text-soft">
          Interpreting isn't switched on for this deploy — it needs an LLM endpoint in the
          environment. Phrases already kept still play.
        </div>
        {phrasebook}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section
        aria-label={`Their side, in ${pair.them.language}`}
        className="flex flex-col gap-4 rounded-3xl bg-night p-5 text-white"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="eyebrow text-night-soft!">Them · {pair.them.language}</span>
          {pair.them.particles && (
            <fieldset className="flex rounded-full bg-night-line p-[3px]">
              <legend className="sr-only">You end polite sentences with</legend>
              {(Object.entries(pair.them.particles) as [Gender, Particle][]).map(
                ([who, particle]) => (
                  <button
                    key={who}
                    type="button"
                    aria-pressed={speaking === who}
                    title={particle.roman}
                    onClick={() => setSpeaking(who)}
                    className={`h-11 rounded-full px-4 font-semibold ${
                      speaking === who ? "bg-sun text-on-sun" : "text-white"
                    }`}
                  >
                    <span lang={pair.them.code}>{particle.native}</span>
                  </button>
                ),
              )}
            </fieldset>
          )}
        </div>

        {latest ? (
          <Card
            pair={pair}
            turn={latest}
            onReplay={() => replay(latest)}
            onKeep={() => setNaming(latest)}
          />
        ) : (
          <p className="display text-2xl font-semibold leading-snug text-night-soft">
            Speak, and it comes out in {pair.them.language}, here, big enough to show.
          </p>
        )}
        {latest && keepForm(latest, "rounded-2xl bg-surface p-3 text-ink")}

        <Mic
          label={listening === "them" ? "Tap when they finish" : "They speak"}
          tone="theirs"
          active={listening === "them"}
          disabled={busy && listening !== "them"}
          onPress={() => press("them")}
        />
      </section>

      <section aria-label={`Your side, in ${pair.us.language}`} className="flex flex-col gap-3">
        <span className="eyebrow">You · {pair.us.language}</span>
        <Mic
          label={listening === "us" ? "Tap when you're done" : "Tap to speak"}
          tone="ours"
          active={listening === "us"}
          disabled={busy && listening !== "us"}
          onPress={() => press("us")}
        />

        <p className="min-h-5 text-center text-sm text-soft" aria-live="polite">
          {partial ? (
            <span className="italic">{partial}</span>
          ) : listening ? (
            "Listening…"
          ) : thinking ? (
            "Interpreting…"
          ) : (
            ""
          )}
        </p>

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-no-tint px-3 py-2 text-center text-sm font-semibold text-no-deep"
          >
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && typed.trim()) send();
            }}
            aria-label={`Type it, in ${pair.us.language} or ${pair.them.language}`}
            placeholder="Or type it"
            className="field min-w-0 flex-1"
          />
          <button
            type="button"
            onClick={send}
            disabled={busy || !typed.trim()}
            className="btn btn-ink shrink-0 px-4"
          >
            Say
          </button>
        </div>
        <p className="text-[13px] text-soft">Nothing said here is saved unless you keep it.</p>
      </section>

      {note && <p className="text-center text-xs text-soft">{note}</p>}

      {phrasebook}

      {turns.length > 1 && (
        <div className="card list overflow-hidden">
          {turns
            .slice(0, -1)
            .reverse()
            .map((turn) => (
              <div key={turn.id}>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => replay(turn)}
                    className="flex min-h-11 min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left"
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        turn.side === "us" ? "bg-ink" : "bg-sun"
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{turn.said}</span>
                      <span className="block truncate text-xs text-soft">{turn.heard}</span>
                    </span>
                    <span className="text-soft">{PLAY}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNaming(naming?.id === turn.id ? null : turn)}
                    className="min-h-11 shrink-0 self-stretch px-4 text-[13px] text-soft underline"
                  >
                    Keep
                  </button>
                </div>
                {keepForm(turn, "px-4 pb-3")}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

const PLAY = (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
    <path d="M3 1.5v11l9-5.5z" />
  </svg>
);

function Mic({
  label,
  tone,
  active,
  disabled,
  onPress,
}: {
  label: string;
  tone: "ours" | "theirs";
  active: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      aria-pressed={active}
      className={`btn w-full text-lg disabled:opacity-40 ${
        active
          ? "h-[88px] rounded-3xl bg-no text-white"
          : tone === "ours"
            ? "btn-sun h-[88px] rounded-3xl"
            : "h-[72px] rounded-[20px] border-[1.5px] border-night-line text-white"
      }`}
    >
      {active ? (
        <span aria-hidden className="h-4 w-4 rounded-sm bg-current" />
      ) : (
        <MicIcon size={24} />
      )}
      {label}
    </button>
  );
}

/** Naming the thing you are keeping; the slug is shown as typed, since that is what the book will call it. */
function KeepForm({
  busy,
  onKeep,
  onCancel,
}: {
  busy: boolean;
  onKeep: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const slug = slugify(name);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        // biome-ignore lint/a11y/noAutofocus: the form only exists because it was just asked for.
        autoFocus
        value={name}
        maxLength={MAX_PHRASE_NAME}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && slug && !busy) onKeep(name);
          if (e.key === "Escape") onCancel();
        }}
        placeholder="Call it something — “no peanuts”"
        className="field min-w-0 flex-1"
      />
      <button
        type="button"
        onClick={() => onKeep(name)}
        disabled={busy || !slug}
        className="btn btn-ink shrink-0 px-3 py-2 text-sm"
      >
        Keep
      </button>
      <button type="button" onClick={onCancel} className="btn btn-line shrink-0 px-3 py-2 text-sm">
        Cancel
      </button>
      <p className="mono w-full text-xs text-soft">{slug ? `Kept as ${slug}` : " "}</p>
    </div>
  );
}

/** The turn being held out to somebody, at the size that survives a night market. */
function Card({
  pair,
  turn,
  onReplay,
  onKeep,
}: {
  pair: Pair;
  turn: Turn;
  onReplay: () => void;
  onKeep: () => void;
}) {
  const outbound = turn.side === "us";
  const target = speakerOf(pair, otherSide(turn.side));
  return (
    <div className="flex flex-col gap-3">
      {!outbound && <p className="eyebrow text-night-soft!">They said</p>}
      <p lang={target.code} className="break-words text-[34px] font-semibold leading-tight">
        {turn.said}
      </p>
      {turn.roman && <p className="mono text-sm text-night-soft">{turn.roman}</p>}
      <p className="text-[13px] text-night-soft">
        {outbound ? `You said “${turn.heard}”` : `In their words: “${turn.heard}”`}
        {turn.literal && outbound && ` · literally: ${turn.literal}`}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onReplay} className="btn bg-white px-4 text-on-sun">
          {PLAY} Say it again
        </button>
        <button
          type="button"
          onClick={onKeep}
          className="btn border-[1.5px] border-night-line px-4 font-semibold text-white"
        >
          Keep this phrase
        </button>
      </div>
    </div>
  );
}
