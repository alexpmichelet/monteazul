"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  // FieldSeparator, // Google sign-in désactivé dans l'UI (voir plus bas)
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/custom/password-input"
import { useAuthActions } from "@convex-dev/auth/react"
import { useConvex } from "convex/react"
import { api } from "@packages/backend/convex/_generated/api"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { useRouter } from "next/navigation"
import * as React from "react"
import { getConvexErrorMessage } from "@/utils/getConvexErrorMessage"
import { Spinner } from "@/components/ui/spinner"
import * as z from "zod"

const formSchema = z
  .object({
    name: z.string().min(1, "El nombre es obligatorio"),
    email: z
      .string()
      .min(1, "El correo es obligatorio")
      .email("Ingresa un correo válido"),
    password: z
      .string()
      .min(1, "La contraseña es obligatoria")
      .min(8, "La contraseña debe tener al menos 8 caracteres"),
    confirmPassword: z
      .string()
      .min(1, "Confirma tu contraseña"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  })

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const { signIn } = useAuthActions()
  const convex = useConvex()
  const [formError, setFormError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setFormError(null)
    // Surface the common "email already used" case explicitly rather than a
    // generic error once the sign-up call fails.
    const existing = await convex.query(api.table.users.getUserByEmail, {
      email: data.email,
    })
    if (existing) {
      setFormError("Ya existe una cuenta con este correo. Inicia sesión.")
      return
    }
    setIsLoading(true)
    try {
      const { signingIn } = await signIn("password", {
        name: data.name,
        email: data.email,
        password: data.password,
        flow: "signUp",
      })
      if (signingIn) {
        router.replace("/")
      } else {
        router.replace(`/verify-email?email=${encodeURIComponent(data.email)}`)
      }
    } catch (error) {
      setFormError(
        getConvexErrorMessage(
          error,
          "No pudimos crear tu cuenta. Verifica los datos e inténtalo de nuevo.",
        ),
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Google sign-in désactivé dans l'UI — on n'utilise que le provider
  // email / mot de passe pour l'instant. Pour réactiver : décommenter cette
  // fonction, le bloc « O continúa con » plus bas et l'import FieldSeparator.
  // async function handleGoogleSignIn() {
  //   setFormError(null)
  //   try {
  //     await signIn("google")
  //   } catch (error) {
  //     setFormError(getConvexErrorMessage(error))
  //   }
  // }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="p-0">
          <form className="p-6 md:p-8" id="form-signup" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Crea tu cuenta</h1>
                <p className="text-muted-foreground text-sm text-balance">
                  Regístrate para guardar tus negocios favoritos
                </p>
              </div>
              {formError && (
                <div className="text-destructive self-center">{formError}</div>
              )}
              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="name">Nombre</FieldLabel>
                    <Input
                      {...field}
                      id="name"
                      aria-invalid={fieldState.invalid}
                      placeholder="Tu nombre"
                      required
                    />
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
                      aria-invalid={fieldState.invalid}
                      type="email"
                      placeholder="tucorreo@ejemplo.com"
                      required
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Field>
                {/* Subgrid: the two columns share row tracks, so both inputs
                    stay aligned even when "Confirmar contraseña" wraps to two
                    lines while "Contraseña" fits on one. */}
                <Field className="grid grid-cols-2 grid-rows-[auto_auto] gap-x-4 gap-y-2">
                  <Controller
                    name="password"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field
                        data-invalid={fieldState.invalid}
                        className="grid grid-rows-subgrid row-span-2"
                      >
                        <FieldLabel htmlFor="password">Contraseña</FieldLabel>
                        <PasswordInput
                          {...field}
                          id="password"
                          aria-invalid={fieldState.invalid}
                          required
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
                      <Field
                        data-invalid={fieldState.invalid}
                        className="grid grid-rows-subgrid row-span-2"
                      >
                        <FieldLabel htmlFor="confirmPassword">
                          Confirmar contraseña
                        </FieldLabel>
                        <PasswordInput
                          {...field}
                          id="confirmPassword"
                          aria-invalid={fieldState.invalid}
                          required
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />
                </Field>
                <FieldDescription>
                  Debe tener al menos 8 caracteres.
                </FieldDescription>
              </Field>
              <Field>
                <Button type="submit" form="form-signup" disabled={isLoading}>
                  {isLoading ? <Spinner /> : "Crear cuenta"}
                </Button>
              </Field>
              {/* Google sign-in désactivé dans l'UI — on n'utilise que le
                  provider email / mot de passe pour l'instant. Pour réactiver :
                  décommenter ce bloc, la fonction handleGoogleSignIn et l'import
                  FieldSeparator.
              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                O continúa con
              </FieldSeparator>
              <Field>
                <Button
                  variant="outline"
                  type="button"
                  onClick={handleGoogleSignIn}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                      fill="currentColor"
                    />
                  </svg>
                  Continuar con Google
                </Button>
              </Field>
              */}
              <FieldDescription className="text-center">
                ¿Ya tienes cuenta? <a href="/login">Iniciar sesión</a>
              </FieldDescription>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
