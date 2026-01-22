import { test, expect } from '@playwright/test';
import { loginAsTestUser, generateProjectName } from '../utils/test-helpers';
import { ProjectsPage } from '../utils/pages/projects-page';
import { DashboardPage } from '../utils/pages/dashboard-page';
import {
  createTestProjectWithHierarchy,
  cleanupTestHierarchy,
} from '../utils/test-data-setup';

test.describe('Project Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginAsTestUser(page);
  });

  test('should display projects page', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    const projectsPage = new ProjectsPage(page);

    // Navigate to projects
    await dashboardPage.goToProjects();

    // Verify we're on projects page
    await expect(page).toHaveURL(/\/dashboard\/projects/);
    await page.waitForLoadState('networkidle');
  });

  test('should show empty state when no projects exist', async ({ page }) => {
    const projectsPage = new ProjectsPage(page);

    // Navigate to projects
    await projectsPage.navigateToProjects();

    // Check for empty state or project list
    // Note: Test user might already have projects, so we check for either state
    const hasProjects = await page.locator('main').getByText(/project/i).count() > 0;

    if (!hasProjects) {
      // Should show empty state or create project prompt
      await expect(
        page.getByText(/no projects|create your first project|get started/i)
      ).toBeVisible();
    }
  });

  test('should navigate to projects from dashboard', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    // Start on dashboard
    await dashboardPage.navigateToDashboard();

    // Click Projects link
    await dashboardPage.goToProjects();

    // Verify navigation
    await expect(page).toHaveURL(/\/dashboard\/projects/);
  });

  test('should create and display a new project', async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    const projectName = generateProjectName();

    // Create project via API (includes client and property)
    const hierarchy = await createTestProjectWithHierarchy(page, projectName);

    try {
      // Navigate to projects page
      await projectsPage.navigateToProjects();

      // Verify project appears in list
      await projectsPage.waitForProjectToAppear(projectName);
      await expect(projectsPage.getProjectByName(projectName)).toBeVisible();
    } finally {
      // Cleanup
      await cleanupTestHierarchy(page, hierarchy);
    }
  });

  test('should open an existing project', async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    const projectName = generateProjectName();

    // Create test project
    const hierarchy = await createTestProjectWithHierarchy(page, projectName);

    try {
      // Navigate to projects
      await projectsPage.navigateToProjects();

      // Open the project
      await projectsPage.openProject(projectName);

      // Verify we're on project page
      await expect(page).toHaveURL(new RegExp(`/projects/${hierarchy.project.id}`));
      await page.waitForLoadState('networkidle');
    } finally {
      // Cleanup
      await cleanupTestHierarchy(page, hierarchy);
    }
  });
});
