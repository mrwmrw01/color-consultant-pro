# Test Automation for Color Consultant Pro

This directory contains automated tests for the Color Consultant Pro application.

## Directory Structure

```
tests/
├── e2e/              # End-to-end Playwright tests
│   ├── auth.spec.ts           # Authentication tests
│   ├── projects.spec.ts       # Project management tests
│   ├── photo-upload.spec.ts   # Photo upload tests
│   ├── annotations.spec.ts    # Color annotation tests
│   ├── recent-colors.spec.ts  # Recent colors feature tests
│   ├── favorites.spec.ts      # Favorites feature tests
│   └── auto-save.spec.ts      # Auto-save tests
├── api/              # API integration tests
│   ├── auth.test.ts           # Auth API tests
│   ├── projects.test.ts       # Projects API tests
│   └── colors.test.ts         # Colors API tests
├── fixtures/         # Test data
│   ├── images/                # Test images for upload tests
│   └── data/                  # Test data files
└── utils/            # Test utilities and helpers
    ├── test-helpers.ts        # Common test utilities
    ├── page-objects/          # Page Object Model classes
    └── setup.ts               # Test setup and teardown
```

## Running Tests

### Prerequisites
1. Install dependencies:
   ```bash
   npm install
   ```

2. Install Playwright browsers:
   ```bash
   npx playwright install
   ```

3. Set up test environment:
   ```bash
   cp .env.example .env.test
   # Edit .env.test with test database credentials
   ```

4. Start the application:
   ```bash
   npm run dev
   ```

### Test Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npm run test:e2e -- auth.spec.ts

# Run tests in headed mode (watch browser)
npm run test:e2e:headed

# Run tests with debugging
npm run test:e2e:debug

# Generate HTML test report
npm run test:e2e -- --reporter=html

# Run API tests
npm run test:api

# Run all tests
npm test
```

## Writing Tests

### Test Structure
Follow the Arrange-Act-Assert pattern:

```typescript
import { test, expect } from '@playwright/test';

test('user can login with valid credentials', async ({ page }) => {
  // Arrange: Navigate to login page
  await page.goto('/login');

  // Act: Fill in credentials and submit
  await page.fill('input[name="email"]', 'test@colorguru.com');
  await page.fill('input[name="password"]', 'TestPassword123!');
  await page.click('button[type="submit"]');

  // Assert: Verify successful login
  await expect(page).toHaveURL('/projects');
  await expect(page.locator('text=Welcome')).toBeVisible();
});
```

### Best Practices

1. **Use Page Object Model**: Organize selectors and actions into page objects
2. **Independent Tests**: Each test should set up its own data and clean up
3. **Explicit Waits**: Use waitFor with conditions, not hard-coded sleeps
4. **Meaningful Assertions**: Tests should fail with clear error messages
5. **Test Data**: Use fixtures for consistent test data
6. **Cleanup**: Always clean up test data in afterEach hooks

### Selectors Priority
1. Accessibility attributes: `role`, `aria-label`, `alt`, `title`
2. Test IDs: `data-testid`
3. User-facing text: `text="Login"`
4. CSS selectors: Use as last resort

## Test Data

### Test Users
```typescript
{
  email: "test@colorguru.com",
  password: "TestPassword123!"
}
```

### Test Images
- `small-photo.jpg`: < 1MB - for fast upload tests
- `medium-photo.jpg`: 1-5MB - for normal upload tests
- `large-photo.jpg`: > 5MB - for large file handling tests
- `invalid.txt`: Invalid file type for error testing

## CI/CD Integration

Tests run automatically on:
- Pull requests to main branch
- Commits to main branch
- Nightly scheduled runs

### GitHub Actions Workflow
```yaml
- name: Run E2E Tests
  run: |
    npm run test:e2e
    npx playwright show-report
```

## Debugging Tests

### Visual Debugging
```bash
# Run in headed mode to see browser
npm run test:e2e:headed

# Run with Playwright Inspector
npm run test:e2e:debug
```

### Screenshots and Videos
Failed tests automatically capture:
- Screenshot at point of failure
- Video recording of entire test
- Trace file for detailed debugging

### Trace Viewer
```bash
# View trace for failed test
npx playwright show-trace trace.zip
```

## Test Maintenance

### When Tests Fail
1. Check if it's a real bug or flaky test
2. Run test 3 times to verify consistency
3. Fix flaky tests immediately
4. Update selectors if UI changed
5. Update assertions if behavior changed

### Updating Tests
- Keep tests in sync with feature changes
- Remove tests for removed features
- Update Page Objects when UI structure changes
- Maintain test data fixtures

## Ralph Integration

These tests are designed to be created and maintained by Ralph, the autonomous testing agent.

### Running Ralph Testing Loop
```bash
./run-ralph-testing.sh
```

Ralph will:
- Read test requirements from `specs/testing-requirements.md`
- Follow tasks in `@fix_plan_testing.md`
- Create new tests incrementally
- Run tests and verify they pass
- Update documentation

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Testing Best Practices](https://playwright.dev/docs/best-practices)
- [Page Object Model](https://playwright.dev/docs/pom)
- [Test Fixtures](https://playwright.dev/docs/test-fixtures)
