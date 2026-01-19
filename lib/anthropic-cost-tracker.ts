/**
 * Anthropic API Cost Tracker
 * Tracks usage and costs for Claude Haiku and Opus models
 *
 * Pricing (as of Jan 2026):
 * - Claude 3.5 Haiku: $0.80/MTok input, $4.00/MTok output
 * - Claude Opus 4.5: $15.00/MTok input, $75.00/MTok output
 */

import { Redis } from 'ioredis'

// Initialize Redis connection
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

export type ClaudeModel = 'haiku' | 'opus'

export interface ModelPricing {
  inputCostPerMToken: number
  outputCostPerMToken: number
}

export const MODEL_PRICING: Record<ClaudeModel, ModelPricing> = {
  haiku: {
    inputCostPerMToken: 0.80,   // $0.80 per million tokens
    outputCostPerMToken: 4.00,  // $4.00 per million tokens
  },
  opus: {
    inputCostPerMToken: 15.00,   // $15.00 per million tokens
    outputCostPerMToken: 75.00,  // $75.00 per million tokens
  },
}

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  model: ClaudeModel
  timestamp: Date
  cost: number
}

export interface UserCostSummary {
  userId: string
  currentMonth: {
    totalCost: number
    totalInputTokens: number
    totalOutputTokens: number
    requestCount: number
    byModel: {
      haiku: { cost: number; tokens: number; requests: number }
      opus: { cost: number; tokens: number; requests: number }
    }
  }
  daily: {
    date: string
    cost: number
    requests: number
  }[]
}

/**
 * Calculate cost for token usage
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: ClaudeModel
): number {
  const pricing = MODEL_PRICING[model]
  const inputCost = (inputTokens / 1_000_000) * pricing.inputCostPerMToken
  const outputCost = (outputTokens / 1_000_000) * pricing.outputCostPerMToken
  return inputCost + outputCost
}

/**
 * Track API usage for a user
 */
export async function trackAnthropicUsage(
  userId: string,
  inputTokens: number,
  outputTokens: number,
  model: ClaudeModel
): Promise<TokenUsage> {
  const cost = calculateCost(inputTokens, outputTokens, model)
  const timestamp = new Date()
  const monthKey = timestamp.toISOString().slice(0, 7) // YYYY-MM
  const dateKey = timestamp.toISOString().slice(0, 10) // YYYY-MM-DD

  // Track monthly totals
  const monthlyKey = `ai:usage:${userId}:${monthKey}`
  await redis.hincrby(monthlyKey, 'inputTokens', inputTokens)
  await redis.hincrby(monthlyKey, 'outputTokens', outputTokens)
  await redis.hincrby(monthlyKey, 'requests', 1)
  await redis.hincrbyfloat(monthlyKey, 'cost', cost)
  await redis.hincrby(monthlyKey, `${model}:tokens`, inputTokens + outputTokens)
  await redis.hincrbyfloat(monthlyKey, `${model}:cost`, cost)
  await redis.hincrby(monthlyKey, `${model}:requests`, 1)
  await redis.expire(monthlyKey, 60 * 60 * 24 * 90) // 90 days

  // Track daily totals
  const dailyKey = `ai:usage:${userId}:${dateKey}`
  await redis.hincrby(dailyKey, 'requests', 1)
  await redis.hincrbyfloat(dailyKey, 'cost', cost)
  await redis.expire(dailyKey, 60 * 60 * 24 * 90) // 90 days

  // Track global monthly totals (for circuit breaker)
  const globalMonthlyKey = `ai:usage:global:${monthKey}`
  await redis.hincrbyfloat(globalMonthlyKey, 'cost', cost)
  await redis.hincrby(globalMonthlyKey, 'requests', 1)
  await redis.expire(globalMonthlyKey, 60 * 60 * 24 * 90)

  // Track global daily totals (for alerts)
  const globalDailyKey = `ai:usage:global:${dateKey}`
  await redis.hincrbyfloat(globalDailyKey, 'cost', cost)
  await redis.hincrby(globalDailyKey, 'requests', 1)
  await redis.expire(globalDailyKey, 60 * 60 * 24 * 90)

  return {
    inputTokens,
    outputTokens,
    model,
    timestamp,
    cost,
  }
}

/**
 * Get user's cost summary for current month
 */
