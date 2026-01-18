

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

export const dynamic = "force-dynamic"

const createRoomSchema = z.object({
  name: z.string().min(1, "Room name is required"),
  description: z.string().optional().nullable(),
  roomType: z.string().optional().nullable(),
  subType: z.string().optional().nullable()
})

// POST /api/projects/[projectId]/rooms - Create a new room
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: {
        id: params.projectId,
        userId: session.user.id
      }
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = createRoomSchema.parse(body)

    // Create the room
    const room = await prisma.room.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        roomType: validatedData.roomType,
        subType: validatedData.subType,
        projectId: params.projectId
      }
    })

    return NextResponse.json(room)

  } catch (error) {
    console.error("Room creation error:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// GET /api/projects/[projectId]/rooms - List all rooms in a project
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: {
        id: params.projectId,
        userId: session.user.id
      }
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Fetch all rooms for the project
    const rooms = await prisma.room.findMany({
      where: {
        projectId: params.projectId
      },
      include: {
        _count: {
          select: {
            photos: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(rooms)

  } catch (error) {
    console.error("Rooms fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
