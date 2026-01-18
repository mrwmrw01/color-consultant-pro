
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Users, Mail, Phone, FileText, Building2 } from "lucide-react"
import Link from "next/link"
import { PropertiesList } from "@/components/properties/properties-list"

export const dynamic = "force-dynamic"

export default async function ClientDetailPage({ params }: { params: { clientId: string } }) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  const client = await prisma.client.findUnique({
    where: { 
      id: params.clientId,
      userId: session.user.id
    },
    include: {
      properties: {
        include: {
          _count: {
            select: {
              projects: true
            }
          }
        },
        orderBy: { updatedAt: "desc" }
      },
      _count: {
        select: {
          properties: true
        }
      }
    }
  })

  if (!client) {
    redirect("/dashboard/clients")
  }

  return (
    <div className="space-y-6 p-8 rounded-lg" style={{ backgroundColor: '#fef3e8' }}>
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" asChild className="self-start">
          <Link href="/dashboard/clients">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Clients
          </Link>
        </Button>
        
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-8 w-8" style={{ color: '#c47004' }} />
            <h1 className="text-3xl font-bold" style={{ color: '#412501' }}>{client.name}</h1>
          </div>
        </div>
      </div>

      {/* Client Info Card */}
      <Card style={{ borderColor: '#d2691e', borderWidth: '1px' }}>
        <CardHeader>
          <CardTitle style={{ color: '#412501' }}>Client Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {client.email && (
              <div className="flex items-center gap-2" style={{ color: '#8b4513' }}>
                <Mail className="h-4 w-4" />
                <span>{client.email}</span>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-2" style={{ color: '#8b4513' }}>
                <Phone className="h-4 w-4" />
                <span>{client.phone}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2" style={{ color: '#8b4513' }}>
            <Building2 className="h-4 w-4" />
            <span>{client._count.properties} {client._count.properties === 1 ? 'property' : 'properties'}</span>
          </div>

          {client.notes && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium" style={{ color: '#412501' }}>
                <FileText className="h-4 w-4" />
                Notes
              </div>
              <p className="text-sm" style={{ color: '#8b4513' }}>
                {client.notes}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Properties List */}
      <PropertiesList properties={client.properties} clientId={client.id} />
    </div>
  )
}
