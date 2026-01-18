
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { ColorManagement } from "@/components/colors/color-management"

export const dynamic = "force-dynamic"

export default async function ColorsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return <div>Unauthorized</div>
  }

  const colorCodes = await prisma.color.findMany({
    include: {
      availability: {
        orderBy: [
          { productLine: 'asc' },
          { sheen: 'asc' }
        ]
      }
    },
    orderBy: [
      { usageCount: 'desc' },
      { manufacturer: "asc" },
      { colorCode: "asc" },
      { name: "asc" }
    ]
  })

  return <ColorManagement colorCodes={colorCodes} />
}
