
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
    select: {
      id: true,
      colorCode: true,
      name: true,
      manufacturer: true,
      hexColor: true,
      rgbColor: true,
      usageCount: true,
      status: true,
    },
    orderBy: [
      { usageCount: 'desc' },
      { manufacturer: "asc" },
      { colorCode: "asc" },
    ],
    take: 200, // Initial page load — paginate via client-side search/filter
  })

  return <ColorManagement colorCodes={colorCodes} />
}
