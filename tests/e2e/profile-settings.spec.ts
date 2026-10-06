import { test, expect } from '@playwright/test';
import { readFile } from 'fs/promises';
import { loginAsTestUser } from '../utils/test-helpers';
import { LoginPage } from '../utils/pages/login-page';
import { createTestClient, deleteTestClient } from '../utils/test-data-setup';

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@colorguru.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestPassword123!';

// Serial: these tests change the shared test user's profile and password
test.describe.serial('Profile & Settings', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('should update profile name and refresh the header', async ({ page }) => {
    await page.goto('/dashboard/profile');
    const firstName = page.getByLabel('First name');
    await expect(firstName).toBeVisible();
    const original = (await firstName.inputValue()) || 'Test';
    const updated = `Tester${Date.now() % 100000}`;

    try {
      await firstName.fill(updated);
      await page.getByRole('button', { name: 'Save Profile' }).click();
      // Toast comes from sonner, which must be mounted app-wide
      await expect(page.getByText('Profile updated')).toBeVisible();
      await expect(page.getByText(`Welcome, ${updated}`)).toBeVisible();
    } finally {
      const res = await page.request.patch('/api/profile', {
        data: { firstName: original, lastName: 'User', companyName: '' },
      });
      expect(res.ok()).toBeTruthy();
    }
  });

  test('should reject invalid profile input', async ({ page }) => {
    const res = await page.request.patch('/api/profile', {
      data: { firstName: '', lastName: 'User' },
    });
    expect(res.status()).toBe(400);
  });

  test('should change password only with the correct current password', async ({ page, browser }) => {
    const newPassword = `Changed-${Date.now()}`;

    const wrong = await page.request.post('/api/profile/password', {
      data: { currentPassword: 'not-the-password', newPassword },
    });
    expect(wrong.status()).toBe(400);
    expect((await wrong.json()).error).toMatch(/current password is incorrect/i);

    await page.goto('/dashboard/profile');
    await page.getByLabel('Current password').fill(TEST_PASSWORD);
    await page.getByLabel('New password', { exact: true }).fill(newPassword);
    await page.getByLabel('Confirm new password').fill(newPassword);
    await page.getByRole('button', { name: 'Change Password' }).click();
    await expect(page.getByText('Password changed')).toBeVisible();

    try {
      // The new password signs in from a fresh browser session
      const context = await browser.newContext();
      const loginPage = new LoginPage(await context.newPage());
      await loginPage.navigateToLogin();
      await loginPage.login(TEST_EMAIL, newPassword);
      await loginPage.waitForLoginSuccess();
      await context.close();
    } finally {
      // Restore so the rest of the suite can sign in
      const restore = await page.request.post('/api/profile/password', {
        data: { currentPassword: newPassword, newPassword: TEST_PASSWORD },
      });
      expect(restore.ok()).toBeTruthy();
    }
  });

  test('should download a JSON export of all data', async ({ page }) => {
    const client = await createTestClient(page, `Export Client ${Date.now()}`);
    try {
      await page.goto('/dashboard/settings');
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('link', { name: /export all data/i }).click();
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toMatch(/^color-consultant-export-\d{4}-\d{2}-\d{2}\.json$/);
      const data = JSON.parse(await readFile(await download.path(), 'utf-8'));
      expect(data.format).toBe('color-consultant-pro-export');
      expect(data.user.email).toBe(TEST_EMAIL);
      expect(data.user.password).toBeUndefined();
      expect(data.clients.map((c: any) => c.name)).toContain(client.name);
      expect(Array.isArray(data.projects)).toBeTruthy();
    } finally {
      await deleteTestClient(page, client.id);
    }
  });

  test('settings and help pages have no placeholder features', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await expect(page.getByText(/coming soon/i)).toHaveCount(0);
    await page.getByRole('link', { name: 'Catalog Administration' }).click();
    await expect(page).toHaveURL(/\/dashboard\/admin/);

    await page.goto('/dashboard/help');
    await expect(page.getByText('Quick Start')).toBeVisible();
    await expect(page.getByText(/coming soon/i)).toHaveCount(0);
  });
});
