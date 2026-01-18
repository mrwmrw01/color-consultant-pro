

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

// GET /api/projects/check-name?name=ProjectName - Check if a project name exists
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const name = searchParams.get("name")

    if (!name || !name.trim()) {
      return NextResponse.json({ exists: false })
    }

    const existingProject = await prisma.project.findFirst({
      where: {
        userId: session.user.id,
        name: name.trim()
      }
    })

    return NextResponse.json({ exists: !!existingProject })

  } catch (error) {
    console.error("Name check error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
