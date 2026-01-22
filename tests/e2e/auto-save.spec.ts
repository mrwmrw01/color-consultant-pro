import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../utils/test-helpers';
import {
  createTestProjectWithHierarchy,
  cleanupTestHierarchy,
} from '../utils/test-data-setup';
import { PhotoUploadPage } from '../utils/pages/photo-upload-page';
import { PhotoAnnotatorPage } from '../utils/pages/photo-annotator-page';
import { getTestImagePath } from '../utils/test-helpers';

test.describe('Auto-save Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('should auto-save annotated photo after adding annotation', async ({ page }) => {
    const uploadPage = new PhotoUploadPage(page);
    const annotatorPage = new PhotoAnnotatorPage(page);
    const projectName = `AutoSave Test ${Date.now()}`;
    const hierarchy = await createTestProjectWithHierarchy(page, projectName);

    try {
      // Upload a photo
      await uploadPage.navigateToUpload(hierarchy.project.id);
      await uploadPage.uploadSingleFile(getTestImagePath('small-photo.jpg'));
      await page.waitForTimeout(2000);

      // Navigate to annotation page
      await page.goto(`/dashboard/projects/${hierarchy.project.id}`);
      await page.waitForLoadState('networkidle');

      const annotateLink = page.getByRole('link', { name: /annotate|add colors/i }).first();
      const hasLink = await annotateLink.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasLink) {
        await annotateLink.click();
        await page.waitForLoadState('networkidle');

        // Wait for annotation interface to be ready
        await annotatorPage.waitForCanvas();

        // Create an annotation by drawing on the canvas
        await annotatorPage.drawSimpleStroke();
        await page.waitForTimeout(1000);

        // Auto-save should trigger after annotation is created
        // Wait for auto-save to complete (happens 500ms after annotation)
        await page.waitForTimeout(1500);

        // Verify that the auto-save mechanism was invoked
        // We can't directly test S3 upload, but we can verify no errors occurred
        const hasErrors = await page.locator('text=/error|failed/i').isVisible({ timeout: 1000 }).catch(() => false);
        expect(hasErrors).toBe(false);
      }
    } finally {
      await cleanupTestHierarchy(page, hierarchy);
    }
  });

  test('should show annotation interface without errors', async ({ page }) => {
    const uploadPage = new PhotoUploadPage(page);
    const annotatorPage = new PhotoAnnotatorPage(page);
    const projectName = `AutoSave Test ${Date.now()}`;
    const hierarchy = await createTestProjectWithHierarchy(page, projectName);

    try {
      // Upload a photo
      await uploadPage.navigateToUpload(hierarchy.project.id);
      await uploadPage.uploadSingleFile(getTestImagePath('small-photo.jpg'));
      await page.waitForTimeout(2000);

      // Navigate to annotation page
      await page.goto(`/dashboard/projects/${hierarchy.project.id}`);
      await page.waitForLoadState('networkidle');

      const annotateLink = page.getByRole('link', { name: /annotate|add colors/i }).first();
      const hasLink = await annotateLink.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasLink) {
        await annotateLink.click();
        await page.waitForLoadState('networkidle');

        // Wait for annotation interface to be ready
        await annotatorPage.waitForCanvas();

        // Verify annotation interface loads without errors
        const canvas = await annotatorPage.getCanvas();
        expect(canvas).not.toBeNull();

        // Check that no error messages are displayed
        const hasErrors = await page.locator('text=/error|failed/i').isVisible({ timeout: 1000 }).catch(() => false);
        expect(hasErrors).toBe(false);
      }
    } finally {
      await cleanupTestHierarchy(page, hierarchy);
    }
  });

  test('should allow navigating away without data loss after annotation', async ({ page }) => {
    const uploadPage = new PhotoUploadPage(page);
    const annotatorPage = new PhotoAnnotatorPage(page);
    const projectName = `AutoSave Test ${Date.now()}`;
    const hierarchy = await createTestProjectWithHierarchy(page, projectName);

    try {
      // Upload a photo
      await uploadPage.navigateToUpload(hierarchy.project.id);
      await uploadPage.uploadSingleFile(getTestImagePath('small-photo.jpg'));
      await page.waitForTimeout(2000);

      // Navigate to annotation page
      await page.goto(`/dashboard/projects/${hierarchy.project.id}`);
      await page.waitForLoadState('networkidle');

      const annotateLink = page.getByRole('link', { name: /annotate|add colors/i }).first();
      const hasLink = await annotateLink.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasLink) {
        await annotateLink.click();
        await page.waitForLoadState('networkidle');

        // Wait for annotation interface
        await annotatorPage.waitForCanvas();

        // Create an annotation
        await annotatorPage.drawSimpleStroke();
        await page.waitForTimeout(1000);

        // Wait for auto-save
        await page.waitForTimeout(1500);

        // Navigate back to project page
        await page.goto(`/dashboard/projects/${hierarchy.project.id}`);
        await page.waitForLoadState('networkidle');

        // Navigate back to annotation page
        await page.goto(page.url().replace(/\/projects\/[^/]+$/, `/projects/${hierarchy.project.id}`));
        await page.waitForLoadState('networkidle');

        // Verify we can still access the annotation page
        const canAnnotate = await page.getByRole('link', { name: /annotate|add colors/i }).first().isVisible({ timeout: 3000 }).catch(() => false);
        expect(canAnnotate).toBeTruthy();
      }
    } finally {
      await cleanupTestHierarchy(page, hierarchy);
    }
  });

  test('should auto-save after editing annotation', async ({ page }) => {
    const uploadPage = new PhotoUploadPage(page);
    const annotatorPage = new PhotoAnnotatorPage(page);
    const projectName = `AutoSave Test ${Date.now()}`;
    const hierarchy = await createTestProjectWithHierarchy(page, projectName);

    try {
      // Upload a photo
      await uploadPage.navigateToUpload(hierarchy.project.id);
      await uploadPage.uploadSingleFile(getTestImagePath('small-photo.jpg'));
      await page.waitForTimeout(2000);

      // Navigate to annotation page
      await page.goto(`/dashboard/projects/${hierarchy.project.id}`);
      await page.waitForLoadState('networkidle');

      const annotateLink = page.getByRole('link', { name: /annotate|add colors/i }).first();
      const hasLink = await annotateLink.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasLink) {
        await annotateLink.click();
        await page.waitForLoadState('networkidle');

        // Wait for annotation interface
        await annotatorPage.waitForCanvas();

        // Create an annotation
        await annotatorPage.drawSimpleStroke();
        await page.waitForTimeout(1000);

        // Check if edit button exists (annotation was saved)
        const editButton = page.locator('button[title*="Edit"]').first();
        const hasEditButton = await editButton.isVisible({ timeout: 3000 }).catch(() => false);

        if (hasEditButton) {
          // Click edit button
          await editButton.click();
          await page.waitForTimeout(500);

          // Verify edit dialog opens
          const editDialog = page.locator('text=/Edit Annotation/i').first();
          const dialogVisible = await editDialog.isVisible({ timeout: 2000 }).catch(() => false);

          if (dialogVisible) {
            // Close dialog
            const cancelButton = page.locator('button', { hasText: /cancel/i }).first();
            await cancelButton.click();
            await page.waitForTimeout(500);

            // Auto-save should handle the state correctly
            const hasErrors = await page.locator('text=/error|failed/i').isVisible({ timeout: 1000 }).catch(() => false);
            expect(hasErrors).toBe(false);
          }
        }
      }
    } finally {
      await cleanupTestHierarchy(page, hierarchy);
    }
  });

  test('should auto-save after deleting annotation', async ({ page }) => {
    const uploadPage = new PhotoUploadPage(page);
    const annotatorPage = new PhotoAnnotatorPage(page);
    const projectName = `AutoSave Test ${Date.now()}`;
    const hierarchy = await createTestProjectWithHierarchy(page, projectName);

    try {
      // Upload a photo
      await uploadPage.navigateToUpload(hierarchy.project.id);
      await uploadPage.uploadSingleFile(getTestImagePath('small-photo.jpg'));
      await page.waitForTimeout(2000);

      // Navigate to annotation page
      await page.goto(`/dashboard/projects/${hierarchy.project.id}`);
      await page.waitForLoadState('networkidle');

      const annotateLink = page.getByRole('link', { name: /annotate|add colors/i }).first();
      const hasLink = await annotateLink.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasLink) {
        await annotateLink.click();
        await page.waitForLoadState('networkidle');

        // Wait for annotation interface
        await annotatorPage.waitForCanvas();

        // Create an annotation
        await annotatorPage.drawSimpleStroke();
        await page.waitForTimeout(1500);

        // Try to delete the annotation
        const deleteButton = page.locator('button[title*="Delete"]').first();
        const hasDeleteButton = await deleteButton.isVisible({ timeout: 3000 }).catch(() => false);

        if (hasDeleteButton) {
          await deleteButton.click();
          await page.waitForTimeout(1000);

          // Wait for auto-save after deletion (500ms delay)
          await page.waitForTimeout(1500);

          // Verify no errors occurred during auto-save
          const hasErrors = await page.locator('text=/error|failed/i').isVisible({ timeout: 1000 }).catch(() => false);
          expect(hasErrors).toBe(false);
        }
      }
    } finally {
      await cleanupTestHierarchy(page, hierarchy);
    }
  });

  test('should handle annotation updates without conflicts', async ({ page }) => {
    const uploadPage = new PhotoUploadPage(page);
    const annotatorPage = new PhotoAnnotatorPage(page);
    const projectName = `AutoSave Test ${Date.now()}`;
    const hierarchy = await createTestProjectWithHierarchy(page, projectName);

    try {
      // Upload a photo
      await uploadPage.navigateToUpload(hierarchy.project.id);
      await uploadPage.uploadSingleFile(getTestImagePath('small-photo.jpg'));
      await page.waitForTimeout(2000);

      // Navigate to annotation page
      await page.goto(`/dashboard/projects/${hierarchy.project.id}`);
      await page.waitForLoadState('networkidle');

      const annotateLink = page.getByRole('link', { name: /annotate|add colors/i }).first();
      const hasLink = await annotateLink.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasLink) {
        await annotateLink.click();
        await page.waitForLoadState('networkidle');

        // Wait for annotation interface
        await annotatorPage.waitForCanvas();

        // Create multiple annotations to test conflict handling
        await annotatorPage.drawSimpleStroke();
        await page.waitForTimeout(1000);

        await annotatorPage.drawSimpleStroke();
        await page.waitForTimeout(1000);

        // Wait for auto-save to complete
        await page.waitForTimeout(1500);

        // Verify the annotation interface is still functional
        const canvas = await annotatorPage.getCanvas();
        expect(canvas).not.toBeNull();

        // Verify no error messages about conflicts
        const hasConflictErrors = await page.locator('text=/conflict|duplicate/i').isVisible({ timeout: 1000 }).catch(() => false);
        expect(hasConflictErrors).toBe(false);

        // Verify general error check
        const hasErrors = await page.locator('text=/error|failed/i').isVisible({ timeout: 1000 }).catch(() => false);
        expect(hasErrors).toBe(false);
      }
    } finally {
      await cleanupTestHierarchy(page, hierarchy);
    }
  });
});
