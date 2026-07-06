"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { IconCopy } from "@tabler/icons-react";
import { api } from "@packages/backend/convex/_generated/api";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

// Client-side email check mirroring the backend `EMAIL_PATTERN`.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const formSchema = z.object({
  email: z
    .string()
    .regex(EMAIL_REGEX, "El correo electrónico no es válido."),
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

  const [subcategories, setSubcategories] = React.useState<string[]>([]);
  const [horario, setHorario] = React.useState<Horario>(DEFAULT_HORARIO);
  const [horarioError, setHorarioError] = React.useState<string | null>(null);
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

  function resetForm() {
    form.reset();
    setSubcategories([]);
    setHorario(DEFAULT_HORARIO);
    setHorarioError(null);
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
    try {
      const result = await createSeededEntreprise({
        email: data.email,
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
                    ¿Resides en Monteazul? (interno)
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
                  <FieldLabel htmlFor="notas">Notas (interno)</FieldLabel>
                  <Textarea {...field} id="notas" rows={2} />
                </Field>
              )}
            />

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
