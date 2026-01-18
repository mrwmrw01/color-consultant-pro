
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { ProjectSynopsisView } from "@/components/projects/project-synopsis-view"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function SynopsisPage({ params }: { params: { projectId: string } }) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  // Fetch project with synopsis
  const project = await prisma.project.findFirst({
    where: {
      id: params.projectId,
      userId: session.user.id
    },
    include: {
      synopsis: {
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          _count: {
            select: {
              entries: true
            }
          }
        }
      },
      _count: {
        select: {
          photos: true,
          rooms: true
        }
      }
    }
  })

  if (!project) {
    redirect('/dashboard/projects')
  }

  return <ProjectSynopsisView project={project} />
}
