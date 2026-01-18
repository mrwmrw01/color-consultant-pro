

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { PhotoAnnotator } from "@/components/photos/photo-annotator"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

interface PageProps {
  params: { photoId: string }
}

export default async function AnnotatePhotoPage({ params }: PageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  const photo = await prisma.photo.findFirst({
    where: {
      id: params.photoId,
      project: {
        userId: session.user.id
      }
    },
    include: {
      project: true,
      room: true,
      annotations: {
        include: {
          color: true
        }
      }
    }
  })

  if (!photo) {
    redirect("/dashboard/photos")
  }

  // Get all photos from the same project for navigation
  const allProjectPhotos = await prisma.photo.findMany({
    where: {
      projectId: photo.projectId
    },
    select: {
      id: true,
      originalFilename: true,
      createdAt: true
    },
    orderBy: { createdAt: "asc" }
  })

  // Find current photo index
  const currentPhotoIndex = allProjectPhotos.findIndex(p => p.id === params.photoId)

  // Get all global rooms
  const globalRooms = await prisma.room.findMany({
    orderBy: { name: "asc" }
  })

  // Get all colors
  const colors = await prisma.color.findMany({
    orderBy: [
      { usageCount: 'desc' },
      { manufacturer: 'asc' },
      { name: 'asc' }
    ]
  })

  return (
    <PhotoAnnotator
      photo={photo}
      rooms={globalRooms}
      colors={colors}
      allProjectPhotos={allProjectPhotos}
      currentPhotoIndex={currentPhotoIndex}
    />
  )
}
