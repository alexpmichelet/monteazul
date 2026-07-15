"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@packages/backend/convex/_generated/api";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { getConvexErrorMessage } from "@/utils/getConvexErrorMessage";
import {
  DEFAULT_HORARIO,
  validateHorario,
  type Horario,
} from "@/components/app/entrepreneur/horario-editor";
import { CommerceFields } from "@/components/app/commerces/commerce-fields";
import { PhotoManager } from "@/components/app/entrepreneur/photo-manager";
import {
  EstadoTransitionButton,
  RemoveCommerceButton,
} from "@/components/app/commerces/commerce-actions";
import { EstadoBadge } from "@/components/app/commerces/estado-badge";

type AdminCommerce = NonNullable<
  FunctionReturnType<typeof api.table.adminCommerces.getCommerceForAdmin>
>;

const formSchema = z.object({
  name: z.string().min(1, "El nombre del negocio es obligatorio."),
  category: z.string().min(1, "Selecciona una categoría."),
  description: z.string().min(1, "La descripción es obligatoria."),
  infoExtra: z.string().optional(),
  whatsapp: z
    .string()
    .regex(
      /^\d{10}$/,
      "El WhatsApp debe tener exactamente 10 dígitos, sin +57 ni espacios.",
    ),
  instagram: z.string().optional(),
  contactName: z.string().min(1, "El nombre de contacto es obligatorio."),
  resides: z.string().min(1, "Indica si resides en Monteazul."),
  notas: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

/**
 * The Super admin fiche editor. Pre-fills every field from the admin projection
 * (internal fields included), applies the SAME validations as the entrepreneur
 * form, and calls `updateCommerce` — which never changes the `estado`
 * (moderación a posteriori). The Estado transition and definitive removal live
 * alongside, and the photos reuse the shared owner-or-admin PhotoManager.
 */
export function CommerceEditForm({ commerce }: { commerce: AdminCommerce }) {
  const router = useRouter();
  const options = useQuery(api.table.commerces.getFormOptions);
  const updateCommerce = useMutation(api.table.adminCommerces.updateCommerce);

  const [subcategories, setSubcategories] = React.useState<string[]>(
    commerce.subcategories ?? [],
  );
  const [horario, setHorario] = React.useState<Horario>(
    commerce.horario ?? DEFAULT_HORARIO,
  );
  const [horarioError, setHorarioError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: commerce.name,
      category: commerce.category,
      description: commerce.description,
      infoExtra: commerce.infoExtra ?? "",
      whatsapp: commerce.whatsapp,
      instagram: commerce.instagram ?? "",
      contactName: commerce.contactName ?? "",
      resides: commerce.resides,
      notas: commerce.notas ?? "",
    },
  });

  const category = useWatch({ control: form.control, name: "category" });
  const isComida = options ? category === options.comidaCategory : false;

  function toggleSubcategory(value: string, checked: boolean) {
    setSubcategories((prev) =>
      checked ? [...prev, value] : prev.filter((s) => s !== value),
    );
  }

  async function onSubmit(data: FormValues) {
    setFormError(null);

    const horarioValidation = validateHorario(horario);
    if (horarioValidation) {
      setHorarioError(horarioValidation);
      return;
    }
    setHorarioError(null);

    const subcats = isComida ? subcategories : [];

    setIsLoading(true);
    try {
      await updateCommerce({
        commerceId: commerce._id,
        name: data.name,
        category: data.category,
        subcategories: subcats.length > 0 ? subcats : undefined,
        description: data.description,
        infoExtra: data.infoExtra || undefined,
        whatsapp: data.whatsapp,
        horario,
        instagram: data.instagram || undefined,
        contactName: data.contactName || undefined,
        resides: data.resides,
        notas: data.notas || undefined,
      });
      toast.success("Ficha actualizada.");
    } catch (error) {
      setFormError(getConvexErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  if (options === undefined) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CardTitle>Editar ficha</CardTitle>
            <EstadoBadge estado={commerce.estado} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <EstadoTransitionButton commerce={commerce} />
            <RemoveCommerceButton
              commerceId={commerce._id}
              onRemoved={() => router.push("/negocios")}
            />
          </div>
        </CardHeader>
        <CardContent>
          <form id="form-edit-fiche" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <CommerceFields
                control={form.control}
                options={options}
                isComida={isComida}
                subcategories={subcategories}
                onToggleSubcategory={toggleSubcategory}
                horario={horario}
                onHorarioChange={setHorario}
                horarioError={horarioError}
                residesLabel="¿Resides en Monteazul? (interno)"
                notasLabel="Notas (interno)"
              />
            </FieldGroup>
          </form>
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

      {/* Guardar — at the very bottom, below the photos (submits the form above). */}
      <div className="flex flex-col items-end gap-2">
        {formError && (
          <div className="text-destructive text-sm">{formError}</div>
        )}
        <Button type="submit" form="form-edit-fiche" disabled={isLoading}>
          {isLoading ? <Spinner /> : "Guardar cambios"}
        </Button>
      </div>
    </div>
  );
}
