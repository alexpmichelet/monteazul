"use client";

import * as React from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/custom/password-input";
import { Spinner } from "@/components/ui/spinner";
import { getConvexErrorMessage } from "@/utils/getConvexErrorMessage";

const formSchema = z
  .object({
    name: z.string().min(1, "El nombre es obligatorio."),
    email: z
      .string()
      .min(1, "El correo es obligatorio.")
      .email("Introduce un correo válido."),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
    confirmPassword: z.string().min(1, "Confirma tu contraseña."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof formSchema>;

/**
 * Entrepreneur account creation. Reuses the shared Convex Auth Password provider
 * (`signUp` flow). If the deployment requires email verification, the account
 * is routed through the OTP screen; otherwise it lands straight on « Mi negocio »
 * where the fiche wizard awaits.
 */
export function RegistroForm({ className, ...props }: React.ComponentProps<"div">) {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  async function onSubmit(data: FormValues) {
    setFormError(null);
    setIsLoading(true);
    try {
      const { signingIn } = await signIn("password", {
        name: data.name,
        email: data.email,
        password: data.password,
        flow: "signUp",
      });
      if (signingIn) {
        router.replace("/mi-negocio");
      } else {
        router.replace(`/verificar?email=${encodeURIComponent(data.email)}`);
      }
    } catch (error) {
      setFormError(
        getConvexErrorMessage(
          error,
          "No pudimos crear tu cuenta. Verifica los datos e inténtalo de nuevo.",
        ),
      );
      setIsLoading(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="p-0">
        <CardContent className="p-6 md:p-8">
          <form id="form-registro" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Crea tu cuenta</h1>
                <p className="text-muted-foreground text-balance">
                  Regístrate para publicar tu negocio en el directorio de
                  Monteazul.
                </p>
              </div>

              {formError && (
                <div className="text-destructive self-center text-sm">
                  {formError}
                </div>
              )}

              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="name">Nombre</FieldLabel>
                    <Input {...field} id="name" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="email">Correo</FieldLabel>
                    <Input
                      {...field}
                      id="email"
                      type="email"
                      placeholder="tu@correo.com"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="password">Contraseña</FieldLabel>
                    <PasswordInput
                      {...field}
                      id="password"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="confirmPassword"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="confirmPassword">
                      Confirmar contraseña
                    </FieldLabel>
                    <PasswordInput
                      {...field}
                      id="confirmPassword"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Field>
                <Button type="submit" form="form-registro" disabled={isLoading}>
                  {isLoading ? <Spinner /> : "Crear cuenta"}
                </Button>
              </Field>

              <FieldDescription className="text-center">
                ¿Ya tienes cuenta? <Link href="/acceso">Inicia sesión</Link>
              </FieldDescription>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
