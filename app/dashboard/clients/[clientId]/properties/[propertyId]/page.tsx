
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Building2, MapPin, FileText, Plus, FolderOpen, ArrowRight } from "lucide-react"
import Link from "next/link"
import { ProjectCard } from "@/components/projects/project-card"

export const dynamic = "force-dynamic"

export default async function PropertyDetailPage({ 
  params 
}: { 
  params: { clientId: string; propertyId: string } 
}) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  const property = await prisma.property.findUnique({
    where: { 
      id: params.propertyId,
      clientId: params.clientId,
      client: {
        userId: session.user.id
      }
    },
    include: {
      client: true,
      projects: {
        include: {
          rooms: {
            orderBy: { name: "asc" }
          },
          photos: {
            take: 3,
            orderBy: { createdAt: "desc" }
          },
          _count: {
            select: {
              photos: true,
              rooms: true
            }
          }
        },
        orderBy: { updatedAt: "desc" }
      },
      _count: {
        select: {
          projects: true
        }
      }
    }
  })

  if (!property) {
    redirect(`/dashboard/clients/${params.clientId}`)
  }

  return (
    <div className="space-y-6 p-8 rounded-lg" style={{ backgroundColor: '#fef3e8' }}>
      {/* Breadcrumb */}
      <div className="flex flex-col gap-2">
        <Button variant="ghost" size="sm" asChild className="self-start">
          <Link href={`/dashboard/clients/${property.client.id}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {property.client.name}
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Building2 className="h-8 w-8" style={{ color: '#c47004' }} />
          <h1 className="text-3xl font-bold" style={{ color: '#412501' }}>
            {property.name || property.address}
          </h1>
          {property.type && (
            <Badge variant="secondary" className="text-sm">
              {property.type}
            </Badge>
          )}
        </div>
        <p className="text-sm" style={{ color: '#8b4513' }}>
          Client: {property.client.name}
        </p>
      </div>

      {/* Property Info Card */}
      <Card style={{ borderColor: '#d2691e', borderWidth: '1px' }}>
        <CardHeader>
          <CardTitle style={{ color: '#412501' }}>Property Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {property.address && (
            <div className="flex items-start gap-2" style={{ color: '#8b4513' }}>
              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{property.address}</span>
            </div>
          )}

          <div className="flex items-center gap-2" style={{ color: '#8b4513' }}>
            <FolderOpen className="h-4 w-4" />
            <span>{property._count.projects} {property._count.projects === 1 ? 'project' : 'projects'}</span>
          </div>

          {property.notes && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium" style={{ color: '#412501' }}>
                <FileText className="h-4 w-4" />
                Notes
              </div>
              <p className="text-sm" style={{ color: '#8b4513' }}>
                {property.notes}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Projects Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: '#412501' }}>Projects</h2>
            <p className="mt-1" style={{ color: '#8b4513' }}>
              Consultation projects for this property
            </p>
          </div>
          <Button asChild style={{ backgroundColor: '#c47004' }}>
            <Link href={`/dashboard/clients/${property.client.id}/properties/${property.id}/projects/new`}>
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Link>
          </Button>
        </div>

        {property.projects.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <FolderOpen className="h-16 w-16 mx-auto mb-4" style={{ color: '#d2691e' }} />
                <h3 className="text-lg font-medium mb-2" style={{ color: '#412501' }}>
                  No projects yet
                </h3>
                <p className="mb-6" style={{ color: '#8b4513' }}>
                  Create a project for this property
                </p>
                <Button asChild style={{ backgroundColor: '#c47004' }}>
                  <Link href={`/dashboard/clients/${property.client.id}/properties/${property.id}/projects/new`}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Project
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {property.projects.map((project) => (
              <ProjectCard 
                key={project.id}
                project={project}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
