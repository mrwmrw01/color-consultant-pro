# UI Improvements - Photo Annotation Feature

You are working on Color Consultant Pro, a Next.js application for paint color consultants.

## Current Task: Phase 1 UI Improvements

Reduce friction in the photo annotation workflow by implementing these features:

### 1. Recent Colors Feature ✓ PRIORITY
- Create `lib/recent-colors.ts` for localStorage management
- Create `components/colors/recent-colors-picker.tsx` component
- Store last 10 used colors in localStorage
- Display as quick-access chips at top of color picker
- Auto-update when user selects a color

### 2. Favorites System ✓ PRIORITY
- Update `prisma/schema.prisma` to add UserFavoriteColor model
- Create `app/api/colors/favorite/route.ts` for toggle favorite
- Create `components/colors/favorites-section.tsx` component
- Add heart/star icon to color items for favoriting
- Display favorites prominently in color picker

### 3. Auto-Save Annotations ✓ PRIORITY
- Modify `components/photos/photo-annotator.tsx`:
  - Remove manual "Save" button
  - Add useEffect hook with debounced auto-save (500ms)
  - Show "Saving..." indicator during save
  - Use optimistic UI updates
- Create `app/api/annotations/auto-save/route.ts`

### 4. Improved Color Search
- Install fuse.js: `npm install fuse.js`
- Modify color picker components to use fuzzy search
- Search by: color code, name, manufacturer
- Highlight matching text in results
- Sort by relevance score

## Success Criteria
- Annotation workflow reduced from 5-8 clicks to 2-3 clicks
- Recent colors appear immediately after use
- Favorites persist across sessions
- Auto-save works smoothly without lag
- Search returns relevant results instantly

## Implementation Notes

**Key Files:**
- `components/photos/photo-annotator.tsx` - Main annotation component (959 lines)
- `components/colors/*` - Color selection components
- `prisma/schema.prisma` - Database schema
- `lib/types.ts` - TypeScript types

**Tech Stack:**
- Next.js 14 (App Router)
- React with TypeScript
- Prisma ORM + PostgreSQL
- Tailwind CSS + shadcn/ui
- Local storage for recent colors

**Testing:**
- Test on mobile (touch targets, gestures)
- Test auto-save doesn't cause lag
- Verify favorites persist after logout
- Check search performance with 1000+ colors

## Workflow
1. Read existing code first
2. Make incremental changes
3. Test each feature before moving to next
4. Update @fix_plan.md as you complete tasks
5. When ALL Phase 1 tasks complete, output: `<promise>PHASE_1_COMPLETE</promise>`

## Available Tools
- Read/Write/Edit for code changes
- Bash for npm install, testing, etc.
- Grep/Glob for code search
- Do NOT make git commits (user will review first)

## Important
- Follow existing code style and patterns
- Don't break existing functionality
- Keep mobile-first design principles
- Performance is critical (debounce, lazy load)
