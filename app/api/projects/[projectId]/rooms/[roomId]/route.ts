

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

export const dynamic = "force-dynamic"

const updateRoomSchema = z.object({
  name: z.string().min(1, "Room name is required").optional(),
  description: z.string().optional().nullable(),
  roomType: z.string().optional().nullable(),
  subType: z.string().optional().nullable()
})

// GET /api/projects/[projectId]/rooms/[roomId] - Fetch a single room
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string; roomId: string } }
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

    // Fetch room
    const room = await prisma.room.findFirst({
      where: {
        id: params.roomId,
        projectId: params.projectId
      },
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
    })

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 })
    }

    return NextResponse.json(room)

  } catch (error) {
    console.error("Room fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT /api/projects/[projectId]/rooms/[roomId] - Update room details
export async function PUT(
  request: NextRequest,
  { params }: { params: { projectId: string; roomId: string } }
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

    // Verify room exists
    const existingRoom = await prisma.room.findFirst({
      where: {
        id: params.roomId,
        projectId: params.projectId
      }
    })

    if (!existingRoom) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = updateRoomSchema.parse(body)

    // Update the room
    const updatedRoom = await prisma.room.update({
      where: { id: params.roomId },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.description !== undefined && { description: validatedData.description }),
        ...(validatedData.roomType !== undefined && { roomType: validatedData.roomType }),
        ...(validatedData.subType !== undefined && { subType: validatedData.subType })
      }
    })

    return NextResponse.json(updatedRoom)

  } catch (error) {
    console.error("Room update error:", error)
    
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

// DELETE /api/projects/[projectId]/rooms/[roomId] - Delete a room
export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string; roomId: string } }
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
      return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 404 })
    }

    // Verify room exists and fetch details
    const existingRoom = await prisma.room.findFirst({
      where: {
        id: params.roomId,
        projectId: params.projectId
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            photos: true
          }
        }
      }
    })

    if (!existingRoom) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 })
    }

    // Delete the room (cascade will handle related data, photos will be unassigned)
    await prisma.room.delete({
      where: { id: params.roomId }
    })

    return NextResponse.json({
      success: true,
      deletedRoom: {
        id: existingRoom.id,
        name: existingRoom.name
      },
      message: `Room "${existingRoom.name}" deleted successfully`
    })

  } catch (error: any) {
    console.error("Room deletion error:", error)

    // Handle specific database errors
    if (error.code === 'P2003') {
      return NextResponse.json(
        { 
          error: "Cannot delete room",
          details: "There are dependencies that prevent deletion"
        },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}
