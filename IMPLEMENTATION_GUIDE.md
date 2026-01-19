# Implementation Guide - Cost Optimizations & Ralph Wiggum

**Date:** January 2026
**Status:** Ready to implement
**Priority:** P0 (High Priority)

---

## Quick Start (15 minutes)

### Step 1: Install Dependencies

```bash
cd color-consultant-pro

# Install new dependencies
npm install sharp ioredis rate-limiter-flexible lru-cache @anthropic-ai/sdk

# Verify installation
npm list sharp ioredis rate-limiter-flexible lru-cache @anthropic-ai/sdk
```

### Step 2: Set Up Redis

**Option A: Local Development (Docker)**
```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

**Option B: Cloud Redis (Recommended for Production)**
- **Upstash** (Free tier: 10K commands/day): https://upstash.com/
- **Redis Cloud** (Free tier: 30MB): https://redis.com/cloud/
- **AWS ElastiCache**: For production with high traffic

Get your Redis URL and add to `.env`:
```bash
REDIS_URL="redis://default:password@your-redis-host:6379"
```

### Step 3: Configure Environment Variables

```bash
# Copy example and edit
cp .env.example .env

# Required: Add Anthropic API key (for Ralph Wiggum)
ANTHROPIC_API_KEY="sk-ant-your-key-here"

# Required: Add Redis URL
REDIS_URL="redis://localhost:6379"

# Recommended: Set cost limits
MONTHLY_COST_LIMIT=500
DAILY_COST_LIMIT=20
```

**Get Anthropic API Key:**
1. Sign up at https://console.anthropic.com/
2. Go to API Keys
3. Create new key
4. Add to `.env`

### Step 4: Verify Installation

```bash
# Test Redis connection
node -e "const Redis = require('ioredis'); const redis = new Redis(process.env.REDIS_URL); redis.ping().then(() => console.log('✅ Redis connected!')).catch(err => console.error('❌ Redis error:', err))"

