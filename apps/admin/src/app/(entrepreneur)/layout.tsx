"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { IconLogout } from "@tabler/icons-react";
import { EntrepreneurGuard } from "@/components/app/entrepreneur/entrepreneur-guard";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";

export default function EntrepreneurLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { signOut } = useAuthActions();

  async function handleLogout() {
    await signOut();
    router.push("/acceso");
  }

  return (
    <EntrepreneurGuard>
      <div className="bg-muted/40 flex min-h-svh flex-col">
        <header className="bg-background flex items-center justify-between border-b px-4 py-3">
          <Link href="/mi-negocio" className="font-semibold">
            Mi negocio
          </Link>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <IconLogout className="mr-2 size-4" />
            Cerrar sesión
          </Button>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
      <Toaster />
    </EntrepreneurGuard>
  );
}
