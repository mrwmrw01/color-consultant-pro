import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { PropertyMaintenance } from "@/components/properties/property-maintenance"

export const dynamic = 'force-dynamic'

export default async function PropertyMaintenancePage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  // Fetch all properties for the user
  const properties = await prisma.property.findMany({
    where: {
      client: {
        userId: session.user.id
      }
    },
    include: {
      client: {
        select: {
          id: true,
          name: true
        }
      },
      _count: {
        select: {
          projects: true
        }
      }
    },
    orderBy: {
      address: 'asc'
    }
  })

  return <PropertyMaintenance properties={properties} />
}
