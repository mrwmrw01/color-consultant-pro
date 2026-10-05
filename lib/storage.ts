import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { createS3Client, getBucketConfig } from "./aws-config"
import { promises as fs } from "fs"
import path from "path"

/**
 * Storage layer with pluggable drivers.
 *
 *   STORAGE_DRIVER=s3     (default) AWS S3 or any S3-compatible endpoint
 *                          (Cloudflare R2, Backblaze B2, MinIO — set
 *                          S3_ENDPOINT_URL + S3_FORCE_PATH_STYLE)
 *   STORAGE_DRIVER=local  filesystem storage under LOCAL_UPLOADS_DIR
 *                          (zero cloud dependencies; photos served via
 *                          /api/files?key=...)
 *
 * This module exists so the app is fully runnable without an AWS account.
 */

export type StorageDriverName = "s3" | "local"

export function getStorageDriverName(): StorageDriverName {
  const driver = (process.env.STORAGE_DRIVER || "s3").toLowerCase()
  return driver === "local" ? "local" : "s3"
}

export function getLocalUploadsDir(): string {
  return (
    process.env.LOCAL_UPLOADS_DIR ||
    path.join(process.cwd(), "storage", "uploads")
  )
}

export function getStoragePrefix(): string {
  if (getStorageDriverName() === "local") {
    return "uploads/"
  }
  const { folderPrefix } = getBucketConfig()
  return `${folderPrefix}uploads/`
}

let s3ClientInstance: S3Client | null = null

function getS3Client(): S3Client {
  if (!s3ClientInstance) {
    s3ClientInstance = createS3Client()
  }
  return s3ClientInstance
}

/** Resolve a storage key to a safe absolute path (local driver only). */
function resolveLocalPath(key: string): string {
  const dir = path.resolve(getLocalUploadsDir())
  const target = path.resolve(dir, key)
  if (!target.startsWith(dir + path.sep)) {
    throw new Error(`Invalid storage key: ${key}`)
  }
  return target
}

async function ensureLocalDir(key: string): Promise<void> {
  const dir = path.dirname(resolveLocalPath(key))
  await fs.mkdir(dir, { recursive: true })
}

/**
 * Write an object. Returns the storage key (for local driver the key is the
 * path relative to LOCAL_UPLOADS_DIR).
 */
export async function putObject(
  key: string,
  buffer: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  if (getStorageDriverName() === "local") {
    const target = resolveLocalPath(key)
    await ensureLocalDir(key)
    await fs.writeFile(target, buffer)
    return key
  }

  const { bucketName } = getBucketConfig()
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  })
  await getS3Client().send(command)
  return key
}

/**
 * Public URL for a stored object. S3: presigned GET URL.
 * Local: relative /api/files URL (same-origin, session-guarded).
 */
export async function getFileUrl(key: string): Promise<string> {
  if (getStorageDriverName() === "local") {
    return `/api/files?key=${encodeURIComponent(key)}`
  }

  const { bucketName } = getBucketConfig()
  const command = new GetObjectCommand({ Bucket: bucketName, Key: key })
  return getSignedUrl(getS3Client(), command, { expiresIn: 3600 })
}

export async function getFileBuffer(key: string): Promise<Buffer> {
  if (getStorageDriverName() === "local") {
    return fs.readFile(resolveLocalPath(key))
  }

  const { bucketName } = getBucketConfig()
  const command = new GetObjectCommand({ Bucket: bucketName, Key: key })
  const response = await getS3Client().send(command)
  const stream = response.Body as any
  const chunks: Uint8Array[] = []
  for await (const chunk of stream) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

export async function deleteFile(key: string): Promise<boolean> {
  if (!key) return false
  try {
    if (getStorageDriverName() === "local") {
      await fs.unlink(resolveLocalPath(key))
      return true
    }

    const { bucketName } = getBucketConfig()
    const command = new DeleteObjectCommand({ Bucket: bucketName, Key: key })
    await getS3Client().send(command)
    return true
  } catch (error: any) {
    console.error(`[Storage] Failed to delete ${key}:`, error?.message || error)
    return false
  }
}

export function getContentType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase()
  const contentTypes: { [key: string]: string } = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    pdf: "application/pdf",
  }
  return contentTypes[ext || ""] || "application/octet-stream"
}
