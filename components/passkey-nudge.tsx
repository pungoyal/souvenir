import Link from "next/link";
import { AddPasskeyButton } from "@/components/passkeys";
import { routes } from "@/lib/routes";

/**
 * For every member who hasn't enrolled a passkey, on every page: Google sign-in is a fallback,
 * so the button is here, not a page away. Plain language in every lingo: a notice, not flavour.
 */
export function PasskeyNudge({ needsPicture }: { memberId?: string; needsPicture: boolean }) {
  return (
    <div className="mx-auto mt-4 max-w-2xl px-5">
      <div className="card flex flex-wrap items-center gap-x-4 gap-y-3 border-sun bg-sun-tint px-4 py-3">
        <div className="min-w-64 flex-1">
          <p className="font-semibold">Add a passkey so this phone can sign you in.</p>
          <p className="text-[13px] text-soft">
            One tap with Face ID or a fingerprint. No password, nothing about you stored.
            {needsPicture && (
              <>
                {" "}
                While you're at it,{" "}
                <Link href={routes.account} className="text-link hover:underline">
                  upload a picture
                </Link>{" "}
                : initials are standing in for your face.
              </>
            )}
          </p>
        </div>
        <AddPasskeyButton />
      </div>
    </div>
  );
}
