import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { createSynopsisDocumentV2 } from "@/lib/synopsis-docx-exporter-v2"
import { seedSynopsisDraft } from "@/lib/synopsis-seeder"
import { Packer } from "docx"

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

    // Consistent with GET: auto-seed when no draft exists yet
    if (!draft) {
      draft = await seedSynopsisDraft(projectId)
    }

    const doc = await createSynopsisDocumentV2(draft)
    const buffer = await Packer.toBuffer(doc)

    const filename = `${draft.clientName}_Color_Synopsis.docx`.replace(/[^a-zA-Z0-9_\-\.]/g, "_")

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
      },
    })
  } catch (error: any) {
    console.error("Synopsis draft export error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to export synopsis draft" },
      { status: 500 }
    )
  }
}
