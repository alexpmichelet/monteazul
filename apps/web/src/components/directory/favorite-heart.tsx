"use client";

import { Heart } from "lucide-react";

import { cn } from "@/lib/utils";
import { useFavorites } from "./favorites-context";

const SIZES = {
  card: { button: "size-[30px]", icon: "size-4" },
  detail: { button: "size-[38px]", icon: "size-[19px]" },
} as const;

/**
 * Favourite heart used on both the list cards and the detail screen. When the
 * User is logged in it toggles the real Favori immediately and fills navy (like
 * the prototype); an anonymous Visiteur is invited to sign in instead. Sits
 * inside a Commerce card `<Link>`, so it stops the click from navigating.
 */
export function FavoriteHeart({
  commerceId,
  variant,
  className,
}: {
  commerceId: string;
  variant: keyof typeof SIZES;
  className?: string;
}) {
  const { isFavorite, requestToggle } = useFavorites();
  const filled = isFavorite(commerceId);
  const size = SIZES[variant];

  return (
    <button
      type="button"
      aria-label={filled ? "Quitar de favoritos" : "Guardar en favoritos"}
      aria-pressed={filled}
      data-slot="favorite-button"
      onClick={(event) => {
        // Never let the tap navigate the surrounding card link.
        event.preventDefault();
        event.stopPropagation();
        requestToggle(commerceId);
      }}
      className={cn(
        "flex items-center justify-center rounded-full bg-white/95",
        filled ? "text-primary" : "text-ink-soft",
        size.button,
        className,
      )}
    >
      <Heart
        className={cn(size.icon, filled ? "fill-primary" : "fill-none")}
        strokeWidth={2}
      />
    </button>
  );
}
