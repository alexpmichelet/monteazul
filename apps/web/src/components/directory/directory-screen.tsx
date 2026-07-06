"use client";

import * as React from "react";
import { ChevronDown, MapPin, Search, User } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";

import {
  CATEGORY_CHIPS,
  CATEGORY_CHIP_BY_KEY,
  type CategoryKey,
} from "@/lib/categories";
import {
  CategoryChip,
  CommerceCardSkeleton,
  SearchBar,
} from "@/components/directory";
import { CommerceCard } from "./commerce-card";

/** Accent-insensitive, case-insensitive normalisation for search matching. */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function countLabel(count: number): string {
  return count === 1 ? "1 negocio" : `${count} negocios`;
}

/**
 * Public annuaire listing screen — reproduces the Claude Design prototype:
 * sticky Monteazul header, search field, colour-coded category filter chips,
 * per-category sections in horizontal scroll, and Commerce cards with a
 * real-time opening badge. Only `publicado` fiches are shown (backend query).
 */
export function DirectoryScreen() {
  const sections = useQuery(api.table.commerces.listPublicByCategory);
  const [activeKey, setActiveKey] = React.useState<CategoryKey>("todos");
  const [queryText, setQueryText] = React.useState("");

  // Recompute the opening badges every minute so "Abierto/Cerrado" stays live.
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const activeCategory = CATEGORY_CHIP_BY_KEY[activeKey].category;
  const q = normalize(queryText.trim());

  const visibleSections = React.useMemo(() => {
    if (!sections) return undefined;
    return sections
      .filter(
        (section) =>
          activeCategory === null || section.category === activeCategory,
      )
      .map((section) => {
        const commerces = section.commerces.filter((commerce) => {
          if (!q) return true;
          return [
            commerce.name,
            commerce.category,
            ...(commerce.subcategories ?? []),
            commerce.description,
          ].some((field) => normalize(field).includes(q));
        });
        return { ...section, commerces, count: commerces.length };
      })
      .filter((section) => section.commerces.length > 0);
  }, [sections, activeCategory, q]);

  const isLoading = visibleSections === undefined;
  const noResults = !isLoading && visibleSections.length === 0;

  return (
    <div className="mx-auto min-h-screen max-w-[480px] bg-surface shadow-[0_0_60px_rgba(20,30,50,0.1)]">
      <header className="sticky top-0 z-30 border-b border-hairline bg-surface">
        <div className="flex items-center justify-between px-4 pb-2.5 pt-4">
          <div className="flex items-center gap-[7px]">
            <MapPin className="size-[18px] text-primary" strokeWidth={2.2} />
            <span className="text-[17px] font-bold text-ink">Monteazul</span>
            <ChevronDown className="size-4 text-ink-muted" strokeWidth={2.2} />
          </div>
          <div className="flex size-9 items-center justify-center rounded-full bg-muted text-primary">
            <User className="size-[19px]" strokeWidth={2} />
          </div>
        </div>

        <div className="px-4 pb-3">
          <SearchBar value={queryText} onValueChange={setQueryText} />
        </div>

        <div className="flex gap-1.5 overflow-x-auto px-3 pb-3.5 pt-0.5 [scrollbar-width:none]">
          {CATEGORY_CHIPS.map((chip) => (
            <CategoryChip
              key={chip.key}
              chip={chip}
              active={chip.key === activeKey}
              onSelect={setActiveKey}
            />
          ))}
        </div>
      </header>

      <div className="pb-7">
        {isLoading ? (
          <LoadingSections />
        ) : noResults ? (
          <EmptyState query={queryText} />
        ) : (
          visibleSections.map((section) => (
            <section key={section.category} className="pb-0.5 pt-[18px]">
              <div className="flex items-baseline justify-between px-4 pb-[11px]">
                <span className="text-lg font-bold tracking-[-0.01em] text-ink">
                  {section.category}
                </span>
                <span className="text-xs font-medium text-ink-faint">
                  {countLabel(section.count)}
                </span>
              </div>
              <div className="flex snap-x gap-3.5 overflow-x-auto px-4 pb-1.5 [scrollbar-width:none]">
                {section.commerces.map((commerce) => (
                  <CommerceCard
                    key={commerce._id}
                    commerce={commerce}
                    now={now}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

function LoadingSections() {
  return (
    <>
      {[0, 1].map((row) => (
        <section key={row} className="pb-0.5 pt-[18px]">
          <div className="px-4 pb-[11px]">
            <div className="h-[18px] w-40 animate-pulse rounded-md bg-muted" />
          </div>
          <div className="flex gap-3.5 overflow-hidden px-4 pb-1.5">
            {[0, 1, 2].map((card) => (
              <CommerceCardSkeleton key={card} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="px-8 py-[70px] text-center">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-chip bg-muted text-ink-faint">
        <Search className="size-[26px]" strokeWidth={2} />
      </div>
      <div className="text-base font-bold text-ink">Sin resultados</div>
      <div className="mt-1.5 text-[13px] text-ink-muted">
        {query
          ? `No encontramos negocios para «${query}». Prueba otra búsqueda o categoría.`
          : "No hay negocios en esta categoría por ahora."}
      </div>
    </div>
  );
}
