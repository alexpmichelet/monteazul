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
import { PasswordInput } from "@/components/custom/password-input"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { useAuthActions } from "@convex-dev/auth/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { useRouter } from "next/navigation"
import * as React from "react"
import { getConvexErrorMessage } from "@/utils/getConvexErrorMessage"
import { Spinner } from "@/components/ui/spinner"
import * as z from "zod"

const formSchema = z.object({
  newPassword: z
    .string()
    .min(1, "La nueva contraseña es obligatoria")
    .min(8, "La contraseña debe tener al menos 8 caracteres"),
  code: z.string().length(6, "El código debe tener 6 dígitos"),
})

interface ResetPasswordFormProps extends React.ComponentProps<"div"> {
  email: string
}

export function ResetPasswordForm({
  className,
  email,
  ...props
}: ResetPasswordFormProps) {
  const router = useRouter()
  const { signIn } = useAuthActions()
  const [formError, setFormError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      newPassword: "",
      code: "",
    },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setFormError(null)
    setIsLoading(true)
    try {
      await signIn("password", {
        code: data.code,
        newPassword: data.newPassword,
        email,
        flow: "reset-verification",
      })
      // Password reset successful — the User is now signed in, back to the
      // public annuaire.
      router.replace("/")
    } catch (error) {
      setFormError(getConvexErrorMessage(error))
      setIsLoading(false)
    }
  }

  function handleCodeChange(value: string) {
    form.setValue("code", value)
    // Auto-submit when all 6 digits are entered
    if (value.length === 6) {
      form.handleSubmit(onSubmit)()
    }
  }

  return (
    <div
      className={cn("flex flex-col gap-6", className)}
      {...props}
    >
      <Card className="overflow-hidden p-0">
        <CardContent className="p-0">
          <form
            className="flex flex-col justify-center p-6 md:p-8"
            id="form-reset-password"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Restablecer contraseña</h1>
                <p className="text-muted-foreground text-sm text-balance">
                  Ingresa el código enviado a {email} y define una nueva
                  contraseña
                </p>
              </div>
              {formError && (
                <div className="text-destructive self-center text-center">
                  {formError}
                </div>
              )}
              <Controller
                name="newPassword"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="newPassword">
                      Nueva contraseña
                    </FieldLabel>
                    <PasswordInput
                      {...field}
                      id="newPassword"
                      aria-invalid={fieldState.invalid}
                      required
                    />
                    <FieldDescription>
                      Debe tener al menos 8 caracteres.
                    </FieldDescription>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="code"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="code">Código de verificación</FieldLabel>
                    <InputOTP
                      maxLength={6}
                      id="code"
                      value={field.value}
                      onChange={handleCodeChange}
                      required
                      containerClassName="gap-4"
                      disabled={isLoading}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                      </InputOTPGroup>
                      <InputOTPSeparator />
                      <InputOTPGroup>
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                    <FieldDescription>
                      Ingresa el código de 6 dígitos que enviamos a tu correo.
                    </FieldDescription>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Field className="gap-2">
                <Button
                  type="submit"
                  form="form-reset-password"
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
                  Cancelar
                </Button>
                <FieldDescription className="text-center">
                  ¿No recibiste el código?{" "}
                  <a href={`/forgot-password`}>Reenviar</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="text-center">
        Al continuar, aceptas nuestros <a href="#">Términos de servicio</a> y
        nuestra <a href="#">Política de privacidad</a>.
      </FieldDescription>
    </div>
  )
}
