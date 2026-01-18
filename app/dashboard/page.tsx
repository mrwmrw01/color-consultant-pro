

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { DashboardOverview } from "@/components/dashboard/dashboard-overview"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  // Fetch dashboard stats
  const [totalClients, totalProperties, totalProjects, totalPhotos, activeProjects, totalColors] = await Promise.all([
    prisma.client.count({
      where: { userId: session.user.id }
    }),
    prisma.property.count({
      where: { 
        client: {
          userId: session.user.id
        }
      }
    }),
    prisma.project.count({
      where: { 
        property: {
          client: {
            userId: session.user.id
          }
        }
      }
    }),
    prisma.photo.count({
      where: {
        project: {
          property: {
            client: {
              userId: session.user.id
            }
          }
        }
      }
    }),
    prisma.project.count({
      where: { 
        property: {
          client: {
            userId: session.user.id
          }
        },
        status: 'active'
      }
    }),
    prisma.color.count()
  ])

  // Get recent clients
  const clients = await prisma.client.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    take: 5,
    include: {
      _count: {
        select: { 
          properties: true
        }
      }
    }
  })

  const stats = {
    totalClients,
    totalProperties,
    totalProjects,
    totalPhotos,
    activeProjects,
    totalColors
  }

  return <DashboardOverview stats={stats} clients={clients} user={session.user} />
}
