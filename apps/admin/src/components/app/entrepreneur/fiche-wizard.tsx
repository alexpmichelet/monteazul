"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { api } from "@packages/backend/convex/_generated/api";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { getConvexErrorMessage } from "@/utils/getConvexErrorMessage";
import {
  DEFAULT_HORARIO,
  validateHorario,
  type Horario,
} from "@/components/app/entrepreneur/horario-editor";
import { CommerceFields } from "@/components/app/commerces/commerce-fields";

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
 * The entrepreneur fiche wizard (back-office onboarding). Collects the Commerce
 * fields (via the shared `CommerceFields`), shows the Comida sub-categories only
 * for « Comida y bebida », and the structured Horario editor. On submit it calls
 * the real `submitCommerce` mutation, surfaces validation errors inline, and
 * redirects to « Mi negocio ».
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
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Registra tu negocio</CardTitle>
        <p className="text-muted-foreground text-sm">
          Completa la ficha. Quedará pendiente de aprobación antes de publicarse
          en el directorio.
        </p>
      </CardHeader>
      <CardContent>
        <form id="form-fiche" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            {formError && (
              <div className="text-destructive text-sm">{formError}</div>
            )}

            <CommerceFields
              control={form.control}
              options={options}
              isComida={isComida}
              subcategories={subcategories}
              onToggleSubcategory={toggleSubcategory}
              horario={horario}
              onHorarioChange={setHorario}
              horarioError={horarioError}
            />

            <Field>
              <Button type="submit" form="form-fiche" disabled={isLoading}>
                {isLoading ? <Spinner /> : "Enviar mi negocio"}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
