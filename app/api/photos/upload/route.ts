
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { uploadFile } from "@/lib/s3"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const projectId = formData.get('projectId') as string
    const roomId = formData.get('roomId') as string | null

    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    if (!projectId) {
      return NextResponse.json({ error: "Project ID required" }, { status: 400 })
    }

    // Verify user owns the project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id
      }
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const uploadedPhotos = []

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        continue // Skip non-image files
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      const cloud_storage_path = await uploadFile(buffer, file.name)

      // Create photo record in database
      const photo = await prisma.photo.create({
        data: {
          filename: `${Date.now()}-${file.name}`,
          originalFilename: file.name,
          cloud_storage_path,
          mimeType: file.type,
          size: file.size,
          projectId,
          roomId: roomId || null
        }
      })

      uploadedPhotos.push(photo)
    }

    return NextResponse.json({ 
      message: "Photos uploaded successfully",
      photos: uploadedPhotos
    })

  } catch (error) {
    console.error("Photo upload error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
