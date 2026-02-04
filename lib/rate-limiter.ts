/**
 * Redis-based Rate Limiter
 * Prevents abuse and controls costs
 *
 * Features:
 * - Per-user rate limiting
 * - Different limits for different operations
 * - Redis-backed for distributed systems
 * - Automatic reset on schedule
 * - Circuit breaker pattern for Redis failures (fails CLOSED for safety)
 */

import Redis from 'ioredis'
import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible'

// Circuit breaker state for Redis connection
interface CircuitBreakerState {
  isOpen: boolean        // true = Redis is down, blocking requests
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
let redisHealthy = true
let lastHealthCheck = 0

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
  retryStrategy: () => null, // Don't auto-retry, we handle it manually
})

redis.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message)
  redisHealthy = false
  circuitBreaker.failureCount++
  circuitBreaker.lastFailureTime = Date.now()
  
  // Open circuit if threshold reached
  if (circuitBreaker.failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
    if (!circuitBreaker.isOpen) {
      console.error('[Circuit Breaker] OPENED - Redis unavailable, blocking rate-limited operations')
    }
    circuitBreaker.isOpen = true
  }
})

redis.on('connect', () => {
  console.log('[Redis] Connected successfully')
  redisHealthy = true
  circuitBreaker.isOpen = false
  circuitBreaker.failureCount = 0
})

redis.on('reconnecting', () => {
  console.log('[Redis] Attempting to reconnect...')
})

/**
 * Check if Redis is healthy with circuit breaker logic
 * Fails CLOSED (returns false) when Redis is down to prevent cost overruns
 */
async function isRedisHealthy(): Promise<boolean> {
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
      console.log('[Circuit Breaker] CLOSED - Redis is back online')
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
  } catch (err) {
    redisHealthy = false
    circuitBreaker.failureCount++
    circuitBreaker.lastFailureTime = now
    
    if (circuitBreaker.failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
      circuitBreaker.isOpen = true
      console.error('[Circuit Breaker] OPENED - Too many Redis failures')
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
 * FAILS CLOSED when Redis is down (blocks expensive operations)
 */
export async function checkRateLimit(
  userId: string,
  limiter: RateLimiterRedis
): Promise<RateLimitResult> {
  // Check circuit breaker first
  const healthy = await isRedisHealthy()
  
  if (!healthy) {
    console.warn('[Rate Limiter] Circuit breaker OPEN - blocking request')
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(Date.now() + CIRCUIT_BREAKER_TIMEOUT),
      retryAfter: Math.ceil(CIRCUIT_BREAKER_TIMEOUT / 1000),
      circuitOpen: true,
    }
  }
  
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

    // Unexpected error - open circuit breaker for safety
    console.error('[Rate Limiter] Unexpected error:', error)
    circuitBreaker.failureCount++
    circuitBreaker.lastFailureTime = Date.now()
    
    if (circuitBreaker.failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
      circuitBreaker.isOpen = true
      console.error('[Circuit Breaker] OPENED due to rate limiter errors')
    }
    
    // Fail closed for safety
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(Date.now() + CIRCUIT_BREAKER_TIMEOUT),
      retryAfter: Math.ceil(CIRCUIT_BREAKER_TIMEOUT / 1000),
      circuitOpen: true,
    }
  }
}

/**
 * Check rate limit without consuming a point
 * Returns "allowed" status even if circuit is open (for status checks)
 */
export async function getRateLimitStatus(
  userId: string,
  limiter: RateLimiterRedis
): Promise<RateLimitResult> {
  // Check circuit breaker
  const healthy = await isRedisHealthy()
  
  if (!healthy) {
    // For status checks, we return optimistic values but mark circuit as open
    return {
      allowed: true, // Allow status checks
      remaining: 0,
      resetAt: new Date(Date.now() + CIRCUIT_BREAKER_TIMEOUT),
      circuitOpen: true,
    }
  }
  
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
    circuitBreaker.failureCount++
    
    return {
      allowed: true, // Allow on error for status checks
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
  limiter: RateLimiterRedis
): Promise<void> {
  // Check circuit breaker
  const healthy = await isRedisHealthy()
  if (!healthy) {
    console.error('[Rate Limiter] Cannot reset - Redis unavailable')
    throw new Error('Redis unavailable - cannot reset rate limit')
  }
  
  try {
    await limiter.delete(userId)
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
    'X-RateLimit-Limit': '100', // Adjust based on limiter
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
