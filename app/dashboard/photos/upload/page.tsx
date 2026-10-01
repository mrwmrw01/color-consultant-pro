
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { PhotoUpload } from "@/components/photos/photo-upload"

export const dynamic = "force-dynamic"

interface PhotoUploadPageProps {
  searchParams: { project?: string }
}

export default async function PhotoUploadPage({ searchParams }: PhotoUploadPageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return <div>Unauthorized</div>
  }

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    orderBy: { name: "asc" }
  })

  // Fetch all global rooms
  const globalRooms = await prisma.room.findMany({
    where: { projectId: null },
    orderBy: [
      { roomType: 'asc' },
      { name: 'asc' }
    ]
  })

  // Serialize dates for client component
  const serializedRooms = globalRooms.map(room => ({
    ...room,
    createdAt: room.createdAt.toISOString(),
    updatedAt: room.updatedAt.toISOString(),
  }))

  const serializedProjects = projects.map(p => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }))

  return <PhotoUpload projects={serializedProjects} globalRooms={serializedRooms} preselectedProjectId={searchParams.project} />
}
