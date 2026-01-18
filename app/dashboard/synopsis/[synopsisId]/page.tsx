
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { SynopsisDetail } from "@/components/synopsis/synopsis-detail"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

interface PageProps {
  params: { synopsisId: string }
}

export default async function SynopsisDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return <div>Unauthorized</div>
  }

  const synopsis = await prisma.colorSynopsis.findFirst({
    where: {
      id: params.synopsisId,
      project: {
        userId: session.user.id
      }
    },
    include: {
      project: true,
      entries: {
        include: {
          room: true,
          color: true
        },
        orderBy: [
          { room: { name: "asc" } },
          { surfaceType: "asc" }
        ]
      }
    }
  })

  if (!synopsis) {
    notFound()
  }

  return <SynopsisDetail synopsis={synopsis} />
}
