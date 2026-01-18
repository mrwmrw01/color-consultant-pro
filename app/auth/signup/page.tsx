
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AuthGuard } from "@/components/auth/auth-guard"
import { SignUpForm } from "@/components/auth/signup-form"

export default async function SignUpPage() {
  const session = await getServerSession(authOptions)

  if (session) {
    redirect("/dashboard")
  }

  return (
    <AuthGuard requireAuth={false}>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-12 px-4">
        <SignUpForm />
      </div>
    </AuthGuard>
  )
}
