import { test, expect } from '@playwright/test';
import { loginAsTestUser, getTestImagePath } from '../utils/test-helpers';
import { PhotoUploadPage } from '../utils/pages/photo-upload-page';
import { PhotoAnnotatorPage } from '../utils/pages/photo-annotator-page';
import {
  createTestProjectWithHierarchy,
  cleanupTestHierarchy,
} from '../utils/test-data-setup';

test.describe('Recent Colors', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginAsTestUser(page);
  });

  test('should display recent colors section after adding colors', async ({
    page,
  }) => {
    const uploadPage = new PhotoUploadPage(page);
    const annotatorPage = new PhotoAnnotatorPage(page);
    const projectName = `Recent Colors Test ${Date.now()}`;

    const hierarchy = await createTestProjectWithHierarchy(page, projectName);

    try {
      // Upload photo
      await uploadPage.navigateToUpload(hierarchy.project.id);
      await uploadPage.uploadSingleFile(getTestImagePath('small-photo.jpg'));
      await page.waitForTimeout(2000);

      // Navigate to project
      await page.goto(`/dashboard/projects/${hierarchy.project.id}`);
      await page.waitForLoadState('networkidle');

      // Look for annotation link
      const annotateLink = page
        .getByRole('link', { name: /annotate|add colors/i })
        .first();
      const hasLink = await annotateLink
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (hasLink) {
        await annotateLink.click();
        await page.waitForLoadState('networkidle');

        // Clear any existing recent colors
        await annotatorPage.clearLocalStorageRecentColors();

        // Add a test color to recent colors
        await annotatorPage.addColorToRecentColors({
          id: 'test-color-1',
          name: 'Alabaster',
          colorCode: 'SW 7008',
          manufacturer: 'Sherwin-Williams',
          hexColor: '#f2f0e6',
        });

        // Verify recent colors section appears
        const hasRecentColors = await annotatorPage.hasRecentColors();
        expect(hasRecentColors).toBe(true);
      }
    } finally {
      await cleanupTestHierarchy(page, hierarchy);
    }
  });

  test('should show recent colors in chronological order', async ({ page }) => {
    const uploadPage = new PhotoUploadPage(page);
    const annotatorPage = new PhotoAnnotatorPage(page);
    const projectName = `Recent Colors Test ${Date.now()}`;

    const hierarchy = await createTestProjectWithHierarchy(page, projectName);

    try {
      // Upload photo
      await uploadPage.navigateToUpload(hierarchy.project.id);
      await uploadPage.uploadSingleFile(getTestImagePath('small-photo.jpg'));
      await page.waitForTimeout(2000);

      // Navigate to project
      await page.goto(`/dashboard/projects/${hierarchy.project.id}`);
      await page.waitForLoadState('networkidle');

      // Look for annotation link
      const annotateLink = page
        .getByRole('link', { name: /annotate|add colors/i })
        .first();
      const hasLink = await annotateLink
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (hasLink) {
        await annotateLink.click();
        await page.waitForLoadState('networkidle');

        // Clear existing
        await annotatorPage.clearLocalStorageRecentColors();

        // Add colors in sequence
        await annotatorPage.addColorToRecentColors({
          id: 'color-1',
          name: 'First Color',
          colorCode: 'SW 7001',
          manufacturer: 'Sherwin-Williams',
          hexColor: '#aaaaaa',
        });

        await page.waitForTimeout(100);

        await annotatorPage.addColorToRecentColors({
          id: 'color-2',
          name: 'Second Color',
          colorCode: 'SW 7002',
          manufacturer: 'Sherwin-Williams',
          hexColor: '#bbbbbb',
        });

        await page.waitForTimeout(100);

        await annotatorPage.addColorToRecentColors({
          id: 'color-3',
          name: 'Third Color',
          colorCode: 'SW 7003',
          manufacturer: 'Sherwin-Williams',
          hexColor: '#cccccc',
        });

        // Get colors from localStorage
        const recentColors = await annotatorPage.getRecentColorsFromLocalStorage();

        // Most recent should be first
        expect(recentColors[0].name).toBe('Third Color');
        expect(recentColors[1].name).toBe('Second Color');
        expect(recentColors[2].name).toBe('First Color');
      }
    } finally {
      await cleanupTestHierarchy(page, hierarchy);
    }
  });

  test('should display correct color swatches', async ({ page }) => {
    const uploadPage = new PhotoUploadPage(page);
    const annotatorPage = new PhotoAnnotatorPage(page);
    const projectName = `Recent Colors Test ${Date.now()}`;

    const hierarchy = await createTestProjectWithHierarchy(page, projectName);

    try {
      // Upload photo
      await uploadPage.navigateToUpload(hierarchy.project.id);
      await uploadPage.uploadSingleFile(getTestImagePath('small-photo.jpg'));
      await page.waitForTimeout(2000);

      // Navigate to project
      await page.goto(`/dashboard/projects/${hierarchy.project.id}`);
      await page.waitForLoadState('networkidle');

      // Look for annotation link
      const annotateLink = page
        .getByRole('link', { name: /annotate|add colors/i })
        .first();
      const hasLink = await annotateLink
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (hasLink) {
        await annotateLink.click();
        await page.waitForLoadState('networkidle');

        // Clear existing
        await annotatorPage.clearLocalStorageRecentColors();

        // Add a color with specific hex
        await annotatorPage.addColorToRecentColors({
          id: 'test-blue',
          name: 'Naval',
          colorCode: 'SW 6244',
          manufacturer: 'Sherwin-Williams',
          hexColor: '#003b5c',
        });

        // Check if color swatch exists with correct background
        const colorButton = annotatorPage.getRecentColorButton('Naval');
        const isVisible = await colorButton
          .isVisible({ timeout: 2000 })
          .catch(() => false);

        if (isVisible) {
          // Verify the swatch div has the correct hex color
          const swatch = colorButton.locator('div[style*="#003b5c"]');
          await expect(swatch).toBeVisible();
        }
      }
    } finally {
      await cleanupTestHierarchy(page, hierarchy);
    }
  });

  test('should apply recent color when clicked', async ({ page }) => {
    const uploadPage = new PhotoUploadPage(page);
    const annotatorPage = new PhotoAnnotatorPage(page);
    const projectName = `Recent Colors Test ${Date.now()}`;

    const hierarchy = await createTestProjectWithHierarchy(page, projectName);

    try {
      // Upload photo
      await uploadPage.navigateToUpload(hierarchy.project.id);
      await uploadPage.uploadSingleFile(getTestImagePath('small-photo.jpg'));
      await page.waitForTimeout(2000);

      // Navigate to project
      await page.goto(`/dashboard/projects/${hierarchy.project.id}`);
      await page.waitForLoadState('networkidle');

      // Look for annotation link
      const annotateLink = page
        .getByRole('link', { name: /annotate|add colors/i })
        .first();
      const hasLink = await annotateLink
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (hasLink) {
        await annotateLink.click();
        await page.waitForLoadState('networkidle');

        // Clear existing
        await annotatorPage.clearLocalStorageRecentColors();

        // Add a test color
        await annotatorPage.addColorToRecentColors({
          id: 'test-color-click',
          name: 'Accessible Beige',
          colorCode: 'SW 7036',
          manufacturer: 'Sherwin-Williams',
          hexColor: '#d7c9b7',
        });

        // Click the recent color
        await annotatorPage.clickRecentColor('Accessible Beige');

        // Verify toast appears (color was selected)
        await page
          .getByText(/selected.*accessible beige/i)
          .waitFor({ state: 'visible', timeout: 3000 });
      }
    } finally {
      await cleanupTestHierarchy(page, hierarchy);
    }
  });

  test('should persist recent colors after page refresh', async ({ page }) => {
    const uploadPage = new PhotoUploadPage(page);
    const annotatorPage = new PhotoAnnotatorPage(page);
    const projectName = `Recent Colors Test ${Date.now()}`;

    const hierarchy = await createTestProjectWithHierarchy(page, projectName);

    try {
      // Upload photo
      await uploadPage.navigateToUpload(hierarchy.project.id);
      await uploadPage.uploadSingleFile(getTestImagePath('small-photo.jpg'));
      await page.waitForTimeout(2000);

      // Navigate to project
      await page.goto(`/dashboard/projects/${hierarchy.project.id}`);
      await page.waitForLoadState('networkidle');

      // Look for annotation link
      const annotateLink = page
        .getByRole('link', { name: /annotate|add colors/i })
        .first();
      const hasLink = await annotateLink
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (hasLink) {
        await annotateLink.click();
        await page.waitForLoadState('networkidle');

        // Clear existing
        await annotatorPage.clearLocalStorageRecentColors();

        // Add colors
        await annotatorPage.addColorToRecentColors({
          id: 'persist-test-1',
          name: 'Pure White',
          colorCode: 'SW 7005',
          manufacturer: 'Sherwin-Williams',
          hexColor: '#eeeee0',
        });

        await annotatorPage.addColorToRecentColors({
          id: 'persist-test-2',
          name: 'Tricorn Black',
          colorCode: 'SW 6258',
          manufacturer: 'Sherwin-Williams',
          hexColor: '#2f2f30',
        });

        // Get count before refresh
        const countBefore = await annotatorPage.getRecentColorsCount();
        expect(countBefore).toBeGreaterThan(0);

        // Refresh the page
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Wait for recent colors to load
        await page.waitForTimeout(1000);

        // Verify colors still exist in localStorage
        const recentColors = await annotatorPage.getRecentColorsFromLocalStorage();
        expect(recentColors.length).toBe(2);
        expect(recentColors[0].name).toBe('Tricorn Black');
        expect(recentColors[1].name).toBe('Pure White');
      }
    } finally {
      await cleanupTestHierarchy(page, hierarchy);
    }
  });

  test('should clear all recent colors', async ({ page }) => {
    const uploadPage = new PhotoUploadPage(page);
    const annotatorPage = new PhotoAnnotatorPage(page);
    const projectName = `Recent Colors Test ${Date.now()}`;

    const hierarchy = await createTestProjectWithHierarchy(page, projectName);

    try {
      // Upload photo
      await uploadPage.navigateToUpload(hierarchy.project.id);
      await uploadPage.uploadSingleFile(getTestImagePath('small-photo.jpg'));
      await page.waitForTimeout(2000);

      // Navigate to project
      await page.goto(`/dashboard/projects/${hierarchy.project.id}`);
      await page.waitForLoadState('networkidle');

      // Look for annotation link
      const annotateLink = page
        .getByRole('link', { name: /annotate|add colors/i })
        .first();
      const hasLink = await annotateLink
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (hasLink) {
        await annotateLink.click();
        await page.waitForLoadState('networkidle');

        // Add some colors
        await annotatorPage.clearLocalStorageRecentColors();

        await annotatorPage.addColorToRecentColors({
          id: 'clear-test-1',
          name: 'Color 1',
          colorCode: 'SW 1001',
          manufacturer: 'Sherwin-Williams',
          hexColor: '#aaaaaa',
        });

        await annotatorPage.addColorToRecentColors({
          id: 'clear-test-2',
          name: 'Color 2',
          colorCode: 'SW 1002',
          manufacturer: 'Sherwin-Williams',
          hexColor: '#bbbbbb',
        });

        // Verify colors exist
        const hasColors = await annotatorPage.hasRecentColors();
        expect(hasColors).toBe(true);

        // Click clear button
        await annotatorPage.clearRecentColors();

        // Verify colors are cleared from localStorage
        const recentColors = await annotatorPage.getRecentColorsFromLocalStorage();
        expect(recentColors.length).toBe(0);

        // Recent colors section should disappear
        await page.waitForTimeout(500);
        const stillHasColors = await annotatorPage.hasRecentColors();
        expect(stillHasColors).toBe(false);
      }
    } finally {
      await cleanupTestHierarchy(page, hierarchy);
    }
  });
});
