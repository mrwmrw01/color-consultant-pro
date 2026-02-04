# Phase 1 Features - Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Photo Annotation UI                          │
│                 (photo-annotator.tsx)                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Uses
                              ▼
        ┌─────────────────────────────────────────┐
        │                                         │
        │  ┌──────────────────────────────────┐  │
        │  │   FAVORITES SECTION              │  │
        │  │  ┌──────────────────────┐        │  │
        │  │  │ favorites-section.tsx│        │  │
        │  │  └──────────────────────┘        │  │
        │  │           │                      │  │
        │  │           │ fetch                │  │
        │  │           ▼                      │  │
        │  │  ┌──────────────────────┐        │  │
        │  │  │ /api/colors/favorite │────────┼──┼─► PostgreSQL
        │  │  └──────────────────────┘        │  │   (user_favorite_colors)
        │  │           │                      │  │
        │  │           │ POST/GET             │  │
        │  │           │                      │  │
        │  │  ┌──────────────────────────┐    │  │
        │  │  │ favorite-toggle-button   │    │  │
        │  │  │ (Star Icon)              │    │  │
        │  │  └──────────────────────────┘    │  │
        │  └──────────────────────────────────┘  │
        │                                         │
        │  ┌──────────────────────────────────┐  │
        │  │   RECENT COLORS SECTION          │  │
        │  │  ┌──────────────────────┐        │  │
        │  │  │recent-colors-picker  │        │  │
        │  │  │       .tsx           │        │  │
        │  │  └──────────────────────┘        │  │
        │  │           │                      │  │
        │  │           │ read/write           │  │
        │  │           ▼                      │  │
        │  │  ┌──────────────────────┐        │  │
        │  │  │ recent-colors.ts     │────────┼──┼─► localStorage
        │  │  │ (localStorage util)  │        │  │   (max 10 colors)
        │  │  └──────────────────────┘        │  │
        │  └──────────────────────────────────┘  │
        │                                         │
        │  ┌──────────────────────────────────┐  │
        │  │   FUZZY COLOR SEARCH             │  │
        │  │  ┌──────────────────────┐        │  │
        │  │  │  Fuse.js             │        │  │
        │  │  │  (fuzzy search)      │        │  │
        │  │  └──────────────────────┘        │  │
        │  │           │                      │  │
        │  │           │ searches             │  │
        │  │           ▼                      │  │
        │  │  ┌──────────────────────┐        │  │
        │  │  │  sortedColors[]      │        │  │
        │  │  │  (from API)          │        │  │
        │  │  └──────────────────────┘        │  │
        │  └──────────────────────────────────┘  │
        │                                         │
        └─────────────────────────────────────────┘
```

## Data Flow Diagrams

### 1. Recent Colors Flow

```
User Selects Color
       │
       ▼
┌──────────────┐
│ photo-       │
│ annotator    │
│ .tsx         │
└──────────────┘
       │
       │ useEffect detects
       │ selectedColorId change
       ▼
┌──────────────────┐
│ addRecentColor() │
│ (recent-colors.ts)│
└──────────────────┘
       │
       ▼
┌──────────────────┐
│  localStorage    │
│  - Add to list   │
│  - Sort by date  │
│  - Keep max 10   │
└──────────────────┘
       │
       │ dispatch 'recentColorsUpdated'
       ▼
┌──────────────────────┐
│ RecentColorsPicker   │
│ - Listens for event  │
│ - Refreshes display  │
└──────────────────────┘
```

### 2. Favorites Flow

```
User Clicks Star Button
       │
       ▼
┌──────────────────────┐
│ FavoriteToggleButton │
│ onClick handler      │
└──────────────────────┘
       │
       │ POST /api/colors/favorite
       ▼
┌──────────────────────┐
│ API Route Handler    │
│ - Check auth         │
│ - Toggle in DB       │
└──────────────────────┘
       │
       ▼
