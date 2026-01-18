
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { User, Mail, Building, UserCheck } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return <div>Unauthorized</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-600 mt-1">
          Manage your account information and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Full Name</label>
              <p className="text-gray-900">
                {session.user.firstName} {session.user.lastName} || session.user.name || 'Not provided'
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <p className="text-gray-900">{session.user.email}</p>
              </div>
            </div>
            
            {session.user.companyName && (
              <div>
                <label className="text-sm font-medium text-gray-700">Company</label>
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-gray-400" />
                  <p className="text-gray-900">{session.user.companyName}</p>
                </div>
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium text-gray-700">Role</label>
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-gray-400" />
                <p className="text-gray-900 capitalize">{session.user.role || 'consultant'}</p>
              </div>
            </div>
            
            <Button variant="outline" className="w-full">
              Edit Profile (Coming Soon)
            </Button>
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Additional account management features will be available soon.
            </p>
            <div className="space-y-2">
              <Button variant="outline" className="w-full" disabled>
                Change Password
              </Button>
              <Button variant="outline" className="w-full" disabled>
                Notification Preferences
              </Button>
              <Button variant="outline" className="w-full" disabled>
                Data Export
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
