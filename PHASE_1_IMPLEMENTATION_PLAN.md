# Phase 1 UI Improvements - Complete Implementation Plan

## Status Overview

### ✅ Feature 1: Recent Colors (Files Created, Integration Pending)
**Status:** 90% complete - Files created, needs integration into photo-annotator.tsx

**Created Files:**
- ✅ `lib/recent-colors.ts` - localStorage utility
- ✅ `components/colors/recent-colors-picker.tsx` - UI component

**Pending Changes to `components/photos/photo-annotator.tsx`:**

#### Change 1: Add imports (lines 32-35)
```typescript
import { AddCustomColorDialog } from "@/components/colors/add-custom-color-dialog"
import { QuickAddRoom } from "@/components/projects/quick-add-room"
import { RecentColorsPicker } from "@/components/colors/recent-colors-picker"  // ADD THIS
import { SURFACE_TYPES, PRODUCT_LINES, SHEEN_OPTIONS } from "@/lib/types"
import { addRecentColor } from "@/lib/recent-colors"  // ADD THIS
import toast from "react-hot-toast"
```

#### Change 2: Add useEffect hook to track color selections (after line 438)
```typescript
  }, [photo.id])

  // Track color selection for recent colors
  useEffect(() => {
    if (selectedColorId) {
      const selectedColor = colors.find(c => c.id === selectedColorId)
      if (selectedColor) {
        addRecentColor({
          id: selectedColor.id,
          name: selectedColor.name,
          colorCode: selectedColor.colorCode,
          manufacturer: selectedColor.manufacturer,
          hexColor: selectedColor.hexColor
        })
        // Dispatch custom event for same-tab updates
        window.dispatchEvent(new Event('recentColorsUpdated'))
      }
    }
  }, [selectedColorId, colors])

  const handleSaveAnnotation = async (annotationData: any) => {
```

#### Change 3: Add RecentColorsPicker component (before line 1144)
```typescript
                </Button>

                {/* Recent Colors - Quick Access */}
                <RecentColorsPicker
                  onColorSelect={setSelectedColorId}
                  selectedColorId={selectedColorId}
                  className="pb-3 border-b"
                />

                {/* Color Selection with Browse and Add Custom Color Buttons */}
```

---

## 🔄 Feature 2: Favorites System (Next Priority)

**Files to Create/Modify:**

### 2.1. Update `prisma/schema.prisma`
Add UserFavoriteColor model:
```prisma
model UserFavoriteColor {
  id        String   @id @default(cuid())
  userId    String
  colorId   String
  createdAt DateTime @default(now())

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  color Color @relation(fields: [colorId], references: [id], onDelete: Cascade)

  @@unique([userId, colorId])
  @@index([userId])
  @@index([colorId])
}
```

Also update User and Color models to add relation:
```prisma
model User {
  // ... existing fields ...
  favoriteColors UserFavoriteColor[]
}

model Color {
  // ... existing fields ...
  favoritedBy UserFavoriteColor[]
}
```