# Test Sharp (image processing)
node -e "const sharp = require('sharp'); console.log('✅ Sharp version:', sharp.versions)"
```

---

## Implementation Checklist

### Phase 1: Core Infrastructure (Day 1)

- [x] ✅ **Anthropic Cost Tracker** - `lib/anthropic-cost-tracker.ts`
  - Tracks Haiku/Opus usage
  - Monitors monthly budgets
  - Prevents overage

- [x] ✅ **Ralph Wiggum Suggester** - `lib/ralph-wiggum-suggester.ts`
  - AI-powered color suggestions
  - Budget-aware (Haiku default)
  - Caches results (24h)

- [x] ✅ **Image Optimizer** - `lib/image-optimizer.ts`
  - Compresses uploads (70-85% savings)
  - Generates 3 sizes (large, medium, thumbnail)
  - WebP format

- [x] ✅ **S3 URL Cache** - `lib/s3-url-cache.ts`
  - Caches presigned URLs (50 min)
  - 90% reduction in S3 requests
  - Auto-invalidation

- [x] ✅ **Rate Limiter** - `lib/rate-limiter.ts`
  - Redis-based limiting
  - Per-operation limits
  - Prevents abuse

- [x] ✅ **Updated .env.example** - All new variables documented

### Phase 2: API Integration (Day 2)

- [ ] 🔧 **Create Ralph Wiggum API Route**
  - `app/api/ai/suggestions/route.ts`
  - POST endpoint for color suggestions
  - Rate limited and budget-checked

- [ ] 🔧 **Update Photo Upload API**
  - `app/api/photos/upload/route.ts`
  - Integrate image optimizer
  - Generate thumbnails
  - Upload all 3 sizes to S3

- [ ] 🔧 **Update Photo URL API**
  - `app/api/photos/[photoId]/url/route.ts`
  - Use cached presigned URLs
  - Add cache headers

- [ ] 🔧 **Add Rate Limiting Middleware**
  - Apply to all API routes
  - Return 429 with Retry-After header
  - Log blocked requests

### Phase 3: Cost Monitoring (Day 3)

- [ ] 🔧 **Cost Monitoring API**
  - `app/api/admin/costs/route.ts`
  - Real-time cost tracking
  - Daily/monthly summaries
  - Per-user breakdowns

- [ ] 🔧 **Circuit Breaker**
  - `lib/cost-circuit-breaker.ts`
  - Auto-disable features at $500/month
  - Manual reset required
  - Alert notifications

- [ ] 🔧 **Cost Dashboard UI**
  - `app/dashboard/admin/costs/page.tsx`
  - Charts and graphs
  - Cost breakdown by service
  - Projected monthly cost

### Phase 4: UI Integration (Day 4)

- [ ] 🔧 **Add "Get AI Suggestions" Button**
  - In photo annotation interface
  - Shows Ralph Wiggum quote
  - Displays 3-5 color suggestions

- [ ] 🔧 **Show Thumbnail in Galleries**
  - Update photo gallery to use thumbnails
  - Click to load medium size
  - Annotation tool loads large size

- [ ] 🔧 **Rate Limit Feedback**
  - Show remaining requests in UI
  - Toast notification when limited
  - Display reset time

---

## File Integration Points

### 1. Update Photo Upload API

**File:** `app/api/photos/upload/route.ts`

```typescript
import { optimizeImage, logOptimization } from '@/lib/image-optimizer'
import { uploadFile } from '@/lib/s3'
import { checkRateLimit, uploadLimiter } from '@/lib/rate-limiter'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return unauthorized()

  // Rate limit check
  const rateLimit = await checkRateLimit(session.user.id, uploadLimiter)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Upload limit exceeded', retryAfter: rateLimit.retryAfter },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    )
  }

  const formData = await request.formData()
  const files = formData.getAll('files') as File[]
  // ... existing code ...

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer())

    // Optimize image
    const optimized = await optimizeImage(buffer)
    logOptimization(optimized, file.name)

    // Upload all 3 sizes to S3
    const [largePath, mediumPath, thumbnailPath] = await Promise.all([
      uploadFile(optimized.sizes.large, `large_${file.name}`),
      uploadFile(optimized.sizes.medium, `medium_${file.name}`),
      uploadFile(optimized.sizes.thumbnail, `thumb_${file.name}`),
    ])

    // Create photo record with all paths
    const photo = await prisma.photo.create({
      data: {
        filename: `${Date.now()}-${file.name}`,
        originalFilename: file.name,
        cloud_storage_path: largePath,
        medium_path: mediumPath,
        thumbnail_path: thumbnailPath,
        mimeType: 'image/webp',
        size: optimized.metadata.large.size,
        width: optimized.metadata.large.width,
        height: optimized.metadata.large.height,
        projectId,
        roomId: roomId || null,
      },
    })

    uploadedPhotos.push(photo)
  }

  return NextResponse.json({ photos: uploadedPhotos })
}
```

### 2. Create Ralph Wiggum API Route

**File:** `app/api/ai/suggestions/route.ts` (NEW FILE)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { generateColorSuggestions } from '@/lib/ralph-wiggum-suggester'
import { checkRateLimit, aiSuggestionsLimiter, getRateLimitHeaders } from '@/lib/rate-limiter'
import { z } from 'zod'

const requestSchema = z.object({
  roomType: z.string(),
  roomSubtype: z.string().optional(),
  existingColors: z.array(z.object({
    colorCode: z.string(),
    colorName: z.string(),
    surfaceType: z.string(),
  })).optional(),
  propertyType: z.string().optional(),
  clientPreferences: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit check
  const rateLimit = await checkRateLimit(session.user.id, aiSuggestionsLimiter)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'AI suggestion limit exceeded', retryAfter: rateLimit.retryAfter },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    )
  }

  try {
    const body = await request.json()
    const validated = requestSchema.parse(body)

    // Get user tier from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { tier: true }
    })
    const userTier = (user?.tier as 'free' | 'pro' | 'enterprise') || 'free'

    // Generate suggestions
    const result = await generateColorSuggestions(
      session.user.id,
      validated,
      userTier
    )

    return NextResponse.json({
      suggestions: result.suggestions,
      cached: result.cached,
      model: result.model,
      cost: result.cost,
      remaining: rateLimit.remaining,
    }, {
      headers: getRateLimitHeaders(rateLimit)
    })
  } catch (error: any) {
    console.error('[AI Suggestions] Error:', error)

    if (error.message.includes('budget exceeded')) {
      return NextResponse.json(
        { error: error.message },
        { status: 402 } // Payment Required
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    )
  }
}
```

### 3. Update Photo URL API

**File:** `app/api/photos/[photoId]/url/route.ts`

```typescript
import { getCachedPresignedUrl } from '@/lib/s3-url-cache'

export async function GET(request: NextRequest, { params }: { params: { photoId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return unauthorized()

  // Rate limit check
  const rateLimit = await checkRateLimit(session.user.id, presignedUrlLimiter)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    )
  }

  const photo = await prisma.photo.findFirst({
    where: {
      id: params.photoId,
      project: { userId: session.user.id }
    }
  })

  if (!photo) {
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
  }

  // Get size from query param (thumbnail, medium, large)
  const { searchParams } = new URL(request.url)
  const size = searchParams.get('size') || 'large'

  const s3Key = size === 'thumbnail' ? photo.thumbnail_path
              : size === 'medium' ? photo.medium_path
              : photo.cloud_storage_path

  // Use cached presigned URL
  const url = await getCachedPresignedUrl(s3Key)

  return NextResponse.json({ url }, {
    headers: {
      ...getRateLimitHeaders(rateLimit),
      'Cache-Control': 'private, max-age=3000', // 50 minutes
    }
  })
}
```

