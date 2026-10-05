/**
 * Backwards-compatible storage helpers.
 *
 * Historically this module spoke only to AWS S3. Since the AWS account was
 * deleted, all functions now dispatch through lib/storage.ts, which supports
 * a local-disk driver and S3-compatible endpoints (R2/B2/MinIO) as well as S3.
 * Existing imports across the codebase keep working unchanged.
 */

import {
  putObject,
  getFileUrl,
  getFileBuffer as storageGetFileBuffer,
  deleteFile as storageDeleteFile,
  getContentType,
  getStoragePrefix,
} from "./storage"

/**
 * Upload a file and return its storage key.
 */
export async function uploadFile(
  buffer: Buffer,
  fileName: string
): Promise<string> {
  const key = `${getStoragePrefix()}${Date.now()}-${fileName}`
  try {
    return await putObject(key, buffer, getContentType(fileName))
  } catch (error: any) {
    console.error("[Storage] Upload failed:", error?.message || error)
    throw new Error(`Upload failed: ${error?.message || "Unknown error"}`)
  }
}

/**
 * Generate a public URL for downloading a file.
 */
export async function downloadFile(key: string): Promise<string> {
  try {
    return await getFileUrl(key)
  } catch (error: any) {
    console.error(
      "[Storage] Failed to generate download URL:",
      error?.message || error
    )
    throw new Error(
      `Failed to generate download URL: ${error?.message || "Unknown error"}`
    )
  }
}

/**
 * Get file buffer from storage.
 */
export async function getFileBuffer(key: string): Promise<Buffer> {
  try {
    return await storageGetFileBuffer(key)
  } catch (error: any) {
    console.error("[Storage] Failed to get file:", error?.message || error)
    throw new Error(`Failed to get file: ${error?.message || "Unknown error"}`)
  }
}

/**
 * Delete a file. Never throws — returns true/false.
 */
export async function deleteFile(key: string): Promise<boolean> {
  return storageDeleteFile(key)
}

/**
 * Rename a file (copy + delete).
 */
export async function renameFile(
  oldKey: string,
  newKey: string
): Promise<string> {
  try {
    const buffer = await storageGetFileBuffer(oldKey)
    const uploadedKey = await uploadFile(
      buffer,
      newKey.split("/").pop() || "renamed-file"
    )
    await storageDeleteFile(oldKey)
    return uploadedKey
  } catch (error: any) {
    console.error("[Storage] Failed to rename file:", error?.message || error)
    throw new Error(
      `Failed to rename file: ${error?.message || "Unknown error"}`
    )
  }
}

/**
 * Clear cached instances (no-op for local driver; kept for API compatibility).
 */
export function clearS3Cache() {
  // Driver instances are lazily created module-level; nothing to clear.
}
