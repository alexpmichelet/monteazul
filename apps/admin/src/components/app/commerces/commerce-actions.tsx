"use client";

import * as React from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import {
  IconCheck,
  IconPlayerPause,
  IconPlayerPlay,
  IconTrash,
} from "@tabler/icons-react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";
import { getConvexErrorMessage } from "@/utils/getConvexErrorMessage";
import type { Estado } from "./estado-badge";

export type CommerceRef = { _id: Id<"commerces">; estado: Estado };

/**
 * The single valid Estado transition button for a fiche, driven by the
 * `approval` state machine: « Aprobar » (pendiente → publicado), « Suspender »
 * (publicado → suspendido) or « Reactivar » (suspendido → publicado). Calls the
 * real admin mutation and surfaces any rejection as a toast.
 */
export function EstadoTransitionButton({
  commerce,
  size = "sm",
}: {
  commerce: CommerceRef;
  size?: "sm" | "default";
}) {
  const approve = useMutation(api.table.adminCommerces.approveCommerce);
  const suspend = useMutation(api.table.adminCommerces.suspendCommerce);
  const reactivate = useMutation(api.table.adminCommerces.reactivateCommerce);
  const [loading, setLoading] = React.useState(false);

  const config =
    commerce.estado === "pendiente"
      ? {
          label: "Aprobar",
          icon: IconCheck,
          run: approve,
          success: "Negocio aprobado y publicado.",
        }
      : commerce.estado === "publicado"
        ? {
            label: "Suspender",
            icon: IconPlayerPause,
            run: suspend,
            success: "Negocio suspendido.",
          }
        : {
            label: "Reactivar",
            icon: IconPlayerPlay,
            run: reactivate,
            success: "Negocio reactivado.",
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
    <Button
      size={size}
      variant="outline"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? (
        <Spinner className="mr-2 size-4" />
      ) : (
        <Icon className="mr-2 size-4" />
      )}
      {config.label}
    </Button>
  );
}

/**
 * Definitive removal of a fiche from any Estado, gated by a confirmation dialog
 * (« retrait définitif, avec confirmation »). Calls `removeCommerce` and invokes
 * `onRemoved` on success (e.g. to leave a detail page).
 */
export function RemoveCommerceButton({
  commerceId,
  onRemoved,
  size = "sm",
}: {
  commerceId: Id<"commerces">;
  onRemoved?: () => void;
  size?: "sm" | "default";
}) {
  const remove = useMutation(api.table.adminCommerces.removeCommerce);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  async function handleRemove() {
    setLoading(true);
    try {
      await remove({ commerceId });
      toast.success("Negocio eliminado definitivamente.");
      setOpen(false);
      onRemoved?.();
    } catch (error) {
      toast.error(getConvexErrorMessage(error));
      setLoading(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button size={size} variant="destructive">
          <IconTrash className="mr-2 size-4" />
          Eliminar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar negocio</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción es definitiva y no se puede deshacer. Se eliminarán la
            ficha, sus fotos, sus estadísticas y la cuenta del negocio — el
            correo quedará libre para registrarse de nuevo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void handleRemove();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? <Spinner className="mr-2 size-4" /> : null}
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
