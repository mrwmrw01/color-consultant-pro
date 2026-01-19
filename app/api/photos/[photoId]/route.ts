import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { deleteFile } from "@/lib/s3"
import { invalidateUrl } from "@/lib/s3-url-cache"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { photoId: string } }
) {
  try {
    console.log(`PATCH request for photo ${params.photoId}`)
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.log("Unauthorized access attempt")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Validate parameters
    if (!params.photoId || params.photoId === 'undefined') {
      console.error("Invalid photo ID:", params.photoId)
      return NextResponse.json({ error: "Invalid photo ID" }, { status: 400 })
    }

    // Get request body
    const body = await request.json()
    const { roomId } = body

    // Verify the photo belongs to the user
    const photo = await prisma.photo.findFirst({
      where: {
        id: params.photoId,
        project: {
          userId: session.user.id
        }
      },
      include: {
        project: true
      }
    })

    if (!photo) {
      console.log(`Photo ${params.photoId} not found or doesn't belong to user ${session.user.id}`)
      return NextResponse.json({ error: "Photo not found" }, { status: 404 })
    }

    // If roomId is provided, verify it exists and is a global room
    if (roomId) {
      const room = await prisma.room.findFirst({
        where: {
          id: roomId,
          projectId: null  // All rooms are now global
        }
      })

      if (!room) {
        console.log(`Room ${roomId} not found or is not a global room`)
        return NextResponse.json({ error: "Invalid room" }, { status: 400 })
      }
    }

    // Update the photo's room assignment
    const updatedPhoto = await prisma.photo.update({
      where: {
        id: params.photoId
      },
      data: {
        roomId: roomId || null
      },
      include: {
        room: true,
        project: true
      }
    })

    console.log(`Successfully updated room assignment for photo ${params.photoId}`)
    return NextResponse.json(updatedPhoto)
    
  } catch (error) {
    console.error("Error updating photo:", error)
    return NextResponse.json(
      { error: `Failed to update photo: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { photoId: string } }
) {
  try {
    console.log(`DELETE request for photo ${params.photoId}`)
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.log("Unauthorized access attempt")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Validate parameters
    if (!params.photoId || params.photoId === 'undefined') {
      console.error("Invalid photo ID:", params.photoId)
      return NextResponse.json({ error: "Invalid photo ID" }, { status: 400 })
    }

    // Verify the photo belongs to the user
    const photo = await prisma.photo.findFirst({
      where: {
        id: params.photoId,
        project: {
          userId: session.user.id
        }
      }
    })

    if (!photo) {
      console.log(`Photo ${params.photoId} not found or doesn't belong to user ${session.user.id}`)
      return NextResponse.json({ error: "Photo not found" }, { status: 404 })
    }

    console.log(`Deleting photo ${params.photoId}`)

    // Invalidate cached URLs for all photo sizes
    if (photo.cloud_storage_path) {
      invalidateUrl(photo.cloud_storage_path)
    }
    if (photo.medium_path) {
      invalidateUrl(photo.medium_path)
    }
    if (photo.thumbnail_path) {
      invalidateUrl(photo.thumbnail_path)
    }
    if (photo.annotated_photo_path) {
      invalidateUrl(photo.annotated_photo_path)
    }

    // Delete from S3 first
    if (photo.cloud_storage_path) {
      try {
        await deleteFile(photo.cloud_storage_path)
        console.log(`Successfully deleted file from S3: ${photo.cloud_storage_path}`)
      } catch (s3Error) {
        console.error("Error deleting file from S3:", s3Error)
        // Continue with database deletion even if S3 deletion fails
      }
    }

    // Delete medium and thumbnail from S3
    if (photo.medium_path) {
      try {
        await deleteFile(photo.medium_path)
      } catch (s3Error) {
        console.error("Error deleting medium file from S3:", s3Error)
      }
    }
    if (photo.thumbnail_path) {
      try {
        await deleteFile(photo.thumbnail_path)
      } catch (s3Error) {
        console.error("Error deleting thumbnail file from S3:", s3Error)
      }
    }

    // Delete annotated photo from S3
    if (photo.annotated_photo_path) {
      try {
        await deleteFile(photo.annotated_photo_path)
      } catch (s3Error) {
        console.error("Error deleting annotated file from S3:", s3Error)
      }
    }

    // Delete the photo and all related annotations (cascade)
    await prisma.photo.delete({
      where: {
        id: params.photoId
      }
    })

    console.log(`Successfully deleted photo ${params.photoId}`)
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error("Error deleting photo:", error)
    return NextResponse.json(
      { error: `Failed to delete photo: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}