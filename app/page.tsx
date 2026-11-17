import Link from "next/link";
import { redirect } from "next/navigation";
import { JoinForm } from "@/components/join-form";
import { Postmark } from "@/components/postmark";
import { googleConfigured, passkeysConfigured } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { currentMember } from "@/lib/session";

// The front door for newcomers; members never see it.
export default async function Landing() {
  const me = await currentMember();
  if (me) redirect(routes.trips);

  return (
    <div className="mx-auto max-w-3xl">
      <section className="mt-2 rounded-3xl bg-sun p-6 text-[#12141a] sm:p-10">
        <div className="flex items-start justify-between gap-4">
          <p className="text-sm font-semibold uppercase tracking-[0.06em]">
            For a friend group going somewhere
          </p>
          <Postmark
            place="Wherever you're going"
            year={String(new Date().getFullYear())}
            top="Go"
          />
        </div>
        <h1 className="display mt-2 text-[40px] font-bold leading-[1.05] sm:text-6xl">
          One private app
          <br />
          for the whole trip
        </h1>
        <p className="mt-4 max-w-xl text-lg">
          It opens on what needs you today: the bill you haven't settled, the question the group is
          arguing about, the phrase for the taxi. Shared by one link, readable only by the people on
          it.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href="#start" className="btn h-14 bg-[#12141a] px-6 text-lg text-white">
            Open a trip
          </a>
          <Link href={routes.signin} className="btn h-14 border-[1.5px] border-[#12141a] px-6">
            Sign in
          </Link>
        </div>
        <p className="mt-4 text-sm">
          Free. Works in the browser on any phone. Nothing to install, no email needed to join.
        </p>
      </section>

      <section className="mt-14">
        <p className="eyebrow text-center">How it works</p>
        <ol className="mt-3 grid gap-4 sm:grid-cols-3">
          <Step n={1} title="Open a trip">
            Name it, say where it's going and when. That sets the language the interpreter speaks
            and the currencies the bills use — you never pick those again.
          </Step>
          <Step n={2} title="Drop one link in the chat">
            Friends tap it, choose a name, and they're in. The link carries the trip's key, so it
            goes to the group and nobody else.
          </Step>
          <Step n={3} title="Start calling it">
            Who books first, who's late to the airport, whether the boat trip happens. Every call is
            on the record, and the table settles it when the trip does.
          </Step>
        </ol>
      </section>

      <section className="mt-14 grid gap-4 sm:grid-cols-3">
        <Feature
          title="Call it"
          body="Anyone asks a yes-or-no question with plain rules for what counts. Everyone backs a side with stamps. When it resolves, the winning side splits exactly what the other side put in — no house, just who read the group best. The leaderboard ranks the season."
        />
        <Feature
          title="Split it"
          body="Bills in the money you're spending and the money you settle in — two currencies, decided when the trip opens. Log what you paid and for whom; the app works out who owes whom in the fewest transfers, and what's still open on the last day."
        />
        <Feature
          title="Say it"
          body="Tap your side, speak, hand the phone over. It says it aloud in Thai, Vietnamese or Bahasa, and what they say comes back in yours. Keep the phrases that worked; the whole trip can play them again."
        />
      </section>

      <section className="mt-14 card p-6">
        <p className="eyebrow">Private by design</p>
        <p className="display mt-1 text-3xl font-bold">Your trip stays between you</p>
        <div className="mt-3 grid gap-4 text-sm text-soft sm:grid-cols-2">
          <p>
            Everything the group writes — every call, comment, bill and verdict — is locked on your
            phone before it leaves it, with a key that only the people on the trip have. Our server
            keeps the locked copies in order and counts them; it can't read them, and neither can
            anyone who gets hold of it. Think of it as a shared notebook that only the group can
            open.
          </p>
          <p>
            The key travels with the invite link, in a part of the address the browser never sends
            anywhere. Got a new phone? Any friend on the trip sends you the key in one tap. A
            passkey that supports it keeps a sealed backup of your keys too, so signing in on a new
            device just works. Someone leaves? The organiser turns the key and everyone still on the
            trip gets the new one.{" "}
            <Link href={routes.privacy} className="text-link hover:underline">
              The plain-words version
            </Link>
          </p>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <Feature
          title="Stamps, not money"
          body="Stamps are points. Everyone starts at zero, calls cost stamps, and the winners' stamps come from the losers'. Nothing is bought, sold or cashed out; the bills are the only place real money appears, and that's just a record of what you told each other. For adults, 18 and over."
          small
        />
        <Feature
          title="A season, not a feed"
          body="A trip has a start and an end. Before it, the calls are about who commits; during it, about what happens; after it, the recap sums it up — the table, the rivalries, the biggest swings — and shares as a card for the group chat."
          small
        />
      </section>

      <section id="start" className="mx-auto mt-14 max-w-sm card p-6">
        <p className="eyebrow">Open a trip</p>
        <p className="display text-3xl font-bold">You're the organiser</p>
        <p className="mt-1 text-sm text-soft">
          Make a passkey — Face ID, a fingerprint, your phone — and open the first trip. Takes a
          minute; your friends need nothing but the link.
        </p>
        {passkeysConfigured ? (
          <JoinForm />
        ) : (
          <p className="mt-4 text-sm text-no-deep">Passkeys aren't available on this host.</p>
        )}
        {googleConfigured && (
          <p className="mt-4 text-center text-xs text-soft">
            Rather use Google?{" "}
            <Link href={routes.signin} className="text-link hover:underline">
              Sign in that way
            </Link>
            .
          </p>
        )}
        <p className="mt-4 text-center text-xs text-soft">
          <Link href={routes.terms} className="hover:underline">
            Terms
          </Link>{" "}
          ·{" "}
          <Link href={routes.privacy} className="hover:underline">
            Privacy
          </Link>
        </p>
      </section>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="card p-4">
      <p className="mono flex h-8 w-8 items-center justify-center rounded-full bg-sun font-bold text-[#12141a]">
        {n}
      </p>
      <p className="display mt-3 text-xl font-bold">{title}</p>
      <p className="mt-1 text-sm text-soft">{children}</p>
    </li>
  );
}

function Feature({ title, body, small = false }: { title: string; body: string; small?: boolean }) {
  return (
    <div className="card p-4">
      <p className={`display font-bold ${small ? "text-xl" : "text-2xl"}`}>{title}</p>
      <p className="mt-1 text-sm text-soft">{body}</p>
    </div>
  );
}
