import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { seedSynopsisDraft } from "@/lib/synopsis-seeder"

export const dynamic = "force-dynamic"

export async function POST(
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

    // seedSynopsisDraft uses upsert, so it overwrites any existing draft
    const draft = await seedSynopsisDraft(projectId)

    return NextResponse.json(draft)
  } catch (error: any) {
    console.error("Synopsis draft reset error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to reset synopsis draft" },
      { status: 500 }
    )
  }
}
