import { test, expect } from '@playwright/test';
import { loginAsTestUser, waitForToast } from '../utils/test-helpers';
import {
  createTestProjectWithHierarchy,
  cleanupTestHierarchy,
} from '../utils/test-data-setup';

test.describe('Synopsis Draft Editor', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('should navigate to synopsis draft editor from project page', async ({ page }) => {
    const projectName = `Synopsis Nav Test ${Date.now()}`;
    const hierarchy = await createTestProjectWithHierarchy(page, projectName);

    try {
      // Navigate to the project detail page
      await page.goto(`/dashboard/projects/${hierarchy.project.id}`);
      await page.waitForLoadState('networkidle');

      // Click the "Edit Synopsis" button
      const editSynopsisButton = page.getByRole('link', { name: /edit synopsis/i });
      await expect(editSynopsisButton).toBeVisible();
      await editSynopsisButton.click();
      await page.waitForLoadState('networkidle');

      // Verify we landed on the synopsis-draft page
      await expect(page).toHaveURL(
        new RegExp(`/dashboard/projects/${hierarchy.project.id}/synopsis-draft`)
      );

      // Verify the editor loaded with the expected section headings
      await expect(page.getByText('Client Information')).toBeVisible();
      await expect(page.getByText('Color Summary')).toBeVisible();
      await expect(page.getByText('Specifications')).toBeVisible();
    } finally {
      await cleanupTestHierarchy(page, hierarchy);
    }
  });

  test('should display editor header with project name', async ({ page }) => {
    const projectName = `Synopsis Header Test ${Date.now()}`;
    const hierarchy = await createTestProjectWithHierarchy(page, projectName);

    try {
      await page.goto(
        `/dashboard/projects/${hierarchy.project.id}/synopsis-draft`
      );
      await page.waitForLoadState('networkidle');

      // The header renders "<projectName> - Synopsis"
      await expect(
        page.getByRole('heading', { name: new RegExp(projectName) })
      ).toBeVisible();

      // The saved-state indicator should default to "All changes saved"
      await expect(page.getByText('All changes saved')).toBeVisible();
    } finally {
      await cleanupTestHierarchy(page, hierarchy);
    }
  });

  test('should edit client name and show unsaved changes indicator', async ({ page }) => {
    const projectName = `Synopsis Edit Test ${Date.now()}`;
    const hierarchy = await createTestProjectWithHierarchy(page, projectName);

    try {
      await page.goto(
        `/dashboard/projects/${hierarchy.project.id}/synopsis-draft`
      );
      await page.waitForLoadState('networkidle');

      // Wait for the editor to finish loading (client name input visible)
      const clientNameInput = page.getByLabel(/name/i).first();
      await expect(clientNameInput).toBeVisible();

      // Change the client name
      await clientNameInput.fill('');
      await clientNameInput.fill('Updated Test Client');

      // The dirty indicator should appear
      await expect(page.getByText('Unsaved changes')).toBeVisible({ timeout: 5000 });

      // Click the Save button
      const saveButton = page.getByRole('button', { name: /save/i });
      await saveButton.click();

      // After save completes, "All changes saved" should appear and the
      // sonner toast "Saved" should fire
      await expect(page.getByText('All changes saved')).toBeVisible({ timeout: 10000 });
    } finally {
      await cleanupTestHierarchy(page, hierarchy);
    }
  });

  test('should display client information form fields', async ({ page }) => {
    const projectName = `Synopsis Fields Test ${Date.now()}`;
    const hierarchy = await createTestProjectWithHierarchy(page, projectName);

    try {
      await page.goto(
        `/dashboard/projects/${hierarchy.project.id}/synopsis-draft`
      );
      await page.waitForLoadState('networkidle');

      // Verify all client information inputs are rendered
      await expect(page.getByLabel(/name/i).first()).toBeVisible();
      await expect(page.getByLabel(/address/i)).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/phone/i)).toBeVisible();
      await expect(page.getByLabel(/consult date/i)).toBeVisible();
    } finally {
      await cleanupTestHierarchy(page, hierarchy);
    }
  });

  test('should verify drag handles exist on group cards', async ({ page }) => {
    // NOTE: Drag-and-drop testing is notoriously flaky in Playwright.
    // This test only verifies that drag handles are rendered when groups exist.
    // A freshly created project without annotations will have zero groups,
    // so we verify the empty-state message instead and skip the handle check
    // if no groups are present.

    const projectName = `Synopsis Drag Test ${Date.now()}`;
    const hierarchy = await createTestProjectWithHierarchy(page, projectName);

    try {
      await page.goto(
        `/dashboard/projects/${hierarchy.project.id}/synopsis-draft`
      );
      await page.waitForLoadState('networkidle');

      // The Specifications section should be visible
      await expect(page.getByText('Specifications')).toBeVisible();

      // Check whether any group cards rendered (depends on annotations)
      const gripHandles = page.locator('.lucide-grip-vertical');
      const handleCount = await gripHandles.count();

      if (handleCount > 0) {
        // Verify at least one drag handle is visible
        await expect(gripHandles.first()).toBeVisible();
      } else {
        // No groups means we should see the empty-state message
        await expect(
          page.getByText(/no color groups/i)
        ).toBeVisible();
      }
    } finally {
      await cleanupTestHierarchy(page, hierarchy);
    }
  });

  test('should export DOCX and trigger download', async ({ page }) => {
    const projectName = `Synopsis Export Test ${Date.now()}`;
    const hierarchy = await createTestProjectWithHierarchy(page, projectName);

    try {
      await page.goto(
        `/dashboard/projects/${hierarchy.project.id}/synopsis-draft`
      );
      await page.waitForLoadState('networkidle');

      // Wait for editor to finish loading
      await expect(page.getByText('Client Information')).toBeVisible();

      // Set up download listener BEFORE clicking export
      const downloadPromise = page.waitForEvent('download', { timeout: 15000 });

      // Click "Export DOCX"
      const exportButton = page.getByRole('button', { name: /export docx/i });
      await expect(exportButton).toBeVisible();
      await exportButton.click();

      // Start waiting for the toast IMMEDIATELY (sonner auto-dismisses after ~4s;
      // waiting for the download first made this assertion race the timeout)
      const toastPromise = expect(page.getByText(/synopsis exported/i)).toBeVisible({ timeout: 15000 });

      // Wait for the download event
      const download = await downloadPromise;

      // Verify the downloaded file has a .docx extension
      const suggestedFilename = download.suggestedFilename();
      expect(suggestedFilename).toMatch(/\.docx$/);

      // Verify the toast notification
      await toastPromise;
    } finally {
      await cleanupTestHierarchy(page, hierarchy);
    }
  });

  test('should reset synopsis from annotations', async ({ page }) => {
    const projectName = `Synopsis Reset Test ${Date.now()}`;
    const hierarchy = await createTestProjectWithHierarchy(page, projectName);

    try {
      await page.goto(
        `/dashboard/projects/${hierarchy.project.id}/synopsis-draft`
      );
      await page.waitForLoadState('networkidle');

      // Wait for editor to finish loading
      await expect(page.getByText('Client Information')).toBeVisible();

      // Click "Reset" — a confirm dialog now guards the destructive reset
      const resetButton = page.getByRole('button', { name: /reset/i });
      await expect(resetButton).toBeVisible();
      page.once('dialog', (dialog) => dialog.accept());
      await resetButton.click();

      // Verify the toast message
      await waitForToast(page, /synopsis re-generated from annotations/i, 10000);
    } finally {
      await cleanupTestHierarchy(page, hierarchy);
    }
  });

  test('should navigate back to project via back arrow', async ({ page }) => {
    const projectName = `Synopsis Back Nav Test ${Date.now()}`;
    const hierarchy = await createTestProjectWithHierarchy(page, projectName);

    try {
      await page.goto(
        `/dashboard/projects/${hierarchy.project.id}/synopsis-draft`
      );
      await page.waitForLoadState('networkidle');

      // Click the back arrow link (first ghost button with ArrowLeft icon)
      const backLink = page
        .locator(`a[href="/dashboard/projects/${hierarchy.project.id}"]`)
        .first();
      await expect(backLink).toBeVisible();
      await backLink.click();

      // Should navigate back to the project detail page
      await expect(page).toHaveURL(
        new RegExp(`/dashboard/projects/${hierarchy.project.id}$`)
      );
    } finally {
      await cleanupTestHierarchy(page, hierarchy);
    }
  });

  test('should render action buttons in header toolbar', async ({ page }) => {
    const projectName = `Synopsis Toolbar Test ${Date.now()}`;
    const hierarchy = await createTestProjectWithHierarchy(page, projectName);

    try {
      await page.goto(
        `/dashboard/projects/${hierarchy.project.id}/synopsis-draft`
      );
      await page.waitForLoadState('networkidle');

      // All three action buttons should be visible
      await expect(
        page.getByRole('button', { name: /save/i })
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: /reset/i })
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: /export docx/i })
      ).toBeVisible();
    } finally {
      await cleanupTestHierarchy(page, hierarchy);
    }
  });
});
