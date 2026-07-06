"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Clock, Heart, Instagram, MapPin, Phone, Store } from "lucide-react";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@packages/backend/convex/_generated/api";
import {
  commerceStatus,
  formatMinutes,
} from "@packages/backend/convex/lib/horario";

import {
  formatColombianPhone,
  instagramLink,
  whatsAppLink,
} from "@/lib/commerce-contact";
import { PhotoCarousel } from "./photo-carousel";
import { StatusBadge } from "./status-badge";
import { SubcategoryPill } from "./subcategory-pill";
import { useRecordVisit } from "./use-record-visit";
import { useWhatsAppContact } from "./use-whatsapp-contact";
import { WhatsAppGlyph } from "./whatsapp-button";

/** The public projection of a Commerce returned by `getPublicById` (never null here). */
type DetailCommerce = NonNullable<
  FunctionReturnType<typeof api.table.commerces.getPublicById>
>;

const SCREEN = "mx-auto min-h-screen max-w-[480px] bg-surface";

/**
 * Public Commerce detail screen, faithful to the Claude Design prototype:
 * swipeable photo carousel with position dots, floating back button,
 * sub-category pill, real-time opening badge (from the horario module), name,
 * location, description, a « Horario » card, a « Redes y contacto » section and
 * a sticky « Escribir por WhatsApp » CTA.
 *
 * Fetches a single fiche by id from `getPublicById`, which only ever returns a
 * `publicado` Commerce with the internal fields (`resides`, `notas`, …) already
 * stripped: a `pendiente`/`suspendido` fiche or an unknown id yields `null`,
 * rendering the "no encontrado" state. Opening a real fiche records a Visite
 * (deduplicated per visitor / fiche / Bogota day, owner excluded — ADR-0001).
 * The WhatsApp CTA records a Contact WhatsApp Événement on click and stays a
 * real `wa.me` anchor, so the redirect happens through the browser even if
 * tracking fails (contact prime sur la stat).
 */
export function CommerceDetailScreen({ id }: { id: string }) {
  const router = useRouter();
  const commerce = useQuery(api.table.commerces.getPublicById, { id });

  // Record a Visite once the fiche resolves to a real publicado Commerce. The
  // server dedups to one Visite per (visitor, fiche, Bogota day) and excludes
  // the Entrepreneur on their own fiche (ADR-0001).
  useRecordVisit(commerce ? commerce._id : null);

  // Recompute the opening badge every minute so "Abierto/Cerrado" stays live.
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  if (commerce === undefined) {
    return <DetailLoading />;
  }
  if (commerce === null) {
    return <DetailNotFound />;
  }

  return (
    <DetailContent
      commerce={commerce}
      now={now}
      onBack={() => router.back()}
    />
  );
}

