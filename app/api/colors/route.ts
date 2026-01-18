import { getServerSession } from "next-auth/next"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const manufacturer = searchParams.get('manufacturer')
    const search = searchParams.get('search')

    const colors = await prisma.color.findMany({
      where: {
        ...(manufacturer && manufacturer !== 'all' ? { manufacturer } : {}),
        ...(search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { manufacturer: { contains: search, mode: 'insensitive' } },
            { colorCode: { contains: search, mode: 'insensitive' } }
          ]
        } : {})
      },
      include: {
        availability: {
          orderBy: [
            { productLine: 'asc' },
            { sheen: 'asc' }
          ]
        }
      },
      orderBy: [
        { usageCount: 'desc' }, // Most used colors first
        { manufacturer: 'asc' },
        { colorCode: 'asc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json(colors)

  } catch (error) {
    console.error("Error fetching colors:", error)
    return NextResponse.json(
      { error: "Failed to fetch colors" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await request.json()
    const {
      colorCode,
      name,
      manufacturer,
      productLines, // Array of { productLine, sheens[] }
      rgbColor,
      hexColor,
      colorFamily,
      notes
    } = data

    if (!colorCode || !name || !manufacturer) {
      return NextResponse.json(
        { error: "Color code, name, and manufacturer are required" },
        { status: 400 }
      )
    }

    // Check if this color code already exists
    const existingColor = await prisma.color.findUnique({
      where: {
        colorCode
      }
    })

    if (existingColor) {
      return NextResponse.json(
        { error: "A color with this code already exists" },
        { status: 400 }
      )
    }

    // Create the color with availability entries
    const color = await prisma.color.create({
      data: {
        colorCode,
        name,
        manufacturer,
        rgbColor,
        hexColor,
        colorFamily,
        notes,
        availability: {
          create: productLines?.flatMap((pl: any) => 
            pl.sheens?.map((sheen: string) => ({
              productLine: pl.productLine,
              sheen
            }))
          ) || []
        }
      },
      include: {
        availability: true
      }
    })

    return NextResponse.json(color, { status: 201 })

  } catch (error) {
    console.error("Error creating color:", error)
    return NextResponse.json(
      { error: "Failed to create color" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const colorId = searchParams.get('id')

    if (!colorId) {
      return NextResponse.json(
        { error: "Color ID is required" },
        { status: 400 }
      )
    }

    // Check if color exists
    const color = await prisma.color.findUnique({
      where: { id: colorId },
      include: {
        annotations: true,
        synopsisEntries: true
      }
    })

    if (!color) {
      return NextResponse.json(
        { error: "Color not found" },
        { status: 404 }
      )
    }

    // Check if color is being used in any projects
    if (color.annotations.length > 0 || color.synopsisEntries.length > 0) {
      return NextResponse.json(
        { 
          error: "Cannot delete color that is being used in projects",
          usageCount: color.annotations.length + color.synopsisEntries.length
        },
        { status: 400 }
      )
    }

    // Delete the color (availability entries will be cascaded)
    await prisma.color.delete({
      where: { id: colorId }
    })

    return NextResponse.json({ 
      message: "Color deleted successfully",
      deletedColor: {
        id: color.id,
        colorCode: color.colorCode,
        name: color.name
      }
    })

  } catch (error) {
    console.error("Error deleting color:", error)
    return NextResponse.json(
      { error: "Failed to delete color" },
      { status: 500 }
    )
  }
}