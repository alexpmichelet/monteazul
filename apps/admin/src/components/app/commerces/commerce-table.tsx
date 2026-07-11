"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IconEdit } from "@tabler/icons-react";
import { ArrowUpDown, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { api } from "@packages/backend/convex/_generated/api";
import { normalizeForSearch } from "@packages/backend/convex/lib/commerce";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { getConvexErrorMessage } from "@/utils/getConvexErrorMessage";
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

type AdminCommerce = FunctionReturnType<
  typeof api.table.adminCommerces.listCommerces
>[number];

/** The public comparator: admin-curated order first, then unordered oldest first. */
function byPublicOrder(a: AdminCommerce, b: AdminCommerce): number {
  return (
    (a.sortOrder ?? Number.MAX_SAFE_INTEGER) -
      (b.sortOrder ?? Number.MAX_SAFE_INTEGER) ||
    a._creationTime - b._creationTime
  );
}

/**
 * « Gestión de todos los negocios »: lists every fiche, filterable by Estado and
 * category and searchable by name / owner, with the per-row admin actions
 * (edit, the valid Estado transition, definitive removal).
 *
 * With a CATEGORY selected the rows follow the public order, and « Reordenar »
 * switches the table into reorder mode: rows drag & drop AND the # becomes an
 * editable position — both persist immediately (`reorderCategory`) and reflect
 * on the public directory. An out-of-range position lands at the end. Without
 * a category the # is a plain counter (the order is per category, never
 * global). All data comes from the admin-guarded `listCommerces` query.
 */
export function CommerceTable() {
  const [estado, setEstado] = React.useState<Estado | "">("");
  const [category, setCategory] = React.useState<Category | "">("");
  const [search, setSearch] = React.useState("");
  const [reordering, setReordering] = React.useState(false);

  const options = useQuery(api.table.commerces.getFormOptions);
  const commerces = useQuery(api.table.adminCommerces.listCommerces, {
    estado: estado || undefined,
    category: category || undefined,
  });
  const reorderCategory = useMutation(api.table.adminCommerces.reorderCategory);

  // With a category selected, mirror the PUBLIC order so the # column matches
  // the position visitors see (and reordering edits that exact sequence).
  const sorted = React.useMemo(() => {
    if (commerces === undefined) return undefined;
    if (!category) return commerces;
    return [...commerces].sort(byPublicOrder);
  }, [commerces, category]);

  // Local mirror of the sorted rows for optimistic drag-and-drop; re-synced
  // whenever the reactive query pushes new data (same idiom as PhotoManager).
  const [order, setOrder] = React.useState<AdminCommerce[]>([]);
  React.useEffect(() => {
    if (sorted) setOrder(sorted);
  }, [sorted]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Search filters by the visible fields (name + owner), accent-insensitive.
  // Reordering renumbers the WHOLE displayed category, so both are exclusive:
  // entering reorder mode clears the search, searching is disabled meanwhile.
  const trimmedSearch = normalizeForSearch(search).trim();
  const rows = React.useMemo(() => {
    const base = reordering ? order : (sorted ?? []);
    if (reordering || trimmedSearch.length === 0) return base;
    return base.filter((commerce) =>
      normalizeForSearch(
        `${commerce.name} ${commerce.ownerEmail ?? ""} ${commerce.ownerName ?? ""}`,
      ).includes(trimmedSearch),
    );
  }, [reordering, order, sorted, trimmedSearch]);

  async function persistOrder(next: AdminCommerce[]): Promise<void> {
    if (!category) return;
    const previous = order;
    setOrder(next); // optimistic
    try {
      await reorderCategory({
        category,
        orderedIds: next.map((commerce) => commerce._id),
      });
    } catch (error) {
      setOrder(previous);
      toast.error(getConvexErrorMessage(error));
    }
  }

  /** Move a row to a target index (already clamped to the list bounds). */
  function moveTo(from: number, to: number): void {
    const clamped = Math.max(0, Math.min(order.length - 1, to));
    if (from === clamped || from < 0) return;
    void persistOrder(arrayMove(order, from, clamped));
  }

  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = order.findIndex((c) => c._id === active.id);
    const to = order.findIndex((c) => c._id === over.id);
    if (from === -1 || to === -1) return;
    moveTo(from, to);
  }

  const table = (
    <Table>
      <TableHeader className="bg-muted">
        <TableRow>
          <TableHead
            className={
              reordering ? "w-24 text-muted-foreground" : "w-10 text-muted-foreground"
            }
          >
            #
          </TableHead>
          <TableHead>Negocio</TableHead>
          <TableHead>Categoría</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Propietario</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="h-24 text-center">
              No hay negocios que coincidan con los filtros.
            </TableCell>
          </TableRow>
        ) : (
          rows.map((commerce, index) => (
            <CommerceRow
              key={commerce._id}
              commerce={commerce}
              index={index}
              count={rows.length}
              reordering={reordering}
              onCommitPosition={(position) => moveTo(index, position - 1)}
            />
          ))
        )}
      </TableBody>
    </Table>
  );

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
            onChange={(e) => {
              setCategory(e.target.value as Category | "");
              setReordering(false);
            }}
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

        <div className="flex min-w-56 flex-1 flex-col gap-1.5">
          <Label htmlFor="filter-search" className="text-xs">
            Buscar
          </Label>
          <Input
            id="filter-search"
            type="search"
            placeholder="Nombre del negocio o propietario…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            disabled={reordering}
          />
        </div>

        {/* Manual public order — per category, behind an explicit toggle so
            rows never move by accident. */}
        <div className="flex flex-col items-start gap-1.5">
          <Button
            type="button"
            variant={reordering ? "default" : "outline"}
            disabled={category === ""}
            aria-pressed={reordering}
            onClick={() => {
              setSearch("");
              setReordering((prev) => !prev);
            }}
          >
            <ArrowUpDown className="mr-1 size-4" />
            {reordering ? "Listo" : "Reordenar"}
          </Button>
          {category === "" ? (
            <span className="text-muted-foreground text-xs">
              Selecciona una categoría para reordenar.
            </span>
          ) : reordering ? (
            <span className="text-muted-foreground text-xs">
              Arrastra las filas o edita el número de posición.
            </span>
          ) : null}
        </div>
      </div>

      {commerces === undefined ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          {reordering ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={rows.map((c) => c._id)}
                strategy={verticalListSortingStrategy}
              >
                {table}
              </SortableContext>
            </DndContext>
          ) : (
            table
          )}
        </div>
      )}
    </div>
  );
}

