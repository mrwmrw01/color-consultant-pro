/**
 * Test Data Setup Utilities
 * Helper functions to create test data via API calls
 */

import { Page } from '@playwright/test';

export interface TestClient {
  id: string;
  name: string;
}

export interface TestProperty {
  id: string;
  name: string;
  address: string;
  clientId: string;
}

export interface TestProject {
  id: string;
  name: string;
  propertyId: string;
}

/**
 * Create a test client via API
 */
export async function createTestClient(
  page: Page,
  clientName?: string
): Promise<TestClient> {
  const name = clientName || `Test Client ${Date.now()}`;

  const response = await page.request.post('/api/clients', {
    data: {
      name,
      type: 'individual',
      status: 'active',
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create test client: ${response.status()}`);
  }

  const client = await response.json();
  return {
    id: client.id,
    name: client.name,
  };
}

/**
 * Create a test property via API
 */
export async function createTestProperty(
  page: Page,
  clientId: string,
  propertyName?: string
): Promise<TestProperty> {
  const address = `${Math.floor(Math.random() * 9999)} Test St`;
  const name = propertyName || `Test Property ${Date.now()}`;

  const response = await page.request.post('/api/properties', {
    data: {
      clientId,
      name,
      address,
      city: 'Test City',
      state: 'CA',
      zipCode: '90210',
      type: 'residential',
      status: 'active',
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create test property: ${response.status()}`);
  }

  const property = await response.json();
  return {
    id: property.id,
    name: property.name || property.address,
    address: property.address,
    clientId: property.clientId,
  };
}

/**
 * Create a test project via API
 */
export async function createTestProject(
  page: Page,
  propertyId: string,
  projectName?: string
): Promise<TestProject> {
  const name = projectName || `Test Project ${Date.now()}`;

  const response = await page.request.post('/api/projects', {
    data: {
      name,
      propertyId,
      description: 'Test project created by automated tests',
      status: 'active',
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create test project: ${response.status()}`);
  }

  const project = await response.json();
  return {
    id: project.id,
    name: project.name,
    propertyId: project.propertyId,
  };
}

/**
 * Create full test hierarchy: Client → Property → Project
 */
export async function createTestProjectWithHierarchy(
  page: Page,
  projectName?: string
): Promise<{
  client: TestClient;
  property: TestProperty;
  project: TestProject;
}> {
  // Create client
  const client = await createTestClient(page);

  // Create property for client
  const property = await createTestProperty(page, client.id);

  // Create project for property
  const project = await createTestProject(page, property.id, projectName);

  return { client, property, project };
}

/**
 * Delete a test project
 */
export async function deleteTestProject(
  page: Page,
  projectId: string
): Promise<void> {
  const response = await page.request.delete(`/api/projects/${projectId}`);

  if (!response.ok() && response.status() !== 404) {
    throw new Error(`Failed to delete test project: ${response.status()}`);
  }
}

/**
 * Delete a test property
 */
export async function deleteTestProperty(
  page: Page,
  propertyId: string
): Promise<void> {
  const response = await page.request.delete(`/api/properties/${propertyId}`);

  if (!response.ok() && response.status() !== 404) {
    throw new Error(`Failed to delete test property: ${response.status()}`);
  }
}

/**
 * Delete a test client
 */
export async function deleteTestClient(
  page: Page,
  clientId: string
): Promise<void> {
  const response = await page.request.delete(`/api/clients/${clientId}`);

  if (!response.ok() && response.status() !== 404) {
    throw new Error(`Failed to delete test client: ${response.status()}`);
  }
}

/**
 * Clean up entire test hierarchy
 */
export async function cleanupTestHierarchy(
  page: Page,
  hierarchy: {
    client?: TestClient;
    property?: TestProperty;
    project?: TestProject;
  }
): Promise<void> {
  // Delete in reverse order: project → property → client
  if (hierarchy.project) {
    await deleteTestProject(page, hierarchy.project.id);
  }

  if (hierarchy.property) {
    await deleteTestProperty(page, hierarchy.property.id);
  }

  if (hierarchy.client) {
    await deleteTestClient(page, hierarchy.client.id);
  }
}
