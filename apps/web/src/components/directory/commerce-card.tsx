"use client";

import Image from "next/image";
import Link from "next/link";
import { Clock } from "lucide-react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@packages/backend/convex/_generated/api";
import { commerceStatus } from "@packages/backend/convex/lib/horario";

import { PHOTO_PLACEHOLDER_GRADIENT } from "@/lib/commerce-media";
import { whatsAppLink } from "@/lib/commerce-contact";
import { FavoriteHeart } from "./favorite-heart";
import { StatusBadge } from "./status-badge";
import { useWhatsAppContact } from "./use-whatsapp-contact";
import { WhatsAppButton } from "./whatsapp-button";

type Sections = FunctionReturnType<
  typeof api.table.commerces.listPublicByCategory
>;
export type DirectorySection = Sections[number];
export type DirectoryCommerce = DirectorySection["commerces"][number];

/**
 * Commerce card of the directory list, faithful to the Claude Design prototype:
 * photo (or placeholder) with a real-time opening badge, name, sub-category,
 * horario status line, and a WhatsApp CTA. The whole card links to the public
 * detail page (`/negocio/<id>`). The WhatsApp button records a Contact WhatsApp
 * (fire-and-forget) and opens `wa.me` without navigating the card; the
 * favourite heart toggles the real Favori (or invites an anonymous Visiteur to
 * sign in) without navigating either.
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
  const contactWhatsApp = useWhatsAppContact();
  const waHref = whatsAppLink(commerce.whatsapp);

  return (
    <Link
      href={`/negocio/${commerce._id}`}
      aria-label={commerce.name}
      data-slot="commerce-card"
      className="block w-[204px] shrink-0 snap-start lg:w-full"
    >
      <div
        className="relative flex h-[132px] items-end overflow-hidden rounded-card p-2.5"
        style={photo ? undefined : { background: PHOTO_PLACEHOLDER_GRADIENT }}
      >
        {photo ? (
          <Image
            src={photo}
            alt={commerce.name}
            fill
            sizes="(min-width: 1024px) 340px, 204px"
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

        <FavoriteHeart
          commerceId={commerce._id}
          variant="card"
          className="absolute right-2 top-2"
        />
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
          onClick={(event) => {
            // Stop the card's Link navigation, record the Contact WhatsApp,
            // then open wa.me in a new tab (contact prime sur la stat).
            event.preventDefault();
            contactWhatsApp({ commerceId: commerce._id, name: commerce.name });
            window.open(waHref, "_blank", "noopener,noreferrer");
          }}
          className="mt-2.5 h-9 w-full rounded-[9px] text-[12.5px]"
        />
      </div>
    </Link>
  );
}

export { CommerceCard };