---

## Testing

### Test Image Optimization

```bash
# Create test script
cat > test-image-optimization.ts << 'EOF'
import { optimizeImage, logOptimization } from './lib/image-optimizer'
import * as fs from 'fs'

async function test() {
  const buffer = fs.readFileSync('./test-image.jpg')
  const result = await optimizeImage(buffer)
  logOptimization(result, 'test-image.jpg')

  console.log('\n✅ Savings:', result.savings.storageReduction.toFixed(2) + '%')
}

test().catch(console.error)
EOF

# Run test
npx tsx test-image-optimization.ts
```

### Test Ralph Wiggum

```bash
# Create test script
cat > test-ralph.ts << 'EOF'
import { generateColorSuggestions } from './lib/ralph-wiggum-suggester'

async function test() {
  const result = await generateColorSuggestions(
    'test-user-id',
    {
      roomType: 'Kitchen',
      existingColors: [
        { colorCode: 'SW 7005', colorName: 'Pure White', surfaceType: 'trim' }
      ]
    },
    'free'
  )

  console.log('✅ Suggestions:', result.suggestions)
  console.log('💰 Cost:', '$' + result.cost.toFixed(4))
  console.log('🤖 Model:', result.model)
  console.log('📦 Cached:', result.cached)
}

test().catch(console.error)
EOF

npx tsx test-ralph.ts
```

### Test Rate Limiting

```bash
# Create test script
cat > test-rate-limit.ts << 'EOF'
import { checkRateLimit, apiLimiter } from './lib/rate-limiter'

async function test() {
  for (let i = 0; i < 5; i++) {
    const result = await checkRateLimit('test-user', apiLimiter)
    console.log(`Request ${i + 1}:`, result.allowed ? '✅ Allowed' : '❌ Blocked', `(${result.remaining} remaining)`)
  }
}

test().catch(console.error)
EOF

npx tsx test-rate-limit.ts
```

---

## Monitoring

### Check Cost Savings

```bash
# Redis CLI
redis-cli

# View URL cache stats
KEYS rl:*
HGETALL ai:usage:global:2026-01

# View rate limit stats
KEYS rl:*
```

### View Logs

```bash
# Search for cost tracking logs
grep "Anthropic Usage" logs/*.log
grep "Image Optimizer" logs/*.log
grep "S3 URL Cache" logs/*.log
grep "Rate Limiter" logs/*.log
```

---

## Expected Results

After full implementation:

| Metric | Before | After | Savings |
|--------|--------|-------|---------|
| **Photo Storage** | 5-10 MB each | 500 KB-1 MB | 70-85% |
| **Bandwidth (Gallery)** | 100 MB | 5 MB | 95% |
| **S3 Requests** | 1000/day | 100/day | 90% |
| **Monthly Cost** | $200 | $50-80 | 60-75% |

---

## Troubleshooting

### Redis Connection Issues

```bash
# Check Redis is running
redis-cli ping
# Should return: PONG

# Check connection from Node
node -e "const Redis = require('ioredis'); new Redis(process.env.REDIS_URL).ping().then(console.log)"
```

### Anthropic API Issues

```bash
# Verify API key
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-3-5-haiku-20241022","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}'
```

### Image Optimization Issues

```bash
# Check Sharp installation
npm list sharp

# Reinstall if needed
npm rebuild sharp
```

---

## Next Steps

1. ✅ Review implementation guide
2. 🔧 Install dependencies (`npm install`)
3. 🔧 Set up Redis
4. 🔧 Configure `.env` file
5. 🔧 Test individual components
6. 🔧 Integrate into API routes
7. 🔧 Test end-to-end flow
8. 🔧 Deploy to staging
9. 🔧 Monitor costs for 1 week
10. 🔧 Deploy to production

**Estimated Time:** 2-3 days for full implementation

---

## Support

Questions? Check:
- Main documentation: `MIGRATION_RECOMMENDATIONS.md` Section 14
- Cost optimization summary: `COST_OPTIMIZATION_SUMMARY.md`
- Code comments in each new file

Ralph Wiggum says: "I'm helping! 🎨"
