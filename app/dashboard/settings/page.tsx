
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Settings, Bell, Shield, Database, Palette } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return <div>Unauthorized</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">
          Configure your application preferences and settings
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Application Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Application Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Default Project Settings</h4>
              <p className="text-sm text-gray-600 mb-3">
                Configure default settings for new projects
              </p>
              <Button variant="outline" disabled>
                Configure Defaults (Coming Soon)
              </Button>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Color Preferences</h4>
              <p className="text-sm text-gray-600 mb-3">
                Set your preferred color brands and catalogs
              </p>
              <Button variant="outline" disabled>
                <Palette className="mr-2 h-4 w-4" />
                Color Settings (Coming Soon)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Privacy & Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Data Privacy</h4>
              <p className="text-sm text-gray-600 mb-3">
                Manage your data privacy and security settings
              </p>
              <Button variant="outline" disabled>
                Privacy Settings (Coming Soon)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Email and push notification preferences
            </p>
            <Button variant="outline" disabled>
              Configure Notifications (Coming Soon)
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
                Export your projects, photos, and annotations
              </p>
              <Button variant="outline" disabled>
                Export All Data (Coming Soon)
              </Button>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Data Cleanup</h4>
              <p className="text-sm text-gray-600 mb-3">
                Clean up unused data and optimize storage
              </p>
              <Button variant="outline" disabled>
                Cleanup Tools (Coming Soon)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
