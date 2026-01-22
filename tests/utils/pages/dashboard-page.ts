import { Page } from '@playwright/test';
import { BasePage } from '../base-page';

/**
 * Page Object for Dashboard home page
 */
export class DashboardPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Locators
  get projectsLink() {
    return this.page.getByRole('link', { name: /projects/i });
  }

  get uploadPhotosLink() {
    return this.page.getByRole('link', { name: /upload photos/i });
  }

  get dashboardHeading() {
    return this.page.getByRole('heading', { name: /welcome/i }).or(
      this.page.getByText(/recent activity|dashboard/i).first()
    );
  }

  // Actions
  async navigateToDashboard() {
    await this.goto('/dashboard');
    await this.waitForPageLoad();
  }

  async goToProjects() {
    await this.projectsLink.click();
    await this.waitForPageLoad();
  }

  async goToUploadPhotos() {
    await this.uploadPhotosLink.click();
    await this.waitForPageLoad();
  }
}
