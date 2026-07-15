"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { Controller, useForm, useWatch, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { IconCopy } from "@tabler/icons-react";
import { api } from "@packages/backend/convex/_generated/api";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { getConvexErrorMessage } from "@/utils/getConvexErrorMessage";
import {
  DEFAULT_HORARIO,
  validateHorario,
  type Horario,
} from "@/components/app/entrepreneur/horario-editor";
import {
  CommerceFields,
  type CommerceFieldsValues,
  RequiredMark,
} from "@/components/app/commerces/commerce-fields";
import {
  PhotoPicker,
  type PickedPhoto,
} from "@/components/app/entrepreneur/photo-picker";
import {
  uploadCompressedPhoto,
  type UploadedPhoto,
} from "@/lib/photo-upload";

// Client-side email check mirroring the backend `EMAIL_PATTERN`.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const formSchema = z.object({
  email: z
    .string()
    .regex(EMAIL_REGEX, "El correo electrónico no es válido."),
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
  resides: z.string().min(1, "Indica si reside en Monteazul."),
  notas: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type Credentials = { email: string; password: string };

/**
 * The Super admin « Crear cuenta de empresa » form (WhatsApp onboarding). It
 * collects the merchant's email plus the fiche (same fields and validations as
 * the entrepreneur form) and calls `createSeededEntreprise`, which creates the
 * `entreprise` account and its published fiche and returns a strong password.
 *
 * That password is shown ONCE (it is never stored in plaintext nor re-readable):
 * the admin copies it and transmits it manually by WhatsApp. No email is sent.
 */
export function CreateEntrepriseForm() {
  const options = useQuery(api.table.commerces.getFormOptions);
  const createSeededEntreprise = useMutation(
    api.table.seededEntreprise.createSeededEntreprise,
  );
  const generateSubmissionUploadUrl = useMutation(
    api.table.commerces.generateSubmissionUploadUrl,
  );

  const [subcategories, setSubcategories] = React.useState<string[]>([]);
  const [horario, setHorario] = React.useState<Horario>(DEFAULT_HORARIO);
  const [horarioError, setHorarioError] = React.useState<string | null>(null);
  const [photos, setPhotos] = React.useState<PickedPhoto[]>([]);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [credentials, setCredentials] = React.useState<Credentials | null>(
    null,
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      name: "",
      category: "",
      description: "",
      whatsapp: "",
      instagram: "",
      contactName: "",
      infoExtra: "",
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

  function resetForm() {
    form.reset();
    setSubcategories([]);
    setHorario(DEFAULT_HORARIO);
    setHorarioError(null);
    // Preview URLs were already revoked when the picker unmounted (credentials
    // screen) — only the stale entries need clearing.
    setPhotos([]);
    setFormError(null);
    setCredentials(null);
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
    // seeded fiche is published with its vitrine at once.
    const photoIds: UploadedPhoto[] = [];
    try {
      for (const photo of photos) {
        photoIds.push(
          await uploadCompressedPhoto(
            () => generateSubmissionUploadUrl(),
            photo.file,
          ),
        );
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
      const result = await createSeededEntreprise({
        email: data.email,
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
        photos: photoIds.length > 0 ? photoIds : undefined,
      });
      setCredentials(result);
      toast.success("Cuenta de empresa creada.");
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

  if (credentials) {
    return (
      <CredentialsReveal credentials={credentials} onCreateAnother={resetForm} />
    );
  }

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Crear cuenta de empresa</CardTitle>
        <p className="text-muted-foreground text-sm">
          Crea la cuenta del comerciante y su ficha (se publica de inmediato). Se
          generará una contraseña que deberás enviarle manualmente por WhatsApp.
          No se envía ningún correo.
        </p>
      </CardHeader>
      <CardContent>
        <form
          id="form-create-entreprise"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <FieldGroup>
            {formError && (
              <div className="text-destructive text-sm">{formError}</div>
            )}

            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="email">
                    Correo electrónico del comerciante
                    <RequiredMark />
                  </FieldLabel>
                  <Input
                    {...field}
                    id="email"
                    type="email"
                    inputMode="email"
                    placeholder="comerciante@example.com"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <CommerceFields
              control={
                form.control as unknown as Control<CommerceFieldsValues>
              }
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

            <Field>
              <FieldLabel>Fotos del negocio</FieldLabel>
              <PhotoPicker value={photos} onChange={setPhotos} />
            </Field>

            <Field>
              <Button
                type="submit"
                form="form-create-entreprise"
                disabled={isLoading}
              >
                {isLoading ? <Spinner /> : "Crear cuenta"}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

/**
 * One-time reveal of the generated credentials. The password is never stored in
 * plaintext nor re-displayable, so the admin must copy it here and send it by
 * WhatsApp before leaving the screen.
 */
function CredentialsReveal({
  credentials,
  onCreateAnother,
}: {
  credentials: Credentials;
  onCreateAnother: () => void;
}) {
  async function copy(value: string) {
    try {
      await navigator.clipboard?.writeText(value);
      toast.success("Copiado.");
    } catch {
      toast.error("No se pudo copiar.");
    }
  }

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Cuenta creada</CardTitle>
        <p className="text-muted-foreground text-sm">
          Envía estas credenciales al comerciante por WhatsApp. El comerciante
          podrá cambiar su contraseña con « Olvidé mi contraseña ».
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Alert variant="destructive">
          <AlertTitle>Guarda la contraseña ahora</AlertTitle>
          <AlertDescription>
            No se volverá a mostrar y no puede recuperarse. No se ha enviado
            ningún correo.
          </AlertDescription>
        </Alert>

        <Field>
          <FieldLabel>Correo electrónico</FieldLabel>
          <div className="flex items-center gap-2">
            <code className="bg-muted flex-1 truncate rounded-md px-3 py-2 text-sm">
              {credentials.email}
            </code>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Copiar correo"
              onClick={() => copy(credentials.email)}
            >
              <IconCopy className="size-4" />
            </Button>
          </div>
        </Field>

        <Field>
          <FieldLabel>Contraseña generada</FieldLabel>
          <div className="flex items-center gap-2">
            <code className="bg-muted flex-1 truncate rounded-md px-3 py-2 font-mono text-sm">
              {credentials.password}
            </code>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Copiar contraseña"
              onClick={() => copy(credentials.password)}
            >
              <IconCopy className="size-4" />
            </Button>
          </div>
        </Field>

        <div>
          <Button type="button" variant="outline" onClick={onCreateAnother}>
            Crear otra cuenta
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
