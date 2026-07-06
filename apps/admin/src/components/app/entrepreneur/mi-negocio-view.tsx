"use client";

import type { FunctionReturnType } from "convex/server";
import { api } from "@packages/backend/convex/_generated/api";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhotoManager } from "@/components/app/entrepreneur/photo-manager";
import { horarioSummary } from "@/lib/horario-format";

type Commerce = NonNullable<
  FunctionReturnType<typeof api.table.commerces.myCommerce>
>;

const ESTADO_LABELS: Record<Commerce["estado"], string> = {
  pendiente: "Pendiente de aprobación",
  publicado: "Publicado",
  suspendido: "Suspendido",
};

const ESTADO_VARIANTS: Record<
  Commerce["estado"],
  "default" | "secondary" | "outline"
> = {
  pendiente: "secondary",
  publicado: "default",
  suspendido: "outline",
};

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5 border-b py-2 last:border-b-0">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

export function MiNegocioView({ commerce }: { commerce: Commerce }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>{commerce.name}</CardTitle>
            <p className="text-muted-foreground text-sm">{commerce.category}</p>
          </div>
          <Badge variant={ESTADO_VARIANTS[commerce.estado]}>
            {ESTADO_LABELS[commerce.estado]}
          </Badge>
        </CardHeader>
        <CardContent>
          {commerce.estado === "pendiente" && (
            <p className="bg-muted text-muted-foreground mb-4 rounded-md p-3 text-sm">
              Tu negocio está pendiente de aprobación. Un administrador lo
              revisará antes de publicarlo en el directorio.
            </p>
          )}

          <div className="flex flex-col">
            <Row label="Descripción" value={commerce.description} />
            {commerce.subcategories && commerce.subcategories.length > 0 && (
              <Row
                label="Subcategorías"
                value={commerce.subcategories.join(" · ")}
              />
            )}
            <Row label="WhatsApp" value={commerce.whatsapp} />
            <Row label="Horario" value={horarioSummary(commerce.horario)} />
            <Row label="Torre y apartamento" value={commerce.torreApto} />
            <Row label="Instagram" value={commerce.instagram} />
            <Row label="Nombre de contacto" value={commerce.contactName} />
            <Row label="¿Resides en Monteazul?" value={commerce.resides} />
            <Row label="Notas" value={commerce.notas} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fotos del negocio</CardTitle>
        </CardHeader>
        <CardContent>
          <PhotoManager commerce={commerce} />
        </CardContent>
      </Card>
    </div>
  );
}
