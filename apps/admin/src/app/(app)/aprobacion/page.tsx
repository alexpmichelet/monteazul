"use client";

import { ApprovalQueue } from "@/components/app/commerces/approval-queue";

export default function AprobacionPage() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <h1 className="text-2xl font-bold">Aprobación</h1>
        <p className="text-muted-foreground text-sm">
          Negocios pendientes de aprobación, del más antiguo al más reciente.
          Incluye los datos internos para calificar cada solicitud.
        </p>
      </div>
      <div className="px-4 lg:px-6">
        <ApprovalQueue />
      </div>
    </div>
  );
}
