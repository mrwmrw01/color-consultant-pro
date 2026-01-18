
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { ClientsList } from "@/components/clients/clients-list"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function ClientsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  const clients = await prisma.client.findMany({
    where: { userId: session.user.id },
    include: {
      _count: {
        select: {
          properties: true
        }
      }
    },
    orderBy: { updatedAt: "desc" }
  })

  return <ClientsList clients={clients} />
}
