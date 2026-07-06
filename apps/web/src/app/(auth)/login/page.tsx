import { LoginForm } from "@/components/app/auth/login-form"

export default function LoginPage() {
  return (
    <div className="bg-page flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  )
}
