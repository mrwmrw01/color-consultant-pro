import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

interface BulkColorInput {
  colorCode: string
  name: string
  manufacturer: string
  rgbColor?: string
  hexColor?: string
  notes?: string
  productLines?: Array<{
    productLine: string
    sheens: string[]
  }>
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { colors, skipDuplicates = true } = await request.json() as {
      colors: BulkColorInput[]
      skipDuplicates?: boolean
    }

    if (!Array.isArray(colors) || colors.length === 0) {
      return NextResponse.json(
        { error: "Colors array is required and must not be empty" },
        { status: 400 }
      )
    }

    const results = {
      created: 0,
      skipped: 0,
      errors: [] as string[]
    }

    for (const color of colors) {
      try {
        // Validate required fields
        if (!color.colorCode || !color.name || !color.manufacturer) {
          results.errors.push(`Skipped: Missing required fields for ${color.colorCode || 'unknown'}`)
          results.skipped++
          continue
        }

        // Check if color already exists
        const existing = await prisma.color.findUnique({
          where: { colorCode: color.colorCode }
        })

        if (existing) {
          if (skipDuplicates) {
            results.skipped++
            continue
          } else {
            results.errors.push(`Color ${color.colorCode} already exists`)
            results.skipped++
            continue
          }
        }

        // Create the color with availability entries
        await prisma.color.create({
          data: {
            colorCode: color.colorCode,
            name: color.name,
            manufacturer: color.manufacturer,
            rgbColor: color.rgbColor,
            hexColor: color.hexColor,
            notes: color.notes,
            availability: {
              create: color.productLines?.flatMap(pl =>
                pl.sheens?.map(sheen => ({
                  productLine: pl.productLine,
                  sheen
                }))
              ) || []
            }
          }
        })

        results.created++
      } catch (error: any) {
        results.errors.push(`Error importing ${color.colorCode}: ${error.message}`)
        results.skipped++
      }
    }

    return NextResponse.json({
      message: "Bulk import completed",
      results
    })

  } catch (error: any) {
    console.error("Bulk import error:", error)
    return NextResponse.json(
      { error: "Failed to import colors", details: error.message },
      { status: 500 }
    )
  }
}
