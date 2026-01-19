
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { downloadFile } from "@/lib/s3"
import { getCachedPresignedUrl } from "@/lib/s3-url-cache"
import { checkRateLimit, presignedUrlLimiter, getRateLimitHeaders } from "@/lib/rate-limiter"

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

    // Check rate limit
    const rateLimitResult = await checkRateLimit(session.user.id, presignedUrlLimiter)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please try again later.",
          retryAfter: rateLimitResult.retryAfter
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      )
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

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const forceOriginal = searchParams.get('original') === 'true'
    const size = searchParams.get('size') as 'thumbnail' | 'medium' | 'large' | null

    // Determine which path to use
    let photoPath: string

    if (!forceOriginal && photo.annotated_photo_path) {
      // Use annotated version if available
      photoPath = photo.annotated_photo_path
    } else if (size === 'thumbnail' && photo.thumbnail_path) {
      // Use thumbnail for galleries
      photoPath = photo.thumbnail_path
    } else if (size === 'medium' && photo.medium_path) {
      // Use medium for detail views
      photoPath = photo.medium_path
    } else {
      // Use large (default for annotation)
      photoPath = photo.cloud_storage_path
    }

    // Get cached presigned URL
    const signedUrl = await getCachedPresignedUrl(photoPath)

    return NextResponse.json({
      url: signedUrl,
      isAnnotated: !forceOriginal && !!photo.annotated_photo_path,
      hasAnnotatedVersion: !!photo.annotated_photo_path,
      size: size || 'large',
      cached: true // URLs are always cached
    }, {
      headers: {
        ...getRateLimitHeaders(rateLimitResult),
        'Cache-Control': 'public, max-age=3000', // Cache response for 50 minutes
      }
    })

  } catch (error) {
    console.error("Photo URL error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
