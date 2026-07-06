"use client";

import * as React from "react";

import { CATEGORY_CHIPS, type CategoryKey } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { CategoryChip } from "@/components/directory/category-chip";
import { CommerceCardSkeleton } from "@/components/directory/commerce-card-skeleton";
import { SearchBar } from "@/components/directory/search-bar";
import { StatusBadge } from "@/components/directory/status-badge";
import { SubcategoryPill } from "@/components/directory/subcategory-pill";
import { WhatsAppButton } from "@/components/directory/whatsapp-button";
import {
  Toaster,
  notifyWhatsAppRedirect,
} from "@/components/directory/whatsapp-toast";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-hairline px-4 py-6">
      <h2 className="mb-4 font-mono text-[11px] font-medium uppercase tracking-wider text-ink-faint">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * Internal design-system gallery. Not linked from any public navigation — it
 * exists so the Monteazul directory primitives and their states can be
 * eyeballed against the Claude Design prototype.
 */
export default function DesignSystemPage() {
  const [query, setQuery] = React.useState("");
  const [activeCat, setActiveCat] = React.useState<CategoryKey>("todos");

  return (
    <div className="min-h-screen bg-page py-6">
      <div className="mx-auto min-h-screen max-w-[480px] bg-surface shadow-[0_0_60px_rgba(20,30,50,0.1)]">
        <header className="px-4 pt-6 pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            Design system
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Primitivas del Directorio Monteazul · apps/web
          </p>
        </header>

        <Section title="Botones">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primario</Button>
            <Button variant="secondary">Secundario</Button>
            <Button variant="outline">Contorno</Button>
            <Button variant="ghost">Fantasma</Button>
            <Button variant="destructive">Eliminar</Button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button size="sm">Pequeño</Button>
            <Button size="lg">Grande</Button>
            <Button disabled>Deshabilitado</Button>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            <WhatsAppButton />
            <WhatsAppButton size="lg" className="rounded-[13px] py-4 text-base">
              Escribir por WhatsApp
            </WhatsAppButton>
          </div>
        </Section>

        <Section title="Chips de categoría">
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-3 [scrollbar-width:none]">
            {CATEGORY_CHIPS.map((chip) => (
              <CategoryChip
                key={chip.key}
                chip={chip}
                active={activeCat === chip.key}
                onSelect={setActiveCat}
              />
            ))}
          </div>
        </Section>

        <Section title="Badges de estado">
          <div className="flex flex-wrap items-center gap-4">
            <StatusBadge status="abierto" />
            <StatusBadge status="cerrado" />
            <StatusBadge status="disponible" />
            <StatusBadge status="abierto" label="Abierto ahora · cierra a las 16:00" />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-card bg-gradient-to-br from-[#eef1f6] to-[#e1e8f1] p-3">
            <StatusBadge status="abierto" pill />
            <StatusBadge status="cerrado" pill />
            <StatusBadge status="disponible" pill />
          </div>
        </Section>

        <Section title="Pills de sub-categoría">
          <div className="flex flex-wrap gap-2">
            <SubcategoryPill>Almuerzos y comida típica</SubcategoryPill>
            <SubcategoryPill>Panadería y repostería</SubcategoryPill>
            <SubcategoryPill>Barbería</SubcategoryPill>
          </div>
        </Section>

        <Section title="Barra de búsqueda">
          <SearchBar value={query} onValueChange={setQuery} />
          <p className="mt-2 text-xs text-ink-muted">
            Consulta actual: «{query || "—"}»
          </p>
        </Section>

        <Section title="Esqueleto de tarjeta">
          <div className="flex gap-3.5 overflow-x-auto [scrollbar-width:none]">
            <CommerceCardSkeleton />
            <CommerceCardSkeleton />
          </div>
        </Section>

        <Section title="Toast de redirección">
          <Button
            variant="outline"
            onClick={() => notifyWhatsAppRedirect("Panadería El Trigal")}
          >
            Mostrar toast de WhatsApp
          </Button>
        </Section>
      </div>
      <Toaster position="bottom-center" />
    </div>
  );
}
