/**
 * Redis-based Rate Limiter
 * Prevents abuse and controls costs
 *
 * Features:
 * - Per-user rate limiting
 * - Different limits for different operations
 * - Redis-backed for distributed systems
 * - Automatic reset on schedule
 * - Graceful degradation when Redis is unavailable (fails OPEN - allows requests)
 */

import Redis from 'ioredis'
import { RateLimiterRedis, RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible'

// Circuit breaker state for Redis connection
interface CircuitBreakerState {
  isOpen: boolean        // true = Redis is down
  failureCount: number   // consecutive failures
  lastFailureTime: number
  lastCheckTime: number
}

const circuitBreaker: CircuitBreakerState = {
  isOpen: false,
  failureCount: 0,
  lastFailureTime: 0,
  lastCheckTime: 0,
}

// Circuit breaker configuration
const CIRCUIT_BREAKER_THRESHOLD = 3        // failures before opening
const CIRCUIT_BREAKER_TIMEOUT = 30000      // 30 seconds before retry
const CIRCUIT_BREAKER_CHECK_INTERVAL = 5000 // 5 seconds between health checks

// Track Redis health status
let redisHealthy = false
let lastHealthCheck = 0

// Lazy-initialized Redis client
let _redis: Redis | null = null

function getRedis(): Redis | null {
  if (_redis) return _redis

  try {
    _redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // Don't auto-retry, we handle it manually
      lazyConnect: true,
    })

    _redis.on('error', (err) => {
      if (redisHealthy) {
        console.warn('[Redis] Connection error:', err.message)
      }
      redisHealthy = false
      circuitBreaker.failureCount++
      circuitBreaker.lastFailureTime = Date.now()

      if (circuitBreaker.failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
        circuitBreaker.isOpen = true
      }
    })

    _redis.on('connect', () => {
      console.log('[Redis] Connected successfully')
      redisHealthy = true
      circuitBreaker.isOpen = false
      circuitBreaker.failureCount = 0
    })

    // Attempt connection but don't block
    _redis.connect().catch(() => {
      redisHealthy = false
    })

    return _redis
  } catch {
    return null
  }
}

/**
 * Check if Redis is healthy with circuit breaker logic
 */
async function isRedisHealthy(): Promise<boolean> {
  const redis = getRedis()
  if (!redis) return false

  const now = Date.now()

  // If circuit is open, check if we should attempt reset
  if (circuitBreaker.isOpen) {
    const timeSinceLastFailure = now - circuitBreaker.lastFailureTime

    // Only check health after timeout period
    if (timeSinceLastFailure < CIRCUIT_BREAKER_TIMEOUT) {
      return false
    }

    // Try to ping Redis to see if it's back
    try {
      await redis.ping()
      circuitBreaker.isOpen = false
      circuitBreaker.failureCount = 0
      redisHealthy = true
      return true
    } catch {
      circuitBreaker.lastFailureTime = now
      return false
    }
  }

  // Rate limit health checks
  if (now - lastHealthCheck < CIRCUIT_BREAKER_CHECK_INTERVAL) {
    return redisHealthy
  }

  lastHealthCheck = now

  try {
    await redis.ping()
    redisHealthy = true
    circuitBreaker.failureCount = 0
    return true
  } catch {
    redisHealthy = false
    circuitBreaker.failureCount++
    circuitBreaker.lastFailureTime = now

    if (circuitBreaker.failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
      circuitBreaker.isOpen = true
    }

    return false
  }
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
  retryAfter?: number // seconds
  circuitOpen?: boolean // indicates if circuit breaker is active
}

/**
 * Lazy-initialized rate limiters
 */
interface LazyLimiter {
  keyPrefix: string
  points: number
  duration: number
}

function createLimiterConfig(keyPrefix: string, points: number, duration: number): LazyLimiter {
  return { keyPrefix, points, duration }
}

// General API requests: 100 per minute
export const apiLimiter = createLimiterConfig('rl:api', 100, 60)

// Photo uploads: 20 per hour (expensive operation)
export const uploadLimiter = createLimiterConfig('rl:upload', 20, 60 * 60)

// Synopsis generation: 10 per hour (expensive operation)
export const synopsisLimiter = createLimiterConfig('rl:synopsis', 10, 60 * 60)

// Presigned URL generation: 500 per hour
export const presignedUrlLimiter = createLimiterConfig('rl:presigned', 500, 60 * 60)

// AI suggestions: 30 per hour
export const aiSuggestionsLimiter = createLimiterConfig('rl:ai', 30, 60 * 60)

