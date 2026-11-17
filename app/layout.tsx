import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import Link from "next/link";
import { AppBar } from "@/components/app-bar";
import { Avatar } from "@/components/avatar";
import { BackupNudge } from "@/components/backup-nudge";
import { ErrorReporter } from "@/components/error-reporter";
import { KeyringProvider } from "@/components/keyring";
import { PasskeyNudge } from "@/components/passkey-nudge";
import { RecoveryNotice } from "@/components/recovery-notice";
import { StaleBuild } from "@/components/stale-build";
import { TermsNudge } from "@/components/terms-nudge";
import { ThemeToggle } from "@/components/theme-toggle";
import { passkeysConfigured, RP_ID } from "@/lib/auth";
import { build } from "@/lib/build";
import { passkeyBackups, recoveryNoticeFor } from "@/lib/data";
import { env } from "@/lib/env";
import { lingoOf } from "@/lib/lingo";
import { routes } from "@/lib/routes";
import { currentMember } from "@/lib/session";
import "./globals.css";

const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk" });
const body = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  // Standalone deploy: no platform env supplies a base, so og:image would resolve to localhost.
  metadataBase: new URL(env.AUTH_URL),
  title: { default: "Souvenir", template: "%s · Souvenir" },
  description:
    "The app for the trip that actually happens. Call who shows up, who's late, who pays — play-money stamps, real bragging rights.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Souvenir", statusBarStyle: "default" },
  openGraph: {
    siteName: "Souvenir",
    title: "Souvenir",
    description: "The app for the trip that actually happens.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef0f3" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1014" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const member = await currentMember();
  const [passkeys, recoveries] = member
    ? await Promise.all([passkeyBackups(member.id), recoveryNoticeFor(member.id)])
    : [[], null];
  const liveRecovery = recoveries?.live[0] ?? null;
  const usedRecovery = recoveries?.used[0] ?? null;
  const needsPasskey = passkeysConfigured && member != null && passkeys.length === 0;
  const needsTerms = member != null && member.termsAcceptedAt == null;
  const t = lingoOf(member?.lingo ?? "english");

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Saved theme before first paint; suppressHydrationWarning covers the attribute. */}
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: static theme bootstrap, no user input
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`,
          }}
        />
      </head>
      <body className={`${display.variable} ${body.variable} min-h-screen antialiased`}>
        <ErrorReporter />
        <AppBar signedIn={member != null}>
          {member ? (
            <Link
              href={routes.account}
              className="flex min-h-11 items-center gap-2 rounded-full bg-surface p-1.5 sm:pl-4"
              title="Your account"
            >
              <span className="hidden text-sm font-semibold sm:inline">{member.name}</span>
              <Avatar member={member} size={32} />
            </Link>
          ) : (
            <Link href={routes.signin} className="btn btn-line px-4 text-sm">
              Sign in
            </Link>
          )}
        </AppBar>
        <StaleBuild />
        {member && (liveRecovery || usedRecovery) && (
          <RecoveryNotice
            live={liveRecovery && { code: liveRecovery.code, expiresAt: liveRecovery.expiresAt }}
            usedAt={usedRecovery?.usedAt ?? null}
          />
        )}
        {member && needsTerms && <TermsNudge />}
        {member && needsPasskey && !needsTerms && (
          <PasskeyNudge memberId={member.id} needsPicture={member.avatarUpdatedAt == null} />
        )}
        <KeyringProvider signedIn={member != null}>
          {member && !needsTerms && passkeys.length > 0 && (
            <BackupNudge
              rpId={RP_ID}
              held={passkeys.map((p) => p.id)}
              wrapped={passkeys.filter((p) => p.wrapped).map((p) => p.id)}
            />
          )}
          <main className="mx-auto max-w-5xl px-5 py-5">{children}</main>
        </KeyringProvider>
        <footer className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-1 px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-4 text-xs text-soft">
          <span>{t.footer}</span>
          <span className="ml-auto flex gap-3">
            <ThemeToggle />
            <Link href={routes.terms} className="hover:underline">
              Terms
            </Link>
            <Link href={routes.privacy} className="hover:underline">
              Privacy
            </Link>
            {build && (
              <span className="mono" title="The commit this build is from">
                {build.short}
              </span>
            )}
          </span>
        </footer>
      </body>
    </html>
  );
}
