"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import {
  IconClock,
  IconInfoCircle,
  IconMapPin,
  IconPhone,
  IconPhoto,
} from "@tabler/icons-react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { getConvexErrorMessage } from "@/utils/getConvexErrorMessage";
import {
  DEFAULT_HORARIO,
  HorarioEditor,
  validateHorario,
  type Horario,
} from "@/components/app/entrepreneur/horario-editor";
import {
  CommerceBasicsFields,
  CommerceContactFields,
  CommerceLocationFields,
} from "@/components/app/commerces/commerce-fields";
import { SectionTitle } from "@/components/app/commerces/section-title";
import {
  PhotoPicker,
  type PickedPhoto,
} from "@/components/app/entrepreneur/photo-picker";
import { compressImage } from "@/lib/photo-upload";

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
 * The entrepreneur fiche wizard (back-office onboarding). Same sectioned card
 * design as « Mi negocio » — Información básica, Contacto, Horario, Ubicación
 * y detalles, plus a Fotos card — built from the shared `Commerce*Fields`
 * groups, with the Comida sub-categories only for « Comida y bebida » and the
 * structured Horario editor. Photos are picked locally and only uploaded at
 * submission (compress → `generateSubmissionUploadUrl` → POST), so the fiche
 * sent for approval already carries its vitrine. On submit it calls the real
 * `submitCommerce` mutation, surfaces validation errors inline, and redirects
 * to « Mi negocio ».
 */
export function FicheWizard() {
  const router = useRouter();
  const options = useQuery(api.table.commerces.getFormOptions);
  const submitCommerce = useMutation(api.table.commerces.submitCommerce);
  const generateSubmissionUploadUrl = useMutation(
    api.table.commerces.generateSubmissionUploadUrl,
  );

  const [subcategories, setSubcategories] = React.useState<string[]>([]);
  const [horario, setHorario] = React.useState<Horario>(DEFAULT_HORARIO);
  const [horarioError, setHorarioError] = React.useState<string | null>(null);
  const [photos, setPhotos] = React.useState<PickedPhoto[]>([]);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: "",
      description: "",
      whatsapp: "",
      torreApto: "",
      instagram: "",
      contactName: "",
      resides: "",
      notas: "",
    },
  });

  const category = useWatch({ control: form.control, name: "category" });
  const isComida = options ? category === options.comidaCategory : false;

  function toggleSubcategory(value: string, checked: boolean) {
    setSubcategories((prev) =>
      checked ? [...prev, value] : prev.filter((s) => s !== value),
    );
  }

  /** Compress + upload one picked photo, returning its storage reference. */
  async function uploadPhoto(
    photo: PickedPhoto,
  ): Promise<{ storageId: Id<"_storage">; contentType: string }> {
    const blob = await compressImage(photo.file);
    const contentType = blob.type || photo.file.type;
    const uploadUrl = await generateSubmissionUploadUrl();
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": contentType },
      body: blob,
    });
    if (!response.ok) {
      throw new Error(`No se pudo subir "${photo.file.name}".`);
    }
    const { storageId } = (await response.json()) as {
      storageId: Id<"_storage">;
    };
    return { storageId, contentType };
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

    // Upload the picked photos now (selection order = vitrine order) so the
    // fiche sent for approval already carries them.
    const photoIds: { storageId: Id<"_storage">; contentType: string }[] = [];
    try {
      for (const photo of photos) {
        photoIds.push(await uploadPhoto(photo));
      }
    } catch (error) {
      setFormError(
        getConvexErrorMessage(
          error,
          "No se pudieron subir las fotos. Revisa tu conexión e inténtalo de nuevo.",
        ),
      );
      setIsLoading(false);
      return;
    }

    try {
      await submitCommerce({
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
        photos: photoIds.length > 0 ? photoIds : undefined,
      });
      router.push("/mi-negocio");
    } catch (error) {
      setFormError(getConvexErrorMessage(error));
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
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Registra tu negocio
        </h1>
        <p className="text-muted-foreground text-sm">
          Completa la ficha. Quedará pendiente de aprobación antes de
          publicarse en el directorio.
        </p>
      </div>

      {/* One <form>, sectioned into cards, single submit action at the bottom.
          Cards on the same desktop row stretch to equal height (grid default). */}
      <form
        id="form-fiche"
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid gap-6 lg:grid-cols-2"
      >
        {/* Información básica */}
        <Card>
          <CardHeader>
            <SectionTitle
              icon={IconInfoCircle}
              accent="bg-blue-100 text-blue-700"
            >
              Información básica
            </SectionTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <CommerceBasicsFields
                control={form.control}
                options={options}
                isComida={isComida}
                subcategories={subcategories}
                onToggleSubcategory={toggleSubcategory}
              />
            </FieldGroup>
          </CardContent>
        </Card>

        {/* Contacto */}
        <Card>
          <CardHeader>
            <SectionTitle
              icon={IconPhone}
              accent="bg-emerald-100 text-emerald-700"
            >
              Contacto
            </SectionTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <CommerceContactFields control={form.control} />
            </FieldGroup>
          </CardContent>
        </Card>

        {/* Horario */}
        <Card>
          <CardHeader>
            <SectionTitle
              icon={IconClock}
              accent="bg-violet-100 text-violet-700"
            >
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
              <CommerceLocationFields
                control={form.control}
                options={options}
              />
            </FieldGroup>
          </CardContent>
        </Card>

        {/* Fotos — picked locally, uploaded at submission. */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <SectionTitle
              icon={IconPhoto}
              accent="bg-indigo-100 text-indigo-700"
            >
              Fotos del negocio
            </SectionTitle>
          </CardHeader>
          <CardContent>
            <PhotoPicker value={photos} onChange={setPhotos} />
          </CardContent>
        </Card>

        {formError && (
          <div className="text-destructive text-sm lg:col-span-2">
            {formError}
          </div>
        )}

        {/* Persistent submit bar — stays reachable at the bottom of the long form. */}
        <div className="bg-background/80 sticky bottom-0 -mx-1 flex justify-end rounded-lg border p-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:col-span-2">
          <Button
            type="submit"
            form="form-fiche"
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? <Spinner /> : "Enviar mi negocio"}
          </Button>
        </div>
      </form>
    </div>
  );
}