export async function getUserCostSummary(userId: string): Promise<UserCostSummary> {
  const now = new Date()
  const monthKey = now.toISOString().slice(0, 7) // YYYY-MM
  const monthlyKey = `ai:usage:${userId}:${monthKey}`

  const monthlyData = await redis.hgetall(monthlyKey)

  // Get last 30 days of daily data
  const dailyData: { date: string; cost: number; requests: number }[] = []
  for (let i = 0; i < 30; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const dateKey = date.toISOString().slice(0, 10)
    const dailyKey = `ai:usage:${userId}:${dateKey}`
    const data = await redis.hgetall(dailyKey)

    if (data.cost) {
      dailyData.push({
        date: dateKey,
        cost: parseFloat(data.cost || '0'),
        requests: parseInt(data.requests || '0', 10),
      })
    }
  }

  return {
    userId,
    currentMonth: {
      totalCost: parseFloat(monthlyData.cost || '0'),
      totalInputTokens: parseInt(monthlyData.inputTokens || '0', 10),
      totalOutputTokens: parseInt(monthlyData.outputTokens || '0', 10),
      requestCount: parseInt(monthlyData.requests || '0', 10),
      byModel: {
        haiku: {
          cost: parseFloat(monthlyData['haiku:cost'] || '0'),
          tokens: parseInt(monthlyData['haiku:tokens'] || '0', 10),
          requests: parseInt(monthlyData['haiku:requests'] || '0', 10),
        },
        opus: {
          cost: parseFloat(monthlyData['opus:cost'] || '0'),
          tokens: parseInt(monthlyData['opus:tokens'] || '0', 10),
          requests: parseInt(monthlyData['opus:requests'] || '0', 10),
        },
      },
    },
    daily: dailyData,
  }
}

/**
 * Get global cost summary (all users)
 */
export async function getGlobalCostSummary(): Promise<{
  monthly: { cost: number; requests: number }
  daily: { cost: number; requests: number }
}> {
  const now = new Date()
  const monthKey = now.toISOString().slice(0, 7)
  const dateKey = now.toISOString().slice(0, 10)

  const monthlyKey = `ai:usage:global:${monthKey}`
  const dailyKey = `ai:usage:global:${dateKey}`

  const [monthlyData, dailyData] = await Promise.all([
    redis.hgetall(monthlyKey),
    redis.hgetall(dailyKey),
  ])

  return {
    monthly: {
      cost: parseFloat(monthlyData.cost || '0'),
      requests: parseInt(monthlyData.requests || '0', 10),
    },
    daily: {
      cost: parseFloat(dailyData.cost || '0'),
      requests: parseInt(dailyData.requests || '0', 10),
    },
  }
}

/**
 * Check if user has exceeded their budget
 */
export async function checkUserBudget(
  userId: string,
  tier: 'free' | 'pro' | 'enterprise' = 'free'
): Promise<{
  allowed: boolean
  currentCost: number
  limit: number
  remaining: number
  percentUsed: number
}> {
  const MONTHLY_LIMITS = {
    free: 5,        // $5/month (~6K Haiku requests or 330 Opus requests)
    pro: 50,        // $50/month
    enterprise: 500, // $500/month
  }

  const limit = MONTHLY_LIMITS[tier]
  const summary = await getUserCostSummary(userId)
  const currentCost = summary.currentMonth.totalCost

  return {
    allowed: currentCost < limit,
    currentCost,
    limit,
    remaining: Math.max(0, limit - currentCost),
    percentUsed: (currentCost / limit) * 100,
  }
}

/**
 * Get recommended model based on user's budget
 */
export async function getRecommendedModel(
  userId: string,
  tier: 'free' | 'pro' | 'enterprise' = 'free'
): Promise<ClaudeModel> {
  const budget = await checkUserBudget(userId, tier)

  // If over 80% of budget, use Haiku
  if (budget.percentUsed > 80) {
    return 'haiku'
  }

  // Free tier: always use Haiku
  if (tier === 'free') {
    return 'haiku'
  }

  // Pro tier: use Opus for important tasks, Haiku for suggestions
  // Enterprise: default to Opus
  return tier === 'enterprise' ? 'opus' : 'haiku'
}

/**
 * Log usage to console (for debugging)
 */
export function logUsage(usage: TokenUsage, userId: string): void {
  console.log('[Anthropic Usage]', {
    userId,
    model: usage.model,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    cost: `$${usage.cost.toFixed(4)}`,
    timestamp: usage.timestamp.toISOString(),
  })
}
