"use client";

import * as React from "react";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

export type SearchBarProps = Omit<
  React.ComponentProps<"input">,
  "value" | "onChange"
> & {
  value: string;
  onValueChange: (value: string) => void;
  /** Called when the clear button is pressed. Defaults to clearing the value. */
  onClear?: () => void;
};

/**
 * Directory search field: rounded grey input with a leading search icon and a
 * trailing clear button that appears only while there is a query. Controlled
 * via `value` / `onValueChange`.
 */
function SearchBar({
  value,
  onValueChange,
  onClear,
  placeholder = "Buscar negocios o categorías…",
  className,
  ...props
}: SearchBarProps) {
  const handleClear = () => {
    if (onClear) onClear();
    else onValueChange("");
  };

  return (
    <div
      data-slot="search-bar"
      className={cn(
        "flex h-[46px] items-center gap-[9px] rounded-xl border border-hairline bg-muted px-3.5",
        className,
      )}
    >
      <Search className="size-[18px] shrink-0 text-ink-faint" strokeWidth={2} />
      <input
        type="search"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 border-none bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint [&::-webkit-search-cancel-button]:hidden"
        {...props}
      />
      {value.length > 0 ? (
        <button
          type="button"
          aria-label="Limpiar búsqueda"
          onClick={handleClear}
          className="flex size-[22px] shrink-0 cursor-pointer items-center justify-center rounded-full bg-hairline-strong text-ink-muted"
        >
          <X className="size-3" strokeWidth={2.6} />
        </button>
      ) : null}
    </div>
  );
}

export { SearchBar };
