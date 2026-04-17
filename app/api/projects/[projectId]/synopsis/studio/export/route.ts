import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { generateStudioData } from "@/lib/synopsis-studio-data"
import { renderSynopsisHtml } from "@/lib/synopsis-pdf-renderer"
import { exec } from "child_process"
import { writeFileSync, readFileSync, unlinkSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { randomUUID } from "crypto"

export const dynamic = "force-dynamic"

/**
 * GET /api/projects/[projectId]/synopsis/studio/export?format=pdf
 *
 * Generates a PDF from the synopsis studio data using weasyprint.
 * Query params:
 *   format: "pdf" (default) | "html"
 *   showExceptions: "true" (default) | "false"
 *   consultantName: string
 *   companyName: string
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { projectId } = await params
    const { searchParams } = new URL(request.url)
    const format = searchParams.get("format") || "pdf"
    const showExceptions = searchParams.get("showExceptions") !== "false"
    const consultantName =
      searchParams.get("consultantName") ||
      (session.user as any).firstName
        ? `${(session.user as any).firstName || ""} ${(session.user as any).lastName || ""}`.trim()
        : "Color Consultant"
    const companyName =
      searchParams.get("companyName") ||
      (session.user as any).companyName ||
      "Color Guru"

    // Generate data
    const data = await generateStudioData(projectId)

    // Render HTML
    const html = renderSynopsisHtml(data, {
      showExceptions,
      consultantName,
      companyName,
    })

    // If they just want HTML
    if (format === "html") {
      return new NextResponse(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      })
    }

    // Generate PDF via weasyprint
    const id = randomUUID()
    const htmlPath = join(tmpdir(), `synopsis-${id}.html`)
    const pdfPath = join(tmpdir(), `synopsis-${id}.pdf`)

    writeFileSync(htmlPath, html, "utf-8")

    await new Promise<void>((resolve, reject) => {
      exec(`weasyprint "${htmlPath}" "${pdfPath}"`, { timeout: 30000 }, (err, _stdout, stderr) => {
        if (err) {
          console.error("weasyprint error:", stderr)
          reject(new Error(`PDF generation failed: ${stderr || err.message}`))
        } else {
          resolve()
        }
      })
    })

    const pdfBuffer = readFileSync(pdfPath)

    // Cleanup temp files
    try {
      unlinkSync(htmlPath)
      unlinkSync(pdfPath)
    } catch {
      // ignore cleanup errors
    }

    const safeName = data.project.clientName.replace(/[^a-zA-Z0-9_\-\s]/g, "").replace(/\s+/g, "_")
    const filename = `${safeName}_Color_Synopsis.pdf`

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    })
  } catch (error: any) {
    console.error("Synopsis PDF export error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to export synopsis" },
      { status: 500 }
    )
  }
}
