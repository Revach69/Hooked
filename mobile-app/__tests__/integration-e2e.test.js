/**
 * End-to-End Integration Testing Suite
 * Tests complete workflow from admin dashboard to mobile app
 */

import { device, element, by, expect, waitFor } from 'detox';
import { LocationPermissionHelpers } from './helpers/location-permission-helpers';

describe('Mapbox Integration - End-to-End Tests', () => {
  beforeAll(async () => {
    // Start Firebase emulator and web admin dashboard
    await setupTestEnvironment();
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  beforeEach(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { location: 'always' }
    });
  });

  afterEach(async () => {
    await device.terminateApp();
  });

  describe('Admin Dashboard → Mobile App Integration', () => {
    it('should sync new map client from admin to mobile app', async () => {
      // Step 1: Create map client via admin dashboard API
      const testClient = {
        name: 'E2E Test Venue',
        address: '123 Integration Street, NYC',
        latitude: 40.7589,
        longitude: -73.9851,
        type: 'continuous',
        category: 'nightclub',
        subscriptionTier: 'premium'
      };

      console.log('Creating map client via admin dashboard...');
      const clientId = await createMapClientViaAPI(testClient);
      expect(clientId).toBeTruthy();

      // Step 2: Wait for sync to complete
      await waitForSyncCompletion(clientId);

      // Step 3: Open mobile app and navigate to map
      await element(by.id('home-tab')).tap();
      await element(by.id('map-button')).tap();
      await LocationPermissionHelpers.waitForMapReady();

      // Step 4: Verify new client appears on mobile map
      await LocationPermissionHelpers.setMockLocation({
        latitude: testClient.latitude,
        longitude: testClient.longitude
      });

      // Pan to the venue location
      await centerMapOnLocation(testClient.latitude, testClient.longitude);

      // Verify venue marker is visible
      const venueMarker = element(by.id(`venue-marker-${clientId}`));
      await expect(venueMarker).toBeVisible();

      // Step 5: Tap marker to verify details
      await venueMarker.tap();
      await expect(element(by.id('venue-details-modal'))).toBeVisible();
      await expect(element(by.text(testClient.name))).toBeVisible();
      await expect(element(by.text(testClient.address))).toBeVisible();

      // Step 6: Verify client type is displayed correctly
      await expect(element(by.text('Continuous Client'))).toBeVisible();
      await expect(element(by.text('Premium'))).toBeVisible();

      console.log('✅ Admin → Mobile sync test completed successfully');
    });

    it('should sync map client updates from admin to mobile', async () => {
      // Step 1: Create initial client
      const initialClient = {
        name: 'Update Test Venue',
        address: '456 Update Street, NYC',
        latitude: 40.7500,
        longitude: -73.9800,
        type: 'continuous',
        subscriptionTier: 'basic'
      };

      const clientId = await createMapClientViaAPI(initialClient);
      await waitForSyncCompletion(clientId);

      // Step 2: Verify initial state in mobile app
      await element(by.id('map-button')).tap();
      await LocationPermissionHelpers.waitForMapReady();
      await centerMapOnLocation(initialClient.latitude, initialClient.longitude);

      let venueMarker = element(by.id(`venue-marker-${clientId}`));
      await expect(venueMarker).toBeVisible();

      await venueMarker.tap();
      await expect(element(by.text(initialClient.name))).toBeVisible();
      await expect(element(by.text('Basic'))).toBeVisible();
      await element(by.id('close-venue-modal')).tap();

      // Step 3: Update client via admin dashboard
      const updatedClient = {
        ...initialClient,
        name: 'Updated Test Venue',
        subscriptionTier: 'enterprise'
      };

      await updateMapClientViaAPI(clientId, updatedClient);
      await waitForSyncCompletion(clientId);

      // Step 4: Refresh mobile app and verify updates
      await device.reloadReactNative();
      await element(by.id('map-button')).tap();
      await LocationPermissionHelpers.waitForMapReady();
      await centerMapOnLocation(initialClient.latitude, initialClient.longitude);

      venueMarker = element(by.id(`venue-marker-${clientId}`));
      await expect(venueMarker).toBeVisible();

      await venueMarker.tap();
      await expect(element(by.text('Updated Test Venue'))).toBeVisible();
      await expect(element(by.text('Enterprise'))).toBeVisible();

      console.log('✅ Admin update → Mobile sync test completed successfully');
    });

    it('should handle map client deletion from admin to mobile', async () => {
      // Step 1: Create client
      const clientToDelete = {
        name: 'Delete Test Venue',
        address: '789 Delete Street, NYC',
        latitude: 40.7400,
        longitude: -73.9900,
        type: 'continuous'
      };

      const clientId = await createMapClientViaAPI(clientToDelete);
      await waitForSyncCompletion(clientId);

      // Step 2: Verify client exists in mobile app
      await element(by.id('map-button')).tap();
      await LocationPermissionHelpers.waitForMapReady();
      await centerMapOnLocation(clientToDelete.latitude, clientToDelete.longitude);

      let venueMarker = element(by.id(`venue-marker-${clientId}`));
      await expect(venueMarker).toBeVisible();

      // Step 3: Delete client via admin dashboard
      await deleteMapClientViaAPI(clientId);
      await waitForSyncCompletion(clientId, 'deleted');

      // Step 4: Refresh mobile app and verify deletion
      await device.reloadReactNative();
      await element(by.id('map-button')).tap();
      await LocationPermissionHelpers.waitForMapReady();
      await centerMapOnLocation(clientToDelete.latitude, clientToDelete.longitude);

      // Venue marker should no longer exist
      venueMarker = element(by.id(`venue-marker-${clientId}`));
      await expect(venueMarker).not.toBeVisible();

      console.log('✅ Admin deletion → Mobile sync test completed successfully');
    });
  });

  describe('Mobile App → Backend → Admin Dashboard Flow', () => {
    it('should track mobile app usage in admin analytics', async () => {
      // Step 1: Generate mobile app activity
      await element(by.id('map-button')).tap();
      await LocationPermissionHelpers.waitForMapReady();

      // Load test venues
      await element(by.id('load-test-venues-button')).tap();
      await waitFor(element(by.id('venues-loaded-indicator')))
        .toBeVisible()
        .withTimeout(5000);

      // Interact with multiple venues
      const venueMarkers = element(by.id('venue-marker')); // Generic selector
      const markerCount = await venueMarkers.getElementCount();

      for (let i = 0; i < Math.min(3, markerCount); i++) {
        const marker = venueMarkers.atIndex(i);
        await marker.tap();
        await expect(element(by.id('venue-details-modal'))).toBeVisible();
        await LocationPermissionHelpers.sleep(1000); // View venue for 1 second
        await element(by.id('close-venue-modal')).tap();
      }

      // Step 2: Verify analytics data via admin API
      const analyticsData = await getAnalyticsDataViaAPI();
      
      expect(analyticsData.mapViews).toBeGreaterThan(0);
      expect(analyticsData.venueInteractions).toBeGreaterThan(0);
      expect(analyticsData.sessionDuration).toBeGreaterThan(0);

      console.log('✅ Mobile usage → Admin analytics test completed successfully');
    });

    it('should report performance metrics to admin dashboard', async () => {
      // Step 1: Perform performance-intensive operations in mobile app
      await element(by.id('map-button')).tap();
      await LocationPermissionHelpers.waitForMapReady();

      // Enable performance monitoring
      await element(by.id('performance-monitor-toggle')).tap();

      // Load many venues
      await element(by.id('load-performance-test-data')).tap();
      await waitFor(element(by.id('75-venues-loaded')))
        .toBeVisible()
        .withTimeout(10000);

      // Perform intensive interactions
      for (let i = 0; i < 10; i++) {
        await element(by.id('mapbox-map')).swipe('up', 'fast');
        await element(by.id('mapbox-map')).pinchWithAngle('outward', 1.5, 0);
        await LocationPermissionHelpers.sleep(200);
      }

      // Step 2: Verify performance data is collected
      const performanceMetrics = await getPerformanceMetricsViaAPI();
      
      expect(performanceMetrics.averageFPS).toBeGreaterThan(0);
      expect(performanceMetrics.mapLoadTime).toBeGreaterThan(0);
      expect(performanceMetrics.memoryUsage).toBeGreaterThan(0);

      console.log('✅ Mobile performance → Admin reporting test completed successfully');
    });
  });

  describe('Cross-Platform Data Consistency', () => {
    it('should maintain data consistency across iOS and Android', async () => {
      const testClient = {
        name: 'Cross-Platform Test Venue',
        address: '999 Consistency Street, NYC',
        latitude: 40.7600,
        longitude: -73.9700,
        type: 'continuous',
        operatingHours: {
          monday: { open: '18:00', close: '02:00' },
          friday: { open: '18:00', close: '03:00' }
        }
      };

      // Create client via admin API
      const clientId = await createMapClientViaAPI(testClient);
      await waitForSyncCompletion(clientId);

      // Test on current platform (iOS or Android)
      await element(by.id('map-button')).tap();
      await LocationPermissionHelpers.waitForMapReady();
      await centerMapOnLocation(testClient.latitude, testClient.longitude);

      const venueMarker = element(by.id(`venue-marker-${clientId}`));
      await expect(venueMarker).toBeVisible();

      await venueMarker.tap();
      await expect(element(by.text(testClient.name))).toBeVisible();

      // Verify operating hours display
      await expect(element(by.text('Mon: 6:00 PM - 2:00 AM'))).toBeVisible();
      await expect(element(by.text('Fri: 6:00 PM - 3:00 AM'))).toBeVisible();

      // Record platform-specific data
      const platformData = {
        platform: device.getPlatform(),
        markerVisible: true,
        detailsAccessible: true,
        hoursFormatted: true
      };

      await recordPlatformTestData(clientId, platformData);

      console.log(`✅ Data consistency verified on ${device.getPlatform()}`);
    });

    it('should handle offline/online sync correctly', async () => {
      // Step 1: Create client while online
      const offlineTestClient = {
        name: 'Offline Sync Test Venue',
        address: '111 Offline Street, NYC',
        latitude: 40.7300,
        longitude: -74.0100,
        type: 'one-time'
      };

      const clientId = await createMapClientViaAPI(offlineTestClient);
      await waitForSyncCompletion(clientId);

      // Step 2: Verify client exists while online
      await element(by.id('map-button')).tap();
      await LocationPermissionHelpers.waitForMapReady();
      
      let venueMarker = element(by.id(`venue-marker-${clientId}`));
      await expect(venueMarker).toBeVisible();

      // Step 3: Go offline
      await device.setNetworkConditions('airplane');

      // Navigate away and back to map
      await element(by.id('home-tab')).tap();
      await LocationPermissionHelpers.sleep(1000);
      await element(by.id('map-button')).tap();

      // Should still show cached venues
      await waitFor(element(by.id('mapbox-map')))
        .toBeVisible()
        .withTimeout(10000);
        
      // May show offline indicator but venues should still be visible from cache
      await expect(element(by.text('Offline Mode'))).toBeVisible();

      // Step 4: Go back online
      await device.setNetworkConditions('wifi');
      await LocationPermissionHelpers.sleep(3000); // Wait for reconnection

      // Should sync any pending changes
      await expect(element(by.text('Online'))).toBeVisible();
      venueMarker = element(by.id(`venue-marker-${clientId}`));
      await expect(venueMarker).toBeVisible();

      console.log('✅ Offline/online sync test completed successfully');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle API failures gracefully', async () => {
      // Step 1: Simulate API failure
      await simulateAPIFailure();

      // Step 2: Open map - should show cached data or graceful error
      await element(by.id('map-button')).tap();
      
      // Should either show cached venues or error message
      try {
        await waitFor(element(by.id('mapbox-map')))
          .toBeVisible()
          .withTimeout(10000);
      } catch (e) {
        // If map fails to load, should show error message
        await expect(element(by.text('Unable to load venues'))).toBeVisible();
        await expect(element(by.id('retry-venues-button'))).toBeVisible();
      }

      // Step 3: Restore API and retry
      await restoreAPI();
      
      if (await element(by.id('retry-venues-button')).isVisible()) {
        await element(by.id('retry-venues-button')).tap();
      }

      // Should now work properly
      await LocationPermissionHelpers.waitForMapReady();
      await expect(element(by.id('venues-loaded-indicator'))).toBeVisible();

      console.log('✅ API failure recovery test completed successfully');
    });

    it('should handle sync conflicts properly', async () => {
      // Step 1: Create client
      const conflictClient = {
        name: 'Conflict Test Venue',
        address: '222 Conflict Street, NYC',
        latitude: 40.7700,
        longitude: -73.9600,
        type: 'continuous'
      };

      const clientId = await createMapClientViaAPI(conflictClient);
      await waitForSyncCompletion(clientId);

      // Step 2: Simulate concurrent updates from different sources
      const update1 = { ...conflictClient, name: 'Update 1 Name' };
      const update2 = { ...conflictClient, name: 'Update 2 Name' };

      // Send updates simultaneously
      const [result1, result2] = await Promise.allSettled([
        updateMapClientViaAPI(clientId, update1),
        updateMapClientViaAPI(clientId, update2)
      ]);

      // One should succeed, one should handle conflict
      expect(result1.status === 'fulfilled' || result2.status === 'fulfilled').toBe(true);

      // Wait for conflict resolution
      await waitForSyncCompletion(clientId);

      // Step 3: Verify final state in mobile app
      await device.reloadReactNative();
      await element(by.id('map-button')).tap();
      await LocationPermissionHelpers.waitForMapReady();

      const venueMarker = element(by.id(`venue-marker-${clientId}`));
      await expect(venueMarker).toBeVisible();

      // Should show one of the updates (conflict resolution worked)
      await venueMarker.tap();
      const modalText = await element(by.id('venue-details-modal')).getAttributes();
      expect(modalText.text).toMatch(/Update [12] Name/);

      console.log('✅ Sync conflict resolution test completed successfully');
    });
  });
});

