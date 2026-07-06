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
  // FieldSeparator, // Google sign-in disabled in the UI (see below)
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/custom/password-input"
import { useAuthActions } from "@convex-dev/auth/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { useConvex } from "convex/react"
import * as z from "zod"
import { api } from "@packages/backend/convex/_generated/api"
import { useRouter, useSearchParams } from "next/navigation"
import * as React from "react"
import { getConvexErrorMessage } from "@/utils/getConvexErrorMessage"
import { Spinner } from "@/components/ui/spinner"

const ERROR_MESSAGES: Record<string, string> = {
  admin_required: "Access denied. Admin privileges required.",
};

const formSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuthActions();
  const convex = useConvex();
  
  // Check for error in URL params (e.g., from admin guard redirect)
  const urlError = searchParams.get("error");
  const initialError = urlError ? ERROR_MESSAGES[urlError] ?? null : null;
  
  const [formError, setFormError] = React.useState<string | null>(initialError);
  const [isLoading, setIsLoading] = React.useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    const user = await convex.query(api.table.users.getUserByEmail, {
      email: data.email,
    });
    if (!user) {
      setFormError("No account found with this email");
      return;
    }
    setIsLoading(true);
    try {
      const { signingIn } = await signIn("password", {
        email: data.email,
        password: data.password,
        flow: "signIn",
      });
      if (!signingIn) {
        router.replace(`/verify-email?email=${data.email}`);
      }
    } catch (error) {
      // The account exists (checked above), so a failed password sign-in is a
      // wrong password — show that explicitly instead of a generic error.
      setFormError(
        getConvexErrorMessage(error, "Incorrect email or password."),
      );
    } finally {
      setIsLoading(false);
    }
  }

  // Google sign-in disabled in the UI — we only use the email/password
  // provider for now. To re-enable: uncomment this function, the
  // "Or continue with" block below and the FieldSeparator import.
  // async function handleGoogleSignIn() {
  //   setFormError(null);
  //   try {
  //     await signIn("google");
  //   } catch (error) {
  //     setFormError(getConvexErrorMessage(error));
  //   }
  // }
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">

          <form className="p-6 md:p-8" id="form-login" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Admin Portal</h1>
                <p className="text-muted-foreground text-balance">
                  Sign in to access the admin dashboard
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
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  {...field}
                  id="email"
                  aria-invalid={fieldState.invalid}
                  type="email"
                  placeholder="m@example.com"
                  required
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
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <a
                    href="/forgot-password"
                    className="ml-auto text-sm underline-offset-2 hover:underline"
                  >
                    Forgot your password?
                  </a>
                </div>
                <PasswordInput {...field} id="password" aria-invalid={fieldState.invalid} required />
                {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
              </Field>
              )}
              />
              <Field>
                <Button type="submit" form="form-login" disabled={isLoading}>
                  {isLoading ? <Spinner /> : "Login"}
                </Button>
              </Field>
              {/* Google sign-in disabled in the UI — we only use the
                  email/password provider for now. To re-enable: uncomment this
                  block, the handleGoogleSignIn function and the FieldSeparator
                  import.
              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                Or continue with
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
                  Continue with Google
                </Button>
              </Field>
              */}
              <FieldDescription className="text-center">
                Admin access only. Contact your administrator for access.
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className="bg-muted relative hidden md:block">
            <img
              src="/placeholder.svg"
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}
