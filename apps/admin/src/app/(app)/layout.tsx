"use client";

import { AdminGuard } from "@/components/app/admin-guard";
import { ApplicationShell } from "@/components/application-shell2";
import { Toaster } from "@/components/ui/sonner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <ApplicationShell>{children}</ApplicationShell>
      <Toaster />
    </AdminGuard>
  );
}