/**
 * Helper Functions for Integration Testing
 */

async function setupTestEnvironment() {
  console.log('🚀 Setting up E2E test environment...');
  
  // Start Firebase emulator
  // This would typically be handled by the CI/CD pipeline
  console.log('Starting Firebase emulator...');
  
  // Start web admin dashboard
  console.log('Starting web admin dashboard...');
  
  // Wait for services to be ready
  await waitForServicesReady();
}

async function teardownTestEnvironment() {
  console.log('🧹 Tearing down E2E test environment...');
  
  // Cleanup test data
  await cleanupTestData();
  
  // Stop services if needed
  console.log('Stopping test services...');
}

async function waitForServicesReady() {
  // Implement polling to check if services are ready
  let attempts = 0;
  const maxAttempts = 30;
  
  while (attempts < maxAttempts) {
    try {
      // Check if admin API is responsive
      const response = await fetch('http://localhost:3000/api/health');
      if (response.ok) {
        console.log('✅ Web services are ready');
        return;
      }
    } catch (e) {
      // Service not ready yet
    }
    
    attempts++;
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error('Services failed to start within timeout');
}

async function createMapClientViaAPI(client) {
  const response = await fetch('http://localhost:3000/api/map-clients', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-admin-token'
    },
    body: JSON.stringify(client)
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create map client: ${response.statusText}`);
  }
  
  const result = await response.json();
  return result.id;
}

async function updateMapClientViaAPI(clientId, updates) {
  const response = await fetch(`http://localhost:3000/api/map-clients/${clientId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-admin-token'
    },
    body: JSON.stringify(updates)
  });
  
  if (!response.ok) {
    throw new Error(`Failed to update map client: ${response.statusText}`);
  }
  
  return await response.json();
}

