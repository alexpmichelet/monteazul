"use client";

import { CommerceTable } from "@/components/app/commerces/commerce-table";

export default function NegociosPage() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <h1 className="text-2xl font-bold">Negocios</h1>
        <p className="text-muted-foreground text-sm">
          Gestiona todas las fichas: filtra por estado y categoría, edita,
          aprueba, suspende, reactiva o elimina.
        </p>
      </div>
      <div className="px-4 lg:px-6">
        <CommerceTable />
      </div>
    </div>
  );
}
