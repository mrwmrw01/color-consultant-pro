
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { SynopsisList } from "@/components/synopsis/synopsis-list"

export const dynamic = "force-dynamic"

export default async function SynopsisPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return <div>Unauthorized</div>
  }

  const synopsis = await prisma.colorSynopsis.findMany({
    where: {
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
        }
      }
    },
    orderBy: { createdAt: "desc" }
  })

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    include: {
      _count: {
        select: {
          photos: true,
          rooms: true
        }
      }
    },
    orderBy: { name: "asc" }
  })

  return <SynopsisList synopsis={synopsis} projects={projects} />
}
