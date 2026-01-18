
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/db"
import { getFileBuffer } from "@/lib/s3"
import { authOptions } from "@/lib/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: { photoId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const photoId = params.photoId

    // Get photo from database
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      include: {
        project: true
      }
    })

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 })
    }

    // Verify user has access to this photo's project
    if (photo.project.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Check for query parameter to force original photo
    const { searchParams } = new URL(request.url)
    const forceOriginal = searchParams.get('original') === 'true'

    // Use annotated photo if it exists and not forcing original
    const photoPath = (!forceOriginal && photo.annotated_photo_path) 
      ? photo.annotated_photo_path 
      : photo.cloud_storage_path

    // Download file from S3 and get the buffer
    const buffer = await getFileBuffer(photoPath)
    
    // Convert buffer to base64
    const base64 = buffer.toString('base64')
    
    // Determine MIME type based on file extension
    const ext = photo.filename.toLowerCase().split('.').pop()
    let mimeType = 'image/jpeg'
    if (ext === 'png') mimeType = 'image/png'
    else if (ext === 'gif') mimeType = 'image/gif'
    else if (ext === 'webp') mimeType = 'image/webp'
    
    const dataUrl = `data:${mimeType};base64,${base64}`

    return NextResponse.json({ base64: dataUrl })
  } catch (error) {
    console.error("Error converting photo to base64:", error)
    return NextResponse.json(
      { error: "Failed to convert photo" },
      { status: 500 }
    )
  }
}
