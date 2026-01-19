/**
 * Ralph Wiggum Annotation Suggester
 *
 * Uses Claude AI (Haiku/Opus) to provide intelligent color annotation suggestions
 * Named after Ralph Wiggum for its "helpful but simple" approach
 *
 * Features:
 * - Smart color suggestions based on room type and existing colors
 * - Budget-aware (defaults to Haiku, upgrades to Opus when needed)
 * - Caches suggestions to minimize API costs
 * - Respects user tier limits
 */

import Anthropic from '@anthropic-ai/sdk'
import { LRUCache } from 'lru-cache'
import {
  trackAnthropicUsage,
  checkUserBudget,
  getRecommendedModel,
  ClaudeModel,
  logUsage,
} from './anthropic-cost-tracker'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Cache suggestions for 24 hours
const suggestionCache = new LRUCache<string, ColorSuggestion[]>({
  max: 1000,
  ttl: 24 * 60 * 60 * 1000, // 24 hours
})

export interface ColorSuggestion {
  colorCode: string
  colorName: string
  manufacturer: string
  surfaceType: string
  reason: string
  confidence: 'high' | 'medium' | 'low'
}

export interface SuggestionContext {
  roomType: string // "Kitchen", "Bedroom", "Living Room", etc.
  roomSubtype?: string // "Primary", "Guest", etc.
  existingColors?: Array<{
    colorCode: string
    colorName: string
    surfaceType: string
  }>
  propertyType?: string // "residential", "commercial"
  clientPreferences?: string // Any notes about client preferences
}

/**
 * Generate color annotation suggestions using Claude
 */
