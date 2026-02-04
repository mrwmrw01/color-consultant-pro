import { NextResponse } from "next/server"
import { getAWSConfigStatus, validateS3Connection } from "@/lib/aws-config"
import { getCircuitBreakerStatus } from "@/lib/rate-limiter"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  const checks: {
    database: { status: string; error?: string }
    s3: { status: string; error?: string; bucket?: string | null }
    redis: { status: string; circuitOpen: boolean }
  } = {
    database: { status: "unknown" },
    s3: { status: "unknown" },
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
  
  // Check S3 configuration
  const s3Config = getAWSConfigStatus()
  if (!s3Config.isValid) {
    checks.s3.status = "error"
    checks.s3.error = s3Config.errors.join("; ")
    checks.s3.bucket = s3Config.bucketName
  } else {
    // Try actual S3 connection
    const s3Check = await validateS3Connection()
    checks.s3.status = s3Check.success ? "ok" : "error"
    checks.s3.error = s3Check.error
    checks.s3.bucket = s3Check.bucket
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