// Annotation operations: 200 per hour
export const annotationLimiter = createLimiterConfig('rl:annotation', 200, 60 * 60)

// Cache for instantiated Redis-based limiters
const _redisLimiters = new Map<string, RateLimiterRedis>()
// Fallback in-memory limiters when Redis is unavailable
const _memoryLimiters = new Map<string, RateLimiterMemory>()

function getRedisLimiter(config: LazyLimiter): RateLimiterRedis | null {
  const redis = getRedis()
  if (!redis) return null

  if (!_redisLimiters.has(config.keyPrefix)) {
    _redisLimiters.set(config.keyPrefix, new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: config.keyPrefix,
      points: config.points,
      duration: config.duration,
      blockDuration: 0,
    }))
  }
  return _redisLimiters.get(config.keyPrefix)!
}

function getMemoryLimiter(config: LazyLimiter): RateLimiterMemory {
  if (!_memoryLimiters.has(config.keyPrefix)) {
    _memoryLimiters.set(config.keyPrefix, new RateLimiterMemory({
      keyPrefix: config.keyPrefix,
      points: config.points,
      duration: config.duration,
    }))
  }
  return _memoryLimiters.get(config.keyPrefix)!
}

/**
 * Check rate limit and consume a point
 * Falls back to in-memory rate limiting when Redis is unavailable
 */
export async function checkRateLimit(
  userId: string,
  limiter: LazyLimiter
): Promise<RateLimitResult> {
  const healthy = await isRedisHealthy()

  // Use Redis limiter if available, otherwise fall back to in-memory
  const activeLimiter = healthy
    ? getRedisLimiter(limiter)
    : null

  const effectiveLimiter = activeLimiter || getMemoryLimiter(limiter)

  try {
    const result: RateLimiterRes = await effectiveLimiter.consume(userId)

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

    // Unexpected error - allow request through (fail open)
    console.error('[Rate Limiter] Unexpected error, allowing request:', error)
    return {
      allowed: true,
      remaining: 0,
      resetAt: new Date(),
      circuitOpen: true,
    }
  }
}

/**
 * Check rate limit without consuming a point
 */
export async function getRateLimitStatus(
  userId: string,
  limiter: LazyLimiter
): Promise<RateLimitResult> {
  const healthy = await isRedisHealthy()

  if (!healthy) {
    return {
      allowed: true,
      remaining: limiter.points,
      resetAt: new Date(Date.now() + limiter.duration * 1000),
      circuitOpen: true,
    }
  }

  const redisLimiter = getRedisLimiter(limiter)
  if (!redisLimiter) {
    return {
      allowed: true,
      remaining: limiter.points,
      resetAt: new Date(Date.now() + limiter.duration * 1000),
      circuitOpen: true,
    }
  }

  try {
    const result = await redisLimiter.get(userId)

    if (!result) {
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
      circuitOpen: true,
    }
  }
}

/**
 * Reset rate limit for a user (admin use only)
 */
export async function resetRateLimit(
  userId: string,
  limiter: LazyLimiter
): Promise<void> {
  const healthy = await isRedisHealthy()
  if (!healthy) {
    console.error('[Rate Limiter] Cannot reset - Redis unavailable')
    throw new Error('Redis unavailable - cannot reset rate limit')
  }

  const redisLimiter = getRedisLimiter(limiter)
  if (!redisLimiter) {
    throw new Error('Redis unavailable - cannot reset rate limit')
  }

  try {
    await redisLimiter.delete(userId)
    console.log(`[Rate Limiter] Reset limit for user ${userId}`)
  } catch (error) {
    console.error('[Rate Limiter] Error resetting:', error)
    throw error
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
  circuitOpen: boolean
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
    circuitOpen: circuitBreaker.isOpen,
  }
}

/**
 * Get circuit breaker status for health checks
 */
export function getCircuitBreakerStatus(): {
  isOpen: boolean
  failureCount: number
  redisHealthy: boolean
} {
  return {
    isOpen: circuitBreaker.isOpen,
    failureCount: circuitBreaker.failureCount,
    redisHealthy,
  }
}

/**
 * Middleware helper for Next.js API routes
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.floor(result.resetAt.getTime() / 1000)),
    ...(result.retryAfter
      ? { 'Retry-After': String(result.retryAfter) }
      : {}),
    ...(result.circuitOpen
      ? { 'X-Circuit-Breaker': 'open' }
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
      circuitOpen: result.circuitOpen,
    })
  }
}
