
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { CreatePropertyForm } from "@/components/properties/create-property-form"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function NewPropertyPage({ params }: { params: { clientId: string } }) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  // Verify client exists and belongs to user
  const client = await prisma.client.findUnique({
    where: { 
      id: params.clientId,
      userId: session.user.id
    }
  })

  if (!client) {
    redirect("/dashboard/clients")
  }

  return (
    <div className="p-8 rounded-lg" style={{ backgroundColor: '#fef3e8' }}>
      <CreatePropertyForm clientId={client.id} clientName={client.name} />
    </div>
  )
}
