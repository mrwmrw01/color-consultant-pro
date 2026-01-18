
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { generateSynopsisFromAnnotations } from "@/lib/synopsis-generator"
import { createSynopsisDocument } from "@/lib/synopsis-docx-exporter"
import { Packer } from "docx"

export const dynamic = "force-dynamic"

// GET /api/projects/[projectId]/synopsis/export
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Generate synopsis data
    const synopsisData = await generateSynopsisFromAnnotations(params.projectId)

    // Create DOCX document with photos
    const doc = await createSynopsisDocument(synopsisData, true)

    // Generate buffer
    const buffer = await Packer.toBuffer(doc)

    // Return as downloadable file
    const filename = `${synopsisData.project.clientName}_Color_Synopsis.docx`.replace(/[^a-zA-Z0-9_\-\.]/g, '_')

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString()
      }
    })

  } catch (error: any) {
    console.error("Synopsis export error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to export synopsis" },
      { status: 500 }
    )
  }
}
