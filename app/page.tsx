
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AuthGuard } from "@/components/auth/auth-guard"
import { LandingPage } from "@/components/landing-page"

export default async function HomePage() {
  const session = await getServerSession(authOptions)

  if (session) {
    redirect("/dashboard")
  }

  return (
    <AuthGuard requireAuth={false}>
      <LandingPage />
    </AuthGuard>
  )
}
