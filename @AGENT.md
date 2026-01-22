# Build & Run Instructions for Color Consultant Pro

## Development Server

**Start dev server:**
```bash
npm run dev
```
Server runs on http://localhost:3000

## Database Setup

**If database changes are made:**
```bash
# Create migration
npx prisma migrate dev --name <migration_name>

# Generate Prisma client
npx prisma generate
```

## Installing Dependencies

**If new packages are needed:**
```bash
npm install <package-name>
```

## Testing

### Automated Testing with Ralph

**Run Ralph testing loop:**
```bash
./run-ralph-testing.sh
```

Ralph will automatically:
- Set up Playwright E2E testing framework
- Create automated tests for all manual test scenarios
- Run tests and verify they pass
- Update documentation

**Run E2E tests manually:**
```bash
# Install Playwright (first time only)
npx playwright install chromium

# Run all E2E tests
npx playwright test

# Run specific test file
npx playwright test auth.spec.ts

# Run tests in headed mode (watch browser)
npx playwright test --headed

# Run tests in UI mode (interactive)
npx playwright test --ui

# View test report
npx playwright show-report
```

**Test Infrastructure:**
- Playwright configured in `playwright.config.ts`
- Page Objects in `tests/utils/pages/` (LoginPage, DashboardPage, ProjectsPage, PhotoUploadPage)
- Test helpers in `tests/utils/test-helpers.ts`
- Test data setup in `tests/utils/test-data-setup.ts` (API-based test data creation)
- Test database config in `.env.test`
- Test fixtures in `tests/fixtures/images/` (small-photo.jpg, medium-photo.png, invalid.txt)

**Current Test Coverage:**
- ✅ 8 Authentication tests - login, logout, validation, session persistence
- ✅ 5 Project Management tests - create, list, navigate, open projects
- ✅ 9 Photo Upload tests - JPG/PNG upload, validation, multiple files, UI state
- ✅ 7 Color Annotation tests - color tags, edit/delete, undo/redo, palette display
- ✅ 6 Recent Colors tests - display, chronological order, swatches, persistence, clear
- ✅ 8 Favorites tests - API integration, star icon, persistence, UI interaction
- ✅ 6 Auto-save tests - annotation auto-save, navigation, edit/delete, conflict handling
- **Total: 49 tests passing | 0% flakiness | ~1.2min execution time**

### Manual Testing

**Run the app:**
```bash
# Server should already be running from background process
# Test at http://localhost:3000
```

**Manual testing checklist:**
- Login/signup works
- Can create project
- Can upload photo
- Can annotate photo with new features
- Recent colors appear
- Favorites work
- Auto-save works smoothly

**Test files location:**
- `tests/e2e/` - End-to-end Playwright tests
- `tests/api/` - API integration tests
- `tests/fixtures/` - Test data and images
- See `tests/README.md` for detailed testing documentation

## Important Notes

- PostgreSQL is running locally on port 5432
- Redis is running locally on port 6379
- S3 bucket: colorguru-photos (us-east-1)
- AI suggestions are DISABLED (FEATURE_AI_SUGGESTIONS=false)

## Common Issues

**If dev server won't start:**
```bash
pkill -f "next dev"
npm run dev
```

**If Prisma errors:**
```bash
npx prisma generate
npx prisma migrate deploy
```

**If types are wrong:**
```bash
npm run build
```

## File Structure

- `app/` - Next.js app router pages and API routes
- `components/` - React components
- `lib/` - Utility functions and configurations
- `prisma/` - Database schema
- `public/` - Static assets
