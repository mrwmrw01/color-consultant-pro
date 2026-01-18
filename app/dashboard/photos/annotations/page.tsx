

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { AnnotationsManager } from "@/components/photos/annotations-manager"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function AnnotationsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  // Get all annotations for user's projects
  const annotations = await prisma.annotation.findMany({
    where: {
      photo: {
        project: {
          userId: session.user.id
        }
      }
    },
    include: {
      photo: {
        include: {
          project: true
        }
      },
      room: true,
      color: true
    },
    orderBy: { createdAt: "desc" }
  })

  // Get user's projects with rooms
  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    include: {
      rooms: {
        orderBy: { name: 'asc' }
      }
    },
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

  // Serialize the data properly for client components
  const serializedAnnotations = annotations.map(annotation => ({
    ...annotation,
    createdAt: annotation.createdAt.toISOString(),
    updatedAt: annotation.updatedAt.toISOString(),
    photo: {
      ...annotation.photo,
      createdAt: annotation.photo.createdAt.toISOString(),
      updatedAt: annotation.photo.updatedAt.toISOString(),
      project: {
        ...annotation.photo.project,
        createdAt: annotation.photo.project.createdAt.toISOString(),
        updatedAt: annotation.photo.project.updatedAt.toISOString(),
      }
    },
    room: annotation.room ? {
      ...annotation.room,
      createdAt: annotation.room.createdAt.toISOString(),
      updatedAt: annotation.room.updatedAt.toISOString(),
    } : null,
    color: annotation.color ? {
      ...annotation.color,
      createdAt: annotation.color.createdAt.toISOString(),
      updatedAt: annotation.color.updatedAt.toISOString(),
      firstUsedAt: annotation.color.firstUsedAt ? annotation.color.firstUsedAt.toISOString() : null,
    } : null
  }))

  const serializedProjects = projects.map(project => ({
    ...project,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    rooms: project.rooms.map(room => ({
      ...room,
      createdAt: room.createdAt.toISOString(),
      updatedAt: room.updatedAt.toISOString(),
    }))
  }))

  const serializedColors = colors.map(color => ({
    ...color,
    createdAt: color.createdAt.toISOString(),
    updatedAt: color.updatedAt.toISOString(),
    firstUsedAt: color.firstUsedAt ? color.firstUsedAt.toISOString() : null,
  }))

  return (
    <AnnotationsManager
      annotations={serializedAnnotations}
      projects={serializedProjects}
      colors={serializedColors}
    />
  )
}
