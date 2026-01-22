import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base-page';
import path from 'path';

/**
 * Page Object for Photo Upload page
 */
export class PhotoUploadPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Locators
  get projectSelect() {
    // Look for the select trigger with "Select a project" placeholder
    return this.page.locator('[role="combobox"]').filter({ hasText: /select a project/i }).first();
  }

  get roomSelect() {
    // Look for the select trigger with "Select a room" placeholder
    return this.page.locator('[role="combobox"]').filter({ hasText: /select a room/i }).first();
  }

  get browseFilesButton() {
    return this.page.getByRole('button', { name: /browse files/i });
  }

  get takePhotoButton() {
    return this.page.getByRole('button', { name: /take photo/i });
  }

  get uploadButton() {
    return this.page.getByRole('button', { name: /upload/i }).and(
      this.page.locator('button:not([disabled])')
    );
  }

  get cancelButton() {
    return this.page.getByRole('button', { name: /cancel|clear/i });
  }

  get fileInput() {
    // Get the browse files input (not the camera input)
    // Camera input has capture attribute, browse input doesn't
    return this.page.locator('input[type="file"]:not([capture])');
  }

  get cameraInput() {
    // Camera input has capture attribute
    return this.page.locator('input[type="file"][capture]');
  }

  get progressBar() {
    return this.page.locator('[role="progressbar"]').or(
      this.page.getByTestId('upload-progress')
    );
  }

  get uploadStatus() {
    return this.page.locator('text=/uploading|uploaded|success|error/i');
  }

  // Get file preview by filename
  getFilePreview(filename: string): Locator {
    return this.page.locator(`[data-filename="${filename}"]`).or(
      this.page.locator('div').filter({ hasText: filename })
    );
  }

  // Get remove button for specific file
  getRemoveFileButton(filename: string): Locator {
    return this.getFilePreview(filename)
      .locator('button[aria-label*="remove" i], button[aria-label*="delete" i]')
      .or(
        this.getFilePreview(filename).locator('button:has(svg)')
      );
  }

  // Actions
  async navigateToUpload(projectId?: string) {
    const url = projectId
      ? `/dashboard/photos/upload?project=${projectId}`
      : '/dashboard/photos/upload';
    await this.goto(url);
    await this.waitForPageLoad();
  }

  async selectProject(projectName: string) {
    await this.projectSelect.click();
    // Wait for dropdown to appear, then click the option
    await this.page.waitForSelector('[role="option"]', { state: 'visible' });
    // Use getByRole with partial match since project names include client name
    await this.page.getByRole('option').filter({ hasText: projectName }).first().click();
  }

  async selectRoom(roomName: string) {
    await this.roomSelect.click();
    await this.page.waitForSelector('[role="option"]', { state: 'visible' });
    await this.page.getByRole('option', { name: new RegExp(roomName, 'i') }).click();
  }

  async uploadFiles(filePaths: string[]) {
    // Convert relative paths to absolute paths
    const absolutePaths = filePaths.map(filePath => {
      if (path.isAbsolute(filePath)) {
        return filePath;
      }
      return path.join(process.cwd(), filePath);
    });

    // Set files on the hidden file input
    await this.fileInput.setInputFiles(absolutePaths);

    // Wait for files to be processed and previews to appear
    await this.page.waitForTimeout(1000);
  }

  async uploadSingleFile(filePath: string) {
    await this.uploadFiles([filePath]);
  }

  async removeFile(filename: string) {
    // Hover over the file preview to make remove button visible
    const filePreview = this.getFilePreview(filename);
    await filePreview.hover();

    // Wait a moment for the button to appear
    await this.page.waitForTimeout(300);

    // Click the remove button (X button)
    await this.getRemoveFileButton(filename).click();

    // Wait for the file to be removed
    await this.page.waitForTimeout(500);
  }

  async clickUpload() {
    await this.uploadButton.click();
  }

  async clickCancel() {
    await this.cancelButton.click();
  }

  async waitForUploadComplete(timeout = 30000) {
    // Wait for upload status to show success
    await this.page.waitForSelector('text=/successfully uploaded|upload complete/i', {
      timeout,
      state: 'visible'
    });
  }

  async waitForUploadError(timeout = 10000) {
    // Wait for error message
    await this.page.waitForSelector('text=/upload failed|error/i', {
      timeout,
      state: 'visible'
    });
  }

  async getProgressValue(): Promise<number> {
    const progressBar = this.progressBar;
    const ariaValue = await progressBar.getAttribute('aria-valuenow');
    return ariaValue ? parseInt(ariaValue) : 0;
  }

  async hasFilePreview(filename: string): Promise<boolean> {
    try {
      await this.getFilePreview(filename).waitFor({
        state: 'visible',
        timeout: 2000
      });
      return true;
    } catch {
      return false;
    }
  }

  async getFileCount(): Promise<number> {
    // Look for the text showing file count: "Selected Photos (N)"
    const countText = this.page.getByText(/Selected Photos \((\d+)\)/);

    try {
      const text = await countText.textContent({ timeout: 2000 });
      const match = text?.match(/\((\d+)\)/);
      return match ? parseInt(match[1]) : 0;
    } catch {
      // If no selected photos section visible, count is 0
      return 0;
    }
  }

  async isUploadButtonEnabled(): Promise<boolean> {
    return await this.uploadButton.isEnabled();
  }

  async isUploadButtonDisabled(): Promise<boolean> {
    return await this.uploadButton.isDisabled();
  }

  // Complete upload workflow
  async uploadPhotosToProject(projectName: string, filePaths: string[]) {
    await this.selectProject(projectName);
    await this.uploadFiles(filePaths);
    await this.clickUpload();
    await this.waitForUploadComplete();
  }
}
