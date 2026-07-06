"use client";

import * as React from "react";
import { Search } from "lucide-react";
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
import { AccountMenu } from "./account-menu";
import { CommerceCard } from "./commerce-card";

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
  const [activeKey, setActiveKey] = React.useState<CategoryKey>("todos");
  const [queryText, setQueryText] = React.useState("");

  const activeCategory = CATEGORY_CHIP_BY_KEY[activeKey].category;
  const trimmedQuery = queryText.trim();

  // Search (accent- and case-insensitive) resolves server-side against the
  // normalised `search_text` index; the query returns only `publicado` fiches,
  // grouped by category. The category CHIP is applied client-side below, so
  // switching categories is instant — no refetch, no skeleton flash — because
  // the full grouped result stays cached by Convex under stable query args.
  const allSections = useQuery(api.table.commerces.searchPublic, {
    text: trimmedQuery.length > 0 ? trimmedQuery : undefined,
  });

  const sections = React.useMemo(() => {
    if (allSections === undefined) return undefined;
    if (activeCategory === null) return allSections;
    return allSections.filter((section) => section.category === activeCategory);
  }, [allSections, activeCategory]);

  // Recompute the opening badges every minute so "Abierto/Cerrado" stays live.
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Header greeting: a signed-in User is welcomed by name (ellipsized so a long
  // name can't blow out the header), an anonymous Visiteur sees the app name.
  // `undefined` (auth loading) is treated as anonymous to avoid a greeting flash.
  const me = useQuery(api.table.users.currentUser);
  const headerTitle = me
    ? me.name?.trim()
      ? `Bienvenido, ${me.name.trim()}`
      : "Bienvenido"
    : "Directorio Monteazul";

  return (
    <div className="mx-auto min-h-screen max-w-[480px] bg-surface shadow-[0_0_60px_rgba(20,30,50,0.1)] lg:max-w-6xl lg:shadow-none">
      <header className="sticky top-0 z-30 border-b border-hairline bg-surface">
        <div className="flex items-center justify-between gap-2 px-4 pb-2.5 pt-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-[7px]">
            <span className="truncate text-[17px] font-bold text-ink">
              {headerTitle}
            </span>
          </div>
          <div className="shrink-0">
            <AccountMenu />
          </div>
        </div>

        <div className="px-4 pb-3 lg:px-8">
          <SearchBar value={queryText} onValueChange={setQueryText} />
        </div>

        <div className="flex gap-1.5 overflow-x-auto px-3 pb-3.5 pt-0.5 [scrollbar-width:none] lg:flex-wrap lg:overflow-visible lg:px-8">
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
        {sections === undefined ? (
          <LoadingSections />
        ) : sections.length === 0 ? (
          <EmptyState query={queryText} />
        ) : (
          sections.map((section) => (
            <section key={section.category} className="pb-0.5 pt-[18px]">
              <div className="flex items-baseline justify-between px-4 pb-[11px] lg:px-8">
                <span className="text-lg font-bold tracking-[-0.01em] text-ink">
                  {section.category}
                </span>
                <span className="text-xs font-medium text-ink-faint">
                  {countLabel(section.count)}
                </span>
              </div>
              {/* Horizontal snap-scroll on mobile; a wrapping multi-column grid
                  on desktop so the cards fill the wide layout. */}
              <div className="flex snap-x gap-3.5 overflow-x-auto pb-1.5 pl-4 [scrollbar-width:none] lg:grid lg:grid-cols-2 lg:gap-x-5 lg:gap-y-6 lg:overflow-visible lg:px-8 xl:grid-cols-3 2xl:grid-cols-4">
                {section.commerces.map((commerce) => (
                  <CommerceCard
                    key={commerce._id}
                    commerce={commerce}
                    now={now}
                  />
                ))}
                {/* Trailing gutter so the last card keeps its right padding once
                    the row scrolls — a scroll container's own trailing padding
                    is unreliable across browsers. The negative margin cancels
                    the flex gap so the gutter is exactly 16px. Removed in the
                    desktop grid. */}
                <div aria-hidden className="-ml-3.5 w-4 shrink-0 lg:hidden" />
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
          <div className="px-4 pb-[11px] lg:px-8">
            <div className="h-[18px] w-40 animate-pulse rounded-md bg-muted" />
          </div>
          <div className="flex gap-3.5 overflow-hidden px-4 pb-1.5 lg:grid lg:grid-cols-2 lg:gap-x-5 lg:gap-y-6 lg:px-8 xl:grid-cols-3 2xl:grid-cols-4">
            {[0, 1, 2].map((card) => (
              <CommerceCardSkeleton key={card} className="lg:w-full" />
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
