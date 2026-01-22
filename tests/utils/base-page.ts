import { Page, Locator } from '@playwright/test';

/**
 * Base Page Object class with common functionality
 */
export class BasePage {
  constructor(public readonly page: Page) {}

  /**
   * Navigate to a specific path
   */
  async goto(path: string) {
    await this.page.goto(path);
  }

  /**
   * Wait for page to be fully loaded
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get element by test ID
   */
  getByTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  /**
   * Get element by role
   */
  getByRole(role: Parameters<Page['getByRole']>[0], options?: Parameters<Page['getByRole']>[1]): Locator {
    return this.page.getByRole(role, options);
  }

  /**
   * Get element by text
   */
  getByText(text: string | RegExp): Locator {
    return this.page.getByText(text);
  }

  /**
   * Wait for toast message to appear
   */
  async waitForToast(message: string | RegExp) {
    await this.page.getByText(message).waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Wait for element to be visible
   */
  async waitForVisible(selector: string) {
    await this.page.waitForSelector(selector, { state: 'visible' });
  }

  /**
   * Wait for element to be hidden
   */
  async waitForHidden(selector: string) {
    await this.page.waitForSelector(selector, { state: 'hidden' });
  }

  /**
   * Take a screenshot for debugging
   */
  async screenshot(name: string) {
    await this.page.screenshot({ path: `test-results/screenshots/${name}.png` });
  }
}
