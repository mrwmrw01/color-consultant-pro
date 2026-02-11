/**
 * Image Optimization Service
 * Compresses and generates multiple sizes of images for cost-effective storage
 *
 * Benefits:
 * - 70-85% storage reduction
 * - 95% bandwidth reduction for galleries (using thumbnails)
 * - WebP format for modern browsers
 * - Automatic dimension limits
 */

import sharp from 'sharp'

export interface ImageSizes {
  original?: Buffer
  large: Buffer // 2048x2048 max (for annotation)
  medium: Buffer // 800x800 (for detail view)
  thumbnail: Buffer // 200x200 (for galleries)
}

export interface ImageMetadata {
  format: string
  width: number
  height: number
  size: number
}

export interface OptimizationResult {
  sizes: ImageSizes
  metadata: {
    original: ImageMetadata
    large: ImageMetadata
    medium: ImageMetadata
    thumbnail: ImageMetadata
  }
  savings: {
    storageReduction: number // percentage
    totalSizeReduction: number // bytes
  }
}

/**
 * Optimize image and generate multiple sizes
 */
export async function optimizeImage(
  buffer: Buffer,
  options: {
    quality?: number // 1-100, default 85
    maxDimensions?: { width: number; height: number } // default 2048x2048
    generateOriginal?: boolean // Keep original size, default false
  } = {}
): Promise<OptimizationResult> {
  const {
    quality = 85,
    maxDimensions = { width: 2048, height: 2048 },
    generateOriginal = false,
  } = options

  // Get original metadata
  const originalMetadata = await sharp(buffer).metadata()
  const originalSize = buffer.length

  // Generate sizes in parallel
  // .rotate() with no args auto-applies EXIF orientation (fixes phone photo rotation)
  const [large, medium, thumbnail, original] = await Promise.all([
    // Large (for annotation/editing)
    sharp(buffer)
      .rotate()
      .resize(maxDimensions.width, maxDimensions.height, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality })
      .toBuffer(),

    // Medium (for detail view)
    sharp(buffer)
      .rotate()
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer(),

    // Thumbnail (for galleries)
    sharp(buffer)
      .rotate()
      .resize(200, 200, {
        fit: 'cover', // Crop to square
        position: 'center',
      })
      .webp({ quality: 80 })
      .toBuffer(),

    // Original (optional, only if requested)
    generateOriginal
      ? sharp(buffer).rotate().webp({ quality: 90 }).toBuffer()
      : Promise.resolve(undefined),
  ])

  // Get metadata for each size
  const [largeInfo, mediumInfo, thumbnailInfo] = await Promise.all([
    sharp(large).metadata(),
    sharp(medium).metadata(),
    sharp(thumbnail).metadata(),
  ])

  const totalOptimizedSize = large.length + medium.length + thumbnail.length
  const storageReduction = ((originalSize - totalOptimizedSize) / originalSize) * 100

  return {
    sizes: {
      original,
      large,
      medium,
      thumbnail,
    },
    metadata: {
      original: {
        format: originalMetadata.format || 'unknown',
        width: originalMetadata.width || 0,
        height: originalMetadata.height || 0,
        size: originalSize,
      },
      large: {
        format: 'webp',
        width: largeInfo.width || 0,
        height: largeInfo.height || 0,
        size: large.length,
      },
      medium: {
        format: 'webp',
        width: mediumInfo.width || 0,
        height: mediumInfo.height || 0,
        size: medium.length,
      },
      thumbnail: {
        format: 'webp',
        width: thumbnailInfo.width || 0,
        height: thumbnailInfo.height || 0,
        size: thumbnail.length,
      },
    },
    savings: {
      storageReduction,
      totalSizeReduction: originalSize - totalOptimizedSize,
    },
  }
}

/**
 * Generate blur placeholder (for progressive loading)
 */
export async function generateBlurPlaceholder(buffer: Buffer): Promise<string> {
  // Generate tiny 20x20 placeholder
  const placeholder = await sharp(buffer)
    .rotate()
    .resize(20, 20, { fit: 'inside' })
    .blur(3)
    .webp({ quality: 50 })
    .toBuffer()

  // Return as base64 data URL
  return `data:image/webp;base64,${placeholder.toString('base64')}`
}

/**
 * Validate image before processing
 */
export async function validateImage(
  buffer: Buffer
): Promise<{
  valid: boolean
  error?: string
  metadata?: ImageMetadata
}> {
  try {
    const metadata = await sharp(buffer).metadata()

    // Check format
    const allowedFormats = ['jpeg', 'jpg', 'png', 'webp', 'gif']
    if (!metadata.format || !allowedFormats.includes(metadata.format)) {
      return {
        valid: false,
        error: `Invalid format: ${metadata.format}. Allowed: ${allowedFormats.join(', ')}`,
      }
    }

    // Check size (max 50MB)
    const maxSize = 50 * 1024 * 1024
    if (buffer.length > maxSize) {
      return {
        valid: false,
        error: `File too large: ${(buffer.length / (1024 * 1024)).toFixed(2)}MB. Max: 50MB`,
      }
    }

    // Check dimensions (max 10000x10000)
    const maxDimension = 10000
    if (
      !metadata.width ||
      !metadata.height ||
      metadata.width > maxDimension ||
      metadata.height > maxDimension
    ) {
      return {
        valid: false,
        error: `Invalid dimensions: ${metadata.width}x${metadata.height}. Max: ${maxDimension}x${maxDimension}`,
      }
    }

    return {
      valid: true,
      metadata: {
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
        size: buffer.length,
      },
    }
  } catch (error) {
    return {
      valid: false,
      error: `Invalid image: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Get optimal image size based on use case
 */
export function getOptimalSize(useCase: 'gallery' | 'detail' | 'annotation' | 'download'): {
  width: number
  height: number
  quality: number
} {
  const sizes = {
    gallery: { width: 200, height: 200, quality: 80 },
    detail: { width: 800, height: 800, quality: 85 },
    annotation: { width: 2048, height: 2048, quality: 85 },
    download: { width: 4096, height: 4096, quality: 90 },
  }

  return sizes[useCase]
}

/**
 * Log optimization results
 */
export function logOptimization(result: OptimizationResult, fileName: string): void {
  const original = result.metadata.original
  const total =
    result.metadata.large.size + result.metadata.medium.size + result.metadata.thumbnail.size

  console.log('[Image Optimizer]', {
    file: fileName,
    original: `${(original.size / 1024).toFixed(2)}KB (${original.width}x${original.height})`,
    optimized: {
      large: `${(result.metadata.large.size / 1024).toFixed(2)}KB (${result.metadata.large.width}x${result.metadata.large.height})`,
      medium: `${(result.metadata.medium.size / 1024).toFixed(2)}KB (${result.metadata.medium.width}x${result.metadata.medium.height})`,
      thumbnail: `${(result.metadata.thumbnail.size / 1024).toFixed(2)}KB (${result.metadata.thumbnail.width}x${result.metadata.thumbnail.height})`,
    },
    totalOptimized: `${(total / 1024).toFixed(2)}KB`,
    savings: `${result.savings.storageReduction.toFixed(2)}% (${(result.savings.totalSizeReduction / 1024).toFixed(2)}KB)`,
  })
}