┌──────────────────────┐
│ PostgreSQL           │
│ user_favorite_colors │
│ - INSERT or DELETE   │
└──────────────────────┘
       │
       │ Return favorited: true/false
       ▼
┌──────────────────────┐
│ FavoriteToggleButton │
│ - Update state       │
│ - Show toast         │
│ - Dispatch event     │
└──────────────────────┘
       │
       │ 'favoriteColorsUpdated'
       ▼
┌──────────────────────┐
│ FavoritesSection     │
│ - Refresh favorites  │
│ - Update display     │
└──────────────────────┘
```

### 3. Fuzzy Search Flow

```
User Types in Search Box
       │
       ▼
┌──────────────────┐
│ colorSearch      │
│ state updates    │
└──────────────────┘
       │
       │ useMemo dependency
       ▼
┌──────────────────┐
│ Fuse.js Search   │
│ - Match name     │
│ - Match code     │
│ - Match mfr      │
└──────────────────┘
       │
       │ Returns ranked results
       ▼
┌──────────────────┐
│ filteredColors[] │
│ (sorted by score)│
└──────────────────┘
       │
       │ Re-render
       ▼
┌──────────────────┐
│ Color Grid       │
│ Display results  │
└──────────────────┘
```

## Component Hierarchy

```
photo-annotator.tsx (Main Component)
│
├─ AnnotationToolbar
│
├─ DrawingCanvas
│
└─ Annotation Details Panel (Sidebar)
    │
    ├─ FavoritesSection ✨ NEW
    │   └─ Renders favorite colors as chips
    │
    ├─ RecentColorsPicker ✨ NEW
    │   └─ Renders recent colors as chips
    │
    ├─ Color Selection Dropdown
    │   └─ Uses filteredColors (Fuse.js) ✨ UPDATED
    │
    ├─ Color Catalog Dialog
    │   └─ Can include FavoriteToggleButton ✨ OPTIONAL
    │
    ├─ Room Selection
    │
    ├─ Product Line Selection
    │
    ├─ Sheen Selection
    │
    └─ Surface Type Selection
```

## Database Schema

```sql
-- New table for favorites
CREATE TABLE user_favorite_colors (
  id         VARCHAR PRIMARY KEY,
  user_id    VARCHAR NOT NULL,
  color_id   VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (color_id) REFERENCES colors(id) ON DELETE CASCADE,

  UNIQUE (user_id, color_id),
  INDEX (user_id),
  INDEX (color_id)
);

-- Updated users table
ALTER TABLE users
ADD COLUMN favorite_colors_relation; -- Prisma relation only

-- Updated colors table
ALTER TABLE colors
ADD COLUMN favorited_by_relation; -- Prisma relation only
```

## localStorage Structure

```javascript
// Key: 'color-consultant-recent-colors'
{
  "recent-colors": [
    {
      "id": "clx123...",
      "name": "Extra White",
      "colorCode": "SW 7006",
      "manufacturer": "Sherwin Williams",
      "hexColor": "#f7f6f3",
      "timestamp": 1704067200000
    },
    // ... up to 10 colors
  ]
}
```

## Event System

```javascript
// Custom events for cross-component communication

window.dispatchEvent(new Event('recentColorsUpdated'))
// Triggered: When a color is selected
// Listeners: RecentColorsPicker

window.dispatchEvent(new Event('favoriteColorsUpdated'))
// Triggered: When favorite is toggled
// Listeners: FavoritesSection

window.addEventListener('storage', handler)
// Triggered: When localStorage changes (other tabs)
// Listeners: RecentColorsPicker
```

## Performance Optimizations

### 1. Memoization
```typescript
// Fuse.js instance - only recreates when sortedColors changes
const fuse = useMemo(() => {
  return new Fuse(sortedColors, { /* config */ })
}, [sortedColors])

