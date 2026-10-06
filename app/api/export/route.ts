import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

/**
 * GET /api/export
 * Download everything the signed-in user owns as one JSON file: clients,
 * properties, projects with photo records, annotations and synopses, and
 * favorite colors. Photo files themselves stay in storage; each photo record
 * carries its storage keys.
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

  const [user, clients, projects, favoriteColors] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        companyName: true,
        role: true,
        createdAt: true,
      },
    }),
    prisma.client.findMany({
      where: { userId },
      include: { properties: { orderBy: { address: "asc" } } },
      orderBy: { name: "asc" },
    }),
    prisma.project.findMany({
      where: { userId },
      include: {
        photos: {
          include: {
            room: { select: { name: true } },
            annotations: {
              include: {
                room: { select: { name: true } },
                color: { select: { colorCode: true, name: true, manufacturer: true, hexColor: true } },
              },
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        synopsisDraft: true,
        synopsis: {
          include: {
            entries: {
              include: {
                room: { select: { name: true } },
                color: { select: { colorCode: true, name: true, manufacturer: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.userFavoriteColor.findMany({
      where: { userId },
      include: { color: { select: { colorCode: true, name: true, manufacturer: true } } },
    }),
  ])

  const exportedAt = new Date()
  const body = JSON.stringify(
    {
      format: "color-consultant-pro-export",
      version: 1,
      exportedAt: exportedAt.toISOString(),
      user,
      clients,
      projects,
      favoriteColors: favoriteColors.map((f) => f.color),
    },
    null,
    2
  )

  const filename = `color-consultant-export-${exportedAt.toISOString().slice(0, 10)}.json`
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
