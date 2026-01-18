
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { CreateProjectFormHierarchy } from "@/components/projects/create-project-form-hierarchy"

export const dynamic = "force-dynamic"

export default async function NewProjectPage({ 
  params 
}: { 
  params: { clientId: string; propertyId: string } 
}) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  // Verify property exists and belongs to user's client
  const property = await prisma.property.findUnique({
    where: { 
      id: params.propertyId,
      clientId: params.clientId,
      client: {
        userId: session.user.id
      }
    },
    include: {
      client: true
    }
  })

  if (!property) {
    redirect(`/dashboard/clients/${params.clientId}`)
  }

  return (
    <div className="p-8 rounded-lg" style={{ backgroundColor: '#fef3e8' }}>
      <CreateProjectFormHierarchy 
        propertyId={property.id} 
        propertyName={property.name || property.address || "Property"}
        clientId={property.client.id}
        clientName={property.client.name}
      />
    </div>
  )
}