// Filtered results - only recomputes when search or fuse changes
const filteredColors = useMemo(() => {
  // ... search logic
}, [colorSearch, fuse, sortedColors])
```

### 2. Debouncing
- Color search updates are instant (no debounce needed - useMemo handles it)
- Favorite toggles use optimistic UI (instant feedback)
- Recent colors update immediately (localStorage is fast)

### 3. Lazy Loading
- Favorites only load when component mounts
- Recent colors load from localStorage (instant)
- Events prevent unnecessary re-fetching

## Security Considerations

### Authentication
```typescript
// All favorite operations check auth
const session = await getServerSession(authOptions)
if (!session?.user?.id) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### Data Validation
```typescript
// Validate color ID before processing
if (!colorId) {
  return NextResponse.json({ error: 'Color ID required' }, { status: 400 })
}
```

### Database Constraints
```prisma
@@unique([userId, colorId])  // Prevent duplicate favorites
onDelete: Cascade             // Clean up on user/color deletion
```

## Error Handling

### localStorage Errors
```typescript
try {
  localStorage.setItem(key, value)
} catch (error) {
  console.error('localStorage error:', error)
  // Gracefully degrade - feature won't work but app continues
}
```

### API Errors
```typescript
try {
  const response = await fetch('/api/colors/favorite', { /* ... */ })
  if (!response.ok) {
    toast.error('Failed to update favorite')
  }
} catch (error) {
  console.error('API error:', error)
  toast.error('Network error')
}
```

### Component Errors
```typescript
// Loading states
if (loading) return <Loader />

// Empty states
if (favorites.length === 0) return null

// Error boundaries (implicit via Next.js)
```

## Scalability Considerations

### Recent Colors
- **Limit:** 10 colors max per user
- **Storage:** ~2KB in localStorage
- **Performance:** O(1) read/write

### Favorites
- **Limit:** Unlimited (practical limit ~100)
- **Storage:** Database with indexes
- **Performance:** O(log n) queries with indexes

### Search
- **Limit:** Works efficiently up to 10,000+ colors
- **Storage:** In-memory (from API)
- **Performance:** O(n) search with Fuse.js optimization

## Mobile Responsiveness

```css
/* Color chips */
.chip {
  min-width: 44px;  /* Touch target minimum */
  min-height: 44px;
  flex-wrap: wrap;  /* Wrap on small screens */
}

/* Sections */
.section {
  overflow-x: auto;  /* Horizontal scroll if needed */
  -webkit-overflow-scrolling: touch;  /* Smooth scroll on iOS */
}
```

## Accessibility

```tsx
// ARIA labels
<button
  aria-label="Add to favorites"
  title="Add to favorites"
>

// Keyboard navigation
<button
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleSelect()
    }
  }}
>

// Color contrast
// Yellow star: #eab308 (AA compliant)
// Blue selection: #2563eb (AAA compliant)
```

## Testing Strategy

### Unit Tests
- `recent-colors.ts` utilities
- API route handlers
- Component rendering

### Integration Tests
- Color selection → Recent colors update
- Favorite toggle → Database update
- Search input → Results update

### E2E Tests
- Complete annotation workflow
- Cross-tab synchronization
- Mobile gestures

## Monitoring & Analytics

### Key Metrics
- Average colors used per project
- Most favorited colors
- Search query patterns
- Feature adoption rate

### Event Tracking
```typescript
// Track color selection
analytics.track('Color Selected', {
  colorId,
  source: 'recent' | 'favorite' | 'search' | 'dropdown'
})

// Track favorites
analytics.track('Color Favorited', { colorId })
```

---

This architecture is designed for:
- ⚡ **Performance**: Memoization, localStorage, indexes
- 📱 **Mobile-First**: Touch targets, responsive, smooth
- 🔒 **Security**: Auth checks, validation, constraints
- 🧪 **Testability**: Modular, clear responsibilities
- 📈 **Scalability**: Efficient queries, limited data
- ♿ **Accessibility**: ARIA, keyboard, contrast
