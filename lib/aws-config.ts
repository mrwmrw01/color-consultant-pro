
import { S3Client } from "@aws-sdk/client-s3"

// Cache for validated config
let validatedConfig: {
  bucketName: string
  folderPrefix: string
  region: string
  isValid: boolean
  errors: string[]
} | null = null

/**
 * Validate AWS configuration at startup
 * Fails fast with clear error messages
 */
function validateAWSConfig() {
  if (validatedConfig) {
    return validatedConfig
  }

  const errors: string[] = []
  
  // Required: AWS_BUCKET_NAME
  const bucketName = process.env.AWS_BUCKET_NAME
  if (!bucketName) {
    errors.push(
      'AWS_BUCKET_NAME is required but not set.\n' +
      '  - Set it in your .env file: AWS_BUCKET_NAME=your-bucket-name\n' +
      '  - Or set it as an environment variable'
    )
  }
  
  // Optional but recommended: AWS_REGION
  const region = process.env.AWS_REGION || 'us-east-1'
  if (!process.env.AWS_REGION) {
    console.warn(
      '[AWS Config] AWS_REGION not set, defaulting to us-east-1. ' +
      'Set AWS_REGION in your .env file for better performance.'
    )
  }
  
  // Optional: AWS_FOLDER_PREFIX
  const folderPrefix = process.env.AWS_FOLDER_PREFIX || ""
  
  // Check for AWS credentials (only if not using IAM role)
  const hasAccessKey = !!process.env.AWS_ACCESS_KEY_ID
  const hasSecretKey = !!process.env.AWS_SECRET_ACCESS_KEY
  
  if (hasAccessKey !== hasSecretKey) {
    errors.push(
      'AWS credentials are incomplete.\n' +
      '  - Either set BOTH AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY\n' +
      '  - Or set NEITHER to use IAM role (recommended for EC2)'
    )
  }
  
  // If we have errors, log them but don't throw yet (allow for IAM role fallback)
  if (errors.length > 0) {
    console.error('[AWS Config] Configuration errors:')
    errors.forEach((err, i) => console.error(`  ${i + 1}. ${err}`))
  }
  
  validatedConfig = {
    bucketName: bucketName || '',
    folderPrefix,
    region,
    isValid: errors.length === 0 && !!bucketName,
    errors
  }
  
  return validatedConfig
}

/**
 * Get S3 bucket configuration
 * @throws Error if AWS_BUCKET_NAME is not set
 */
export function getBucketConfig() {
  const config = validateAWSConfig()
  
  if (!config.isValid) {
    throw new Error(
      'AWS S3 configuration is invalid.\n' +
      config.errors.join('\n') +
      '\n\nTo fix this:\n' +
      '1. Copy .env.example to .env: cp .env.example .env\n' +
      '2. Edit .env and set AWS_BUCKET_NAME=your-bucket-name\n' +
      '3. Restart the application\n\n' +
      'For AWS deployment, ensure the EC2 instance has an IAM role with S3 access.'
    )
  }
  
  return {
    bucketName: config.bucketName,
    folderPrefix: config.folderPrefix
  }
}

/**
 * Get AWS region
 */
export function getAWSRegion(): string {
  const config = validateAWSConfig()
  return config.region
}

/**
 * Check if AWS config is valid without throwing
 */
export function isAWSConfigValid(): boolean {
  try {
    const config = validateAWSConfig()
    return config.isValid
  } catch {
    return false
  }
}

/**
 * Get AWS configuration status for health checks
 */
export function getAWSConfigStatus(): {
  isValid: boolean
  bucketName: string | null
  region: string
  errors: string[]
  usingIAM: boolean
} {
  const config = validateAWSConfig()
  const hasAccessKey = !!process.env.AWS_ACCESS_KEY_ID
  const hasSecretKey = !!process.env.AWS_SECRET_ACCESS_KEY
  
  return {
    isValid: config.isValid,
    bucketName: config.bucketName || null,
    region: config.region,
    errors: config.errors,
    usingIAM: !hasAccessKey && !hasSecretKey
  }
}

/**
 * Create S3 client with proper configuration
 * @throws Error if AWS configuration is invalid
 */
export function createS3Client() {
  const config = validateAWSConfig()
  
  // Validate before creating client
  if (!config.isValid) {
    throw new Error(
      'Cannot create S3 client: AWS_BUCKET_NAME is required.\n' +
      'Set AWS_BUCKET_NAME in your environment or .env file.'
    )
  }
  
  const clientConfig: { region: string; credentials?: { accessKeyId: string; secretAccessKey: string } } = {
    region: config.region
  }
  
  // Only add explicit credentials if provided
  // Otherwise, AWS SDK will use IAM role (recommended for EC2)
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    clientConfig.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  }
  
  return new S3Client(clientConfig)
}

/**
 * Validate S3 bucket exists and is accessible
 * Call this during app startup for early error detection
 */
export async function validateS3Connection(): Promise<{
  success: boolean
  error?: string
  bucket?: string
}> {
  try {
    const { bucketName } = getBucketConfig()
    const s3Client = createS3Client()
    
    // Try to list objects (minimal operation to test connectivity)
    const { ListObjectsV2Command } = await import("@aws-sdk/client-s3")
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      MaxKeys: 1
    })
    
    await s3Client.send(command)
    
    console.log(`[AWS S3] Successfully connected to bucket: ${bucketName}`)
    return { success: true, bucket: bucketName }
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error'
    console.error('[AWS S3] Connection validation failed:', errorMessage)
    
    return {
      success: false,
      error: errorMessage,
      bucket: process.env.AWS_BUCKET_NAME
    }
  }
}
