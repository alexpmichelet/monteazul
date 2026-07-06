import { ForgotPasswordForm } from "@/components/app/auth/forgot-password-form"

export default function ForgotPasswordPage() {
  return (
    <div className="bg-page flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <ForgotPasswordForm />
      </div>
    </div>
  )
}
