
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { deleteFile } from "@/lib/s3"
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

// Track uploaded S3 keys for potential cleanup
interface UploadedS3File {
  key: string
  size: number
}

/**
 * Upload a single file to S3
 */
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

/**
 * Cleanup orphaned S3 files after failed database transaction
 */
async function cleanupOrphanedFiles(keys: string[]): Promise<void> {
  if (keys.length === 0) return
  
  console.log(`[Upload Cleanup] Cleaning up ${keys.length} orphaned S3 files...`)
  
  const results = await Promise.allSettled(
    keys.map(async (key) => {
      try {
        await deleteFile(key)
        console.log(`[Upload Cleanup] Deleted: ${key}`)
        return { success: true, key }
      } catch (error) {
        console.error(`[Upload Cleanup] Failed to delete: ${key}`, error)
        return { success: false, key, error }
      }
    })
  )
  
  const successful = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length
  const failed = results.length - successful
  
  console.log(`[Upload Cleanup] Complete: ${successful} deleted, ${failed} failed`)
}

export async function POST(request: NextRequest) {
  let rateLimitResult: Awaited<ReturnType<typeof checkRateLimit>> | null = null
  
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check rate limit
    rateLimitResult = await checkRateLimit(session.user.id, uploadLimiter)
    if (!rateLimitResult.allowed) {
      const errorMessage = rateLimitResult.circuitOpen
        ? "Upload service temporarily unavailable. Please try again in a few minutes."
        : "Upload rate limit exceeded. Please try again later."
      
      return NextResponse.json(
        {
          error: errorMessage,
          retryAfter: rateLimitResult.retryAfter,
          circuitOpen: rateLimitResult.circuitOpen
        },
        {
          status: rateLimitResult.circuitOpen ? 503 : 429,
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
      
      // Track S3 keys for potential cleanup
      const uploadedS3Keys: string[] = []
      let largePath = ''
      let mediumPath = ''
      let thumbnailPath = ''

      try {
        // Upload all sizes
        ;[largePath, mediumPath, thumbnailPath] = await Promise.all([
          uploadToS3(
            optimizationResult.sizes.large,
            `${folderPrefix}uploads/${timestamp}-${baseFileName}-large.webp`,
            'image/webp'
          ),
          uploadToS3(
            optimizationResult.sizes.medium,
            `${folderPrefix}uploads/${timestamp}-${baseFileName}-medium.webp`,
            'image/webp'
          ),
          uploadToS3(
            optimizationResult.sizes.thumbnail,
            `${folderPrefix}uploads/${timestamp}-${baseFileName}-thumbnail.webp`,
            'image/webp'
          )
        ])

        // Track uploaded keys
        uploadedS3Keys.push(largePath, mediumPath, thumbnailPath)

        // Create photo record in database with all sizes
        // If this fails, we need to clean up the S3 files
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
        
        // Clear tracked keys since DB write succeeded
        uploadedS3Keys.length = 0
        
      } catch (error: any) {
        // Database write failed - clean up orphaned S3 files
        console.error(`[Upload] Database write failed for ${file.name}, cleaning up S3 files...`)
        
        await cleanupOrphanedFiles(uploadedS3Keys)
        
        // Re-throw the error to be handled by outer catch
        throw error
      }
    }

    return NextResponse.json({
      message: "Photos uploaded successfully",
      photos: uploadedPhotos
    }, {
      headers: rateLimitResult ? getRateLimitHeaders(rateLimitResult) : {}
    })

  } catch (error: any) {
    console.error("Photo upload error:", error)
    
    // Determine appropriate error message
    let errorMessage = "Internal server error"
    let statusCode = 500
    
    if (error.code === 'P2002') {
      errorMessage = "A photo with this name already exists"
      statusCode = 409
    } else if (error.code === 'P2003') {
      errorMessage = "Invalid project or room reference"
      statusCode = 400
    } else if (error.message?.includes('S3')) {
      errorMessage = "Failed to upload photo to storage"
      statusCode = 502
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: statusCode }
    )
  }
}
