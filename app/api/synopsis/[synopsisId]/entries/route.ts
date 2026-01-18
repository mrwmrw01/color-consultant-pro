
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

interface RouteParams {
  params: { synopsisId: string }
}

// POST - Add entry to synopsis
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { roomId, colorId, productLine, sheen, surfaceType, surfaceArea, quantity, notes } = body

    if (!roomId || !colorId || !productLine || !sheen || !surfaceType) {
      return NextResponse.json(
        { error: "Room, color, product line, sheen, and surface type are required" },
        { status: 400 }
      )
    }

    // Verify user owns the synopsis
    const synopsis = await prisma.colorSynopsis.findFirst({
      where: {
        id: params.synopsisId,
        project: {
          userId: session.user.id
        }
      }
    })

    if (!synopsis) {
      return NextResponse.json({ error: "Synopsis not found" }, { status: 404 })
    }

    // Verify color exists
    const color = await prisma.color.findUnique({
      where: { id: colorId }
    })

    if (!color) {
      return NextResponse.json({ error: "Color not found" }, { status: 404 })
    }

    // Create the entry
    const entry = await prisma.synopsisEntry.create({
      data: {
        synopsisId: params.synopsisId,
        roomId,
        colorId,
        productLine,
        sheen,
        surfaceType,
        surfaceArea,
        quantity,
        notes
      },
      include: {
        room: true,
        color: {
          include: {
            availability: true
          }
        }
      }
    })

    // Update color usage count
    await prisma.color.update({
      where: { id: colorId },
      data: {
        usageCount: { increment: 1 },
        firstUsedAt: color.firstUsedAt || new Date()
      }
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    console.error("Error creating synopsis entry:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