function DetailContent({
  commerce,
  now,
  onBack,
}: {
  commerce: DetailCommerce;
  now: Date;
  onBack: () => void;
}) {
  const secondary = commerce.subcategories?.[0] ?? commerce.category;
  const status = commerce.horario ? commerceStatus(commerce.horario, now) : null;
  const horarioLines = horarioCardLines(commerce.horario);
  const phone = formatColombianPhone(commerce.whatsapp);
  const waHref = whatsAppLink(commerce.whatsapp);
  const ig = commerce.instagram ? instagramLink(commerce.instagram) : null;
  const contactWhatsApp = useWhatsAppContact();

  return (
    <div className={`${SCREEN} pb-24`}>
      <div className="relative">
        <PhotoCarousel name={commerce.name} photos={commerce.photos} />

        <button
          type="button"
          aria-label="Volver"
          onClick={onBack}
          className="absolute left-4 top-4 flex size-[38px] items-center justify-center rounded-full bg-white/95 text-ink shadow-[0_2px_8px_rgba(20,30,50,0.18)]"
        >
          <ChevronLeft className="size-5" strokeWidth={2.4} />
        </button>

        {/* Favourite heart — visual placeholder, wired to favourites in a later slice. */}
        <button
          type="button"
          aria-label="Guardar en favoritos"
          data-slot="favorite-button"
          className="absolute right-4 top-4 flex size-[38px] items-center justify-center rounded-full bg-white/95 text-ink-soft shadow-[0_2px_8px_rgba(20,30,50,0.18)]"
        >
          <Heart className="size-[19px]" strokeWidth={2} />
        </button>
      </div>

      <div className="px-5 pt-5">
        <div className="mb-3 flex items-center gap-2">
          <SubcategoryPill>{secondary}</SubcategoryPill>
          {status ? (
            <StatusBadge status={status.state} label={status.short} />
          ) : null}
        </div>

        <h1 className="text-[26px] font-bold tracking-[-0.02em] text-ink">
          {commerce.name}
        </h1>

        {commerce.torreApto ? (
          <div className="mt-2 flex items-center gap-1.5 text-[13px] text-ink-muted">
            <MapPin
              className="size-[15px] shrink-0 text-ink-faint"
              strokeWidth={2}
            />
            {commerce.torreApto}
          </div>
        ) : null}

        <p className="mt-[18px] text-[15px] leading-[1.6] text-ink-soft">
          {commerce.description}
        </p>

        {horarioLines && status ? (
          <div className="mt-6 rounded-card border border-hairline p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-ink">
              <Clock className="size-[17px] text-primary" strokeWidth={2} />
              Horario
            </div>
            <div className="mt-[11px] flex items-center justify-between">
              <span className="text-sm text-ink-muted">{horarioLines.days}</span>
              <span className="text-sm font-semibold text-ink">
                {horarioLines.hours}
              </span>
            </div>
            <div className="mt-[9px] text-[12.5px] font-medium text-ink-muted">
              {status.text}
            </div>
          </div>
        ) : null}

        <div className="mt-5">
          <div className="mb-[11px] text-sm font-bold text-ink">
            Redes y contacto
          </div>
          <div className="flex flex-wrap gap-2.5">
            {ig ? (
              <a
                href={ig.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-[11px] border border-hairline-strong px-3.5 py-2.5 text-ink"
              >
                <Instagram
                  className="size-[18px] text-primary"
                  strokeWidth={2}
                />
                <span className="text-[13px] font-semibold">{ig.handle}</span>
              </a>
            ) : null}
            <div className="flex items-center gap-2 rounded-[11px] border border-hairline-strong px-3.5 py-2.5 text-ink">
              <Phone className="size-[18px] text-primary" strokeWidth={2} />
              <span className="text-[13px] font-semibold">{phone}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] border-t border-hairline bg-surface px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3">
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() =>
            contactWhatsApp({ commerceId: commerce._id, name: commerce.name })
          }
          className="flex w-full items-center justify-center gap-2.5 rounded-[13px] bg-whatsapp py-[15px] text-[15px] font-bold text-whatsapp-foreground"
        >
          <WhatsAppGlyph className="size-5" />
          Escribir por WhatsApp
        </a>
      </div>
    </div>
  );
}

/**
 * Top-row (days) and right-aligned (hours) lines of the « Horario » card. For a
 * time-range horario it shows the days and the `H:MM – H:MM` window; for the
 * special « Disponible » mode it shows the mode label with no hour range.
 */
function horarioCardLines(
  horario: DetailCommerce["horario"],
): { days: string; hours: string } | null {
  if (!horario) return null;
  if (horario.mode === "plages") {
    return {
      days: horario.days,
      hours: `${formatMinutes(horario.from)} – ${formatMinutes(horario.to)}`,
    };
  }
  return { days: "Disponible", hours: "—" };
}

function DetailLoading() {
  return (
    <div data-testid="detail-loading" className={SCREEN}>
      <div className="h-[300px] w-full animate-pulse bg-muted" />
      <div className="space-y-3 p-5">
        <div className="h-6 w-28 animate-pulse rounded-md bg-muted" />
        <div className="h-7 w-2/3 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-1/2 animate-pulse rounded-md bg-muted" />
        <div className="h-24 w-full animate-pulse rounded-card bg-muted" />
      </div>
    </div>
  );
}

function DetailNotFound() {
  return (
    <div
      data-testid="detail-not-found"
      className={`${SCREEN} flex flex-col items-center justify-center gap-4 px-8 text-center`}
    >
      <div className="flex size-14 items-center justify-center rounded-chip bg-muted text-ink-faint">
        <Store className="size-[26px]" strokeWidth={2} />
      </div>
      <div>
        <div className="text-base font-bold text-ink">Negocio no encontrado</div>
        <div className="mt-1.5 text-[13px] text-ink-muted">
          Este negocio no está disponible o aún no ha sido publicado.
        </div>
      </div>
      <Link
        href="/"
        className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
      >
        Volver al directorio
      </Link>
    </div>
  );
}
