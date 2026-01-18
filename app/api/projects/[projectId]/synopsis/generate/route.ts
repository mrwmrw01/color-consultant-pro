
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { generateSynopsisFromAnnotations } from "@/lib/synopsis-generator"

export const dynamic = "force-dynamic"

// POST /api/projects/[projectId]/synopsis/generate
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { projectId } = await params
    const synopsisData = await generateSynopsisFromAnnotations(projectId)

    return NextResponse.json(synopsisData)

  } catch (error: any) {
    console.error("Synopsis generation error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to generate synopsis" },
      { status: 500 }
    )
  }
}
