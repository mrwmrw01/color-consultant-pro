import { test, expect } from '@playwright/test';
import { LoginPage } from '../utils/pages/login-page';
import { loginAsTestUser, logout } from '../utils/test-helpers';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Start each test from login page
    await page.goto('/auth/signin');
  });

  test('should display login page with email and password fields', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Verify page elements are visible
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.signInButton).toBeVisible();
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Attempt login with test credentials
    await loginPage.loginWithTestUser();

    // Verify redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify we're logged in by checking page loaded
    await page.waitForLoadState('networkidle');
  });

  test('should show error with invalid email', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Try to login with invalid email
    await loginPage.login('invalid-email@example.com', 'WrongPassword123!');

    // Should show error message
    await expect(loginPage.errorMessage).toBeVisible({ timeout: 5000 });

    // Should still be on login page
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test('should show error with incorrect password', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const testEmail = process.env.TEST_USER_EMAIL || 'test@colorguru.com';

    // Try to login with wrong password
    await loginPage.login(testEmail, 'WrongPassword!');

    // Should show error message
    await expect(loginPage.errorMessage).toBeVisible({ timeout: 5000 });

    // Should still be on login page
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test('should maintain session across page refreshes', async ({ page }) => {
    // Login first
    await loginAsTestUser(page);

    // Verify we're on dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Refresh the page
    await page.reload();

    // Should still be logged in and on dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await page.waitForLoadState('networkidle');
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await loginAsTestUser(page);

    // Verify we're logged in
    await expect(page).toHaveURL(/\/dashboard/);

    // Logout
    await logout(page);

    // Should be redirected away from dashboard (to signin or home)
    await expect(page).not.toHaveURL(/\/dashboard/);

    // Try to access dashboard - should redirect to login
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test('should validate email format', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Try invalid email format
    await loginPage.fillEmail('not-an-email');
    await loginPage.fillPassword('TestPassword123!');
    await loginPage.clickSignIn();

    // Should show validation error or stay on page
    // HTML5 validation might prevent submission
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test('should show link to signup page', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Verify signup link is visible
    await expect(loginPage.signUpLink).toBeVisible();

    // Click signup link
    await loginPage.signUpLink.click();

    // Should navigate to signup page
    await expect(page).toHaveURL(/\/auth\/signup/);
  });
});
