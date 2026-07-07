"use client";

import * as React from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { IconPlayerPause, IconPlayerPlay } from "@tabler/icons-react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { getConvexErrorMessage } from "@/utils/getConvexErrorMessage";

type Estado = "pendiente" | "publicado" | "suspendido";

/**
 * The Entrepreneur's own publication toggle from « Mi negocio », driven by the
 * `approval` state machine through the owner mutations: « Suspender mi
 * publicación » (publicado → suspendido, the fiche leaves the directory at once)
 * or « Reactivar mi publicación » (suspendido → publicado, sin aprobación). A
 * `pendiente` fiche has no owner transition, so nothing is rendered.
 */
export function SuspenderReactivarButton({
  commerce,
}: {
  commerce: { _id: Id<"commerces">; estado: Estado };
}) {
  const suspend = useMutation(api.table.commerces.suspendMyCommerce);
  const reactivate = useMutation(api.table.commerces.reactivateMyCommerce);
  const [loading, setLoading] = React.useState(false);

  if (commerce.estado === "pendiente") return null;

  const config =
    commerce.estado === "publicado"
      ? {
          label: "Suspender mi publicación",
          icon: IconPlayerPause,
          run: suspend,
          success:
            "Tu negocio se ha suspendido y ya no aparece en el directorio.",
          // Destructive action (the fiche leaves the directory) → red.
          variant: "destructive" as const,
        }
      : {
          label: "Reactivar mi publicación",
          icon: IconPlayerPlay,
          run: reactivate,
          success: "Tu negocio vuelve a estar publicado en el directorio.",
          variant: "default" as const,
        };

  const Icon = config.icon;

  async function handleClick() {
    setLoading(true);
    try {
      await config.run({ commerceId: commerce._id });
      toast.success(config.success);
    } catch (error) {
      toast.error(getConvexErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant={config.variant} onClick={handleClick} disabled={loading}>
      {loading ? (
        <Spinner className="mr-2 size-4" />
      ) : (
        <Icon className="mr-2 size-4" />
      )}
      {config.label}
    </Button>
  );
}
