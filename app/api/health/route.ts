import { NextResponse } from "next/server"
import { getAWSConfigStatus, validateS3Connection } from "@/lib/aws-config"
import { getCircuitBreakerStatus } from "@/lib/rate-limiter"
import { prisma } from "@/lib/db"
import { getStorageDriverName, getLocalUploadsDir } from "@/lib/storage"
import { promises as fs } from "fs"

export const dynamic = "force-dynamic"

export async function GET() {
  const checks: {
    database: { status: string; error?: string }
    storage: { status: string; error?: string; bucket?: string | null; driver?: string }
    redis: { status: string; circuitOpen: boolean }
  } = {
    database: { status: "unknown" },
    storage: { status: "unknown", driver: getStorageDriverName() },
    redis: { status: "unknown", circuitOpen: false }
  }
  
  // Check database
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database.status = "ok"
  } catch (error: any) {
    checks.database.status = "error"
    checks.database.error = error.message
  }
  
  // Check storage driver
  if (getStorageDriverName() === "local") {
    try {
      await fs.mkdir(getLocalUploadsDir(), { recursive: true })
      const probe = `${getLocalUploadsDir()}/.healthcheck`
      await fs.writeFile(probe, new Date().toISOString())
      await fs.unlink(probe)
      checks.storage.status = "ok"
      checks.storage.bucket = getLocalUploadsDir()
    } catch (error: any) {
      checks.storage.status = "error"
      checks.storage.error = error.message
      checks.storage.bucket = getLocalUploadsDir()
    }
  } else {
    const s3Config = getAWSConfigStatus()
    if (!s3Config.isValid) {
      checks.storage.status = "error"
      checks.storage.error = s3Config.errors.join("; ")
      checks.storage.bucket = s3Config.bucketName
    } else {
      const s3Check = await validateS3Connection()
      checks.storage.status = s3Check.success ? "ok" : "error"
      checks.storage.error = s3Check.error
      checks.storage.bucket = s3Check.bucket
    }
  }
  
  // Check Redis circuit breaker
  const circuitStatus = getCircuitBreakerStatus()
  checks.redis.status = circuitStatus.isOpen ? "degraded" : "ok"
  checks.redis.circuitOpen = circuitStatus.isOpen
  
  // Determine overall status
  const allOk = Object.values(checks).every(c => c.status === "ok")
  const hasErrors = Object.values(checks).some(c => c.status === "error")
  
  const status = hasErrors ? "error" : allOk ? "ok" : "degraded"
  const statusCode = hasErrors ? 503 : allOk ? 200 : 200
  
  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "unknown",
      checks
    },
    { status: statusCode }
  )
}
