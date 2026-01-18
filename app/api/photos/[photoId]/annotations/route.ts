

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

export const dynamic = "force-dynamic"

const createAnnotationSchema = z.object({
  type: z.string().min(1, "Annotation type is required"),
  data: z.any(),
  surfaceType: z.string().optional().nullable(),
  colorId: z.string().optional().nullable(),
  productLine: z.string().optional().nullable(),
  sheen: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  roomId: z.string().optional().nullable()
}).transform((data) => ({
  ...data,
  // Convert empty strings and null to undefined for optional fields
  surfaceType: data.surfaceType || undefined,
  colorId: data.colorId || undefined,
  productLine: data.productLine || undefined,
  sheen: data.sheen || undefined,
  notes: data.notes || undefined,
  roomId: data.roomId || undefined
}))

export async function POST(
  request: NextRequest,
  { params }: { params: { photoId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify user owns the photo
    const photo = await prisma.photo.findFirst({
      where: {
        id: params.photoId,
        project: {
          userId: session.user.id
        }
      }
    })

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 })
    }

    const body = await request.json()
    const { type, data, surfaceType, colorId, productLine, sheen, notes, roomId } = createAnnotationSchema.parse(body)

    const annotation = await prisma.annotation.create({
      data: {
        photoId: params.photoId,
        roomId: roomId || photo.roomId,
        type,
        data,
        surfaceType,
        colorId,
        productLine,
        sheen,
        notes
      },
      include: {
        color: {
          include: {
            availability: true
          }
        }
      }
    })

    // Update color usage count if color was used
    if (colorId) {
      const color = await prisma.color.findUnique({
        where: { id: colorId }
      })
      
      await prisma.color.update({
        where: { id: colorId },
        data: {
          usageCount: { increment: 1 },
          // Only set firstUsedAt if it hasn't been set before
          ...(color && !color.firstUsedAt ? { firstUsedAt: annotation.createdAt } : {})
        }
      })
    }

    return NextResponse.json(annotation)

  } catch (error) {
    console.error("Annotation creation error:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: "Failed to create annotation" },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { photoId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify user owns the photo
    const photo = await prisma.photo.findFirst({
      where: {
        id: params.photoId,
        project: {
          userId: session.user.id
        }
      }
    })

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 })
    }

    const annotations = await prisma.annotation.findMany({
      where: {
        photoId: params.photoId
      },
      include: {
        color: {
          include: {
            availability: true
          }
        },
        room: true
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json(annotations)

  } catch (error) {
    console.error("Error fetching annotations:", error)
    return NextResponse.json(
      { error: "Failed to fetch annotations" },
      { status: 500 }
    )
  }
}
