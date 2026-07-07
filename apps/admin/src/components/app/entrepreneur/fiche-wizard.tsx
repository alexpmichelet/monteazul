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
} from "@tabler/icons-react";
import { api } from "@packages/backend/convex/_generated/api";

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
 * y detalles — built from the shared `Commerce*Fields` groups, with the Comida
 * sub-categories only for « Comida y bebida » and the structured Horario
 * editor. On submit it calls the real `submitCommerce` mutation, surfaces
 * validation errors inline, and redirects to « Mi negocio ».
 */
export function FicheWizard() {
  const router = useRouter();
  const options = useQuery(api.table.commerces.getFormOptions);
  const submitCommerce = useMutation(api.table.commerces.submitCommerce);

  const [subcategories, setSubcategories] = React.useState<string[]>([]);
  const [horario, setHorario] = React.useState<Horario>(DEFAULT_HORARIO);
  const [horarioError, setHorarioError] = React.useState<string | null>(null);
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

      {/* One <form>, sectioned into cards, single submit action at the bottom. */}
      <form
        id="form-fiche"
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid gap-6 lg:grid-cols-2 lg:items-start"
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
