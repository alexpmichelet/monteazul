"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { api } from "@packages/backend/convex/_generated/api";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { getConvexErrorMessage } from "@/utils/getConvexErrorMessage";
import {
  DEFAULT_HORARIO,
  HorarioEditor,
  validateHorario,
  type Horario,
} from "@/components/app/entrepreneur/horario-editor";
import { PhotoManager } from "@/components/app/entrepreneur/photo-manager";
import { SuspenderReactivarButton } from "@/components/app/entrepreneur/suspender-reactivar-button";

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

const ESTADO_DESCRIPTIONS: Record<Commerce["estado"], string> = {
  pendiente:
    "Tu negocio está pendiente de aprobación. Un administrador lo revisará antes de publicarlo en el directorio.",
  publicado:
    "Tu negocio está publicado y visible en el directorio. Puedes editarlo cuando quieras: los cambios se ven de inmediato y siguen en línea.",
  suspendido:
    "Tu negocio está suspendido y no aparece en el directorio. Reactívalo cuando quieras, sin necesidad de una nueva aprobación.",
};

const formSchema = z.object({
  name: z.string().min(1, "El nombre del negocio es obligatorio."),
  category: z.string().min(1, "Selecciona una categoría."),
  description: z.string().min(1, "La descripción es obligatoria."),
  whatsapp: z
    .string()
    .regex(
      /^\d{10}$/,
      "El WhatsApp debe tener exactamente 10 dígitos, sin +57 ni espacios.",
    ),
  torreApto: z.string().optional(),
  instagram: z.string().optional(),
  contactName: z.string().optional(),
  resides: z.string().min(1, "Indica si resides en Monteazul."),
  notas: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

/**
 * « Mi negocio » — the Entrepreneur's self-service screen for the fiche they
 * own. Shows the current Estado clearly (with its meaning and the suspend /
 * reactivate action), lets the owner edit every fiche field at any time with the
 * SAME validations as submission (via `updateMyCommerce`, which never re-opens
 * approval), and manages the photos. Everything in Spanish.
 */
export function MiNegocioView({ commerce }: { commerce: Commerce }) {
  const options = useQuery(api.table.commerces.getFormOptions);
  const updateMyCommerce = useMutation(api.table.commerces.updateMyCommerce);

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
      whatsapp: commerce.whatsapp,
      torreApto: commerce.torreApto ?? "",
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

    // Sub-categories only apply to « Comida y bebida ».
    const subcats = isComida ? subcategories : [];

    setIsLoading(true);
    try {
      await updateMyCommerce({
        commerceId: commerce._id,
        name: data.name,
        category: data.category,
        subcategories: subcats.length > 0 ? subcats : undefined,
        description: data.description,
        whatsapp: data.whatsapp,
        horario,
        torreApto: data.torreApto || undefined,
        instagram: data.instagram || undefined,
        contactName: data.contactName || undefined,
        resides: data.resides,
        notas: data.notas || undefined,
      });
      toast.success("Cambios guardados.");
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
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <CardTitle>{commerce.name}</CardTitle>
              <Badge variant={ESTADO_VARIANTS[commerce.estado]}>
                {ESTADO_LABELS[commerce.estado]}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">{commerce.category}</p>
          </div>
          <SuspenderReactivarButton commerce={commerce} />
        </CardHeader>
        <CardContent>
          <p className="bg-muted text-muted-foreground rounded-md p-3 text-sm">
            {ESTADO_DESCRIPTIONS[commerce.estado]}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Editar mi negocio</CardTitle>
        </CardHeader>
        <CardContent>
          <form id="form-mi-negocio" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              {formError && (
                <div className="text-destructive text-sm">{formError}</div>
              )}

              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="name">Nombre del negocio</FieldLabel>
                    <Input
                      {...field}
                      id="name"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="category"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="category">Categoría</FieldLabel>
                    <NativeSelect
                      {...field}
                      id="category"
                      aria-invalid={fieldState.invalid}
                      className="w-full"
                    >
                      <NativeSelectOption value="">
                        Selecciona una categoría
                      </NativeSelectOption>
                      {options.categories.map((cat) => (
                        <NativeSelectOption key={cat} value={cat}>
                          {cat}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              {isComida && (
                <Field>
                  <FieldLabel>Subcategorías</FieldLabel>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {options.comidaSubcategories.map((sub) => {
                      const id = `sub-${sub}`;
                      return (
                        <div key={sub} className="flex items-center gap-2">
                          <Checkbox
                            id={id}
                            checked={subcategories.includes(sub)}
                            onCheckedChange={(checked) =>
                              toggleSubcategory(sub, checked === true)
                            }
                          />
                          <Label htmlFor={id} className="font-normal">
                            {sub}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </Field>
              )}

              <Controller
                name="description"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="description">Descripción</FieldLabel>
                    <Textarea
                      {...field}
                      id="description"
                      aria-invalid={fieldState.invalid}
                      rows={3}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="whatsapp"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="whatsapp">WhatsApp</FieldLabel>
                    <Input
                      {...field}
                      id="whatsapp"
                      inputMode="numeric"
                      placeholder="3182173887"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <HorarioEditor
                value={horario}
                onChange={setHorario}
                error={horarioError}
              />

              <Controller
                name="torreApto"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="torreApto">
                      Torre y apartamento
                    </FieldLabel>
                    <Input
                      {...field}
                      id="torreApto"
                      placeholder="Torre 4 · Apto 926"
                    />
                  </Field>
                )}
              />

              <Controller
                name="instagram"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="instagram">Instagram</FieldLabel>
                    <Input
                      {...field}
                      id="instagram"
                      placeholder="https://instagram.com/…"
                    />
                  </Field>
                )}
              />

              <Controller
                name="contactName"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="contactName">
                      Nombre de contacto
                    </FieldLabel>
                    <Input {...field} id="contactName" />
                  </Field>
                )}
              />

              <Controller
                name="resides"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="resides">
                      ¿Resides en Monteazul?
                    </FieldLabel>
                    <NativeSelect
                      {...field}
                      id="resides"
                      aria-invalid={fieldState.invalid}
                      className="w-full"
                    >
                      <NativeSelectOption value="">
                        Selecciona una opción
                      </NativeSelectOption>
                      {options.residesValues.map((value) => (
                        <NativeSelectOption key={value} value={value}>
                          {value}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="notas"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="notas">Notas</FieldLabel>
                    <Textarea {...field} id="notas" rows={2} />
                  </Field>
                )}
              />

              <Field>
                <Button
                  type="submit"
                  form="form-mi-negocio"
                  disabled={isLoading}
                >
                  {isLoading ? <Spinner /> : "Guardar cambios"}
                </Button>
              </Field>
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
    </div>
  );
}
