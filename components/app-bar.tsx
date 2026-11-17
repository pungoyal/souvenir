"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { routes } from "@/lib/routes";
import { Logo } from "./logo";

/**
 * The bar across the top of every page that is not inside a trip. A trip has its own header
 * (its name, its place, your face) and its tabs at the bottom, so this one steps aside there —
 * the pathname is the one thing the server doesn't hand a layout.
 */
export function AppBar({
  signedIn,
  children,
}: {
  signedIn: boolean;
  /** The right-hand side: the member's face, or the way in. */
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (pathname.startsWith("/t/")) {
    // Installed to a home screen, the page runs under the status bar.
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
