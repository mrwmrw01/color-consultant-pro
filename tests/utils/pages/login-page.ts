import { Page } from '@playwright/test';
import { BasePage } from '../base-page';

/**
 * Page Object for Login/Sign In page
 */
export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Locators
  get emailInput() {
    return this.page.getByLabel(/email/i);
  }

  get passwordInput() {
    return this.page.getByLabel(/password/i);
  }

  get signInButton() {
    return this.page.getByRole('button', { name: /sign in/i });
  }

  get signUpLink() {
    return this.page.getByRole('link', { name: /sign up/i });
  }

  get errorMessage() {
    return this.page.getByText(/invalid email or password|something went wrong/i);
  }

  get successMessage() {
    return this.page.getByText(/welcome back/i);
  }

  // Actions
  async navigateToLogin() {
    await this.goto('/auth/signin');
    await this.waitForPageLoad();
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  async clickSignIn() {
    await this.signInButton.click();
  }

  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickSignIn();
  }

  async loginWithTestUser() {
    const email = process.env.TEST_USER_EMAIL || 'test@colorguru.com';
    const password = process.env.TEST_USER_PASSWORD || 'TestPassword123!';
    await this.login(email, password);
  }

  async waitForLoginSuccess() {
    // Wait for redirect to dashboard
    await this.page.waitForURL(/\/dashboard/, { timeout: 10000 });
  }

  async waitForLoginError() {
    await this.errorMessage.waitFor({ state: 'visible', timeout: 5000 });
  }
}
