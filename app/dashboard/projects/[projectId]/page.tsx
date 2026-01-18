
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { ProjectDetail } from "@/components/projects/project-detail"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

interface PageProps {
  params: { projectId: string }
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return <div>Unauthorized</div>
  }

  const project = await prisma.project.findFirst({
    where: {
      id: params.projectId,
      userId: session.user.id
    },
    include: {
      rooms: {
        include: {
          photos: {
            include: {
              annotations: {
                include: {
                  color: true
                }
              }
            }
          }
        }
      },
      photos: {
        include: {
          annotations: {
            include: {
              color: true
            }
          }
        },
        orderBy: { createdAt: "desc" }
      },
      synopsis: {
        include: {
          entries: {
            include: {
              room: true,
              color: true
            }
          }
        }
      }
    }
  })

  if (!project) {
    notFound()
  }

  // Fetch all global rooms
  const globalRooms = await prisma.room.findMany({
    where: { projectId: null },
    orderBy: { name: 'asc' }
  })

  return <ProjectDetail project={project} globalRooms={globalRooms} />
}
