
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { downloadFile } from "@/lib/s3"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: { photoId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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

    // Check for query parameter to force original photo
    const { searchParams } = new URL(request.url)
    const forceOriginal = searchParams.get('original') === 'true'

    // Use annotated photo if it exists and not forcing original
    const photoPath = (!forceOriginal && photo.annotated_photo_path) 
      ? photo.annotated_photo_path 
      : photo.cloud_storage_path

    const signedUrl = await downloadFile(photoPath)

    return NextResponse.json({ 
      url: signedUrl,
      isAnnotated: !forceOriginal && !!photo.annotated_photo_path,
      hasAnnotatedVersion: !!photo.annotated_photo_path
    })

  } catch (error) {
    console.error("Photo URL error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
