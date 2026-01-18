import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { projectId } = await params

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id
      }
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Get all annotations for this project with color and room information
    const annotations = await prisma.annotation.findMany({
      where: {
        photo: {
          projectId: projectId
        }
      },
      include: {
        color: true,
        room: true,
        photo: {
          select: {
            id: true,
            originalFilename: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Group annotations by unique combination (color + product + sheen + surface)
    const combinationMap = new Map<string, {
      colorId: string
      colorCode: string
      colorName: string
      manufacturer: string
      surfaceType: string
      productLine: string
      sheen: string
      roomId: string | null
      roomName: string | null
      count: number
      lastUsedAt: Date
      photoFilename: string
    }>()

    for (const annotation of annotations) {
      if (!annotation.color || !annotation.surfaceType || !annotation.productLine || !annotation.sheen) {
        continue // Skip incomplete annotations
      }

      const key = `${annotation.colorId}-${annotation.surfaceType}-${annotation.productLine}-${annotation.sheen}`
      
      if (combinationMap.has(key)) {
        const existing = combinationMap.get(key)!
        existing.count += 1
        // Keep the most recent usage
        if (annotation.createdAt > existing.lastUsedAt) {
          existing.lastUsedAt = annotation.createdAt
          existing.photoFilename = annotation.photo.originalFilename
        }
      } else {
        combinationMap.set(key, {
          colorId: annotation.colorId!,
          colorCode: annotation.color.colorCode,
          colorName: annotation.color.name,
          manufacturer: annotation.color.manufacturer,
          surfaceType: annotation.surfaceType,
          productLine: annotation.productLine,
          sheen: annotation.sheen,
          roomId: annotation.roomId,
          roomName: annotation.room?.name || null,
          count: 1,
          lastUsedAt: annotation.createdAt,
          photoFilename: annotation.photo.originalFilename
        })
      }
    }

    // Convert map to array and sort by count (most used first), then by lastUsedAt (most recent)
    const suggestions = Array.from(combinationMap.values())
      .sort((a, b) => {
        // Primary sort by usage count (descending)
        if (b.count !== a.count) {
          return b.count - a.count
        }
        // Secondary sort by recency (descending)
        return b.lastUsedAt.getTime() - a.lastUsedAt.getTime()
      })
      .slice(0, 10) // Return top 10 suggestions

    return NextResponse.json({
      suggestions,
      totalAnnotations: annotations.length
    })
  } catch (error) {
    console.error("Error fetching annotation suggestions:", error)
    return NextResponse.json(
      { error: "Failed to fetch annotation suggestions" },
      { status: 500 }
    )
  }
}
