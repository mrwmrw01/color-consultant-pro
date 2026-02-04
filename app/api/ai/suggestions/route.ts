import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  generateColorSuggestions,
  getSimpleSuggestions,
  getRalphQuote,
  type SuggestionContext
} from "@/lib/ralph-wiggum-suggester"
import { checkRateLimit, aiSuggestionsLimiter, getRateLimitHeaders } from "@/lib/rate-limiter"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check rate limit
    const rateLimitResult = await checkRateLimit(session.user.id, aiSuggestionsLimiter)
    if (!rateLimitResult.allowed) {
      const errorMessage = rateLimitResult.circuitOpen
        ? "Service temporarily unavailable. Please try again in a few minutes."
        : "Rate limit exceeded. Please try again later."
      
      return NextResponse.json(
        {
          error: errorMessage,
          retryAfter: rateLimitResult.retryAfter,
          ralphQuote: rateLimitResult.circuitOpen ? "I'm taking a nap! 😴" : "I'm tired! 😴",
          circuitOpen: rateLimitResult.circuitOpen
        },
        {
          status: rateLimitResult.circuitOpen ? 503 : 429,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      )
    }

    // Parse request body
    const body = await request.json() as SuggestionContext

    if (!body.roomType) {
      return NextResponse.json(
        { error: "roomType is required" },
        { status: 400 }
      )
    }

    // Get user tier from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { tier: true }
    })

    const userTier = (user?.tier as 'free' | 'pro' | 'enterprise') || 'free'

    // Check if AI suggestions are enabled
    const aiEnabled = process.env.FEATURE_AI_SUGGESTIONS !== 'false'

    if (!aiEnabled) {
      // Return simple suggestions when AI is disabled
      const suggestions = getSimpleSuggestions(body)
      return NextResponse.json({
        suggestions,
        cached: false,
        model: 'simple',
        cost: 0,
        ralphQuote: getRalphQuote()
      }, {
        headers: getRateLimitHeaders(rateLimitResult)
      })
    }

    // Generate AI suggestions
    try {
      const result = await generateColorSuggestions(
        session.user.id,
        body,
        userTier
      )

      return NextResponse.json({
        suggestions: result.suggestions,
        cached: result.cached,
        model: result.model,
        cost: result.cost,
        ralphQuote: getRalphQuote()
      }, {
        headers: getRateLimitHeaders(rateLimitResult)
      })

    } catch (error: any) {
      // If budget exceeded, return 402 Payment Required
      if (error.message?.includes('budget exceeded')) {
        return NextResponse.json(
          {
            error: error.message,
            suggestions: getSimpleSuggestions(body), // Fallback suggestions
            ralphQuote: "I need more money for my suggestions! 💰"
          },
          { status: 402 }
        )
      }

      // Other errors - return simple suggestions as fallback
      console.error('[AI Suggestions] Error:', error)
      return NextResponse.json({
        suggestions: getSimpleSuggestions(body),
        cached: false,
        model: 'simple',
        cost: 0,
        ralphQuote: "Oops! Here are some basic suggestions instead. 🤷",
        error: "AI temporarily unavailable"
      }, {
        headers: getRateLimitHeaders(rateLimitResult)
      })
    }

  } catch (error) {
    console.error("[AI Suggestions API] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// GET endpoint to check AI availability and user status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user tier and current usage
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { tier: true }
    })

    const userTier = (user?.tier as 'free' | 'pro' | 'enterprise') || 'free'
    const aiEnabled = process.env.FEATURE_AI_SUGGESTIONS !== 'false'

    // Get rate limit status
    const rateLimitStatus = await aiSuggestionsLimiter.get(session.user.id)

    return NextResponse.json({
      enabled: aiEnabled,
      tier: userTier,
      rateLimit: {
        remaining: rateLimitStatus?.remainingPoints || aiSuggestionsLimiter.points,
        total: aiSuggestionsLimiter.points,
        resetIn: rateLimitStatus?.msBeforeNext || 0
      },
      ralphQuote: getRalphQuote()
    })

  } catch (error) {
    console.error("[AI Suggestions Status] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