async function deleteMapClientViaAPI(clientId) {
  const response = await fetch(`http://localhost:3000/api/map-clients/${clientId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': 'Bearer test-admin-token'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to delete map client: ${response.statusText}`);
  }
}

async function waitForSyncCompletion(clientId, expectedStatus = 'synced') {
  let attempts = 0;
  const maxAttempts = 15;
  
  while (attempts < maxAttempts) {
    try {
      const response = await fetch(`http://localhost:3000/api/map-clients/${clientId}/sync-status`, {
        headers: {
          'Authorization': 'Bearer test-admin-token'
        }
      });
      
      if (response.ok) {
        const status = await response.json();
        if (status.syncStatus === expectedStatus) {
          return;
        }
      }
    } catch (e) {
      // Continue polling
    }
    
    attempts++;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.warn(`Sync did not complete within timeout for client ${clientId}`);
}

async function centerMapOnLocation(latitude, longitude) {
  // Set mock location first
  await LocationPermissionHelpers.setMockLocation({ latitude, longitude });
  
  // Center map on location
  await element(by.id('center-location-button')).tap();
  
  // Wait for animation to complete
  await LocationPermissionHelpers.sleep(2000);
  
  // Zoom to appropriate level
  await element(by.id('zoom-in-button')).tap();
  await element(by.id('zoom-in-button')).tap();
}

async function getAnalyticsDataViaAPI() {
  const response = await fetch('http://localhost:3000/api/analytics/map-usage', {
    headers: {
      'Authorization': 'Bearer test-admin-token'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get analytics data: ${response.statusText}`);
  }
  
  return await response.json();
}

async function getPerformanceMetricsViaAPI() {
  const response = await fetch('http://localhost:3000/api/analytics/performance', {
    headers: {
      'Authorization': 'Bearer test-admin-token'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get performance metrics: ${response.statusText}`);
  }
  
  return await response.json();
}

async function recordPlatformTestData(clientId, data) {
  await fetch(`http://localhost:3000/api/test/platform-data/${clientId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-admin-token'
    },
    body: JSON.stringify(data)
  });
}

async function simulateAPIFailure() {
  await fetch('http://localhost:3000/api/test/simulate-failure', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer test-admin-token'
    }
  });
}

async function restoreAPI() {
  await fetch('http://localhost:3000/api/test/restore-api', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer test-admin-token'
    }
  });
}

async function cleanupTestData() {
  await fetch('http://localhost:3000/api/test/cleanup', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer test-admin-token'
    }
  });
}