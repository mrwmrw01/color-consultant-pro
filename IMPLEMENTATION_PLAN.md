# Phase 1 Implementation Plan - UI Improvements

## Overview
Implementing Phase 1 of UI_IMPROVEMENT_PRD.md to reduce annotation friction.

## Tasks for Phase 1 (Week 1)

### 1. Recent Colors Feature
**Files to create/modify:**
- `lib/recent-colors.ts` - Client-side storage for recent colors
- `components/colors/recent-colors-picker.tsx` - UI component
- `app/api/colors/recent/[userId]/route.ts` - API endpoint

**Implementation:**
- Store last 10 colors in localStorage
- Display as quick-access chips above color search
- Auto-update when color is selected

### 2. Favorites System
**Files to create/modify:**
- `prisma/schema.prisma` - Add UserFavoriteColor model
- `app/api/colors/favorite/route.ts` - Toggle favorite API
- `components/colors/favorites-section.tsx` - Favorites UI
- Add star icon to color items

**Implementation:**
- Heart/star icon on each color
- Persist favorites to database
- Display favorites section in color picker

### 3. Auto-Save Annotations
**Files to modify:**
- `components/photos/photo-annotator.tsx` - Remove manual save, add auto-save
- `app/api/annotations/auto-save/route.ts` - New endpoint
- Add debounced save (500ms after change)

**Implementation:**
- Debounce saves to avoid excessive API calls
- Show "Saving..." indicator
- Optimistic UI updates

### 4. Improved Color Search
**Files to modify:**
- `components/colors/*` - Add fuzzy search
- Install `fuse.js` for fuzzy matching

**Implementation:**
- Search by color code, name, manufacturer
- Highlight matching text
- Sort by relevance

## Success Criteria
- Clicks per annotation: 3-4 (down from 5-8)
- Time per annotation: <90 seconds
- All tests passing
- No regressions

