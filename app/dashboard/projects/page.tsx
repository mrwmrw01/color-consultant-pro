
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { ProjectsList } from "@/components/projects/projects-list"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  const projects = await prisma.project.findMany({
    where: { 
      property: {
        client: {
          userId: session.user.id
        }
      }
    },
    include: {
      property: {
        include: {
          client: true
        }
      },
      rooms: {
        orderBy: { name: "asc" }
      },
      photos: {
        take: 3,
        orderBy: { createdAt: "desc" }
      },
      _count: {
        select: {
          photos: true,
          rooms: true
        }
      }
    },
    orderBy: { updatedAt: "desc" }
  })

  return <ProjectsList projects={projects} />
}
