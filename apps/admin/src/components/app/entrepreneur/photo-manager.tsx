"use client";

import * as React from "react";
import Image from "next/image";
import { useMutation } from "convex/react";
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
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@packages/backend/convex/_generated/api";
import { MAX_PHOTO_MB } from "@packages/backend/convex/lib/photos";

import { Button } from "@/components/ui/button";
import { getConvexErrorMessage } from "@/utils/getConvexErrorMessage";
import { compressImage } from "@/lib/photo-upload";

type OwnerCommerce = NonNullable<
  FunctionReturnType<typeof api.table.commerces.myCommerce>
>;
type OwnerPhoto = OwnerCommerce["photos"][number];

/**
 * The Entrepreneur's photo vitrine manager, shown in « Mi negocio ». Uploads
 * (client-optimised) images to Convex storage, reorders them by drag-and-drop
 * (dnd-kit), and deletes them — every action calls the real ownership-guarded
 * backend mutations and persists the order. The first photo is the card visual
 * and the carousel cover, so it is flagged « Portada ».
 */
export function PhotoManager({ commerce }: { commerce: OwnerCommerce }) {
  const commerceId = commerce._id;
  const generatePhotoUploadUrl = useMutation(
    api.table.commerces.generatePhotoUploadUrl,
  );
  const addPhoto = useMutation(api.table.commerces.addPhoto);
  const reorderPhotos = useMutation(api.table.commerces.reorderPhotos);
  const removePhoto = useMutation(api.table.commerces.removePhoto);

  // Local mirror of the server order for optimistic drag-and-drop; re-synced
  // whenever the reactive query pushes a new order.
  const [order, setOrder] = React.useState<OwnerPhoto[]>(commerce.photos);
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setOrder(commerce.photos);
  }, [commerce.photos]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  async function uploadOne(file: File): Promise<void> {
    if (!file.type.startsWith("image/")) {
      toast.error(`"${file.name}" no es una imagen.`);
      return;
    }
    const blob = await compressImage(file);
    const contentType = blob.type || file.type;

    const uploadUrl = await generatePhotoUploadUrl({ commerceId });
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": contentType },
      body: blob,
    });
    if (!response.ok) {
      toast.error(`No se pudo subir "${file.name}".`);
      return;
    }
    const { storageId } = (await response.json()) as { storageId: string };

    const result = await addPhoto({
      commerceId,
      storageId: storageId as OwnerPhoto["storageId"],
      contentType,
    });
    if (!result.ok) {
      toast.error(result.error);
    }
  }

  async function handleFiles(files: FileList | null): Promise<void> {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        try {
          await uploadOne(file);
        } catch (error) {
          toast.error(getConvexErrorMessage(error));
        }
      }
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDragEnd(event: DragEndEvent): Promise<void> {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = order.findIndex((p) => p.storageId === active.id);
    const newIndex = order.findIndex((p) => p.storageId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const previous = order;
    const next = arrayMove(order, oldIndex, newIndex);
    setOrder(next); // optimistic
    try {
      await reorderPhotos({
        commerceId,
        photoIds: next.map((p) => p.storageId),
      });
    } catch (error) {
      setOrder(previous); // revert on failure
      toast.error(getConvexErrorMessage(error));
    }
  }

  async function handleRemove(storageId: OwnerPhoto["storageId"]): Promise<void> {
    const previous = order;
    setOrder((current) => current.filter((p) => p.storageId !== storageId));
    try {
      await removePhoto({ commerceId, storageId });
      toast.success("Foto eliminada.");
    } catch (error) {
      setOrder(previous);
      toast.error(getConvexErrorMessage(error));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Fotos</p>
          <p className="text-muted-foreground text-xs">
            Arrastra para reordenar. La primera foto es la portada de tu negocio.
            Máximo {MAX_PHOTO_MB} MB por imagen.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <ImagePlus className="mr-2 size-4" />
          )}
          Subir fotos
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => {
            void handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {order.length === 0 ? (
        <div className="border-muted-foreground/25 text-muted-foreground flex h-32 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-sm">
          <ImagePlus className="size-6" />
          Aún no has subido fotos.
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={order.map((p) => p.storageId)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {order.map((photo, index) => (
                <SortablePhoto
                  key={photo.storageId}
                  photo={photo}
                  isCover={index === 0}
                  onRemove={() => handleRemove(photo.storageId)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function SortablePhoto({
  photo,
  isCover,
  onRemove,
}: {
  photo: OwnerPhoto;
  isCover: boolean;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: photo.storageId });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-slot="photo-tile"
      className="bg-muted relative aspect-square overflow-hidden rounded-lg border"
    >
      {photo.url ? (
        <Image
          src={photo.url}
          alt="Foto del negocio"
          fill
          sizes="160px"
          className="object-cover"
        />
      ) : (
        <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
          No disponible
        </div>
      )}

      {isCover && (
        <span className="bg-primary text-primary-foreground absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 text-[10px] font-medium">
          Portada
        </span>
      )}

      <button
        type="button"
        aria-label="Mover foto"
        className="bg-background/80 text-foreground absolute right-1.5 top-1.5 flex size-6 cursor-grab touch-none items-center justify-center rounded active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      <Button
        type="button"
        variant="destructive"
        size="icon"
        aria-label="Eliminar foto"
        className="absolute bottom-1.5 right-1.5 size-6"
        onClick={onRemove}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}
