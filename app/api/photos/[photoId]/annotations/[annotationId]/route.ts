
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

export const dynamic = "force-dynamic"

const updateAnnotationSchema = z.object({
  colorId: z.string().optional().nullable(),
  surfaceType: z.string().optional().nullable(),
  productLine: z.string().optional().nullable(),
  sheen: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  roomId: z.string().optional().nullable()
}).transform((data) => ({
  // Convert empty strings and null to undefined for optional fields
  colorId: data.colorId || undefined,
  surfaceType: data.surfaceType || undefined,
  productLine: data.productLine || undefined,
  sheen: data.sheen || undefined,
  notes: data.notes || undefined,
  roomId: data.roomId || undefined
}))

interface Params {
  photoId: string
  annotationId: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { photoId, annotationId } = await params

    const annotation = await prisma.annotation.findFirst({
      where: {
        id: annotationId,
        photoId: photoId,
        photo: {
          project: {
            userId: session.user.id
          }
        }
      },
      include: {
        color: {
          include: {
            availability: true
          }
        },
        room: true
      }
    })

    if (!annotation) {
      return NextResponse.json({ error: "Annotation not found" }, { status: 404 })
    }

    return NextResponse.json(annotation)

  } catch (error) {
    console.error("Error fetching annotation:", error)
    return NextResponse.json(
      { error: "Failed to fetch annotation" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { photoId, annotationId } = await params

    const annotation = await prisma.annotation.findFirst({
      where: {
        id: annotationId,
        photoId: photoId,
        photo: {
          project: {
            userId: session.user.id
          }
        }
      },
      include: {
        color: {
          include: {
            availability: true
          }
        }
      }
    })

    if (!annotation) {
      return NextResponse.json({ error: "Annotation not found" }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = updateAnnotationSchema.parse(body)
    const { colorId, surfaceType, productLine, sheen, notes, roomId } = validatedData

    // Track color usage changes
    const oldColorId = annotation.colorId
    
    const updatedAnnotation = await prisma.annotation.update({
      where: { id: annotationId },
      data: {
        colorId: colorId,
        surfaceType: surfaceType,
        productLine: productLine,
        sheen: sheen,
        notes: notes,
        roomId: roomId
      },
      include: {
        photo: {
          include: {
            project: true
          }
        },
        color: {
          include: {
            availability: true
          }
        },
        room: true
      }
    })

    // Update usage counts when color changes
    if (oldColorId !== colorId) {
      // Decrement old color usage if it exists
      if (oldColorId) {
        await prisma.color.update({
          where: { id: oldColorId },
          data: { usageCount: { decrement: 1 } }
        })
      }
      
      // Increment new color usage if it exists
      if (colorId) {
        const newColor = await prisma.color.findUnique({
          where: { id: colorId }
        })
        
        await prisma.color.update({
          where: { id: colorId },
          data: {
            usageCount: { increment: 1 },
            ...(newColor && !newColor.firstUsedAt ? { firstUsedAt: new Date() } : {})
          }
        })
      }
    }

    return NextResponse.json(updatedAnnotation)

  } catch (error) {
    console.error("Error updating annotation:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: "Failed to update annotation" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { photoId, annotationId } = await params

    const annotation = await prisma.annotation.findFirst({
      where: {
        id: annotationId,
        photoId: photoId,
        photo: {
          project: {
            userId: session.user.id
          }
        }
      }
    })

    if (!annotation) {
      return NextResponse.json({ error: "Annotation not found" }, { status: 404 })
    }

    // Decrement color usage count if this annotation used a color
    if (annotation.colorId) {
      await prisma.color.update({
        where: { id: annotation.colorId },
        data: { usageCount: { decrement: 1 } }
      })
    }

    await prisma.annotation.delete({
      where: { id: annotationId }
    })

    return NextResponse.json({ success: true, message: "Annotation deleted successfully" })

  } catch (error) {
    console.error("Error deleting annotation:", error)
    return NextResponse.json(
      { error: "Failed to delete annotation" },
      { status: 500 }
    )
  }
}