/**
 * One fiche row. In reorder mode the row becomes sortable (dragged by the grip)
 * and the # turns into an editable position input; otherwise the # is a plain
 * counter of the current listing.
 */
function CommerceRow({
  commerce,
  index,
  count,
  reordering,
  onCommitPosition,
}: {
  commerce: AdminCommerce;
  index: number;
  count: number;
  reordering: boolean;
  onCommitPosition: (position: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: commerce._id, disabled: !reordering });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="text-muted-foreground tabular-nums">
        {reordering ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={`Mover ${commerce.name}`}
              className="text-muted-foreground flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="size-4" />
            </button>
            <PositionInput
              name={commerce.name}
              position={index + 1}
              count={count}
              onCommit={onCommitPosition}
            />
          </div>
        ) : (
          index + 1
        )}
      </TableCell>
      <TableCell className="font-medium">{commerce.name}</TableCell>
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
  );
}

/**
 * Editable position (1-based). Commits on Enter/blur; the parent clamps, so an
 * out-of-range number (e.g. 50 of 12) simply lands at the end. Non-numeric
 * input resets to the current position.
 */
function PositionInput({
  name,
  position,
  count,
  onCommit,
}: {
  name: string;
  position: number;
  count: number;
  onCommit: (position: number) => void;
}) {
  const [value, setValue] = React.useState(String(position));
  React.useEffect(() => {
    setValue(String(position));
  }, [position]);

  function commit(): void {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      setValue(String(position));
      return;
    }
    const clamped = Math.min(count, Math.max(1, parsed));
    setValue(String(clamped));
    if (clamped !== position) onCommit(clamped);
  }

  return (
    <Input
      type="number"
      min={1}
      max={count}
      value={value}
      aria-label={`Posición de ${name}`}
      onChange={(event) => setValue(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      className="h-7 w-14 px-1.5 text-center tabular-nums"
    />
  );
}
