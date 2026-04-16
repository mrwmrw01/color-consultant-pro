import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect("/auth/signin")
  }
  const role = (session.user as any).role ?? "user"
  if (!["admin", "consultant"].includes(role)) {
    redirect("/dashboard")
  }

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-semibold text-slate-900">Catalog Administration</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage paint manufacturers and colors across the catalog.
        </p>
        <nav className="flex gap-4 mt-4">
          <Link
            href="/dashboard/admin/manufacturers"
            className="text-sm text-slate-700 hover:text-slate-900 hover:underline underline-offset-4"
          >
            Manufacturers
          </Link>
          <Link
            href="/dashboard/admin/colors"
            className="text-sm text-slate-700 hover:text-slate-900 hover:underline underline-offset-4"
          >
            Colors
          </Link>
          <Link
            href="/dashboard/admin/colors/import"
            className="text-sm text-slate-700 hover:text-slate-900 hover:underline underline-offset-4"
          >
            Import CSV
          </Link>
        </nav>
      </div>
      {children}
    </div>
  )
}
