"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, Heart } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";

import { AuthCtaButtons } from "./auth-cta-buttons";
import { CommerceCard } from "./commerce-card";

const SCREEN = "mx-auto min-h-screen max-w-[480px] bg-surface";

/**
 * « Mis guardados » — the logged-in User's favorite fiches. Reads the real
 * `favorites.listMine`, which returns ONLY `publicado` fiches, so a suspended or
 * deleted negocio silently drops off the list (no error). An anonymous Visiteur
 * is invited to sign in; a logged-in User with no Favoris sees an empty state.
 * Each card keeps its live favourite heart, so unsaving from here removes the
 * card reactively.
 */
export function SavedScreen() {
  const me = useQuery(api.table.users.currentUser);
  const saved = useQuery(api.table.favorites.listMine, me ? {} : "skip");

  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={SCREEN}>
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-hairline bg-surface px-4 py-3.5">
        <Link
          href="/"
          aria-label="Volver al directorio"
          className="flex size-9 items-center justify-center rounded-full text-ink"
        >
          <ChevronLeft className="size-5" strokeWidth={2.4} />
        </Link>
        <span className="text-lg font-bold tracking-[-0.01em] text-ink">
          Mis guardados
        </span>
      </header>

      {me === undefined || saved === undefined ? (
        <LoadingGrid />
      ) : me === null ? (
        <SignedOutState />
      ) : saved.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-wrap justify-center gap-x-3.5 gap-y-6 px-4 py-6">
          {saved.map((commerce) => (
            <CommerceCard key={commerce._id} commerce={commerce} now={now} />
          ))}
        </div>
      )}
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="flex flex-wrap justify-center gap-x-3.5 gap-y-6 px-4 py-6">
      {[0, 1, 2, 3].map((card) => (
        <div
          key={card}
          className="h-[230px] w-[204px] animate-pulse rounded-card bg-muted"
        />
      ))}
    </div>
  );
}

function SignedOutState() {
  return (
    <div className="px-8 py-[70px] text-center">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-chip bg-muted text-ink-faint">
        <Heart className="size-[26px]" strokeWidth={2} />
      </div>
      <div className="text-base font-bold text-ink">
        Inicia sesión para ver tus guardados
      </div>
      <div className="mx-auto mt-1.5 max-w-[280px] text-[13px] text-ink-muted">
        Crea una cuenta o inicia sesión para guardar tus negocios favoritos y
        encontrarlos fácilmente.
      </div>
      <AuthCtaButtons className="mx-auto mt-5 max-w-[280px]" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="px-8 py-[70px] text-center">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-chip bg-muted text-ink-faint">
        <Heart className="size-[26px]" strokeWidth={2} />
      </div>
      <div className="text-base font-bold text-ink">
        Aún no has guardado negocios
      </div>
      <div className="mx-auto mt-1.5 max-w-[280px] text-[13px] text-ink-muted">
        Toca el corazón en cualquier negocio para guardarlo y verlo aquí.
      </div>
      <Link
        href="/"
        className="mt-5 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline"
      >
        Explorar el directorio
      </Link>
    </div>
  );
}
