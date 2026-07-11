"use client";

import * as React from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvex } from "convex/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@packages/backend/convex/_generated/api";

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

const formSchema = z.object({
  email: z
    .string()
    .min(1, "El correo es obligatorio.")
    .email("Introduce un correo válido."),
  password: z.string().min(1, "La contraseña es obligatoria."),
});

type FormValues = z.infer<typeof formSchema>;

/**
 * Entrepreneur login. Reuses the shared Convex Auth Password provider (`signIn`
 * flow) and redirects to « Mi negocio » on success — where the wizard is shown
 * if no fiche exists yet, or the fiche + its estado otherwise.
 */
export function AccesoForm({ className, ...props }: React.ComponentProps<"div">) {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const convex = useConvex();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });

  /**
   * Chrome's autofill (and its account-picker popup) fills the inputs WITHOUT
   * firing the events react-hook-form listens to, so the mirrored form state
   * can lag behind what the fields visibly contain — and the submit would then
   * send the OLD credentials (sign into the wrong account). Before validating,
   * copy the real DOM values into the form state: exactly what is on screen is
   * what signs in, on the first «Entrar».
   */
  function syncAutofilledValues(event: React.FormEvent<HTMLFormElement>) {
    const elements = event.currentTarget.elements;
    for (const name of ["email", "password"] as const) {
      const input = elements.namedItem(name);
      if (input instanceof HTMLInputElement) {
        form.setValue(name, input.value);
      }
    }
  }

  async function onSubmit(data: FormValues) {
    setFormError(null);
    setIsLoading(true);
    try {
      const { signingIn } = await signIn("password", {
        email: data.email,
        password: data.password,
        flow: "signIn",
      });
      if (signingIn) {
        // Route by role: a Super admin who signs in here still lands on the
        // admin back-office (/team); everyone else goes to « Mi negocio ».
        const me = await convex.query(api.table.users.currentUser);
        router.replace(me?.role === "admin" ? "/negocios" : "/mi-negocio");
      } else {
        router.replace(`/verificar?email=${encodeURIComponent(data.email)}`);
      }
    } catch (error) {
      setFormError(
        getConvexErrorMessage(error, "Correo o contraseña incorrectos."),
      );
      setIsLoading(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="p-0">
        <CardContent className="p-6 md:p-8">
          <form
            id="form-acceso"
            onSubmit={(event) => {
              syncAutofilledValues(event);
              return form.handleSubmit(onSubmit)(event);
            }}
          >
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Inicia sesión</h1>
                <p className="text-muted-foreground text-balance">
                  Accede para gestionar tu negocio.
                </p>
              </div>

              {formError && (
                <div className="text-destructive self-center text-sm">
                  {formError}
                </div>
              )}

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
                    <div className="flex items-center">
                      <FieldLabel htmlFor="password">Contraseña</FieldLabel>
                      <Link
                        href="/forgot-password"
                        className="ml-auto text-sm underline-offset-2 hover:underline"
                      >
                        ¿Olvidaste tu contraseña?
                      </Link>
                    </div>
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

              <Field>
                <Button type="submit" form="form-acceso" disabled={isLoading}>
                  {isLoading ? <Spinner /> : "Entrar"}
                </Button>
              </Field>

              <FieldDescription className="text-center">
                ¿No tienes cuenta? <Link href="/registro">Regístrate</Link>
              </FieldDescription>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
