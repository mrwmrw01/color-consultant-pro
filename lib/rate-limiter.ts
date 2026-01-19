/**
 * Redis-based Rate Limiter
 * Prevents abuse and controls costs
 *
 * Features:
 * - Per-user rate limiting
 * - Different limits for different operations
 * - Redis-backed for distributed systems
 * - Automatic reset on schedule
 */

import Redis from 'ioredis'
import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible'

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
})

redis.on('error', (err) => {
  console.error('[Redis] Connection error:', err)
})

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
  retryAfter?: number // seconds
}

/**
 * Rate limiters for different operations
 */

// General API requests: 100 per minute
export const apiLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:api',
  points: 100, // Number of requests
  duration: 60, // Per 60 seconds
  blockDuration: 0, // Don't block, just reject
})

// Photo uploads: 20 per hour (expensive operation)
export const uploadLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:upload',
  points: 20,
  duration: 60 * 60, // Per hour
  blockDuration: 0,
})

// Synopsis generation: 10 per hour (expensive operation)
export const synopsisLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:synopsis',
  points: 10,
  duration: 60 * 60,
  blockDuration: 0,
})

// Presigned URL generation: 500 per hour
export const presignedUrlLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:presigned',
  points: 500,
  duration: 60 * 60,
  blockDuration: 0,
})

// AI suggestions: 30 per hour
export const aiSuggestionsLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:ai',
  points: 30,
  duration: 60 * 60,
  blockDuration: 0,
})

// Annotation operations: 200 per hour
export const annotationLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:annotation',
  points: 200,
  duration: 60 * 60,
  blockDuration: 0,
})

/**
 * Check rate limit and consume a point
 */
export async function checkRateLimit(
  userId: string,
  limiter: RateLimiterRedis
): Promise<RateLimitResult> {
  try {
    const result: RateLimiterRes = await limiter.consume(userId)

    return {
      allowed: true,
      remaining: result.remainingPoints,
      resetAt: new Date(Date.now() + result.msBeforeNext),
    }
  } catch (error: any) {
    // Rate limit exceeded - rate-limiter-flexible throws RateLimiterRes on rejection
    if (error && typeof error === 'object' && 'msBeforeNext' in error) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(Date.now() + (error.msBeforeNext || 0)),
        retryAfter: Math.ceil((error.msBeforeNext || 0) / 1000),
      }
    }

    // Redis error or other issue - fail open (allow request)
    console.error('[Rate Limiter] Error:', error)
    return {
      allowed: true,
      remaining: 0,
      resetAt: new Date(),
    }
  }
}

/**
 * Check rate limit without consuming a point
 */
export async function getRateLimitStatus(
  userId: string,
  limiter: RateLimiterRedis
): Promise<RateLimitResult> {
  try {
    const result = await limiter.get(userId)

    if (!result) {
      // No usage yet
      return {
        allowed: true,
        remaining: limiter.points,
        resetAt: new Date(Date.now() + limiter.duration * 1000),
      }
    }

    return {
      allowed: result.remainingPoints > 0,
      remaining: result.remainingPoints,
      resetAt: new Date(Date.now() + result.msBeforeNext),
    }
  } catch (error) {
    console.error('[Rate Limiter] Error getting status:', error)
    return {
      allowed: true,
      remaining: 0,
      resetAt: new Date(),
    }
  }
}

/**
 * Reset rate limit for a user (admin use only)
 */
export async function resetRateLimit(
  userId: string,
  limiter: RateLimiterRedis
): Promise<void> {
  try {
    await limiter.delete(userId)
    console.log(`[Rate Limiter] Reset limit for user ${userId}`)
  } catch (error) {
    console.error('[Rate Limiter] Error resetting:', error)
  }
}

/**
 * Get all rate limit statuses for a user
 */
export async function getAllRateLimitStatuses(userId: string): Promise<{
  api: RateLimitResult
  upload: RateLimitResult
  synopsis: RateLimitResult
  presignedUrl: RateLimitResult
  aiSuggestions: RateLimitResult
  annotation: RateLimitResult
}> {
  const [api, upload, synopsis, presignedUrl, aiSuggestions, annotation] = await Promise.all([
    getRateLimitStatus(userId, apiLimiter),
    getRateLimitStatus(userId, uploadLimiter),
    getRateLimitStatus(userId, synopsisLimiter),
    getRateLimitStatus(userId, presignedUrlLimiter),
    getRateLimitStatus(userId, aiSuggestionsLimiter),
    getRateLimitStatus(userId, annotationLimiter),
  ])

  return {
    api,
    upload,
    synopsis,
    presignedUrl,
    aiSuggestions,
    annotation,
  }
}

/**
 * Middleware helper for Next.js API routes
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': '100', // Adjust based on limiter
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.floor(result.resetAt.getTime() / 1000)),
    ...(result.retryAfter
      ? { 'Retry-After': String(result.retryAfter) }
      : {}),
  }
}

/**
 * Log rate limit event
 */
export function logRateLimit(
  userId: string,
  operation: string,
  result: RateLimitResult
): void {
  if (!result.allowed) {
    console.warn('[Rate Limiter] BLOCKED', {
      userId,
      operation,
      remaining: result.remaining,
      resetAt: result.resetAt.toISOString(),
    })
  }
}
