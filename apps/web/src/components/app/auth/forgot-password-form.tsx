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
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useAuthActions } from "@convex-dev/auth/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { useConvex } from "convex/react"
import * as z from "zod"
import { api } from "@packages/backend/convex/_generated/api"
import { useRouter } from "next/navigation"
import * as React from "react"
import { getConvexErrorMessage } from "@/utils/getConvexErrorMessage"
import { Spinner } from "@/components/ui/spinner"

const formSchema = z.object({
  email: z
    .string()
    .min(1, "El correo es obligatorio")
    .email("Ingresa un correo válido"),
})

export function ForgotPasswordForm({
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
      email: "",
    },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setFormError(null)

    // Check if account exists
    const user = await convex.query(api.table.users.getUserByEmail, {
      email: data.email,
    })
    if (!user) {
      setFormError("No encontramos una cuenta con este correo")
      return
    }

    setIsLoading(true)
    try {
      await signIn("password", {
        email: data.email,
        flow: "reset",
      })
      router.replace(`/reset-password?email=${encodeURIComponent(data.email)}`)
    } catch (error) {
      setFormError(getConvexErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="p-0">
          <form
            className="p-6 md:p-8"
            id="form-forgot-password"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">¿Olvidaste tu contraseña?</h1>
                <p className="text-muted-foreground text-sm text-balance">
                  Ingresa tu correo para restablecer tu contraseña
                </p>
              </div>
              {formError && (
                <div className="text-destructive self-center">{formError}</div>
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
              <Field className="gap-2">
                <Button
                  type="submit"
                  form="form-forgot-password"
                  disabled={isLoading}
                >
                  {isLoading ? <Spinner /> : "Restablecer contraseña"}
                </Button>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => router.push("/login")}
                  disabled={isLoading}
                >
                  Volver a iniciar sesión
                </Button>
              </Field>
              <FieldDescription className="text-center">
                ¿Recuerdas tu contraseña? <a href="/login">Iniciar sesión</a>
              </FieldDescription>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        Al continuar, aceptas los <a href="/terminos">Términos y Condiciones</a> y
        la <a href="/privacidad">Política de Privacidad</a>.
      </FieldDescription>
    </div>
  )
}
