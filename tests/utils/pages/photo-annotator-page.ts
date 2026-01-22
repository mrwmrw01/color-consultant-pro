import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base-page';

/**
 * Page Object for Photo Annotation page
 * Tests color tagging, drawing, and annotation management
 */
export class PhotoAnnotatorPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Locators - Annotation Toolbar
  get penToolButton() {
    return this.page.getByRole('button', { name: /pen|draw/i });
  }

  get textToolButton() {
    return this.page.getByRole('button', { name: /text/i });
  }

  get colorTagButton() {
    return this.page.getByRole('button', { name: /tag/i }).or(
      this.page.locator('button:has(svg.lucide-tag)')
    );
  }

  get undoButton() {
    return this.page.getByRole('button', { name: /undo/i }).or(
      this.page.locator('button:has(svg.lucide-undo)')
    );
  }

  get redoButton() {
    return this.page.getByRole('button', { name: /redo/i }).or(
      this.page.locator('button:has(svg.lucide-redo)')
    );
  }

  get clearButton() {
    return this.page.getByRole('button', { name: /clear/i });
  }

  // Canvas
  get canvas() {
    return this.page.locator('canvas').first();
  }

  // Color Palette (8 colors)
  getColorSwatch(color: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'black' | 'gray') {
    const colorMap = {
      red: '#dc2626',
      orange: '#ea580c',
      yellow: '#ca8a04',
      green: '#16a34a',
      blue: '#2563eb',
      purple: '#9333ea',
      black: '#000000',
      gray: '#6b7280'
    };
    // Look for button with this background color
    return this.page.locator(`button[style*="${colorMap[color]}"]`);
  }

  // Annotations Summary
  get annotationsSummary() {
    return this.page.locator('text=/annotations/i').locator('..');
  }

  get annotationsCount() {
    return this.page.getByText(/\d+ annotations?/i);
  }

  getAnnotationCard(index: number) {
    // Annotation cards in the summary grid
    return this.page.locator('[data-testid="annotation-card"]').nth(index).or(
      this.annotationsSummary.locator('> div > div').nth(index)
    );
  }

  getEditButton(annotationIndex: number) {
    return this.getAnnotationCard(annotationIndex).getByRole('button', { name: /edit/i });
  }

  getDeleteButton(annotationIndex: number) {
    return this.getAnnotationCard(annotationIndex).getByRole('button', { name: /delete/i }).or(
      this.getAnnotationCard(annotationIndex).locator('button:has(svg.lucide-trash)')
    );
  }

  // Right Sidebar - Color Selection
  get colorSelectDropdown() {
    return this.page.locator('[role="combobox"]').filter({ hasText: /select.*color|color/i }).first();
  }

  get colorCatalogButton() {
    return this.page.getByRole('button', { name: /color catalog|browse colors/i }).or(
      this.page.locator('button:has(svg.lucide-palette)')
    );
  }

  // Recent Colors Section
  get recentColorsSection() {
    return this.page.getByText(/recent colors/i).locator('..');
  }

  get recentColorsClearButton() {
    return this.recentColorsSection.getByRole('button', { name: /clear/i });
  }

  getRecentColorButton(colorName: string) {
    return this.page.locator('button').filter({ hasText: colorName });
  }

  get recentColorsCount() {
    // Badge showing count
    return this.recentColorsSection.locator('[class*="badge"]');
  }

  // Favorites Section
  get favoritesSection() {
    return this.page.getByText(/favorite colors/i).locator('..');
  }

  get favoritesCount() {
    // Badge showing count in favorites section
    return this.favoritesSection.locator('[class*="badge"]');
  }

  getFavoriteColorButton(colorName: string) {
    // Color buttons in favorites section
    return this.favoritesSection.locator('button').filter({ hasText: colorName });
  }

  getFavoriteToggleButton() {
    // Star button for toggling favorite status
    return this.page.locator('button:has(svg.lucide-star)').first();
  }

  get surfaceTypeSelect() {
    return this.page.getByLabel(/surface type/i);
  }

  get roomSelect() {
    return this.page.getByLabel(/room/i);
  }

  get notesTextarea() {
    return this.page.getByLabel(/notes/i);
  }

  // Edit Dialog
  get editDialog() {
    return this.page.locator('[role="dialog"]').filter({ hasText: /edit annotation/i });
  }

  get saveChangesButton() {
    return this.editDialog.getByRole('button', { name: /save changes/i });
  }

  get cancelButton() {
    return this.page.getByRole('button', { name: /cancel/i });
  }

  // Actions
  async navigateToAnnotator(photoId: string) {
    await this.goto(`/dashboard/photos/${photoId}/annotate`);
    await this.waitForPageLoad();
  }

  async selectTool(tool: 'pen' | 'text' | 'colorTag') {
    const buttonMap = {
      pen: this.penToolButton,
      text: this.textToolButton,
      colorTag: this.colorTagButton
    };
    await buttonMap[tool].click();
  }

  async selectColor(color: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'black' | 'gray') {
    await this.getColorSwatch(color).click();
  }

  async clickOnCanvas(x: number, y: number) {
    // Click at specific coordinates on canvas
    const canvasBox = await this.canvas.boundingBox();
    if (!canvasBox) {
      throw new Error('Canvas not found');
    }

    // Click relative to canvas position
    await this.canvas.click({
      position: { x, y }
    });
  }

  async clickCanvasCenter() {
    // Click in the center of the canvas
    const canvasBox = await this.canvas.boundingBox();
    if (!canvasBox) {
      throw new Error('Canvas not found');
    }

    await this.canvas.click({
      position: {
        x: canvasBox.width / 2,
        y: canvasBox.height / 2
      }
    });
  }

  async addColorTag(color: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'black' | 'gray', x?: number, y?: number) {
    // Complete workflow: select color tag tool, select color, click on canvas
    await this.selectTool('colorTag');
    await this.selectColor(color);

    if (x !== undefined && y !== undefined) {
      await this.clickOnCanvas(x, y);
    } else {
      await this.clickCanvasCenter();
    }

    // Wait for annotation to be saved
    await this.page.waitForTimeout(1000);
  }

  async getAnnotationsCount(): Promise<number> {
    try {
      const text = await this.annotationsCount.textContent({ timeout: 2000 });
      const match = text?.match(/(\d+)/);
      return match ? parseInt(match[1]) : 0;
    } catch {
      return 0;
    }
  }

  async hasAnnotations(): Promise<boolean> {
    const count = await this.getAnnotationsCount();
    return count > 0;
  }

  async editAnnotation(index: number, options: {
    surfaceType?: string;
    room?: string;
    notes?: string;
  }) {
    // Click edit button for annotation
    await this.getEditButton(index).click();

    // Wait for dialog to open
    await this.editDialog.waitFor({ state: 'visible' });

    // Fill in fields if provided
    if (options.surfaceType) {
      await this.surfaceTypeSelect.click();
      await this.page.getByRole('option', { name: new RegExp(options.surfaceType, 'i') }).click();
    }

    if (options.room) {
      await this.roomSelect.click();
      await this.page.getByRole('option', { name: new RegExp(options.room, 'i') }).click();
    }

    if (options.notes) {
      await this.notesTextarea.fill(options.notes);
    }

    // Save changes
    await this.saveChangesButton.click();

    // Wait for dialog to close
    await this.editDialog.waitFor({ state: 'hidden', timeout: 3000 });

    // Wait for save to complete
    await this.page.waitForTimeout(1000);
  }

  async deleteAnnotation(index: number) {
    const countBefore = await this.getAnnotationsCount();

    // Click delete button
    await this.getDeleteButton(index).click();

    // Wait for deletion to process
    await this.page.waitForTimeout(1000);

    // Wait for count to decrease
    await this.page.waitForFunction(
      (expectedCount) => {
        const countText = document.body.textContent?.match(/(\d+)\s+annotations?/i);
        return countText ? parseInt(countText[1]) < expectedCount : false;
      },
      countBefore,
      { timeout: 5000 }
    );
  }

  async undoLastAction() {
    await this.undoButton.click();
    await this.page.waitForTimeout(500);
  }

  async redoLastAction() {
    await this.redoButton.click();
    await this.page.waitForTimeout(500);
  }

  async clearAllAnnotations() {
    await this.clearButton.click();

    // Confirm if dialog appears
    const confirmButton = this.page.getByRole('button', { name: /confirm|yes|clear/i });
    const isVisible = await confirmButton.isVisible({ timeout: 1000 }).catch(() => false);
    if (isVisible) {
      await confirmButton.click();
    }

    await this.page.waitForTimeout(1000);
  }

  async isToolSelected(tool: 'pen' | 'text' | 'colorTag'): Promise<boolean> {
    const buttonMap = {
      pen: this.penToolButton,
      text: this.textToolButton,
      colorTag: this.colorTagButton
    };

    const button = buttonMap[tool];

    // Check if button has active/selected styling
    const classAttr = await button.getAttribute('class');
    return classAttr?.includes('active') || classAttr?.includes('selected') || false;
  }

  async waitForAnnotationToSave() {
    // Wait for toast notification or loading indicator
    await this.page.waitForTimeout(1500);
  }

  // Recent Colors Actions
  async hasRecentColors(): Promise<boolean> {
    return await this.recentColorsSection.isVisible({ timeout: 2000 }).catch(() => false);
  }

  async getRecentColorsCount(): Promise<number> {
    try {
      const text = await this.recentColorsCount.textContent({ timeout: 2000 });
      return text ? parseInt(text) : 0;
    } catch {
      return 0;
    }
  }

  async clickRecentColor(colorName: string) {
    await this.getRecentColorButton(colorName).click();
    await this.page.waitForTimeout(500);
  }

  async clearRecentColors() {
    await this.recentColorsClearButton.click();
    await this.page.waitForTimeout(500);
  }

  async getRecentColorsFromLocalStorage(): Promise<any[]> {
    return await this.page.evaluate(() => {
      const stored = localStorage.getItem('color-consultant-recent-colors');
      return stored ? JSON.parse(stored) : [];
    });
  }

  async addColorToRecentColors(color: { id: string; name: string; colorCode: string; manufacturer: string; hexColor?: string }) {
    await this.page.evaluate((colorData) => {
      const stored = localStorage.getItem('color-consultant-recent-colors');
      const existing = stored ? JSON.parse(stored) : [];
      const filtered = existing.filter((c: any) => c.id !== colorData.id);
      const updated = [
        { ...colorData, timestamp: Date.now() },
        ...filtered
      ].slice(0, 10);
      localStorage.setItem('color-consultant-recent-colors', JSON.stringify(updated));

      // Dispatch custom event to notify components
      window.dispatchEvent(new Event('recentColorsUpdated'));
    }, color);

    await this.page.waitForTimeout(500);
  }

  async clearLocalStorageRecentColors() {
    await this.page.evaluate(() => {
      localStorage.removeItem('color-consultant-recent-colors');
      window.dispatchEvent(new Event('recentColorsUpdated'));
    });
    await this.page.waitForTimeout(500);
  }

  // Favorites Actions
  async hasFavorites(): Promise<boolean> {
    return await this.favoritesSection.isVisible({ timeout: 2000 }).catch(() => false);
  }

  async getFavoritesCount(): Promise<number> {
    try {
      const text = await this.favoritesCount.textContent({ timeout: 2000 });
      return text ? parseInt(text) : 0;
    } catch {
      return 0;
    }
  }

  async clickFavoriteColor(colorName: string) {
    await this.getFavoriteColorButton(colorName).click();
    await this.page.waitForTimeout(500);
  }

  async toggleFavorite() {
    // Click the star button to toggle favorite
    await this.getFavoriteToggleButton().click();
    await this.page.waitForTimeout(1000); // Wait for API call
  }

  async isFavorited(): Promise<boolean> {
    // Check if star button is filled (favorited state)
    const starButton = this.getFavoriteToggleButton();
    const className = await starButton.locator('svg').getAttribute('class');
    return className?.includes('fill-yellow-500') || false;
  }

  async addColorToFavorites(colorId: string) {
    // API call to add to favorites
    return await this.page.evaluate(async (id) => {
      const response = await fetch('/api/colors/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ colorId: id })
      });
      return response.ok;
    }, colorId);
  }

  async removeColorFromFavorites(colorId: string) {
    // Toggle again to remove (same endpoint toggles)
    return await this.addColorToFavorites(colorId);
  }

  async getFavoriteColorsFromAPI(): Promise<any[]> {
    return await this.page.evaluate(async () => {
      const response = await fetch('/api/colors/favorite');
      if (response.ok) {
        return await response.json();
      }
      return [];
    });
  }

  // Canvas interaction methods for auto-save tests
  async waitForCanvas() {
    await this.canvas.waitFor({ state: 'visible', timeout: 5000 });
    await this.page.waitForTimeout(1000);
  }

  async getCanvas() {
    try {
      return await this.canvas.elementHandle({ timeout: 3000 });
    } catch {
      return null;
    }
  }

  async drawSimpleStroke() {
    // Draw a simple stroke on the canvas by simulating mouse drag
    const canvasBox = await this.canvas.boundingBox();
    if (!canvasBox) {
      throw new Error('Canvas not found');
    }

    // Start from center, draw a short line
    const startX = canvasBox.width / 2;
    const startY = canvasBox.height / 2;
    const endX = startX + 50;
    const endY = startY + 50;

    // Mouse down at start position
    await this.canvas.hover({ position: { x: startX, y: startY } });
    await this.page.mouse.down();

    // Move to end position
    await this.canvas.hover({ position: { x: endX, y: endY } });

    // Mouse up
    await this.page.mouse.up();

    // Wait for annotation to be processed
    await this.page.waitForTimeout(500);
  }
}
