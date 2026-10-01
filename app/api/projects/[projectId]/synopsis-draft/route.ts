import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { synopsisStructureSchema } from "@/lib/synopsis-types"
import { seedSynopsisDraft } from "@/lib/synopsis-seeder"

export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { projectId } = await params

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: session.user.id },
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    let draft = await prisma.synopsisDraft.findUnique({
      where: { projectId },
    })

    if (!draft) {
      draft = await seedSynopsisDraft(projectId)
    }

    return NextResponse.json(draft)
  } catch (error: any) {
    console.error("Synopsis draft fetch error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch synopsis draft" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { projectId } = await params

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: session.user.id },
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const body = await request.json()

    const structureResult = synopsisStructureSchema.safeParse(body.structure)
    if (!structureResult.success) {
      return NextResponse.json(
        {
          error: "Invalid synopsis structure",
          details: structureResult.error.errors,
        },
        { status: 400 }
      )
    }

    // clientName is NOT NULL — never forward null/empty; keep the existing value
    const clientName =
      typeof body.clientName === "string" && body.clientName.trim()
        ? body.clientName.trim()
        : undefined

    const draft = await prisma.synopsisDraft.upsert({
      where: { projectId },
      update: {
        structure: structureResult.data,
        ...(clientName ? { clientName } : {}),
        ...(body.address !== undefined && { address: body.address }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.consultDate !== undefined && {
          consultDate: body.consultDate ? new Date(body.consultDate) : null,
        }),
      },
      create: {
        projectId,
        structure: structureResult.data,
        clientName: body.clientName || project.clientName || "Client",
        address: body.address ?? project.address ?? null,
        email: body.email ?? project.clientEmail ?? null,
        phone: body.phone ?? project.clientPhone ?? null,
        consultDate: body.consultDate ? new Date(body.consultDate) : null,
      },
    })

    return NextResponse.json(draft)
  } catch (error: any) {
    console.error("Synopsis draft update error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update synopsis draft" },
      { status: 500 }
    )
  }
}
