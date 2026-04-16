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
 * POST /api/admin/colors/import-preview
 *
 * Body: { rows: CsvRow[], defaultManufacturerId?: string }
 *
 * Returns a classification of each row: new, duplicate, conflict, invalid.
 * Does NOT commit anything.
 */
export async function POST(request: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  try {
    const body = await request.json()
    const rows: CsvRow[] = Array.isArray(body.rows) ? body.rows : []
    const defaultManufacturerId: string | undefined = body.defaultManufacturerId

    const manufacturers = await prisma.manufacturer.findMany()
    const byName = new Map(manufacturers.map((m) => [m.name.toLowerCase(), m]))
    const byAbbrev = new Map(manufacturers.map((m) => [m.abbreviation.toLowerCase(), m]))
    const defaultMfr = defaultManufacturerId
      ? manufacturers.find((m) => m.id === defaultManufacturerId)
      : undefined

    const report = {
      totalRows: rows.length,
      newCount: 0,
      duplicateCount: 0,
      conflictCount: 0,
      invalidCount: 0,
      rows: [] as Array<{
        index: number
        status: "new" | "duplicate" | "conflict" | "invalid"
        manufacturer?: string
        colorCode?: string
        name?: string
        reason?: string
        existing?: { name: string; hexColor?: string | null }
      }>,
    }

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      const colorCode = (r.colorCode || "").trim()
      const name = (r.name || "").trim()
      const mfrRaw = (r.manufacturer || "").trim()

      if (!colorCode || !name) {
        report.invalidCount++
        report.rows.push({
          index: i,
          status: "invalid",
          colorCode,
          name,
          reason: "Missing colorCode or name",
        })
        continue
      }

      let mfr = defaultMfr
      if (mfrRaw) {
        mfr =
          byName.get(mfrRaw.toLowerCase()) ||
          byAbbrev.get(mfrRaw.toLowerCase()) ||
          undefined
      }

      if (!mfr) {
        report.invalidCount++
        report.rows.push({
          index: i,
          status: "invalid",
          colorCode,
          name,
          manufacturer: mfrRaw,
          reason: `Manufacturer "${mfrRaw}" not found and no default set`,
        })
        continue
      }

      // Validate code pattern
      if (mfr.codePattern) {
        try {
          if (!new RegExp(mfr.codePattern).test(colorCode)) {
            report.invalidCount++
            report.rows.push({
              index: i,
              status: "invalid",
              colorCode,
              name,
              manufacturer: mfr.name,
              reason: `Code does not match ${mfr.name} pattern: ${mfr.codePattern}`,
            })
            continue
          }
        } catch {
          /* ignore bad regex */
        }
      }

      const existing = await prisma.color.findUnique({
        where: {
          manufacturer_colorCode: { manufacturer: mfr.name, colorCode },
        },
      })
      if (existing) {
        if (existing.name === name) {
          report.duplicateCount++
          report.rows.push({
            index: i,
            status: "duplicate",
            manufacturer: mfr.name,
            colorCode,
            name,
            existing: { name: existing.name, hexColor: existing.hexColor },
          })
        } else {
          report.conflictCount++
          report.rows.push({
            index: i,
            status: "conflict",
            manufacturer: mfr.name,
            colorCode,
            name,
            reason: `Exists as "${existing.name}" — CSV wants "${name}"`,
            existing: { name: existing.name, hexColor: existing.hexColor },
          })
        }
      } else {
        report.newCount++
        report.rows.push({
          index: i,
          status: "new",
          manufacturer: mfr.name,
          colorCode,
          name,
        })
      }
    }

    return NextResponse.json(report)
  } catch (error: any) {
    console.error("POST /api/admin/colors/import-preview error:", error)
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 })
  }
}
