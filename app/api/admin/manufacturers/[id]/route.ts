import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAdmin } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

// GET /api/admin/manufacturers/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  const { id } = await params
  const m = await prisma.manufacturer.findUnique({
    where: { id },
    include: { _count: { select: { colors: true } } },
  })
  if (!m) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(m)
}

// PATCH /api/admin/manufacturers/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  try {
    const { id } = await params
    const body = await request.json()
    const { name, abbreviation, website, codePattern, notes, isActive } = body

    const data: any = {}
    if (name !== undefined) data.name = name.trim()
    if (abbreviation !== undefined) data.abbreviation = abbreviation.trim().toUpperCase()
    if (website !== undefined) data.website = website?.trim() || null
    if (codePattern !== undefined) data.codePattern = codePattern?.trim() || null
    if (notes !== undefined) data.notes = notes?.trim() || null
    if (isActive !== undefined) data.isActive = Boolean(isActive)

    const updated = await prisma.manufacturer.update({ where: { id }, data })
    return NextResponse.json(updated)
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Manufacturer with this name or abbreviation already exists" },
        { status: 409 }
      )
    }
    console.error("PATCH /api/admin/manufacturers/[id] error:", error)
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 })
  }
}

// DELETE /api/admin/manufacturers/[id] — soft delete (deactivate). Never hard-delete if colors linked.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  try {
    const { id } = await params
    const count = await prisma.color.count({ where: { manufacturerId: id } })
    if (count > 0) {
      // Soft delete (deactivate) — colors stay linked
      const updated = await prisma.manufacturer.update({
        where: { id },
        data: { isActive: false },
      })
      return NextResponse.json({
        ...updated,
        deactivated: true,
        message: `Deactivated — ${count} colors still linked, kept for history.`,
      })
    }
    await prisma.manufacturer.delete({ where: { id } })
    return NextResponse.json({ deleted: true })
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    console.error("DELETE /api/admin/manufacturers/[id] error:", error)
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 })
  }
}
