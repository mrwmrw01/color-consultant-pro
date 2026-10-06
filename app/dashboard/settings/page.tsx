
import Link from "next/link"
import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Settings, Database, Palette, Download, Wrench } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/auth/signin")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">
          Manage your account, data and color catalog
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Update your name and company, or change your password.
            </p>
            <Button variant="outline" asChild>
              <Link href="/dashboard/profile">Edit Profile &amp; Password</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Export Data</h4>
              <p className="text-sm text-gray-600 mb-3">
                Download your clients, properties, projects, photo records, annotations
                and synopses as a JSON backup file.
              </p>
              <Button variant="outline" asChild>
                <a href="/api/export" download>
                  <Download className="mr-2 h-4 w-4" />
                  Export All Data
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Cleanup */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Cleanup Tools
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Review and bulk-delete old clients, properties and projects.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <Link href="/dashboard/clients/maintenance">Clients</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard/properties/maintenance">Properties</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard/maintenance">Projects</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Color Catalog */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Color Catalog
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Manage paint manufacturers and colors, or import colors from a CSV file.
            </p>
            <Button variant="outline" asChild>
              <Link href="/dashboard/admin">Catalog Administration</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
