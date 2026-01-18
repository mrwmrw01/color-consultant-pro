
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

interface RouteParams {
  params: { synopsisId: string }
}

// GET - Get single synopsis
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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
          }
        }
      }
    })

    if (!synopsis) {
      return NextResponse.json({ error: "Synopsis not found" }, { status: 404 })
    }

    return NextResponse.json(synopsis)
  } catch (error) {
    console.error("Error fetching synopsis:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Update synopsis
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { title, notes } = body

    // Verify user owns the synopsis
    const existingSynopsis = await prisma.colorSynopsis.findFirst({
      where: {
        id: params.synopsisId,
        project: {
          userId: session.user.id
        }
      }
    })

    if (!existingSynopsis) {
      return NextResponse.json({ error: "Synopsis not found" }, { status: 404 })
    }

    const synopsis = await prisma.colorSynopsis.update({
      where: { id: params.synopsisId },
      data: { title, notes },
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

    return NextResponse.json(synopsis)
  } catch (error) {
    console.error("Error updating synopsis:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Delete synopsis
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify user owns the synopsis
    const existingSynopsis = await prisma.colorSynopsis.findFirst({
      where: {
        id: params.synopsisId,
        project: {
          userId: session.user.id
        }
      },
      include: {
        entries: true
      }
    })

    if (!existingSynopsis) {
      return NextResponse.json({ error: "Synopsis not found" }, { status: 404 })
    }

    // Decrement usage counts for all colors in this synopsis
    const colorCounts = new Map<string, number>()
    for (const entry of existingSynopsis.entries) {
      const count = colorCounts.get(entry.colorId) || 0
      colorCounts.set(entry.colorId, count + 1)
    }

    for (const [colorId, count] of colorCounts.entries()) {
      await prisma.color.update({
        where: { id: colorId },
        data: { usageCount: { decrement: count } }
      })
    }

    await prisma.colorSynopsis.delete({
      where: { id: params.synopsisId }
    })

    return NextResponse.json({ message: "Synopsis deleted successfully" })
  } catch (error) {
    console.error("Error deleting synopsis:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
