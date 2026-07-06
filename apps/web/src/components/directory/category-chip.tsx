"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import type { CategoryChip as CategoryChipToken, CategoryKey } from "@/lib/categories";

export type CategoryChipProps = {
  chip: CategoryChipToken;
  active?: boolean;
  onSelect?: (key: CategoryKey) => void;
  className?: string;
};

/**
 * Vertical category filter chip: rounded icon square over a short label.
 * Colours come from the category design token (`@/lib/categories`), so the
 * primitive carries no hard-coded palette. Active = solid accent + white icon;
 * resting = soft pastel + accent icon.
 */
function CategoryChip({ chip, active = false, onSelect, className }: CategoryChipProps) {
  const { Icon, color, pastel, label } = chip;

  return (
    <button
      type="button"
      data-slot="category-chip"
      data-active={active}
      onClick={() => onSelect?.(chip.key)}
      className={cn(
        "flex w-16 shrink-0 cursor-pointer flex-col items-center gap-[7px] border-none bg-transparent",
        className,
      )}
    >
      <span
        aria-hidden
        className="flex size-[52px] items-center justify-center rounded-chip transition-transform"
        style={{
          backgroundColor: active ? color : pastel,
          color: active ? "#fff" : color,
          boxShadow: active ? `0 5px 14px ${color}4D` : undefined,
        }}
      >
        <Icon className="size-6" strokeWidth={2} />
      </span>
      <span
        className={cn(
          "text-[11px] whitespace-nowrap",
          active ? "font-bold text-ink" : "font-medium text-ink-muted",
        )}
      >
        {label}
      </span>
    </button>
  );
}

export { CategoryChip };
