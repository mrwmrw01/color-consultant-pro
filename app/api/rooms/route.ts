
import { getServerSession } from "next-auth/next"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

// GET all global rooms
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rooms = await prisma.room.findMany({
      where: {
        projectId: null // Global rooms only
      },
      orderBy: [
        { roomType: 'asc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json(rooms)

  } catch (error) {
    console.error("Error fetching global rooms:", error)
    return NextResponse.json(
      { error: "Failed to fetch rooms" },
      { status: 500 }
    )
  }
}

// POST - Create a new global room
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await request.json()
    const { name, roomType, subType, description } = data

    console.log("Creating room with data:", { name, roomType, subType, description })

    if (!name || !roomType) {
      return NextResponse.json(
        { error: "Room name and type are required" },
        { status: 400 }
      )
    }

    // Check if room with same name already exists (globally)
    const existingRoom = await prisma.room.findFirst({
      where: {
        name,
        projectId: null
      }
    })

    if (existingRoom) {
      console.log("Room already exists:", existingRoom)
      return NextResponse.json(
        { error: `A room named "${name}" already exists. Please choose a different name.` },
        { status: 409 }
      )
    }

    // Create global room (projectId: null)
    const room = await prisma.room.create({
      data: {
        name,
        roomType,
        subType,
        description,
        projectId: null // Global room
      }
    })

    console.log("Room created successfully:", room)
    return NextResponse.json(room, { status: 201 })

  } catch (error: any) {
    console.error("Error creating room:", error)
    
    // Handle specific Prisma errors
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: "A room with this name already exists. Please choose a different name." },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: error?.message || "Failed to create room" },
      { status: 500 }
    )
  }
}
