"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { routes } from "@/lib/routes";
import { Logo } from "./logo";

/** Steps aside inside a trip, which has its own header; only the client knows the pathname. */
export function AppBar({ signedIn, children }: { signedIn: boolean; children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/t/")) {
    return <div className="pt-[env(safe-area-inset-top)]" />;
  }
  return (
    <header className="pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-5 pt-4">
        <Link
          href={signedIn ? routes.trips : routes.home}
          className="flex min-h-11 items-center gap-2.5"
        >
          <Logo size={32} className="rounded-[22%]" />
          <span className="display text-xl font-bold">Souvenir</span>
        </Link>
        <div className="ml-auto flex items-center gap-2">{children}</div>
      </div>
    </header>
  );
}
