"use client";

import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "@packages/backend/convex/_generated/api";
import { EstadisticasView } from "@/components/app/entrepreneur/estadisticas-view";
import { Spinner } from "@/components/ui/spinner";

export default function EstadisticasPage() {
  const router = useRouter();
  const commerce = useQuery(api.table.commerces.myCommerce);

  useEffect(() => {
    // No fiche yet → statistics make no sense; send to the submission wizard.
    if (commerce === null) {
      router.replace("/mi-negocio/nueva");
    }
  }, [commerce, router]);

  if (commerce === undefined || commerce === null) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return <EstadisticasView commerceId={commerce._id} />;
}
