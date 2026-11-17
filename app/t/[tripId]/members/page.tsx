import Link from "next/link";
import { GroupLink } from "@/components/group-link";
import { InviteForm } from "@/components/invite-form";
import { Leaderboard } from "@/components/leaderboard";
import { ShutRecovery } from "@/components/recovery";
import { ShutRekey } from "@/components/rekey-list";
import { RevokeInvite } from "@/components/revoke-invite";
import { RotateKey } from "@/components/rotate-key";
import { Sealed } from "@/components/sealed";
import { Chevron } from "@/components/ui";
import {
  isOrganiser,
  listInvites,
  listRecoveries,
  listRekeys,
  membersOf,
  passkeyHolders,
} from "@/lib/data";
import { env } from "@/lib/env";
import { fmtDate, timeAgo, timeUntil } from "@/lib/format";
import { inviteUrl, partitionInvites } from "@/lib/invites";
import { lingoOf } from "@/lib/lingo";
import { routes } from "@/lib/routes";
import { requireTrip } from "@/lib/session";
import { tripPhase, tripToday } from "@/lib/trips";

/**
 * The group and the leaderboard. The table is sealed and comes from the phone; the invite,
 * rekey and recovery machinery below is the server's, and everybody sees it: being seen is the
 * check.
 */
export default async function MembersPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const ctx = await requireTrip(tripId);
  const { me } = ctx;
  const t = lingoOf(me.lingo);
  const canInvite = isOrganiser(ctx);
  const ended = tripPhase(ctx.trip, tripToday(ctx.trip)) === "after";

  const [roster, invites, passkeys, recoveries, rekeys] = await Promise.all([
    membersOf(tripId),
    listInvites(tripId),
    passkeyHolders(tripId),
    listRecoveries(tripId),
    listRekeys(tripId),
  ]);
  const { groupLink, personal } = partitionInvites(invites, new Date());
  const nameById = new Map(roster.map((m) => [m.id, m.name]));

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="display text-[28px] font-bold">{t.membersTitle}</h1>
        {canInvite && (
          <a href="#invite" className="btn btn-ink px-4">
            Invite
          </a>
        )}
      </div>

      <Sealed>
        <Leaderboard minResolved={env.RANKED_MIN_RESOLVED} passkeys={[...passkeys]} />
        <RotateKey since={ctx.trip.keyStaleSince} />
      </Sealed>

      <nav aria-label="More about this trip" className="card list mt-5 overflow-hidden">
        <More
          href={routes.recap(tripId)}
          title={ended ? "The recap" : "Recap so far"}
          sub="Rivalries, biggest swings, and a card for the group chat."
        />
        <More href={routes.inbox(tripId)} title="Activity" sub="Everything that has happened." />
        <More
          href={routes.privacy}
          title={`Private to the ${roster.length} of you`}
          sub={t.sealedNote}
        />
        {canInvite && (
          <More
            href={routes.settings(tripId)}
            title="Trip settings"
            sub="Name, dates, the cap on a call."
          />
        )}
      </nav>

      {rekeys.length > 0 && (
        <Section
          title="Key links"
          note="A key link gives one member's phone the key to this trip. It only works signed in as them, for half an hour, once — and it is listed here while it is live so nobody hands one out quietly."
        >
          <ul className="mt-2 card list">
            {rekeys.map((r) => (
              <Row
                key={r.row.code}
                who={r.forMember.name}
                detail={`${
                  r.mintedBy
                    ? r.mintedBy.id === r.forMember.id
                      ? "for their other phone"
                      : `from ${r.mintedBy.name}`
                    : "from the operator"
                } · expires ${timeUntil(r.row.expiresAt)}`}
              >
                <ShutRekey tripId={tripId} code={r.row.code} />
              </Row>
            ))}
          </ul>
        </Section>
      )}

      {(recoveries.live.length > 0 || recoveries.used.length > 0) && (
        <Section
          title="Recovery links"
          note="A recovery link puts a new passkey on somebody's seat, so whoever opens it is them. Nothing stops an organiser making one — what stops it going unnoticed is this list, which everybody can read. If one names you and you didn't ask for it, shut it."
        >
          {recoveries.live.length > 0 && (
            <ul className="mt-2 card list overflow-hidden border-sun">
              {recoveries.live.map((r) => (
                <Row
                  key={r.row.code}
                  className="bg-sun-tint"
                  who={r.member.name}
                  detail={`made by ${r.mintedBy?.name ?? "the operator"} · expires ${timeUntil(r.row.expiresAt)}`}
                >
                  {/* The member a link names can always shut it (revokeRecovery). */}
                  {(canInvite || r.member.id === me.id) && (
                    <ShutRecovery tripId={tripId} code={r.row.code} />
                  )}
                </Row>
              ))}
            </ul>
          )}
          {recoveries.used.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-soft">
              {recoveries.used.map((r) => (
                <li key={r.row.code}>
                  {r.member.name} came back through a link from {r.mintedBy?.name ?? "the operator"}
                  {r.row.usedAt ? ` · ${timeAgo(r.row.usedAt)}` : ""}
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {personal.length > 0 && (
        <Section title="Invited, not joined yet">
          <ul className="mt-2 card list">
            {personal.map((i) => (
              <Row
                key={i.code}
                who={i.label}
                detail={`invited by ${nameById.get(i.invitedBy) ?? "an organiser"} · link expires ${fmtDate(i.expiresAt)}`}
              >
                {/* Whole only where minted; here it can only be shut. */}
                {canInvite && <RevokeInvite code={i.code} />}
              </Row>
            ))}
          </ul>
        </Section>
      )}

      {canInvite && (
        <Section
          id="invite"
          title="Invite a friend"
          note="Create a link and send it however you'd normally reach them. They pick a name, make a passkey, and they're in — no email, no Google account. The link carries the trip's key, so send it to them and nobody else."
        >
          <div className="mt-2">
            <Sealed>
              <InviteForm />
            </Sealed>
          </div>
          <Section
            title="Or one link for the group"
            note="Anyone holding it can join, as often as people click it, for seven days. Paste it in the group chat — and shut it if it ever ends up somewhere else."
          >
            <div className="mt-2">
              <Sealed>
                <GroupLink
                  existing={
                    groupLink && {
                      code: groupLink.code,
                      url: inviteUrl(env.AUTH_URL, groupLink.code),
                      expiresAt: groupLink.expiresAt,
                      useCount: groupLink.useCount,
                    }
                  }
                />
              </Sealed>
            </div>
          </Section>
        </Section>
      )}
    </div>
  );
}

function More({ href, title, sub }: { href: string; title: string; sub: string }) {
  return (
    <Link href={href} className="flex min-h-14 items-center justify-between gap-3 px-4 py-3">
      <span className="min-w-0">
        <span className="block font-semibold">{title}</span>
        <span className="block text-[13px] text-soft">{sub}</span>
      </span>
      <span className="text-soft">
        <Chevron />
      </span>
    </Link>
  );
}

function Section({
  id,
  title,
  note,
  children,
}: {
  id?: string;
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-6 scroll-mt-4">
      <h2 className="display text-xl font-bold">{title}</h2>
      {note && <p className="mt-0.5 text-[13px] text-soft">{note}</p>}
      {children}
    </section>
  );
}

function Row({
  who,
  detail,
  className = "",
  children,
}: {
  who: string;
  detail: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <li className={`flex items-center gap-3 px-4 py-2.5 text-sm ${className}`}>
      <span className="min-w-0 flex-1">
        <span className="font-semibold">{who}</span>
        <span className="block text-xs text-soft sm:inline sm:text-sm">
          <span className="hidden sm:inline"> · </span>
          {detail}
        </span>
      </span>
      {children}
    </li>
  );
}
