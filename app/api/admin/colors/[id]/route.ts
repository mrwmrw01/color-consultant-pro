import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAdmin } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

// GET /api/admin/colors/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  const { id } = await params
  const color = await prisma.color.findUnique({
    where: { id },
    include: {
      manufacturerRel: true,
      supersededBy: true,
      availability: true,
    },
  })
  if (!color) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(color)
}

// PATCH /api/admin/colors/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  try {
    const { id } = await params
    const body = await request.json()
    const {
      colorCode,
      name,
      hexColor,
      rgbColor,
      notes,
      status,
      introducedYear,
      discontinuedAt,
      supersededById,
    } = body

    const data: any = {}
    if (colorCode !== undefined) data.colorCode = colorCode.trim()
    if (name !== undefined) data.name = name.trim()
    if (hexColor !== undefined) data.hexColor = hexColor?.trim() || null
    if (rgbColor !== undefined) data.rgbColor = rgbColor?.trim() || null
    if (notes !== undefined) data.notes = notes?.trim() || null
    if (status !== undefined) data.status = status
    if (introducedYear !== undefined) data.introducedYear = introducedYear
    if (discontinuedAt !== undefined)
      data.discontinuedAt = discontinuedAt ? new Date(discontinuedAt) : null
    if (supersededById !== undefined) data.supersededById = supersededById || null

    const updated = await prisma.color.update({ where: { id }, data })
    return NextResponse.json(updated)
  } catch (error: any) {
    if (error.code === "P2025")
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (error.code === "P2002")
      return NextResponse.json(
        { error: "Duplicate colorCode for this manufacturer" },
        { status: 409 }
      )
    console.error("PATCH /api/admin/colors/[id] error:", error)
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 })
  }
}

// DELETE /api/admin/colors/[id] — soft delete (status=discontinued) if annotations reference it, else hard delete
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  try {
    const { id } = await params
    const usage = await prisma.annotation.count({ where: { colorId: id } })
    if (usage > 0) {
      const updated = await prisma.color.update({
        where: { id },
        data: { status: "discontinued", discontinuedAt: new Date() },
      })
      return NextResponse.json({
        ...updated,
        discontinued: true,
        message: `Marked discontinued — ${usage} annotations reference this color.`,
      })
    }
    await prisma.color.delete({ where: { id } })
    return NextResponse.json({ deleted: true })
  } catch (error: any) {
    if (error.code === "P2025")
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    console.error("DELETE /api/admin/colors/[id] error:", error)
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 })
  }
}
