"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AuthCtaButtons } from "./auth-cta-buttons";

/**
 * Shared favourites state for the whole public annuaire. A single subscription
 * to `listMineIds` feeds every heart (list cards + detail) with its filled /
 * empty state, and `toggle` writes straight to the DB so the visual state
 * reflects the real Favori. An anonymous Visiteur toggling a heart is invited
 * to sign in / create an account instead — no Favori is created client-side.
 *
 * The context ships a safe, inert default so a Commerce card or the detail
 * screen can be rendered in isolation (e.g. unit tests) without a provider:
 * anonymous, no favourites, clicks are no-ops.
 */
type FavoritesContextValue = {
  /** True once we know the caller has an authenticated session. */
  isAuthenticated: boolean;
  isFavorite: (commerceId: string) => boolean;
  /**
   * Toggle a Favori. Logged-in → writes the real mutation; anonymous → opens
   * the sign-in invitation; still loading → ignored.
   */
  requestToggle: (commerceId: string) => void;
};

const FavoritesContext = React.createContext<FavoritesContextValue>({
  isAuthenticated: false,
  isFavorite: () => false,
  requestToggle: () => {},
});

export function useFavorites(): FavoritesContextValue {
  return React.useContext(FavoritesContext);
}

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const me = useQuery(api.table.users.currentUser);
  // Only subscribe to the favourite ids once we have a session — an anonymous
  // Visiteur has none, and `listMineIds` returns [] server-side anyway.
  const ids = useQuery(
    api.table.favorites.listMineIds,
    me ? {} : "skip",
  );
  const toggleFavorite = useMutation(api.table.favorites.toggle);
  const [inviteOpen, setInviteOpen] = React.useState(false);

  const favoriteIds = React.useMemo(
    () => new Set<string>(ids ?? []),
    [ids],
  );

  const requestToggle = React.useCallback(
    (commerceId: string) => {
      // `undefined` = auth still loading: ignore the click rather than flash
      // the invitation at a User who is in fact logged in.
      if (me === undefined) return;
      if (me === null) {
        setInviteOpen(true);
        return;
      }
      // Fire-and-forget: the reactive `listMineIds` query corrects the heart
      // whether the write succeeds or fails.
      void toggleFavorite({
        commerceId: commerceId as Id<"commerces">,
      }).catch(() => {});
    },
    [me, toggleFavorite],
  );

  const value = React.useMemo<FavoritesContextValue>(
    () => ({
      isAuthenticated: me != null,
      isFavorite: (commerceId: string) => favoriteIds.has(commerceId),
      requestToggle,
    }),
    [me, favoriteIds, requestToggle],
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
      <LoginInviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </FavoritesContext.Provider>
  );
}

/**
 * Invitation shown when an anonymous Visiteur taps a favourite heart: explains
 * the benefit (saving one's negocios) and routes to sign-in / sign-up.
 */
function LoginInviteDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[360px] rounded-card">
        <DialogHeader>
          <DialogTitle>Guarda tus negocios favoritos</DialogTitle>
          <DialogDescription>
            Crea una cuenta o inicia sesión para guardar tus negocios y
            encontrarlos fácilmente la próxima vez.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-2 sm:flex-col">
          {/* Close the invitation before navigating, so it doesn't stay open
              over the login / signup screen (this dialog lives in a provider
              that survives client-side navigation). */}
          <AuthCtaButtons
            className="w-full"
            onNavigate={() => onOpenChange(false)}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
