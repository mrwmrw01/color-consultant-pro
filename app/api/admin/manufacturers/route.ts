import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAdmin } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

// GET /api/admin/manufacturers — list all (includes inactive) with color counts
export async function GET() {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  const manufacturers = await prisma.manufacturer.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { colors: true } } },
  })
  return NextResponse.json({ manufacturers })
}

// POST /api/admin/manufacturers — create
export async function POST(request: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  try {
    const body = await request.json()
    const { name, abbreviation, website, codePattern, notes, isActive } = body

    if (!name || !abbreviation) {
      return NextResponse.json(
        { error: "name and abbreviation are required" },
        { status: 400 }
      )
    }

    const created = await prisma.manufacturer.create({
      data: {
        name: name.trim(),
        abbreviation: abbreviation.trim().toUpperCase(),
        website: website?.trim() || null,
        codePattern: codePattern?.trim() || null,
        notes: notes?.trim() || null,
        isActive: isActive ?? true,
      },
    })
    return NextResponse.json(created, { status: 201 })
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Manufacturer with this name or abbreviation already exists" },
        { status: 409 }
      )
    }
    console.error("POST /api/admin/manufacturers error:", error)
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 })
  }
}
