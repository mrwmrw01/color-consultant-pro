
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { uploadFile, deleteFile } from "@/lib/s3"

export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
  { params }: { params: { photoId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify user owns the photo
    const photo = await prisma.photo.findFirst({
      where: {
        id: params.photoId,
        project: {
          userId: session.user.id
        }
      }
    })

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())
    
    // Generate S3 key for annotated photo
    const timestamp = Date.now()
    const filename = `annotated-${timestamp}-${photo.originalFilename}`
    const cloud_storage_path = await uploadFile(buffer, filename)

    // Delete old annotated photo if it exists
    if (photo.annotated_photo_path) {
      try {
        await deleteFile(photo.annotated_photo_path)
      } catch (error) {
        console.error("Error deleting old annotated photo:", error)
        // Continue even if deletion fails
      }
    }

    // Update photo record with new annotated photo path
    const updatedPhoto = await prisma.photo.update({
      where: { id: params.photoId },
      data: { 
        annotated_photo_path: cloud_storage_path,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({ 
      success: true,
      annotated_photo_path: cloud_storage_path,
      photo: updatedPhoto
    })

  } catch (error) {
    console.error("Error saving annotated photo:", error)
    return NextResponse.json(
      { error: "Failed to save annotated photo" },
      { status: 500 }
    )
  }
}

// DELETE endpoint to remove annotated photo
export async function DELETE(
  request: NextRequest,
  { params }: { params: { photoId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify user owns the photo
    const photo = await prisma.photo.findFirst({
      where: {
        id: params.photoId,
        project: {
          userId: session.user.id
        }
      }
    })

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 })
    }

    // Delete annotated photo from S3 if it exists
    if (photo.annotated_photo_path) {
      try {
        await deleteFile(photo.annotated_photo_path)
      } catch (error) {
        console.error("Error deleting annotated photo from S3:", error)
      }
    }

    // Update photo record to remove annotated photo path
    const updatedPhoto = await prisma.photo.update({
      where: { id: params.photoId },
      data: { 
        annotated_photo_path: null,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({ 
      success: true,
      photo: updatedPhoto
    })

  } catch (error) {
    console.error("Error removing annotated photo:", error)
    return NextResponse.json(
      { error: "Failed to remove annotated photo" },
      { status: 500 }
    )
  }
}
