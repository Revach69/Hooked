/**
 * Admin Dashboard Map Clients Testing
 * Tests CRUD operations for Map Clients management interface
 */

import { test, expect } from '@playwright/test';

test.describe('Map Clients Management', () => {
  let adminContext;

  test.beforeAll(async ({ browser }) => {
    // Create admin context with authentication
    adminContext = await browser.newContext();
    const page = await adminContext.newPage();
    
    // Login as admin
    await page.goto('/admin/login');
    await page.fill('[data-testid="admin-email"]', 'admin@hooked.com');
    await page.fill('[data-testid="admin-password"]', 'testpassword123');
    await page.click('[data-testid="login-button"]');
    
    // Wait for successful login redirect
    await page.waitForURL('/admin/dashboard');
    await page.close();
  });

  test.afterAll(async () => {
    await adminContext.close();
  });

  test.beforeEach(async () => {
    const page = await adminContext.newPage();
    
    // Navigate to Map Clients page
    await page.goto('/admin/map-clients');
    await page.waitForLoadState('networkidle');
    
    // Ensure we're on the correct page
    await expect(page.locator('h1')).toContainText('Map Clients');
  });

  test.describe('Map Clients CRUD Operations', () => {
    test('should display existing map clients in table format', async () => {
      const page = adminContext.pages()[0];
      
      // Wait for table to load
      await expect(page.locator('[data-testid="map-clients-table"]')).toBeVisible();
      
      // Check table headers
      await expect(page.locator('th')).toContainText(['Name', 'Address', 'Type', 'Status', 'Subscription', 'Actions']);
      
      // Should have at least one test client
      const rows = page.locator('[data-testid="client-row"]');
      await expect(rows).toHaveCount({ min: 0 });
    });

    test('should create new continuous map client', async () => {
      const page = adminContext.pages()[0];
      
      // Click Add New Map Client button
      await page.click('[data-testid="add-map-client-button"]');
      
      // Wait for modal to open
      await expect(page.locator('[data-testid="map-client-modal"]')).toBeVisible();
      
      // Fill out client form
      const testClient = {
        name: 'Test Continuous Club',
        address: '123 Test Street, New York, NY 10001',
        latitude: '40.7128',
        longitude: '-74.0060',
        type: 'continuous',
        category: 'nightclub',
        phone: '+1234567890',
        email: 'test@testclub.com',
        operatingHours: {
          monday: { open: '18:00', close: '02:00', closed: false },
          tuesday: { open: '18:00', close: '02:00', closed: false },
          wednesday: { open: '18:00', close: '02:00', closed: false },
          thursday: { open: '18:00', close: '02:00', closed: false },
          friday: { open: '18:00', close: '03:00', closed: false },
          saturday: { open: '18:00', close: '03:00', closed: false },
          sunday: { closed: true }
        },
        subscriptionTier: 'premium',
        monthlyFee: 299
      };
      
      await page.fill('[data-testid="client-name"]', testClient.name);
      await page.fill('[data-testid="client-address"]', testClient.address);
      await page.fill('[data-testid="client-latitude"]', testClient.latitude);
      await page.fill('[data-testid="client-longitude"]', testClient.longitude);
      
      await page.selectOption('[data-testid="client-type"]', testClient.type);
      await page.selectOption('[data-testid="client-category"]', testClient.category);
      
      await page.fill('[data-testid="client-phone"]', testClient.phone);
      await page.fill('[data-testid="client-email"]', testClient.email);
      
      // Set operating hours
      await page.selectOption('[data-testid="subscription-tier"]', testClient.subscriptionTier);
      await page.fill('[data-testid="monthly-fee"]', testClient.monthlyFee.toString());
      
      // Submit form
      await page.click('[data-testid="save-map-client-button"]');
      
      // Wait for success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Map client created successfully');
      
      // Verify client appears in table
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-testid="client-row"]').filter({ hasText: testClient.name })).toBeVisible();
      
      // Verify client type badge
      const clientRow = page.locator('[data-testid="client-row"]').filter({ hasText: testClient.name });
      await expect(clientRow.locator('[data-testid="client-type-badge"]')).toContainText('Continuous');
    });

    test('should edit existing map client', async () => {
      const page = adminContext.pages()[0];
      
      // Find first client and click edit
      const firstClientRow = page.locator('[data-testid="client-row"]').first();
      await firstClientRow.locator('[data-testid="edit-client-button"]').click();
      
      // Wait for edit modal
      await expect(page.locator('[data-testid="map-client-modal"]')).toBeVisible();
      
      // Modify client name
      const originalName = await page.locator('[data-testid="client-name"]').inputValue();
      const updatedName = `${originalName} - Updated`;
      
      await page.fill('[data-testid="client-name"]', updatedName);
      
      // Update subscription tier
      await page.selectOption('[data-testid="subscription-tier"]', 'enterprise');
      await page.fill('[data-testid="monthly-fee"]', '499');
      
      // Save changes
      await page.click('[data-testid="save-map-client-button"]');
      
      // Verify success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Map client updated successfully');
      
      // Verify changes in table
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-testid="client-row"]').filter({ hasText: updatedName })).toBeVisible();
    });

    test('should delete map client with confirmation', async () => {
      const page = adminContext.pages()[0];
      
      // Get initial count of clients
      const initialCount = await page.locator('[data-testid="client-row"]').count();
      
      if (initialCount === 0) {
        test.skip('No clients to delete');
      }
      
      // Find last client and click delete
      const lastClientRow = page.locator('[data-testid="client-row"]').last();
      const clientName = await lastClientRow.locator('[data-testid="client-name-cell"]').textContent();
      
      await lastClientRow.locator('[data-testid="delete-client-button"]').click();
      
      // Confirm deletion in modal
      await expect(page.locator('[data-testid="delete-confirmation-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="delete-confirmation-text"]')).toContainText(clientName);
      
      await page.click('[data-testid="confirm-delete-button"]');
      
      // Verify success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Map client deleted successfully');
      
      // Verify client removed from table
      await page.waitForLoadState('networkidle');
      const finalCount = await page.locator('[data-testid="client-row"]').count();
      expect(finalCount).toBe(initialCount - 1);
    });
  });

  test.describe('Map Clients Filtering and Search', () => {
    test('should filter clients by type', async () => {
      const page = adminContext.pages()[0];
      
      // Select continuous clients filter
      await page.selectOption('[data-testid="filter-client-type"]', 'continuous');
      await page.waitForLoadState('networkidle');
      
      // All visible clients should be continuous type
      const visibleRows = page.locator('[data-testid="client-row"]');
      const count = await visibleRows.count();
      
      for (let i = 0; i < count; i++) {
        const typeBadge = visibleRows.nth(i).locator('[data-testid="client-type-badge"]');
        await expect(typeBadge).toContainText('Continuous');
      }
      
      // Select one-time clients filter
      await page.selectOption('[data-testid="filter-client-type"]', 'one-time');
      await page.waitForLoadState('networkidle');
      
      // All visible clients should be one-time type
      const onetimeCount = await page.locator('[data-testid="client-row"]').count();
      for (let i = 0; i < onetimeCount; i++) {
        const typeBadge = visibleRows.nth(i).locator('[data-testid="client-type-badge"]');
        await expect(typeBadge).toContainText('One-time');
      }
    });

    test('should search clients by name', async () => {
      const page = adminContext.pages()[0];
      
      // Get first client name for search
      const firstClientRow = page.locator('[data-testid="client-row"]').first();
      const clientName = await firstClientRow.locator('[data-testid="client-name-cell"]').textContent();
      
      if (!clientName) {
        test.skip('No clients available for search test');
      }
      
      // Search for partial client name
      const searchTerm = clientName.split(' ')[0];
      await page.fill('[data-testid="search-clients"]', searchTerm);
      await page.waitForLoadState('networkidle');
      
      // All visible clients should match search term
      const visibleRows = page.locator('[data-testid="client-row"]');
      const count = await visibleRows.count();
      
      expect(count).toBeGreaterThan(0);
      
      for (let i = 0; i < count; i++) {
        const name = await visibleRows.nth(i).locator('[data-testid="client-name-cell"]').textContent();
        expect(name.toLowerCase()).toContain(searchTerm.toLowerCase());
      }
    });

    test('should filter clients by subscription status', async () => {
      const page = adminContext.pages()[0];
      
      // Filter by active subscriptions
      await page.selectOption('[data-testid="filter-subscription-status"]', 'active');
      await page.waitForLoadState('networkidle');
      
      // All visible clients should have active subscriptions
      const activeRows = page.locator('[data-testid="client-row"]');
      const activeCount = await activeRows.count();
      
      for (let i = 0; i < activeCount; i++) {
        const statusBadge = activeRows.nth(i).locator('[data-testid="subscription-status-badge"]');
        await expect(statusBadge).toContainText('Active');
      }
    });
  });

  test.describe('Map Clients Validation', () => {
    test('should validate required fields when creating client', async () => {
      const page = adminContext.pages()[0];
      
      await page.click('[data-testid="add-map-client-button"]');
      await expect(page.locator('[data-testid="map-client-modal"]')).toBeVisible();
      
      // Try to save without filling required fields
      await page.click('[data-testid="save-map-client-button"]');
      
      // Should show validation errors
      await expect(page.locator('[data-testid="error-client-name"]')).toContainText('Name is required');
      await expect(page.locator('[data-testid="error-client-address"]')).toContainText('Address is required');
      await expect(page.locator('[data-testid="error-client-coordinates"]')).toContainText('Coordinates are required');
    });

    test('should validate coordinate format', async () => {
      const page = adminContext.pages()[0];
      
      await page.click('[data-testid="add-map-client-button"]');
      await expect(page.locator('[data-testid="map-client-modal"]')).toBeVisible();
      
      // Fill required fields
      await page.fill('[data-testid="client-name"]', 'Test Validation Client');
      await page.fill('[data-testid="client-address"]', '123 Test St');
      
      // Enter invalid coordinates
      await page.fill('[data-testid="client-latitude"]', '999'); // Invalid latitude
      await page.fill('[data-testid="client-longitude"]', 'invalid'); // Invalid longitude
      
      await page.click('[data-testid="save-map-client-button"]');
      
      // Should show coordinate validation errors
      await expect(page.locator('[data-testid="error-latitude"]')).toContainText('Latitude must be between -90 and 90');
      await expect(page.locator('[data-testid="error-longitude"]')).toContainText('Longitude must be a valid number');
    });

    test('should validate email format', async () => {
      const page = adminContext.pages()[0];
      
      await page.click('[data-testid="add-map-client-button"]');
      await expect(page.locator('[data-testid="map-client-modal"]')).toBeVisible();
      
      // Fill valid required fields
      await page.fill('[data-testid="client-name"]', 'Test Email Validation');
      await page.fill('[data-testid="client-address"]', '123 Test St');
      await page.fill('[data-testid="client-latitude"]', '40.7128');
      await page.fill('[data-testid="client-longitude"]', '-74.0060');
      
      // Enter invalid email
      await page.fill('[data-testid="client-email"]', 'invalid-email');
      
      await page.click('[data-testid="save-map-client-button"]');
      
      // Should show email validation error
      await expect(page.locator('[data-testid="error-email"]')).toContainText('Please enter a valid email address');
    });
  });

  test.describe('Map Clients Data Sync', () => {
    test('should sync client data to mobile app', async () => {
      const page = adminContext.pages()[0];
      
      // Create a test client
      await page.click('[data-testid="add-map-client-button"]');
      
      const testClient = {
        name: 'Sync Test Club',
        address: '456 Sync Street, NYC',
        latitude: '40.7500',
        longitude: '-73.9850'
      };
      
      await page.fill('[data-testid="client-name"]', testClient.name);
      await page.fill('[data-testid="client-address"]', testClient.address);
      await page.fill('[data-testid="client-latitude"]', testClient.latitude);
      await page.fill('[data-testid="client-longitude"]', testClient.longitude);
      await page.selectOption('[data-testid="client-type"]', 'continuous');
      
      await page.click('[data-testid="save-map-client-button"]');
      
      // Wait for success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Map client created successfully');
      
      // Verify sync status indicator
      const clientRow = page.locator('[data-testid="client-row"]').filter({ hasText: testClient.name });
      
      // Should show synced status after a few seconds
      await expect(clientRow.locator('[data-testid="sync-status"]')).toContainText('Synced', { timeout: 10000 });
    });

    test('should handle sync failures gracefully', async () => {
      const page = adminContext.pages()[0];
      
      // Simulate network failure during sync
      await page.route('**/api/sync-clients', route => {
        route.abort();
      });
      
      // Try to create a client
      await page.click('[data-testid="add-map-client-button"]');
      
      await page.fill('[data-testid="client-name"]', 'Sync Failure Test');
      await page.fill('[data-testid="client-address"]', '789 Error St');
      await page.fill('[data-testid="client-latitude"]', '40.7000');
      await page.fill('[data-testid="client-longitude"]', '-74.0000');
      
      await page.click('[data-testid="save-map-client-button"]');
      
      // Should show warning about sync failure
      await expect(page.locator('[data-testid="warning-message"]')).toContainText('Client saved but sync to mobile failed');
      
      // Should show retry sync button
      const clientRow = page.locator('[data-testid="client-row"]').filter({ hasText: 'Sync Failure Test' });
      await expect(clientRow.locator('[data-testid="retry-sync-button"]')).toBeVisible();
      
      // Clear network failure simulation
      await page.unroute('**/api/sync-clients');
      
      // Retry sync should work
      await clientRow.locator('[data-testid="retry-sync-button"]').click();
      await expect(clientRow.locator('[data-testid="sync-status"]')).toContainText('Synced', { timeout: 10000 });
    });
  });

  test.describe('Map Clients Pagination', () => {
    test('should paginate large client lists', async () => {
      const page = adminContext.pages()[0];
      
      // Check if pagination controls are visible
      const clientRows = page.locator('[data-testid="client-row"]');
      const clientCount = await clientRows.count();
      
      if (clientCount >= 10) {
        // Should show pagination controls
        await expect(page.locator('[data-testid="pagination-controls"]')).toBeVisible();
        
        // Test next page
        if (await page.locator('[data-testid="next-page-button"]').isEnabled()) {
          await page.click('[data-testid="next-page-button"]');
          await page.waitForLoadState('networkidle');
          
          // Should show different clients
          const newClientRows = page.locator('[data-testid="client-row"]');
          const newCount = await newClientRows.count();
          expect(newCount).toBeGreaterThan(0);
        }
      }
    });

    test('should allow changing items per page', async () => {
      const page = adminContext.pages()[0];
      
      // Change items per page to 5
      await page.selectOption('[data-testid="items-per-page"]', '5');
      await page.waitForLoadState('networkidle');
      
      // Should show maximum 5 clients
      const clientRows = page.locator('[data-testid="client-row"]');
      const count = await clientRows.count();
      expect(count).toBeLessThanOrEqual(5);
    });
  });

  test.describe('Map Clients Export', () => {
    test('should export clients to CSV', async () => {
      const page = adminContext.pages()[0];
      
      // Start download
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="export-csv-button"]');
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/map-clients.*\.csv$/);
      
      // Verify CSV content (basic check)
      const path = await download.path();
      expect(path).toBeTruthy();
    });

    test('should export filtered clients', async () => {
      const page = adminContext.pages()[0];
      
      // Apply filter
      await page.selectOption('[data-testid="filter-client-type"]', 'continuous');
      await page.waitForLoadState('networkidle');
      
      // Export filtered results
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="export-csv-button"]');
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('continuous');
    });
  });
});