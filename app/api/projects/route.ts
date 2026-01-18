
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

export const dynamic = "force-dynamic"

const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional().nullable().transform(val => val || null),
  
  // NEW: 3-tier hierarchy
  propertyId: z.string().min(1, "Property is required"),
  
  // OLD: Direct client fields (deprecated, kept for backward compatibility)
  clientName: z.string().optional().nullable().transform(val => val || null),
  clientEmail: z.union([
    z.string().email(),
    z.literal(""),
    z.undefined()
  ]).optional().nullable().transform(val => val || null),
  clientPhone: z.string().optional().nullable().transform(val => val || null),
  address: z.string().optional().nullable().transform(val => val || null),
  
  rooms: z.array(z.object({
    name: z.string().min(1),
    description: z.string().optional().nullable().transform(val => val || null)
  })).optional().nullable().default([])
})

export async function POST(request: NextRequest) {
  try {
    console.log("=== Project Creation Request ===")
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      console.log("Unauthorized: No session or user ID")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("User authenticated:", session.user.id)

    const body = await request.json()
    console.log("Raw request body:", JSON.stringify(body, null, 2))
    
    // Validate and parse the data
    const validatedData = createProjectSchema.parse(body)
    console.log("Validated data:", JSON.stringify(validatedData, null, 2))

    const { name, description, propertyId, clientName, clientEmail, clientPhone, address, rooms } = validatedData

    // Verify property ownership
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        client: {
          userId: session.user.id
        }
      },
      include: {
        client: true
      }
    })

    if (!property) {
      return NextResponse.json(
        { error: "Property not found or you don't have permission to access it" },
        { status: 404 }
      )
    }

    // Check if a project with the same name already exists for this user
    const existingProject = await prisma.project.findFirst({
      where: {
        userId: session.user.id,
        name: name
      }
    })

    if (existingProject) {
      return NextResponse.json(
        { error: `A project named "${name}" already exists. Please choose a different name.` },
        { status: 409 }
      )
    }

    // Create project with rooms if provided
    const projectData = {
      name,
      description: description || null,
      propertyId: propertyId,
      // Keep old fields for backward compatibility (optional)
      clientName: clientName || null,
      clientEmail: clientEmail || null,
      clientPhone: clientPhone || null,
      address: address || null,
      userId: session.user.id,
      rooms: rooms && rooms.length > 0 ? {
        create: rooms.map(room => ({
          name: room.name,
          description: room.description || null
        }))
      } : undefined
    }

    console.log("Creating project with data:", JSON.stringify(projectData, null, 2))

    const project = await prisma.project.create({
      data: projectData,
      include: {
        property: {
          include: {
            client: true
          }
        },
        rooms: true,
        _count: {
          select: {
            photos: true
          }
        }
      }
    })

    console.log("Project created successfully:", project.id)
    return NextResponse.json(project)

  } catch (error: any) {
    console.error("=== Project Creation Error ===")
    console.error("Error type:", error?.constructor?.name)
    console.error("Error message:", error?.message)
    console.error("Full error:", error)
    
    if (error instanceof z.ZodError) {
      console.error("Validation errors:", JSON.stringify(error.errors, null, 2))
      return NextResponse.json(
        { error: "Invalid input data", details: error.errors },
        { status: 400 }
      )
    }

    // Handle Prisma unique constraint violation (P2002)
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "A project with this name already exists. Please choose a different name." },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: "Internal server error", message: error?.message || "Unknown error" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const projects = await prisma.project.findMany({
      where: { userId: session.user.id },
      include: {
        property: {
          include: {
            client: true
          }
        },
        rooms: true,
        _count: {
          select: {
            photos: true
          }
        }
      },
      orderBy: { updatedAt: "desc" }
    })

    return NextResponse.json(projects)

  } catch (error) {
    console.error("Projects fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(request.url)
    const action = url.searchParams.get('action')

    if (action === 'deleteAll') {
      // Delete all projects for the current user
      // Due to cascade constraints, this will automatically delete all related data:
      // - Photos and annotations
      // - Rooms and their data  
      // - Color synopsis and entries
      const deletedProjects = await prisma.project.deleteMany({
        where: { userId: session.user.id }
      })

      return NextResponse.json({ 
        success: true, 
        deletedCount: deletedProjects.count,
        message: `Successfully deleted ${deletedProjects.count} projects and all their related data`
      })
    }

    return NextResponse.json(
      { error: "Invalid action parameter" },
      { status: 400 }
    )

  } catch (error) {
    console.error("Bulk delete error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
