

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

export const dynamic = "force-dynamic"

const updateProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").optional(),
  description: z.string().optional().nullable(),
  clientName: z.string().min(1, "Client name is required").optional(),
  clientEmail: z.string().email().optional().or(z.literal("")).nullable(),
  clientPhone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  status: z.enum(["active", "completed", "archived"]).optional()
})

// GET /api/projects/[projectId] - Fetch a single project
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const project = await prisma.project.findFirst({
      where: {
        id: params.projectId,
        userId: session.user.id
      },
      include: {
        rooms: {
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
          },
          orderBy: { name: 'asc' }
        },
        photos: {
          include: {
            annotations: {
              include: {
                color: true
              }
            }
          },
          orderBy: { createdAt: "desc" }
        },
        synopsis: {
          include: {
            entries: {
              include: {
                room: true,
                color: true
              }
            }
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    return NextResponse.json(project)

  } catch (error) {
    console.error("Project fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT /api/projects/[projectId] - Update project details
export async function PUT(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify project ownership
    const existingProject = await prisma.project.findFirst({
      where: {
        id: params.projectId,
        userId: session.user.id
      }
    })

    if (!existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = updateProjectSchema.parse(body)

    // If updating the project name, check for duplicates
    if (validatedData.name && validatedData.name !== existingProject.name) {
      const duplicateProject = await prisma.project.findFirst({
        where: {
          userId: session.user.id,
          name: validatedData.name,
          id: { not: params.projectId } // Exclude current project
        }
      })

      if (duplicateProject) {
        return NextResponse.json(
          { error: `A project named "${validatedData.name}" already exists. Please choose a different name.` },
          { status: 409 }
        )
      }
    }

    // Update the project
    const updatedProject = await prisma.project.update({
      where: { id: params.projectId },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.description !== undefined && { description: validatedData.description }),
        ...(validatedData.clientName && { clientName: validatedData.clientName }),
        ...(validatedData.clientEmail !== undefined && { clientEmail: validatedData.clientEmail }),
        ...(validatedData.clientPhone !== undefined && { clientPhone: validatedData.clientPhone }),
        ...(validatedData.address !== undefined && { address: validatedData.address }),
        ...(validatedData.status && { status: validatedData.status }),
        updatedAt: new Date()
      },
      include: {
        rooms: true,
        _count: {
          select: {
            photos: true
          }
        }
      }
    })

    return NextResponse.json(updatedProject)

  } catch (error: any) {
    console.error("Project update error:", error)
    
    if (error instanceof z.ZodError) {
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
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE /api/projects/[projectId] - Delete a project
export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify project ownership and fetch project details
    const existingProject = await prisma.project.findFirst({
      where: {
        id: params.projectId,
        userId: session.user.id
      },
      select: {
        id: true,
        name: true
      }
    })

    if (!existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Delete the project (cascade will handle related data)
    await prisma.project.delete({
      where: { id: params.projectId }
    })

    return NextResponse.json({
      success: true,
      deletedProject: existingProject,
      message: `Project "${existingProject.name}" deleted successfully`
    })

  } catch (error: any) {
    console.error("Project deletion error:", error)

    // Handle specific database errors
    if (error.code === 'P2003') {
      return NextResponse.json(
        { 
          error: "Cannot delete project",
          details: "There are dependencies that prevent deletion"
        },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
