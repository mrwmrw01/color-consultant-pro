/**
 * Per-user rate limiting for expensive operations.
 *
 * Redis is optional:
 *   - Without REDIS_URL, limits are kept in memory. That is exact for a single
 *     app instance, which is how this app is deployed.
 *   - With REDIS_URL, limits are shared through Redis. Whenever Redis is not
 *     ready (still connecting at startup, restarting, unreachable) an in-memory
 *     insurance limiter takes over, so an outage degrades to per-instance limits
 *     instead of blocking uploads and photo display. ioredis reconnects on its
 *     own.
 */

import Redis from 'ioredis'
import {
  RateLimiterAbstract,
  RateLimiterMemory,
  RateLimiterRedis,
} from 'rate-limiter-flexible'

const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, {
      enableOfflineQueue: false, // fail fast; the insurance limiter covers outages
      maxRetriesPerRequest: 1,
    })
  : null

if (redis) {
  let lastErrorLog = 0
  redis.on('error', (err) => {
    // ioredis retries every few seconds while Redis is down; log once a minute
    if (Date.now() - lastErrorLog > 60_000) {
      lastErrorLog = Date.now()
      console.error('[Redis] Connection error (using in-memory rate limits):', err.message)
    }
  })
  redis.on('ready', () => console.log('[Redis] Connected'))
}

function createLimiter(keyPrefix: string, points: number, duration: number): RateLimiterAbstract {
  const memory = new RateLimiterMemory({ keyPrefix, points, duration })
  if (!redis) return memory
  return new RateLimiterRedis({
    storeClient: redis,
    keyPrefix,
    points,
    duration,
    rejectIfRedisNotReady: true,
    insuranceLimiter: memory,
  })
}

/**
 * Rate limiters for different operations. Limits can be overridden with the
 * RATE_LIMIT_* environment variables (see .env.example).
 */

function limitFromEnv(name: string, fallback: number): number {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value > 0 ? value : fallback
}

// General API requests: per minute
export const apiLimiter = createLimiter('rl:api', limitFromEnv('RATE_LIMIT_API', 100), 60)

// Photo upload requests per hour (each request can carry many photos)
export const uploadLimiter = createLimiter('rl:upload', limitFromEnv('RATE_LIMIT_UPLOAD', 60), 60 * 60)

// Synopsis generation per hour (expensive operation)
export const synopsisLimiter = createLimiter('rl:synopsis', limitFromEnv('RATE_LIMIT_SYNOPSIS', 10), 60 * 60)

// Photo URL lookups per hour: every photo shown in a gallery or the annotator
// costs one request, so this only guards against runaway clients
export const presignedUrlLimiter = createLimiter('rl:presigned', limitFromEnv('RATE_LIMIT_PRESIGNED_URL', 5000), 60 * 60)

// AI suggestions per hour
export const aiSuggestionsLimiter = createLimiter('rl:ai', limitFromEnv('RATE_LIMIT_AI_SUGGESTIONS', 30), 60 * 60)

// Annotation operations per hour
export const annotationLimiter = createLimiter('rl:annotation', limitFromEnv('RATE_LIMIT_ANNOTATION', 200), 60 * 60)

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
  retryAfter?: number // seconds
}

/**
 * Check rate limit and consume a point
 */
export async function checkRateLimit(
  userId: string,
  limiter: RateLimiterAbstract
): Promise<RateLimitResult> {
  try {
    const result = await limiter.consume(userId)
    return {
      allowed: true,
      remaining: result.remainingPoints,
      resetAt: new Date(Date.now() + result.msBeforeNext),
    }
  } catch (error: any) {
    // Limit exceeded - rate-limiter-flexible rejects with a RateLimiterRes
    if (error && typeof error === 'object' && 'msBeforeNext' in error) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(Date.now() + (error.msBeforeNext || 0)),
        retryAfter: Math.ceil((error.msBeforeNext || 0) / 1000),
      }
    }

    // Store failures are absorbed by the insurance limiter; anything else is a
    // bug in the limiter, which should not lock users out of their photos
    console.error('[Rate Limiter] Unexpected error:', error)
    return { allowed: true, remaining: 0, resetAt: new Date() }
  }
}

/**
 * Rate limiter state for health checks
 */
export function getRateLimiterStatus(): { store: 'memory' | 'redis'; redisStatus?: string } {
  return redis ? { store: 'redis', redisStatus: redis.status } : { store: 'memory' }
}

/**
 * Response headers for a rate-limited request
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.floor(result.resetAt.getTime() / 1000)),
    ...(result.retryAfter ? { 'Retry-After': String(result.retryAfter) } : {}),
  }
}
