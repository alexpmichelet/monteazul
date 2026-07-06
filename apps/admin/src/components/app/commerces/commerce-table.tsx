"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { IconEdit } from "@tabler/icons-react";
import { api } from "@packages/backend/convex/_generated/api";

import { Button } from "@/components/ui/button";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  EstadoTransitionButton,
  RemoveCommerceButton,
} from "@/components/app/commerces/commerce-actions";
import {
  ESTADO_LABELS,
  EstadoBadge,
  type Estado,
} from "@/components/app/commerces/estado-badge";

const ESTADOS: Estado[] = ["pendiente", "publicado", "suspendido"];

/** The canonical category union, sourced from the shared taxonomy via the query. */
type Category = FunctionReturnType<
  typeof api.table.commerces.getFormOptions
>["categories"][number];

/**
 * « Gestión de todos los negocios »: lists every fiche, filterable by Estado and
 * category, with the per-row admin actions (edit, the valid Estado transition,
 * and definitive removal). All data comes from the admin-guarded
 * `listCommerces` query; the filters drive its arguments.
 */
export function CommerceTable() {
  const [estado, setEstado] = React.useState<Estado | "">("");
  const [category, setCategory] = React.useState<Category | "">("");

  const options = useQuery(api.table.commerces.getFormOptions);
  const commerces = useQuery(api.table.adminCommerces.listCommerces, {
    estado: estado || undefined,
    category: category || undefined,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-estado" className="text-xs">
            Estado
          </Label>
          <NativeSelect
            id="filter-estado"
            value={estado}
            onChange={(e) => setEstado(e.target.value as Estado | "")}
            className="w-48"
          >
            <NativeSelectOption value="">Todos los estados</NativeSelectOption>
            {ESTADOS.map((value) => (
              <NativeSelectOption key={value} value={value}>
                {ESTADO_LABELS[value]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-category" className="text-xs">
            Categoría
          </Label>
          <NativeSelect
            id="filter-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category | "")}
            className="w-56"
          >
            <NativeSelectOption value="">
              Todas las categorías
            </NativeSelectOption>
            {options?.categories.map((cat) => (
              <NativeSelectOption key={cat} value={cat}>
                {cat}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>

      {commerces === undefined ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>Negocio</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Propietario</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commerces.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No hay negocios que coincidan con los filtros.
                  </TableCell>
                </TableRow>
              ) : (
                commerces.map((commerce) => (
                  <TableRow key={commerce._id}>
                    <TableCell className="font-medium">
                      {commerce.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {commerce.category}
                    </TableCell>
                    <TableCell>
                      <EstadoBadge estado={commerce.estado} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {commerce.ownerEmail ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/negocios/${commerce._id}`}>
                            <IconEdit className="mr-1 size-4" />
                            Editar
                          </Link>
                        </Button>
                        <EstadoTransitionButton commerce={commerce} />
                        <RemoveCommerceButton commerceId={commerce._id} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
