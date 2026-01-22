import { Page } from '@playwright/test';
import { LoginPage } from './pages/login-page';

/**
 * Test helper functions
 */

/**
 * Login as test user
 */
export async function loginAsTestUser(page: Page) {
  const loginPage = new LoginPage(page);
  await loginPage.navigateToLogin();
  await loginPage.loginWithTestUser();
  await loginPage.waitForLoginSuccess();
}

/**
 * Logout current user
 */
export async function logout(page: Page) {
  // Navigate to dashboard first
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');

  // Look for user avatar/menu button - it contains user initials or profile icon
  // Try multiple selectors since the UI might vary
  const userMenuSelectors = [
    'button:has-text("TU")', // Test User initials
    'button[aria-haspopup="menu"]',
    'button:has(svg.lucide-user)',
  ];

  let menuClicked = false;
  for (const selector of userMenuSelectors) {
    try {
      const button = page.locator(selector).first();
      if (await button.isVisible({ timeout: 2000 })) {
        await button.click();
        menuClicked = true;
        break;
      }
    } catch {
      continue;
    }
  }

  if (!menuClicked) {
    // Fallback: just try clicking "Sign Out" if it's visible
    const signOutText = page.getByText('Sign Out', { exact: true });
    if (await signOutText.isVisible({ timeout: 1000 })) {
      await signOutText.click();
    }
  } else {
    // Click Sign Out option in dropdown
    await page.getByText('Sign Out', { exact: true }).click();
  }

  // Wait for navigation away from dashboard
  await page.waitForFunction(() => !window.location.pathname.includes('/dashboard'), { timeout: 5000 });
}

/**
 * Wait for network to be idle
 */
export async function waitForNetworkIdle(page: Page) {
  await page.waitForLoadState('networkidle');
}

/**
 * Check if user is logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    // If we're on dashboard, we're logged in
    return page.url().includes('/dashboard');
  } catch {
    return false;
  }
}

/**
 * Get test image path
 */
export function getTestImagePath(filename: string): string {
  return `tests/fixtures/images/${filename}`;
}

/**
 * Wait for toast notification
 */
export async function waitForToast(page: Page, message: string | RegExp, timeout = 5000) {
  await page.getByText(message).waitFor({ state: 'visible', timeout });
}

/**
 * Wait for element and click
 */
export async function waitAndClick(page: Page, selector: string) {
  await page.waitForSelector(selector, { state: 'visible' });
  await page.click(selector);
}

/**
 * Fill form field by label
 */
export async function fillFieldByLabel(page: Page, label: string | RegExp, value: string) {
  await page.getByLabel(label).fill(value);
}

/**
 * Get current timestamp for unique test data
 */
export function getTimestamp(): string {
  return new Date().getTime().toString();
}

/**
 * Generate unique test email
 */
export function generateTestEmail(): string {
  return `test-${getTimestamp()}@example.com`;
}

/**
 * Generate unique project name
 */
export function generateProjectName(): string {
  return `Test Project ${getTimestamp()}`;
}

/**
 * Clean up test data (placeholder - implement based on API)
 */
export async function cleanupTestData(page: Page, options?: {
  projects?: string[];
  users?: string[];
}) {
  // TODO: Implement cleanup logic
  // This might call API endpoints to delete test data
  console.log('Cleanup test data:', options);
}
