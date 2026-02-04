
import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand 
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { createS3Client, getBucketConfig } from "./aws-config"

// Lazy initialization - will throw on first use if config is invalid
let s3ClientInstance: S3Client | null = null
let bucketConfigInstance: { bucketName: string; folderPrefix: string } | null = null

/**
 * Get S3 client (lazy initialization with validation)
 */
function getS3Client(): S3Client {
  if (!s3ClientInstance) {
    s3ClientInstance = createS3Client()
  }
  return s3ClientInstance
}

/**
 * Get bucket config (lazy initialization with validation)
 */
function getBucketConfigCached() {
  if (!bucketConfigInstance) {
    bucketConfigInstance = getBucketConfig()
  }
  return bucketConfigInstance
}

/**
 * Clear cached instances (useful for testing)
 */
export function clearS3Cache() {
  s3ClientInstance = null
  bucketConfigInstance = null
}

class S3UploadError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: Error
  ) {
    super(message)
    this.name = 'S3UploadError'
  }
}

/**
 * Upload a file to S3
 * @throws S3UploadError if upload fails
 */
export async function uploadFile(buffer: Buffer, fileName: string): Promise<string> {
  try {
    const s3Client = getS3Client()
    const { bucketName, folderPrefix } = getBucketConfigCached()
    const key = `${folderPrefix}uploads/${Date.now()}-${fileName}`
    
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: getContentType(fileName)
    })

    await s3Client.send(command)
    console.log(`[S3] Uploaded: ${key} (${(buffer.length / 1024).toFixed(2)}KB)`)
    return key
  } catch (error: any) {
    console.error('[S3] Upload failed:', error)
    
    // Provide helpful error messages for common issues
    if (error.name === 'NoSuchBucket') {
      throw new S3UploadError(
        `S3 bucket "${process.env.AWS_BUCKET_NAME}" does not exist.`,
        'BUCKET_NOT_FOUND',
        error
      )
    }
    
    if (error.name === 'AccessDenied' || error.name === '403') {
      throw new S3UploadError(
        'Access denied to S3 bucket. Check IAM permissions.',
        'ACCESS_DENIED',
        error
      )
    }
    
    if (error.name === 'CredentialsProviderError') {
      throw new S3UploadError(
        'AWS credentials not found. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY, or attach an IAM role.',
        'CREDENTIALS_ERROR',
        error
      )
    }
    
    throw new S3UploadError(
      `Upload failed: ${error.message || 'Unknown error'}`,
      'UPLOAD_FAILED',
      error
    )
  }
}

/**
 * Generate a presigned URL for downloading a file
 */
export async function downloadFile(key: string): Promise<string> {
  try {
    const s3Client = getS3Client()
    const { bucketName } = getBucketConfigCached()
    
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key
    })

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
    return signedUrl
  } catch (error: any) {
    console.error('[S3] Failed to generate download URL:', error)
    throw new Error(`Failed to generate download URL: ${error.message}`)
  }
}

/**
 * Get file buffer from S3
 */
export async function getFileBuffer(key: string): Promise<Buffer> {
  try {
    const s3Client = getS3Client()
    const { bucketName } = getBucketConfigCached()
    
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key
    })

    const response = await s3Client.send(command)
    
    // Convert stream to buffer
    const stream = response.Body as any
    const chunks: Uint8Array[] = []
    
    for await (const chunk of stream) {
      chunks.push(chunk)
    }
    
    return Buffer.concat(chunks)
  } catch (error: any) {
    console.error('[S3] Failed to get file:', error)
    throw new Error(`Failed to get file: ${error.message}`)
  }
}

/**
 * Delete a file from S3
 */
export async function deleteFile(key: string): Promise<boolean> {
  try {
    const s3Client = getS3Client()
    const { bucketName } = getBucketConfigCached()
    
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key
    })

    await s3Client.send(command)
    console.log(`[S3] Deleted: ${key}`)
    return true
  } catch (error: any) {
    console.error('[S3] Failed to delete file:', error)
    // Don't throw on delete failures - just log and return false
    return false
  }
}

/**
 * Rename a file in S3 (copy + delete)
 */
export async function renameFile(oldKey: string, newKey: string): Promise<string> {
  try {
    const downloadUrl = await downloadFile(oldKey)
    
    // Download the file
    const response = await fetch(downloadUrl)
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`)
    }
    
    const buffer = Buffer.from(await response.arrayBuffer())
    
    // Upload with new key
    const uploadedKey = await uploadFile(buffer, newKey.split('/').pop() || 'renamed-file')
    
    // Delete old file
    await deleteFile(oldKey)
    
    return uploadedKey
  } catch (error: any) {
    console.error('[S3] Failed to rename file:', error)
    throw new Error(`Failed to rename file: ${error.message}`)
  }
}

function getContentType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase()
  
  const contentTypes: { [key: string]: string } = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'pdf': 'application/pdf'
  }
  
  return contentTypes[ext || ''] || 'application/octet-stream'
}
