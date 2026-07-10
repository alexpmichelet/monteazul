"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { useAuthActions } from "@convex-dev/auth/react"
import { useRouter } from "next/navigation"
import * as React from "react"
import { getConvexErrorMessage } from "@/utils/getConvexErrorMessage"
import { Spinner } from "@/components/ui/spinner"

interface OTPFormProps extends React.ComponentProps<"div"> {
  email: string
}

export function OTPForm({ className, email, ...props }: OTPFormProps) {
  const router = useRouter()
  const { signIn } = useAuthActions()
  const [code, setCode] = React.useState("")
  const [formError, setFormError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  async function onSubmit(submittedCode?: string) {
    const value = submittedCode ?? code
    setFormError(null)

    if (value.length !== 6) {
      setFormError("Introduce el código completo de 6 dígitos.")
      return
    }

    setIsLoading(true)
    try {
      await signIn("password", {
        email,
        code: value,
        flow: "email-verification",
      })
      // If successful, the auth provider will handle the redirect
    } catch (error) {
      setFormError(getConvexErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  function handleCodeChange(value: string) {
    setCode(value)
    // Auto-submit when all 6 digits are entered
    if (value.length === 6) {
      onSubmit(value)
    }
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit()
  }

  return (
    <div
      className={cn("flex flex-col gap-6 md:min-h-[450px]", className)}
      {...props}
    >
      <Card className="flex-1 overflow-hidden p-0">
        <CardContent className="grid flex-1 p-0 md:grid-cols-2">
          <form
            className="flex flex-col items-center justify-center p-6 md:p-8"
            id="form-otp"
            onSubmit={handleFormSubmit}
          >
            <FieldGroup>
              <Field className="items-center text-center">
                <h1 className="text-2xl font-bold">
                  Introduce el código de verificación
                </h1>
                <p className="text-muted-foreground text-sm text-balance">
                  Enviamos un código de 6 dígitos a {email}
                </p>
              </Field>
              {formError && (
                <div className="text-destructive self-center text-center">{formError}</div>
              )}
              <Field>
                <FieldLabel htmlFor="otp" className="sr-only">
                  Código de verificación
                </FieldLabel>
                <InputOTP
                  maxLength={6}
                  id="otp"
                  value={code}
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
                <FieldDescription className="text-center">
                  Introduce el código de 6 dígitos enviado a tu correo.
                </FieldDescription>
              </Field>
              <Field className="gap-2">
                <Button type="submit" form="form-otp" disabled={isLoading}>
                  {isLoading ? <Spinner /> : "Verificar"}
                </Button>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => router.push("/acceso")}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
              </Field>
            </FieldGroup>
          </form>
          <div className="bg-muted relative hidden md:block">
            <img
              src="/placeholder.svg"
              alt="Imagen decorativa"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>
      <FieldDescription className="text-center">
        Al continuar, aceptas los <a href="/terminos">Términos y Condiciones</a>{" "}
        y la <a href="/privacidad">Política de Privacidad</a>.
      </FieldDescription>
    </div>
  )
}
