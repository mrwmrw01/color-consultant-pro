
import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand 
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { createS3Client, getBucketConfig } from "./aws-config"

const s3Client = createS3Client()
const { bucketName, folderPrefix } = getBucketConfig()

export async function uploadFile(buffer: Buffer, fileName: string) {
  const key = `${folderPrefix}uploads/${Date.now()}-${fileName}`
  
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: getContentType(fileName)
  })

  await s3Client.send(command)
  return key
}

export async function downloadFile(key: string) {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key
  })

  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
  return signedUrl
}

export async function getFileBuffer(key: string): Promise<Buffer> {
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
}

export async function deleteFile(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key
  })

  await s3Client.send(command)
  return true
}

export async function renameFile(oldKey: string, newKey: string) {
  // S3 doesn't have rename, so we copy and delete
  const downloadUrl = await downloadFile(oldKey)
  
  // Download the file
  const response = await fetch(downloadUrl)
  const buffer = Buffer.from(await response.arrayBuffer())
  
  // Upload with new key
  await uploadFile(buffer, newKey.split('/').pop() || 'renamed-file')
  
  // Delete old file
  await deleteFile(oldKey)
  
  return newKey
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
