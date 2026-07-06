"use client";

import Image from "next/image";
import { Clock, Heart } from "lucide-react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@packages/backend/convex/_generated/api";
import { commerceStatus } from "@packages/backend/convex/lib/horario";

import { StatusBadge } from "./status-badge";
import { WhatsAppButton } from "./whatsapp-button";

type Sections = FunctionReturnType<
  typeof api.table.commerces.listPublicByCategory
>;
export type DirectorySection = Sections[number];
export type DirectoryCommerce = DirectorySection["commerces"][number];

/** Placeholder gradient used when a Commerce has no photo yet (matches the prototype). */
const PLACEHOLDER_GRADIENT = "linear-gradient(135deg,#eef1f6,#e1e8f1)";

/**
 * Commerce card of the directory list, faithful to the Claude Design prototype:
 * photo (or placeholder) with a real-time opening badge, name, sub-category,
 * horario status line, and a WhatsApp CTA. The favourite heart and the WhatsApp
 * button are present but INERT in this slice — contact tracking and favourites
 * are wired in later slices.
 */
function CommerceCard({
  commerce,
  now,
}: {
  commerce: DirectoryCommerce;
  now: Date;
}) {
  const status = commerce.horario
    ? commerceStatus(commerce.horario, now)
    : null;
  const secondary = commerce.subcategories?.[0] ?? commerce.category;
  const photo = commerce.photos[0];

  return (
    <div
      data-slot="commerce-card"
      className="w-[204px] shrink-0 snap-start"
    >
      <div
        className="relative flex h-[132px] items-end overflow-hidden rounded-card p-2.5"
        style={photo ? undefined : { background: PLACEHOLDER_GRADIENT }}
      >
        {photo ? (
          <Image
            src={photo}
            alt={commerce.name}
            fill
            sizes="204px"
            className="object-cover"
          />
        ) : null}

        {status ? (
          <StatusBadge
            pill
            status={status.state}
            label={status.short}
            className="absolute left-2.5 top-2.5"
          />
        ) : null}

        <button
          type="button"
          aria-label="Guardar en favoritos"
          data-slot="favorite-button"
          className="absolute right-2 top-2 flex size-[30px] items-center justify-center rounded-full bg-white/95 text-ink-soft"
        >
          <Heart className="size-4" strokeWidth={2} />
        </button>
      </div>

      <div className="px-0.5 pt-2.5">
        <div className="text-[15px] font-bold text-ink">{commerce.name}</div>
        <div className="mt-[3px] text-xs text-ink-muted">{secondary}</div>
        {status ? (
          <div className="mt-[7px] flex items-center gap-[5px] text-[11.5px] font-medium text-ink-muted">
            <Clock className="size-[13px] shrink-0" strokeWidth={2} />
            {status.text}
          </div>
        ) : null}
        <WhatsAppButton
          size="sm"
          aria-label={`Escribir por WhatsApp a ${commerce.name}`}
          className="mt-2.5 h-9 w-full rounded-[9px] text-[12.5px]"
        />
      </div>
    </div>
  );
}

export { CommerceCard };
