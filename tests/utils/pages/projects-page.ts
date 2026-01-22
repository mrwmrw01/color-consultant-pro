import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base-page';

/**
 * Page Object for Projects List page
 */
export class ProjectsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Locators
  get createProjectButton() {
    // Could be "New Project", "Create Project", or similar
    return this.page.getByRole('button', { name: /new project|create project|add project/i });
  }

  get projectList() {
    return this.page.locator('[data-testid="project-list"]').or(
      this.page.locator('main').locator('div').filter({ hasText: /project/i })
    );
  }

  // Get project card by name
  getProjectByName(projectName: string): Locator {
    return this.page.getByRole('link').filter({ hasText: projectName });
  }

  // Get project actions button (3-dot menu)
  getProjectActionsButton(projectName: string): Locator {
    // Find the project card and look for actions button
    return this.getProjectByName(projectName)
      .locator('..')
      .getByRole('button', { name: /more|actions|menu/i });
  }

  // Actions
  async navigateToProjects() {
    await this.goto('/dashboard/projects');
    await this.waitForPageLoad();
  }

  async clickCreateProject() {
    await this.createProjectButton.click();
  }

  async openProject(projectName: string) {
    await this.getProjectByName(projectName).click();
    await this.waitForPageLoad();
  }

  async waitForProjectToAppear(projectName: string, timeout = 10000) {
    await this.getProjectByName(projectName).waitFor({
      state: 'visible',
      timeout
    });
  }

  async projectExists(projectName: string): Promise<boolean> {
    try {
      await this.getProjectByName(projectName).waitFor({
        state: 'visible',
        timeout: 2000
      });
      return true;
    } catch {
      return false;
    }
  }

  async deleteProject(projectName: string) {
    // Click project actions button
    const actionsButton = this.getProjectActionsButton(projectName);
    await actionsButton.click();

    // Click delete option
    await this.page.getByRole('menuitem', { name: /delete/i }).click();

    // Confirm deletion
    await this.page.getByRole('button', { name: /confirm|delete|yes/i }).click();

    // Wait for deletion
    await this.getProjectByName(projectName).waitFor({
      state: 'hidden',
      timeout: 5000
    });
  }

  async renameProject(oldName: string, newName: string) {
    // Click project actions button
    const actionsButton = this.getProjectActionsButton(oldName);
    await actionsButton.click();

    // Click rename/edit option
    await this.page.getByRole('menuitem', { name: /rename|edit/i }).click();

    // Fill in new name
    const nameInput = this.page.getByLabel(/project name|name/i);
    await nameInput.clear();
    await nameInput.fill(newName);

    // Save
    await this.page.getByRole('button', { name: /save|update/i }).click();

    // Wait for new name to appear
    await this.waitForProjectToAppear(newName);
  }
}
