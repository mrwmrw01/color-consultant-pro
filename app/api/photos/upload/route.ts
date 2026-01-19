
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { uploadFile } from "@/lib/s3"
import {
  optimizeImage,
  validateImage,
  logOptimization,
  generateBlurPlaceholder
} from "@/lib/image-optimizer"
import { checkRateLimit, uploadLimiter, getRateLimitHeaders } from "@/lib/rate-limiter"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { createS3Client, getBucketConfig } from "@/lib/aws-config"

export const dynamic = "force-dynamic"

const s3Client = createS3Client()
const { bucketName, folderPrefix } = getBucketConfig()

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check rate limit
    const rateLimitResult = await checkRateLimit(session.user.id, uploadLimiter)
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

      // Validate image
      const validation = await validateImage(buffer)
      if (!validation.valid) {
        console.error(`Image validation failed: ${validation.error}`)
        continue // Skip invalid images
      }

      // Optimize image and generate multiple sizes
      const optimizationResult = await optimizeImage(buffer, {
        quality: parseInt(process.env.IMAGE_QUALITY || '85'),
        maxDimensions: {
          width: parseInt(process.env.MAX_IMAGE_DIMENSION || '2048'),
          height: parseInt(process.env.MAX_IMAGE_DIMENSION || '2048')
        }
      })

      // Generate blur placeholder (optional)
      const blurPlaceholder = await generateBlurPlaceholder(buffer)

      // Log optimization results
      logOptimization(optimizationResult, file.name)

      // Upload all 3 sizes to S3
      const timestamp = Date.now()
      const baseFileName = file.name.replace(/\.[^/.]+$/, '') // Remove extension

      const [largePath, mediumPath, thumbnailPath] = await Promise.all([
        // Large (2048x2048 WebP)
        uploadToS3(
          optimizationResult.sizes.large,
          `${folderPrefix}uploads/${timestamp}-${baseFileName}-large.webp`,
          'image/webp'
        ),
        // Medium (800x800 WebP)
        uploadToS3(
          optimizationResult.sizes.medium,
          `${folderPrefix}uploads/${timestamp}-${baseFileName}-medium.webp`,
          'image/webp'
        ),
        // Thumbnail (200x200 WebP)
        uploadToS3(
          optimizationResult.sizes.thumbnail,
          `${folderPrefix}uploads/${timestamp}-${baseFileName}-thumbnail.webp`,
          'image/webp'
        )
      ])

      // Create photo record in database with all sizes
      const photo = await prisma.photo.create({
        data: {
          filename: `${timestamp}-${file.name}`,
          originalFilename: file.name,
          cloud_storage_path: largePath,
          medium_path: mediumPath,
          thumbnail_path: thumbnailPath,
          blur_placeholder: blurPlaceholder,
          mimeType: 'image/webp',
          size: validation.metadata!.size,
          width: validation.metadata!.width,
          height: validation.metadata!.height,
          optimized_size: optimizationResult.metadata.large.size +
                          optimizationResult.metadata.medium.size +
                          optimizationResult.metadata.thumbnail.size,
          storage_savings: optimizationResult.savings.storageReduction,
          projectId,
          roomId: roomId || null
        }
      })

      uploadedPhotos.push(photo)
    }

    return NextResponse.json({
      message: "Photos uploaded successfully",
      photos: uploadedPhotos
    }, {
      headers: getRateLimitHeaders(rateLimitResult)
    })

  } catch (error) {
    console.error("Photo upload error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Helper function to upload to S3
async function uploadToS3(buffer: Buffer, key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType
  })

  await s3Client.send(command)
  return key
}
