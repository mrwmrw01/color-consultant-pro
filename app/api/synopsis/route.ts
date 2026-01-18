
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

// GET - List all synopsis for user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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

    return NextResponse.json(synopsis)
  } catch (error) {
    console.error("Error fetching synopsis:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Create new synopsis
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { projectId, title, notes, generateFromAnnotations } = body

    if (!projectId || !title) {
      return NextResponse.json(
        { error: "Project ID and title are required" }, 
        { status: 400 }
      )
    }

    // Verify user owns the project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id
      }
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Create the synopsis
    const synopsis = await prisma.colorSynopsis.create({
      data: {
        projectId,
        title,
        notes
      }
    })

    // If requested, generate entries from annotations
    if (generateFromAnnotations) {
      const annotations = await prisma.annotation.findMany({
        where: {
          photo: { projectId },
          colorId: { not: null }
        },
        include: {
          photo: true,
          room: true,
          color: {
            include: {
              availability: true
            }
          }
        }
      })

      if (annotations.length > 0) {
        // Group by room and color
        const entries = new Map()

        for (const annotation of annotations) {
          if (!annotation.roomId || !annotation.colorId || !annotation.color) continue
          
          // Get the first available product line and sheen for the color
          const firstAvailability = annotation.color.availability?.[0]
          if (!firstAvailability) continue
          
          const key = `${annotation.roomId}-${annotation.colorId}-${annotation.surfaceType || 'general'}`
          
          if (!entries.has(key)) {
            entries.set(key, {
              roomId: annotation.roomId,
              colorId: annotation.colorId,
              productLine: firstAvailability.productLine,
              sheen: firstAvailability.sheen,
              surfaceType: annotation.surfaceType || 'general',
              surfaceArea: '',
              quantity: '',
              notes: annotation.notes || ''
            })
          }
        }

        // Create entries
        if (entries.size > 0) {
          await prisma.synopsisEntry.createMany({
            data: Array.from(entries.values()).map(entry => ({
              synopsisId: synopsis.id,
              roomId: entry.roomId,
              colorId: entry.colorId,
              productLine: entry.productLine,
              sheen: entry.sheen,
              surfaceType: entry.surfaceType,
              surfaceArea: entry.surfaceArea,
              quantity: entry.quantity,
              notes: entry.notes
            }))
          })
        }
      }
    }

    // Fetch the complete synopsis with entries
    const completeSynopsis = await prisma.colorSynopsis.findUnique({
      where: { id: synopsis.id },
      include: {
        project: true,
        entries: {
          include: {
            room: true,
            color: true
          }
        }
      }
    })

    return NextResponse.json(completeSynopsis)
  } catch (error) {
    console.error("Error creating synopsis:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
