import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * The « Crear cuenta » / « Iniciar sesión » call-to-action pair, shared by the
 * favourite sign-in invitation dialog and the signed-out « Mis guardados »
 * state so both route to the same auth screens with the same styling.
 *
 * `onNavigate` fires when either link is followed — the invitation dialog uses
 * it to close itself, so it doesn't stay open over the auth screen (the dialog
 * lives in a provider that persists across client-side navigation).
 */
export function AuthCtaButtons({
  className,
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Link
        href="/signup"
        onClick={onNavigate}
        className="flex w-full items-center justify-center rounded-button bg-primary py-3 text-sm font-bold text-primary-foreground"
      >
        Crear cuenta
      </Link>
      <Link
        href="/login"
        onClick={onNavigate}
        className="flex w-full items-center justify-center rounded-button border border-hairline-strong py-3 text-sm font-semibold text-ink"
      >
        Iniciar sesión
      </Link>
    </div>
  );
}
