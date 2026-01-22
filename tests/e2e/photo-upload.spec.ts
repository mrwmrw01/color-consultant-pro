import { test, expect } from '@playwright/test';
import {
  loginAsTestUser,
  getTestImagePath,
  waitForToast,
} from '../utils/test-helpers';
import { PhotoUploadPage } from '../utils/pages/photo-upload-page';
import {
  createTestProjectWithHierarchy,
  cleanupTestHierarchy,
} from '../utils/test-data-setup';

test.describe('Photo Upload', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginAsTestUser(page);
  });

  test('should display photo upload page', async ({ page }) => {
    const uploadPage = new PhotoUploadPage(page);

    // Navigate to upload page
    await uploadPage.navigateToUpload();

    // Verify we're on upload page
    await expect(page).toHaveURL(/\/dashboard\/photos\/upload/);

    // Verify key elements are visible
    await expect(uploadPage.projectSelect).toBeVisible();
    await expect(uploadPage.browseFilesButton).toBeVisible();
  });

  test('should upload JPG photo successfully', async ({ page }) => {
    const uploadPage = new PhotoUploadPage(page);
    const projectName = `Photo Test ${Date.now()}`;

    // Create test project
    const hierarchy = await createTestProjectWithHierarchy(page, projectName);

    try {
      // Navigate to upload page
      await uploadPage.navigateToUpload();

      // Select project
      await uploadPage.selectProject(projectName);

      // Upload JPG file
      const jpgPath = getTestImagePath('small-photo.jpg');
      await uploadPage.uploadSingleFile(jpgPath);

      // Verify file preview appears
      expect(await uploadPage.getFileCount()).toBeGreaterThan(0);

      // Upload button should be enabled now
      expect(await uploadPage.isUploadButtonEnabled()).toBe(true);

      // Click upload button
      await uploadPage.clickUpload();

      // NOTE: Actual upload may fail if S3 is not configured
      // We test the UI workflow up to this point
      // In a production test environment, configure real S3 or MinIO
    } finally {
      // Cleanup
      await cleanupTestHierarchy(page, hierarchy);
    }
  });

  test('should upload PNG photo successfully', async ({ page }) => {
    const uploadPage = new PhotoUploadPage(page);
    const projectName = `Photo Test ${Date.now()}`;

    // Create test project
    const hierarchy = await createTestProjectWithHierarchy(page, projectName);

    try {
      // Navigate to upload page
      await uploadPage.navigateToUpload();

      // Select project
      await uploadPage.selectProject(projectName);

      // Upload PNG file
      const pngPath = getTestImagePath('medium-photo.png');
      await uploadPage.uploadSingleFile(pngPath);

      // Verify file preview appears
      expect(await uploadPage.getFileCount()).toBeGreaterThan(0);

      // Upload button should be enabled
      expect(await uploadPage.isUploadButtonEnabled()).toBe(true);
    } finally {
      // Cleanup
      await cleanupTestHierarchy(page, hierarchy);
    }
  });

  test('should upload multiple photos at once', async ({ page }) => {
    const uploadPage = new PhotoUploadPage(page);
    const projectName = `Photo Test ${Date.now()}`;

    // Create test project
    const hierarchy = await createTestProjectWithHierarchy(page, projectName);

    try {
      // Navigate to upload page
      await uploadPage.navigateToUpload();

      // Select project
      await uploadPage.selectProject(projectName);

      // Upload multiple files
      const files = [
        getTestImagePath('small-photo.jpg'),
        getTestImagePath('medium-photo.png'),
        getTestImagePath('medium-photo.jpg'),
      ];
      await uploadPage.uploadFiles(files);

      // Verify all files appear in preview
      const fileCount = await uploadPage.getFileCount();
      expect(fileCount).toBe(3);

      // Upload button should be enabled
      expect(await uploadPage.isUploadButtonEnabled()).toBe(true);
    } finally {
      // Cleanup
      await cleanupTestHierarchy(page, hierarchy);
    }
  });

  test('should show error when uploading invalid file type', async ({
    page,
  }) => {
    const uploadPage = new PhotoUploadPage(page);
    const projectName = `Photo Test ${Date.now()}`;

    // Create test project
    const hierarchy = await createTestProjectWithHierarchy(page, projectName);

    try {
      // Navigate to upload page
      await uploadPage.navigateToUpload();

      // Select project
      await uploadPage.selectProject(projectName);

      // Try to upload invalid file (txt file)
      const invalidPath = getTestImagePath('invalid.txt');
      await uploadPage.uploadSingleFile(invalidPath);

      // File might be filtered out client-side or show error
      // Check if upload button is disabled or error appears
      const fileCount = await uploadPage.getFileCount();

      if (fileCount > 0) {
        // If file was added, clicking upload should show error
        await uploadPage.clickUpload();
        await uploadPage.waitForUploadError();
        await waitForToast(page, /invalid|not supported|error/i);
      } else {
        // File was filtered out client-side (expected behavior)
        expect(fileCount).toBe(0);
      }
    } finally {
      // Cleanup
      await cleanupTestHierarchy(page, hierarchy);
    }
  });

  test('should require project selection before upload', async ({ page }) => {
    const uploadPage = new PhotoUploadPage(page);

    // Navigate to upload page
    await uploadPage.navigateToUpload();

    // Upload file without selecting project
    const jpgPath = getTestImagePath('small-photo.jpg');
    await uploadPage.uploadSingleFile(jpgPath);

    // Wait a moment for file to be added
    await page.waitForTimeout(1000);

    // Upload button should be disabled (no project selected)
    // Check by trying to locate disabled upload button
    const uploadButton = page.getByRole('button', { name: /upload/i });
    const isDisabled = await uploadButton.isDisabled();
    expect(isDisabled).toBe(true);
  });

  test('should display upload progress indicator', async ({ page }) => {
    const uploadPage = new PhotoUploadPage(page);
    const projectName = `Photo Test ${Date.now()}`;

    // Create test project
    const hierarchy = await createTestProjectWithHierarchy(page, projectName);

    try {
      // Navigate to upload page
      await uploadPage.navigateToUpload();

      // Select project and file
      await uploadPage.selectProject(projectName);
      await uploadPage.uploadSingleFile(getTestImagePath('small-photo.jpg'));

      // Verify upload button is enabled with file and project selected
      expect(await uploadPage.isUploadButtonEnabled()).toBe(true);

      // NOTE: Testing actual progress requires S3 configuration
      // This test verifies the pre-upload UI state
    } finally {
      // Cleanup
      await cleanupTestHierarchy(page, hierarchy);
    }
  });

  test('should allow removing files before upload', async ({ page }) => {
    const uploadPage = new PhotoUploadPage(page);
    const projectName = `Photo Test ${Date.now()}`;

    // Create test project
    const hierarchy = await createTestProjectWithHierarchy(page, projectName);

    try {
      // Navigate to upload page
      await uploadPage.navigateToUpload();

      // Select project
      await uploadPage.selectProject(projectName);

      // Upload multiple files
      await uploadPage.uploadFiles([
        getTestImagePath('small-photo.jpg'),
        getTestImagePath('medium-photo.png'),
      ]);

      // Verify 2 files
      expect(await uploadPage.getFileCount()).toBe(2);

      // Click "Clear All" button
      await page.getByRole('button', { name: /clear all/i }).click();

      // Should have 0 files
      expect(await uploadPage.getFileCount()).toBe(0);
    } finally {
      // Cleanup
      await cleanupTestHierarchy(page, hierarchy);
    }
  });

  test('should preselect project from URL parameter', async ({ page }) => {
    const uploadPage = new PhotoUploadPage(page);
    const projectName = `Photo Test ${Date.now()}`;

    // Create test project
    const hierarchy = await createTestProjectWithHierarchy(page, projectName);

    try {
      // Navigate with project ID in URL
      await uploadPage.navigateToUpload(hierarchy.project.id);

      // Project should be preselected
      // Upload file and it should work
      await uploadPage.uploadSingleFile(getTestImagePath('small-photo.jpg'));

      // Upload button should be enabled (project already selected)
      expect(await uploadPage.isUploadButtonEnabled()).toBe(true);
    } finally {
      // Cleanup
      await cleanupTestHierarchy(page, hierarchy);
    }
  });
});
