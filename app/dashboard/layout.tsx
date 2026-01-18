
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AuthGuard } from "@/components/auth/auth-guard"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/signin")
  }

  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-gray-50">
        <DashboardNav />
        <div className="flex">
          <DashboardSidebar />
          <main className="flex-1 lg:ml-64 w-full min-w-0">
            <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