export async function generateColorSuggestions(
  userId: string,
  context: SuggestionContext,
  userTier: 'free' | 'pro' | 'enterprise' = 'free'
): Promise<{
  suggestions: ColorSuggestion[]
  cached: boolean
  model: ClaudeModel
  cost: number
}> {
  // Check cache first
  const cacheKey = getCacheKey(context)
  const cached = suggestionCache.get(cacheKey)

  if (cached) {
    console.log('[Ralph Wiggum] Cache hit - $0 spent! 🎉')
    return {
      suggestions: cached,
      cached: true,
      model: 'haiku',
      cost: 0,
    }
  }

  // Check budget
  const budget = await checkUserBudget(userId, userTier)
  if (!budget.allowed) {
    throw new Error(
      `Monthly AI budget exceeded. Used $${budget.currentCost.toFixed(2)} of $${budget.limit.toFixed(2)}`
    )
  }

  // Get recommended model based on budget and tier
  const model = await getRecommendedModel(userId, userTier)

  // Build optimized prompt (minimal tokens)
  const prompt = buildPrompt(context)

  // Call Claude API
  const response = await anthropic.messages.create({
    model: model === 'opus' ? 'claude-opus-4-5-20251101' : 'claude-3-5-haiku-20241022',
    max_tokens: 1000,
    temperature: 0.7,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  // Track usage and cost
  const usage = await trackAnthropicUsage(
    userId,
    response.usage.input_tokens,
    response.usage.output_tokens,
    model
  )

  logUsage(usage, userId)

  // Parse response
  const textContent = response.content.find((c) => c.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  const suggestions = parseResponse(textContent.text)

  // Cache result
  suggestionCache.set(cacheKey, suggestions)

  return {
    suggestions,
    cached: false,
    model,
    cost: usage.cost,
  }
}

/**
 * Build optimized prompt (minimal tokens for cost efficiency)
 */
function buildPrompt(context: SuggestionContext): string {
  let prompt = `You are Ralph Wiggum, a helpful paint color consultant AI. Suggest 3-5 paint colors for a ${context.roomType}`

  if (context.roomSubtype) {
    prompt += ` (${context.roomSubtype})`
  }

  if (context.propertyType) {
    prompt += ` in a ${context.propertyType} property`
  }

  prompt += '.\n\n'

  if (context.existingColors && context.existingColors.length > 0) {
    prompt += 'Existing colors in this room:\n'
    context.existingColors.forEach((color) => {
      prompt += `- ${color.colorName} (${color.colorCode}) on ${color.surfaceType}\n`
    })
    prompt += '\n'
  }

  if (context.clientPreferences) {
    prompt += `Client preferences: ${context.clientPreferences}\n\n`
  }

  prompt += `Return ONLY a JSON array of color suggestions. Each suggestion should have:
- colorCode (e.g., "SW 7005")
- colorName
- manufacturer (Sherwin Williams or Benjamin Moore)
- surfaceType (wall, trim, ceiling, door, etc.)
- reason (brief explanation)
- confidence (high, medium, or low)

Format: [{"colorCode": "...", "colorName": "...", "manufacturer": "...", "surfaceType": "...", "reason": "...", "confidence": "high"}]

Keep it simple and practical. Focus on complementary colors.`

  return prompt
}

/**
 * Parse Claude's response into structured suggestions
 */
function parseResponse(text: string): ColorSuggestion[] {
  try {
    // Extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.error('[Ralph Wiggum] No JSON found in response:', text)
      return []
    }

    const suggestions = JSON.parse(jsonMatch[0]) as ColorSuggestion[]

    // Validate and sanitize
    return suggestions
      .filter((s) => s.colorCode && s.colorName && s.surfaceType)
      .map((s) => ({
        ...s,
        confidence: s.confidence || 'medium',
      }))
  } catch (error) {
    console.error('[Ralph Wiggum] Failed to parse response:', error)
    return []
  }
}

/**
 * Generate cache key from context
 */
function getCacheKey(context: SuggestionContext): string {
  const parts = [
    context.roomType,
    context.roomSubtype || '',
    context.propertyType || '',
    context.existingColors?.map((c) => c.colorCode).join(',') || '',
  ]
  return parts.join(':').toLowerCase()
}

/**
 * Get simple suggestions without AI (fallback when budget is tight)
 */
export function getSimpleSuggestions(context: SuggestionContext): ColorSuggestion[] {
  // Basic color schemes by room type
  const schemes: Record<string, ColorSuggestion[]> = {
    kitchen: [
      {
        colorCode: 'SW 7005',
        colorName: 'Pure White',
        manufacturer: 'Sherwin Williams',
        surfaceType: 'wall',
        reason: 'Classic, clean look for kitchens',
        confidence: 'high',
      },
      {
        colorCode: 'SW 7015',
        colorName: 'Repose Gray',
        manufacturer: 'Sherwin Williams',
        surfaceType: 'wall',
        reason: 'Warm neutral that complements most cabinet colors',
        confidence: 'high',
      },
    ],
    bedroom: [
      {
        colorCode: 'BM OC-17',
        colorName: 'White Dove',
        manufacturer: 'Benjamin Moore',
        surfaceType: 'wall',
        reason: 'Soft, calming white for bedrooms',
        confidence: 'high',
      },
      {
        colorCode: 'SW 6204',
        colorName: 'Sea Salt',
        manufacturer: 'Sherwin Williams',
        surfaceType: 'wall',
        reason: 'Serene blue-green for restful sleep',
        confidence: 'medium',
      },
    ],
    bathroom: [
      {
        colorCode: 'SW 6218',
        colorName: 'Tradewind',
        manufacturer: 'Sherwin Williams',
        surfaceType: 'wall',
        reason: 'Spa-like blue-gray perfect for bathrooms',
        confidence: 'high',
      },
    ],
  }

  const roomKey = context.roomType.toLowerCase()
  return schemes[roomKey] || schemes.bedroom // Default to bedroom colors
}

/**
 * Ralph Wiggum says hello!
 */
export function getRalphQuote(): string {
  const quotes = [
    "I'm helping! 🎨",
    "That's where I saw the color!",
    "My colors taste like colors!",
    "I'm a paint consultant!",
    "Super Nintendo Williams!",
  ]
  return quotes[Math.floor(Math.random() * quotes.length)]
}