### 2.2. Create `app/api/colors/favorite/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { colorId } = await request.json()

    if (!colorId) {
      return NextResponse.json({ error: 'Color ID required' }, { status: 400 })
    }

    // Check if already favorited
    const existing = await prisma.userFavoriteColor.findUnique({
      where: {
        userId_colorId: {
          userId: session.user.id,
          colorId
        }
      }
    })

    if (existing) {
      // Remove from favorites
      await prisma.userFavoriteColor.delete({
        where: {
          userId_colorId: {
            userId: session.user.id,
            colorId
          }
        }
      })
      return NextResponse.json({ favorited: false })
    } else {
      // Add to favorites
      await prisma.userFavoriteColor.create({
        data: {
          userId: session.user.id,
          colorId
        }
      })
      return NextResponse.json({ favorited: true })
    }
  } catch (error) {
    console.error('Error toggling favorite:', error)
    return NextResponse.json({ error: 'Failed to toggle favorite' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const favorites = await prisma.userFavoriteColor.findMany({
      where: { userId: session.user.id },
      include: {
        color: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(favorites.map(f => f.color))
  } catch (error) {
    console.error('Error fetching favorites:', error)
    return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 })
  }
}
```

### 2.3. Create `components/colors/favorites-section.tsx`
```typescript
"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, StarOff } from "lucide-react"
import toast from "react-hot-toast"

interface FavoritesSectionProps {
  onColorSelect: (colorId: string) => void
  selectedColorId?: string
  className?: string
}

export function FavoritesSection({
  onColorSelect,
  selectedColorId,
  className = ""
}: FavoritesSectionProps) {
  const [favorites, setFavorites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadFavorites = async () => {
    try {
      const response = await fetch('/api/colors/favorite')
      if (response.ok) {
        const data = await response.json()
        setFavorites(data)
      }
    } catch (error) {
      console.error('Error loading favorites:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFavorites()
  }, [])

  if (loading) {
    return null
  }

  if (favorites.length === 0) {
    return null
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2">
        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
        <span className="text-xs font-medium text-gray-700">Favorite Colors</span>
        <Badge variant="secondary" className="text-xs">
          {favorites.length}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {favorites.map((color) => (
          <button
            key={color.id}
            onClick={() => {
              onColorSelect(color.id)
              toast.success(`Selected: ${color.name}`)
            }}
            className={`
              group relative flex items-center gap-2 px-3 py-2 rounded-lg border-2
              transition-all duration-200 hover:shadow-md
              ${selectedColorId === color.id
                ? 'border-yellow-500 bg-yellow-50 ring-2 ring-yellow-200'
                : 'border-gray-200 hover:border-gray-300 bg-white'
              }
            `}
            title={`${color.name} (${color.colorCode})`}
          >
            {/* Color swatch */}
            <div
              className="w-6 h-6 rounded border border-gray-300 shadow-sm flex-shrink-0"
              style={{ backgroundColor: color.hexColor || '#f3f4f6' }}
            />

            {/* Color info */}
            <div className="flex flex-col items-start min-w-0">
              <span className="text-xs font-medium text-gray-900 truncate max-w-[120px]">
                {color.name}
              </span>
              <span className="text-xs text-gray-500 truncate max-w-[120px]">
                {color.colorCode}
              </span>
            </div>

            {/* Favorite star indicator */}
            <Star className="absolute -top-1 -right-1 w-3 h-3 text-yellow-500 fill-yellow-500" />
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500 italic">
        Your favorite colors for quick access
      </p>
    </div>
  )
}
```

### 2.4. Create `components/colors/favorite-toggle-button.tsx`
```typescript
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Star } from "lucide-react"
import toast from "react-hot-toast"

interface FavoriteToggleButtonProps {
  colorId: string
  initialFavorited?: boolean
  onToggle?: (favorited: boolean) => void
}

export function FavoriteToggleButton({
  colorId,
  initialFavorited = false,
  onToggle
}: FavoriteToggleButtonProps) {
  const [favorited, setFavorited] = useState(initialFavorited)
  const [loading, setLoading] = useState(false)

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setLoading(true)

    try {
      const response = await fetch('/api/colors/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ colorId })
      })

      if (response.ok) {
        const { favorited: newFavorited } = await response.json()
        setFavorited(newFavorited)
        toast.success(newFavorited ? 'Added to favorites' : 'Removed from favorites')
        onToggle?.(newFavorited)
      } else {
        toast.error('Failed to update favorite')
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
      toast.error('Failed to update favorite')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      disabled={loading}
      className="h-8 w-8 p-0"
      title={favorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Star
        className={`h-4 w-4 ${
          favorited
            ? 'text-yellow-500 fill-yellow-500'
            : 'text-gray-400 hover:text-yellow-500'
        }`}
      />
    </Button>
  )
}
```

---

## 🔄 Feature 3: Auto-Save Annotations (Next Priority)

**Changes Required:**

### 3.1. Modify `components/photos/photo-annotator.tsx`

No manual save button exists (annotations save immediately on creation), but we need to add auto-save for EDITS to annotation metadata (color, surface, etc.).

Add debounced auto-save state and logic:

```typescript
// Add these imports at top
import { useCallback, useRef } from "react"

// Add state for auto-save indicator
const [autoSaving, setAutoSaving] = useState(false)
const saveTimeoutRef = useRef<NodeJS.Timeout>()

// Add debounced auto-save function
const debouncedAutoSave = useCallback(() => {
  if (saveTimeoutRef.current) {
    clearTimeout(saveTimeoutRef.current)
  }

  saveTimeoutRef.current = setTimeout(() => {
    // Auto-save logic here if needed
    // Currently annotations save immediately, so this is for future enhancements
  }, 500)
}, [])

// Add cleanup
useEffect(() => {
  return () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
  }
}, [])
```

Add saving indicator in the UI (near annotation details):
```typescript
{autoSaving && (
  <div className="flex items-center gap-2 text-xs text-blue-600">
    <Loader2 className="h-3 w-3 animate-spin" />
    Saving...
  </div>
)}
```

---

## 🔄 Feature 4: Improved Color Search with Fuse.js

### 4.1. Install fuse.js
```bash
npm install fuse.js
npm install --save-dev @types/fuse.js
```

### 4.2. Update photo-annotator.tsx to use fuzzy search

Add import:
```typescript
import Fuse from 'fuse.js'
```

Replace the filteredColors logic (around line 200):
```typescript
// Configure Fuse.js for fuzzy search
const fuse = useMemo(() => {
  return new Fuse(sortedColors, {
    keys: [
      { name: 'name', weight: 2 },
      { name: 'colorCode', weight: 1.5 },
      { name: 'manufacturer', weight: 1 }
    ],
    threshold: 0.3,
    includeScore: true,
    includeMatches: true
  })
}, [sortedColors])

// Filter colors based on search with fuzzy matching
const filteredColors = useMemo(() => {
  if (!colorSearch.trim()) {
    return sortedColors
  }

  const results = fuse.search(colorSearch)
  return results.map(result => result.item)
}, [colorSearch, fuse, sortedColors])
```

---

## Database Migration Commands

After updating schema.prisma:
```bash
npx prisma format
npx prisma migrate dev --name add_favorite_colors
npx prisma generate
```

---

## Testing Checklist

- [ ] Recent colors appear after selecting a color
- [ ] Recent colors persist across page reloads
- [ ] Recent colors list limited to 10 items
- [ ] Favorites can be added/removed
- [ ] Favorites persist after logout/login
- [ ] Favorites appear in color picker
- [ ] Auto-save indicator appears during saves
- [ ] Fuzzy search finds colors with typos
- [ ] Search results sorted by relevance
- [ ] Mobile touch targets are adequate (44x44px minimum)
- [ ] No performance lag with 1000+ colors
