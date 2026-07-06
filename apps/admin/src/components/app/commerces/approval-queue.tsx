"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { IconEdit } from "@tabler/icons-react";
import { api } from "@packages/backend/convex/_generated/api";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  EstadoTransitionButton,
  RemoveCommerceButton,
} from "@/components/app/commerces/commerce-actions";
import { horarioSummary } from "@/lib/horario-format";

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5 border-b py-2 last:border-b-0">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

/**
 * The approval queue: the `pendiente` fiches (oldest first) with their FULL
 * detail — including the internal, admin-only fields `¿Resides?` and `Notas`
 * (never shown publicly) — so the Super admin can qualify each submission before
 * approving, editing or removing it.
 */
export function ApprovalQueue() {
  const queue = useQuery(api.table.adminCommerces.approvalQueue, {});

  if (queue === undefined) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-10 text-center text-sm">
          No hay negocios pendientes de aprobación.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {queue.map((commerce) => (
        <Card key={commerce._id}>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>{commerce.name}</CardTitle>
              <p className="text-muted-foreground text-sm">
                {commerce.category}
                {commerce.subcategories && commerce.subcategories.length > 0
                  ? ` · ${commerce.subcategories.join(" · ")}`
                  : ""}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              <Button asChild size="sm" variant="ghost">
                <Link href={`/negocios/${commerce._id}`}>
                  <IconEdit className="mr-1 size-4" />
                  Editar
                </Link>
              </Button>
              <EstadoTransitionButton commerce={commerce} />
              <RemoveCommerceButton commerceId={commerce._id} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col">
              <Row label="Descripción" value={commerce.description} />
              <Row label="WhatsApp" value={commerce.whatsapp} />
              <Row label="Horario" value={horarioSummary(commerce.horario)} />
              <Row label="Torre y apartamento" value={commerce.torreApto} />
              <Row label="Instagram" value={commerce.instagram} />
              <Row label="Nombre de contacto" value={commerce.contactName} />
              <Row label="Propietario" value={commerce.ownerEmail} />
              {/* Internal, admin-only fields — never surfaced by public queries. */}
              <Row label="¿Resides en Monteazul?" value={commerce.resides} />
              <Row label="Notas (interno)" value={commerce.notas} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
