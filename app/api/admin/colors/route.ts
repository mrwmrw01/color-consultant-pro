import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAdmin } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

// GET /api/admin/colors?search=&manufacturerId=&status=&limit=&offset=
export async function GET(request: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search")?.trim() ?? ""
  const manufacturerId = searchParams.get("manufacturerId") || undefined
  const status = searchParams.get("status") || undefined
  const limit = Math.min(Number(searchParams.get("limit") || 50), 500)
  const offset = Math.max(Number(searchParams.get("offset") || 0), 0)

  const where: any = {}
  if (manufacturerId) where.manufacturerId = manufacturerId
  if (status) where.status = status
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { colorCode: { contains: search, mode: "insensitive" } },
      { manufacturer: { contains: search, mode: "insensitive" } },
    ]
  }

  const [colors, total] = await Promise.all([
    prisma.color.findMany({
      where,
      orderBy: [{ manufacturer: "asc" }, { colorCode: "asc" }],
      include: { manufacturerRel: { select: { name: true, abbreviation: true } } },
      take: limit,
      skip: offset,
    }),
    prisma.color.count({ where }),
  ])

  return NextResponse.json({ colors, total, limit, offset })
}

// POST /api/admin/colors — create new color with dedupe check
export async function POST(request: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  try {
    const body = await request.json()
    const {
      colorCode,
      name,
      manufacturerId,
      hexColor,
      rgbColor,
      notes,
      introducedYear,
      status,
    } = body

    if (!colorCode || !name || !manufacturerId) {
      return NextResponse.json(
        { error: "colorCode, name, and manufacturerId are required" },
        { status: 400 }
      )
    }

    const manufacturer = await prisma.manufacturer.findUnique({
      where: { id: manufacturerId },
    })
    if (!manufacturer) {
      return NextResponse.json(
        { error: "Manufacturer not found" },
        { status: 404 }
      )
    }

    // Validate code pattern if manufacturer defines one
    if (manufacturer.codePattern) {
      const rx = new RegExp(manufacturer.codePattern)
      if (!rx.test(colorCode)) {
        return NextResponse.json(
          {
            error: `Color code "${colorCode}" does not match the expected pattern for ${manufacturer.name} (${manufacturer.codePattern})`,
          },
          { status: 400 }
        )
      }
    }

    // Dedupe: composite unique (manufacturer, colorCode)
    const existing = await prisma.color.findUnique({
      where: {
        manufacturer_colorCode: {
          manufacturer: manufacturer.name,
          colorCode: colorCode.trim(),
        },
      },
    })
    if (existing) {
      return NextResponse.json(
        {
          error: `${manufacturer.name} ${colorCode} already exists as "${existing.name}"`,
          existing,
        },
        { status: 409 }
      )
    }

    const color = await prisma.color.create({
      data: {
        colorCode: colorCode.trim(),
        name: name.trim(),
        manufacturer: manufacturer.name, // legacy string kept in sync
        manufacturerId,
        hexColor: hexColor?.trim() || null,
        rgbColor: rgbColor?.trim() || null,
        notes: notes?.trim() || null,
        introducedYear: introducedYear ?? null,
        status: status ?? "active",
        createdByUserId: guard.session.userId,
        isUserSuggested: false, // admin-created, pre-approved
      },
    })

    return NextResponse.json(color, { status: 201 })
  } catch (error: any) {
    console.error("POST /api/admin/colors error:", error)
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 })
  }
}
