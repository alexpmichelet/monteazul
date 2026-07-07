"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import {
  IconClock,
  IconInfoCircle,
  IconMapPin,
  IconPhone,
  IconPhoto,
} from "@tabler/icons-react";
import { api } from "@packages/backend/convex/_generated/api";

import { cn } from "@/lib/utils";
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

const ESTADO_STYLES: Record<
  Commerce["estado"],
  { badge: string; box: string }
> = {
  pendiente: {
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    box: "bg-amber-50 text-amber-900",
  },
  publicado: {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    box: "bg-emerald-50 text-emerald-900",
  },
  suspendido: {
    badge: "border-red-200 bg-red-50 text-red-700",
    box: "bg-red-50 text-red-900",
  },
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

/** A card title with a coloured icon chip, so each section reads at a glance. */
function SectionTitle({
  icon: Icon,
  accent,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <CardTitle className="flex items-center gap-2.5">
      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-lg",
          accent,
        )}
      >
        <Icon className="size-4" />
      </span>
      {children}
    </CardTitle>
  );
}

/**
 * « Mi negocio » — the Entrepreneur's self-service screen for the fiche they
 * own. The edit form is split into scannable sections (Información básica,
 * Contacto, Horario, Ubicación y detalles), each in its own card, with a single
 * persistent "Guardar cambios" action at the bottom. All edits go through
 * `updateMyCommerce` with the SAME validations as submission (and never re-open
 * approval). Everything in Spanish.
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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mi negocio</h1>
        <p className="text-muted-foreground text-sm">
          Gestiona la información de tu negocio y sus fotos.
        </p>
      </div>

      {/* Estado */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <CardTitle>{commerce.name}</CardTitle>
              <Badge
                variant="outline"
                className={ESTADO_STYLES[commerce.estado].badge}
              >
                {ESTADO_LABELS[commerce.estado]}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">{commerce.category}</p>
          </div>
          <SuspenderReactivarButton commerce={commerce} />
        </CardHeader>
        <CardContent>
          <p
            className={cn(
              "rounded-md p-3 text-sm",
              ESTADO_STYLES[commerce.estado].box,
            )}
          >
            {ESTADO_DESCRIPTIONS[commerce.estado]}
          </p>
        </CardContent>
      </Card>

      {/* Edit form — one <form>, sectioned into cards, single save action. */}
      <form
        id="form-mi-negocio"
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-6"
      >
        {/* Información básica */}
        <Card>
          <CardHeader>
            <SectionTitle icon={IconInfoCircle} accent="bg-blue-100 text-blue-700">
              Información básica
            </SectionTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
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
            </FieldGroup>
          </CardContent>
        </Card>

        {/* Contacto */}
        <Card>
          <CardHeader>
            <SectionTitle icon={IconPhone} accent="bg-emerald-100 text-emerald-700">
              Contacto
            </SectionTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
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
            </FieldGroup>
          </CardContent>
        </Card>

        {/* Horario */}
        <Card>
          <CardHeader>
            <SectionTitle icon={IconClock} accent="bg-violet-100 text-violet-700">
              Horario
            </SectionTitle>
          </CardHeader>
          <CardContent>
            <HorarioEditor
              value={horario}
              onChange={setHorario}
              error={horarioError}
            />
          </CardContent>
        </Card>

        {/* Ubicación y detalles */}
        <Card>
          <CardHeader>
            <SectionTitle icon={IconMapPin} accent="bg-rose-100 text-rose-700">
              Ubicación y detalles
            </SectionTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
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
            </FieldGroup>
          </CardContent>
        </Card>

        {formError && (
          <div className="text-destructive text-sm">{formError}</div>
        )}

        {/* Persistent save bar — stays reachable at the bottom of the long form. */}
        <div className="bg-background/80 sticky bottom-0 -mx-1 flex justify-end rounded-lg border p-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <Button
            type="submit"
            form="form-mi-negocio"
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? <Spinner /> : "Guardar cambios"}
          </Button>
        </div>
      </form>

      {/* Fotos */}
      <Card>
        <CardHeader>
          <SectionTitle icon={IconPhoto} accent="bg-indigo-100 text-indigo-700">
            Fotos del negocio
          </SectionTitle>
        </CardHeader>
        <CardContent>
          <PhotoManager commerce={commerce} />
        </CardContent>
      </Card>
    </div>
  );
}
