/**
 * Location Permission Test Cases for Mapbox Integration
 * Tests cross-platform location permission handling scenarios
 */

import { device, element, by, expect, waitFor } from 'detox';

describe('Location Permission Management', () => {
  beforeEach(async () => {
    await device.launchApp({ 
      newInstance: true,
      permissions: { location: 'unset' }
    });
  });

  afterEach(async () => {
    await device.terminateApp();
  });

  describe('Initial Permission Request', () => {
    it('should display location permission dialog on first map access', async () => {
      await element(by.id('home-tab')).tap();
      await element(by.id('map-button')).tap();
      
      // iOS shows native permission dialog
      if (device.getPlatform() === 'ios') {
        await expect(element(by.text('Allow "Hooked" to access your location?'))).toBeVisible();
        await expect(element(by.text('Allow While Using App'))).toBeVisible();
        await expect(element(by.text('Don\'t Allow'))).toBeVisible();
      }
      
      // Android shows system permission dialog
      if (device.getPlatform() === 'android') {
        await expect(element(by.text('Allow Hooked to access this device\'s location?'))).toBeVisible();
        await expect(element(by.text('Allow only while using the app'))).toBeVisible();
        await expect(element(by.text('Don\'t allow'))).toBeVisible();
      }
    });

    it('should show custom permission explanation before system dialog', async () => {
      await element(by.id('home-tab')).tap();
      await element(by.id('map-button')).tap();
      
      // Custom permission explanation should appear first
      await expect(element(by.id('location-permission-explanation'))).toBeVisible();
      await expect(element(by.text('Find Hooked venues near you'))).toBeVisible();
      await expect(element(by.text('We use your location to show nearby clubs and restaurants with Hooked integration.'))).toBeVisible();
      
      await element(by.id('request-location-button')).tap();
      
      // System dialog should appear after custom explanation
      await waitFor(element(by.text('Allow'))).toBeVisible().withTimeout(3000);
    });
  });

  describe('Permission Granted Scenarios', () => {
    beforeEach(async () => {
      await device.launchApp({
        newInstance: true,
        permissions: { location: 'always' }
      });
    });

    it('should display user location marker when permission granted', async () => {
      await element(by.id('map-button')).tap();
      
      await waitFor(element(by.id('mapbox-map')))
        .toBeVisible()
        .withTimeout(5000);
      
      await waitFor(element(by.id('user-location-marker')))
        .toBeVisible()
        .withTimeout(3000);
      
      // Verify location accuracy indicator
      await expect(element(by.id('location-accuracy-indicator'))).toBeVisible();
    });

    it('should center map on user location automatically', async () => {
      await element(by.id('map-button')).tap();
      
      await waitFor(element(by.id('mapbox-map'))).toBeVisible().withTimeout(5000);
      
      // Check if map is centered on user location (mock coordinates)
      const mapCenter = await element(by.id('map-center-coordinates')).getAttributes();
      expect(mapCenter.text).toContain('40.7128'); // NYC lat (mock location)
      expect(mapCenter.text).toContain('-74.0060'); // NYC lng (mock location)
    });

    it('should show "Center on my location" button when location available', async () => {
      await element(by.id('map-button')).tap();
      await waitFor(element(by.id('mapbox-map'))).toBeVisible().withTimeout(5000);
      
      await expect(element(by.id('center-location-button'))).toBeVisible();
      
      // Test center location functionality
      await element(by.id('center-location-button')).tap();
      await waitFor(element(by.id('centering-animation'))).toBeVisible().withTimeout(2000);
    });
  });

  describe('Permission Denied Scenarios', () => {
    beforeEach(async () => {
      await device.launchApp({
        newInstance: true,
        permissions: { location: 'never' }
      });
    });

    it('should show fallback city view when permission denied', async () => {
      await element(by.id('map-button')).tap();
      
      await waitFor(element(by.id('mapbox-map')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Should show default city (e.g., New York City)
      await expect(element(by.id('default-city-view'))).toBeVisible();
      await expect(element(by.text('Showing venues in New York City'))).toBeVisible();
      
      // User location marker should not be visible
      await expect(element(by.id('user-location-marker'))).not.toBeVisible();
    });

    it('should display helpful message about location benefits', async () => {
      await element(by.id('map-button')).tap();
      await waitFor(element(by.id('mapbox-map'))).toBeVisible().withTimeout(5000);
      
      await expect(element(by.id('location-denied-banner'))).toBeVisible();
      await expect(element(by.text('Enable location to find venues near you'))).toBeVisible();
      await expect(element(by.id('enable-location-settings-button'))).toBeVisible();
    });

    it('should allow manual city selection when location denied', async () => {
      await element(by.id('map-button')).tap();
      await waitFor(element(by.id('mapbox-map'))).toBeVisible().withTimeout(5000);
      
      await element(by.id('city-selector-button')).tap();
      await expect(element(by.id('city-selection-modal'))).toBeVisible();
      
      await element(by.text('Los Angeles')).tap();
      await expect(element(by.text('Showing venues in Los Angeles'))).toBeVisible();
      
      // Map should re-center to selected city
      const mapCenter = await element(by.id('map-center-coordinates')).getAttributes();
      expect(mapCenter.text).toContain('34.0522'); // LA coordinates
    });
  });

  describe('Permission State Changes', () => {
    it('should handle permission revoked during app usage', async () => {
      // Start with location permission
      await device.launchApp({
        permissions: { location: 'always' }
      });
      
      await element(by.id('map-button')).tap();
      await waitFor(element(by.id('user-location-marker')))
        .toBeVisible()
        .withTimeout(3000);
      
      // Simulate permission revoked
      await device.setPermissions({ location: 'never' });
      
      // Trigger location check (e.g., tap center button)
      await element(by.id('center-location-button')).tap();
      
      // Should show permission revoked message
      await expect(element(by.text('Location access has been disabled'))).toBeVisible();
      await expect(element(by.id('request-location-again-button'))).toBeVisible();
    });

    it('should recover when permission granted after initial denial', async () => {
      // Start with no permission
      await device.launchApp({
        permissions: { location: 'never' }
      });
      
      await element(by.id('map-button')).tap();
      await expect(element(by.id('default-city-view'))).toBeVisible();
      
      // Grant permission via settings
      await device.setPermissions({ location: 'always' });
      
      // Tap retry/enable location button
      await element(by.id('enable-location-settings-button')).tap();
      
      // Should show user location after permission granted
      await waitFor(element(by.id('user-location-marker')))
        .toBeVisible()
        .withTimeout(3000);
    });
  });

  describe('Background/Foreground Permission Behavior', () => {
    beforeEach(async () => {
      await device.launchApp({
        permissions: { location: 'always' }
      });
    });

    it('should maintain location accuracy after app backgrounded', async () => {
      await element(by.id('map-button')).tap();
      await waitFor(element(by.id('user-location-marker')))
        .toBeVisible()
        .withTimeout(3000);
      
      // Background the app
      await device.sendToHome();
      await sleep(2000);
      
      // Foreground the app
      await device.launchApp({ newInstance: false });
      
      // Location should still be available
      await expect(element(by.id('user-location-marker'))).toBeVisible();
      await expect(element(by.id('location-accuracy-indicator'))).toBeVisible();
    });

    it('should request fresh location when returning from background', async () => {
      await element(by.id('map-button')).tap();
      await waitFor(element(by.id('user-location-marker')))
        .toBeVisible()
        .withTimeout(3000);
      
      const initialAccuracy = await element(by.id('location-accuracy-value')).getAttributes();
      
      await device.sendToHome();
      await sleep(5000);
      await device.launchApp({ newInstance: false });
      
      // Should show loading indicator briefly
      await expect(element(by.id('location-updating-indicator'))).toBeVisible();
      
      // Accuracy may improve after fresh location request
      await waitFor(element(by.id('location-updating-indicator')))
        .not.toBeVisible()
        .withTimeout(5000);
    });
  });

  describe('Error Handling & Edge Cases', () => {
    it('should handle GPS disabled scenario', async () => {
      await device.launchApp({
        permissions: { location: 'always' }
      });
      
      // Simulate GPS disabled (mock poor accuracy)
      await device.setLocation(40.7128, -74.0060, { 
        horizontalAccuracy: 1000 // Very poor accuracy
      });
      
      await element(by.id('map-button')).tap();
      await waitFor(element(by.id('mapbox-map'))).toBeVisible().withTimeout(5000);
      
      // Should show low accuracy warning
      await expect(element(by.id('low-gps-accuracy-warning'))).toBeVisible();
      await expect(element(by.text('GPS signal is weak'))).toBeVisible();
    });

    it('should handle location timeout gracefully', async () => {
      await device.launchApp({
        permissions: { location: 'always' }
      });
      
      await element(by.id('map-button')).tap();
      
      // Simulate location service timeout
      await waitFor(element(by.text('Unable to determine location')))
        .toBeVisible()
        .withTimeout(15000);
      
      await expect(element(by.id('location-timeout-message'))).toBeVisible();
      await expect(element(by.id('retry-location-button'))).toBeVisible();
    });

    it('should provide clear settings redirect for iOS', async () => {
      if (device.getPlatform() === 'ios') {
        await device.launchApp({
          permissions: { location: 'never' }
        });
        
        await element(by.id('map-button')).tap();
        await element(by.id('enable-location-settings-button')).tap();
        
        // Should show iOS-specific settings instruction
        await expect(element(by.text('Open Settings > Privacy & Security > Location Services > Hooked'))).toBeVisible();
        await expect(element(by.id('open-settings-button'))).toBeVisible();
      }
    });

    it('should provide clear settings redirect for Android', async () => {
      if (device.getPlatform() === 'android') {
        await device.launchApp({
          permissions: { location: 'never' }
        });
        
        await element(by.id('map-button')).tap();
        await element(by.id('enable-location-settings-button')).tap();
        
        // Should show Android-specific settings instruction
        await expect(element(by.text('Open Settings > Apps > Hooked > Permissions > Location'))).toBeVisible();
        await expect(element(by.id('open-app-settings-button'))).toBeVisible();
      }
    });
  });
});

// Helper function for async delays
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));