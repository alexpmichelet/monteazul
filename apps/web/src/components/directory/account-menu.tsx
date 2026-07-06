"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, LogIn, LogOut, User, UserPlus } from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Header avatar that opens the account menu (see the design). Anonymous
 * Visiteurs get « Iniciar sesión » / « Crear cuenta »; a logged-in User gets
 * « Mis guardados » and « Cerrar sesión ». Built on the existing template auth
 * (`@convex-dev/auth`) — `signOut` ends the real session, and `currentUser`
 * reflects it reactively.
 */
export function AccountMenu() {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const me = useQuery(api.table.users.currentUser);
  const isAuthenticated = me != null;
  const initial = (me?.name ?? me?.email ?? "").trim().charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Cuenta"
        className="flex size-9 items-center justify-center rounded-full bg-muted text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        {isAuthenticated && initial ? (
          <span className="text-sm font-bold">{initial}</span>
        ) : (
          <User className="size-[19px]" strokeWidth={2} />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {isAuthenticated ? (
          <>
            <DropdownMenuLabel className="truncate font-normal text-ink-muted">
              {me?.email ?? "Mi cuenta"}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/guardados">
                <Heart className="size-4" />
                Mis guardados
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                void signOut().then(() => router.push("/"));
              }}
            >
              <LogOut className="size-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem asChild>
              <Link href="/login">
                <LogIn className="size-4" />
                Iniciar sesión
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/signup">
                <UserPlus className="size-4" />
                Crear cuenta
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
