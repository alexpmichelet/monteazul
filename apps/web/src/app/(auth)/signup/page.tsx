import { SignupForm } from "@/components/app/auth/signup-form"

export default function SignupPage() {
  return (
    <div className="bg-page flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <SignupForm />
      </div>
    </div>
  )
}
