import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAdmin } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

type CsvRow = {
  manufacturer?: string
  colorCode?: string
  name?: string
  hex?: string
  rgb?: string
  notes?: string
}

/**
 * POST /api/admin/colors/import-commit
 *
 * Body: {
 *   rows: CsvRow[],
 *   defaultManufacturerId?: string,
 *   onConflict: "skip" | "update"   // for rows where colorCode exists with different name
 * }
 *
 * Applies the changes: inserts new rows, optionally updates conflicts,
 * skips duplicates & invalid rows.
 */
export async function POST(request: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  try {
    const body = await request.json()
    const rows: CsvRow[] = Array.isArray(body.rows) ? body.rows : []
    const defaultManufacturerId: string | undefined = body.defaultManufacturerId
    const onConflict: "skip" | "update" = body.onConflict === "update" ? "update" : "skip"

    const manufacturers = await prisma.manufacturer.findMany()
    const byName = new Map(manufacturers.map((m) => [m.name.toLowerCase(), m]))
    const byAbbrev = new Map(manufacturers.map((m) => [m.abbreviation.toLowerCase(), m]))
    const defaultMfr = defaultManufacturerId
      ? manufacturers.find((m) => m.id === defaultManufacturerId)
      : undefined

    let inserted = 0
    let updated = 0
    let skipped = 0
    const errors: Array<{ index: number; message: string }> = []

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      const colorCode = (r.colorCode || "").trim()
      const name = (r.name || "").trim()
      const mfrRaw = (r.manufacturer || "").trim()

      if (!colorCode || !name) {
        skipped++
        continue
      }

      const mfr =
        (mfrRaw
          ? byName.get(mfrRaw.toLowerCase()) || byAbbrev.get(mfrRaw.toLowerCase())
          : undefined) || defaultMfr
      if (!mfr) {
        skipped++
        errors.push({ index: i, message: `No manufacturer for "${colorCode}"` })
        continue
      }

      const existing = await prisma.color.findUnique({
        where: { manufacturer_colorCode: { manufacturer: mfr.name, colorCode } },
      })

      const hexColor = (r.hex || "").trim()
        ? "#" + (r.hex as string).trim().replace(/^#/, "").toUpperCase()
        : null
      const rgbColor = (r.rgb || "").trim() || null

      if (existing) {
        if (existing.name === name) {
          skipped++
          continue
        }
        if (onConflict === "update") {
          await prisma.color.update({
            where: { id: existing.id },
            data: {
              name,
              hexColor: hexColor ?? existing.hexColor,
              rgbColor: rgbColor ?? existing.rgbColor,
              notes: (r.notes || "").trim() || existing.notes,
            },
          })
          updated++
        } else {
          skipped++
        }
        continue
      }

      try {
        await prisma.color.create({
          data: {
            colorCode,
            name,
            manufacturer: mfr.name,
            manufacturerId: mfr.id,
            hexColor,
            rgbColor,
            notes: (r.notes || "").trim() || null,
            status: "active",
            createdByUserId: guard.session.userId,
          },
        })
        inserted++
      } catch (err: any) {
        errors.push({ index: i, message: err.message || "insert failed" })
      }
    }

    return NextResponse.json({
      inserted,
      updated,
      skipped,
      errorCount: errors.length,
      errors: errors.slice(0, 20),
    })
  } catch (error: any) {
    console.error("POST /api/admin/colors/import-commit error:", error)
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 })
  }
}
