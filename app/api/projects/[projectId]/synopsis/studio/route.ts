import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { generateStudioData } from "@/lib/synopsis-studio-data"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

// GET /api/projects/[projectId]/synopsis/studio — full studio data
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const { projectId } = await params
    const data = await generateStudioData(projectId)
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("GET synopsis/studio error:", error)
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 })
  }
}

// PATCH /api/projects/[projectId]/synopsis/studio — update an annotation inline
// Body: { annotationId, colorId?, productLine?, sheen?, notes?, surfaceType? }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { projectId } = await params
    const body = await request.json()
    const { annotationId, colorId, productLine, sheen, notes, surfaceType } = body

    if (!annotationId) {
      return NextResponse.json({ error: "annotationId required" }, { status: 400 })
    }

    // Verify the annotation belongs to this project
    const annotation = await prisma.annotation.findUnique({
      where: { id: annotationId },
      include: { photo: true },
    })
    if (!annotation || annotation.photo.projectId !== projectId) {
      return NextResponse.json({ error: "Annotation not found in project" }, { status: 404 })
    }

    const data: any = {}
    if (colorId !== undefined) data.colorId = colorId
    if (productLine !== undefined) data.productLine = productLine
    if (sheen !== undefined) data.sheen = sheen
    if (notes !== undefined) data.notes = notes
    if (surfaceType !== undefined) data.surfaceType = surfaceType

    const updated = await prisma.annotation.update({
      where: { id: annotationId },
      data,
      include: {
        color: true,
        room: true,
      },
    })

    return NextResponse.json({
      updated: true,
      annotation: {
        id: updated.id,
        surfaceType: updated.surfaceType,
        colorCode: updated.color?.colorCode,
        colorName: updated.color?.name,
        productLine: updated.productLine,
        sheen: updated.sheen,
        notes: updated.notes,
        roomName: updated.room?.name,
      },
    })
  } catch (error: any) {
    console.error("PATCH synopsis/studio error:", error)
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 })
  }
}
