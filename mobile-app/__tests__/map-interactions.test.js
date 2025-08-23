/**
 * Map Interaction Test Suite for Mapbox Integration
 * Tests core map functionality including zoom, pan, markers, and gestures
 */

import { device, element, by, expect, waitFor } from 'detox';
import { LocationPermissionHelpers } from './helpers/location-permission-helpers';

describe('Map Interaction Testing', () => {
  beforeEach(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { location: 'always' }
    });
    
    // Navigate to map and wait for it to load
    await element(by.id('home-tab')).tap();
    await element(by.id('map-button')).tap();
    await LocationPermissionHelpers.waitForMapReady();
  });

  afterEach(async () => {
    await device.terminateApp();
  });

  describe('Basic Map Controls', () => {
    it('should support pinch-to-zoom gestures', async () => {
      const initialZoom = await element(by.id('map-zoom-level')).getAttributes();
      
      // Zoom in with pinch gesture
      await element(by.id('mapbox-map')).pinchWithAngle('outward', 1.5, 0);
      
      await waitFor(element(by.id('map-zoom-level')))
        .toHaveText((parseInt(initialZoom.text) + 1).toString())
        .withTimeout(2000);
      
      // Zoom out with pinch gesture
      await element(by.id('mapbox-map')).pinchWithAngle('inward', 0.7, 0);
      
      await waitFor(element(by.id('map-zoom-level')))
        .toHaveText(initialZoom.text)
        .withTimeout(2000);
    });

    it('should support double-tap to zoom', async () => {
      const initialZoom = await element(by.id('map-zoom-level')).getAttributes();
      
      await element(by.id('mapbox-map')).multiTap(2);
      
      await waitFor(element(by.id('map-zoom-level')))
        .toHaveText((parseInt(initialZoom.text) + 1).toString())
        .withTimeout(2000);
    });

    it('should support pan/drag gestures', async () => {
      const initialCenter = await element(by.id('map-center-coordinates')).getAttributes();
      
      // Pan map to the right
      await element(by.id('mapbox-map')).swipe('right', 'fast', 0.7);
      
      const newCenter = await element(by.id('map-center-coordinates')).getAttributes();
      expect(newCenter.text).not.toEqual(initialCenter.text);
    });

    it('should maintain smooth performance during gestures', async () => {
      // Enable performance monitoring
      await element(by.id('performance-monitor-toggle')).tap();
      
      // Perform rapid gestures
      await element(by.id('mapbox-map')).swipe('up', 'fast');
      await element(by.id('mapbox-map')).swipe('down', 'fast');
      await element(by.id('mapbox-map')).pinchWithAngle('outward', 1.5, 0);
      await element(by.id('mapbox-map')).pinchWithAngle('inward', 0.7, 0);
      
      // Check frame rate maintained above 30fps during interactions
      const performanceData = await element(by.id('performance-fps')).getAttributes();
      expect(parseInt(performanceData.text)).toBeGreaterThan(30);
    });
  });

  describe('Map Control Buttons', () => {
    it('should center map on user location when button pressed', async () => {
      // Pan away from user location first
      await element(by.id('mapbox-map')).swipe('left', 'fast', 0.8);
      await element(by.id('mapbox-map')).swipe('up', 'fast', 0.8);
      
      // Tap center location button
      await element(by.id('center-location-button')).tap();
      
      // Wait for centering animation
      await waitFor(element(by.id('centering-animation')))
        .toBeVisible()
        .withTimeout(1000);
      
      // Verify map is centered on user location
      await waitFor(element(by.id('user-location-marker')))
        .toBeVisible()
        .withTimeout(3000);
      
      const mapCenter = await element(by.id('map-center-coordinates')).getAttributes();
      expect(mapCenter.text).toContain('40.7128'); // Mock location coordinates
    });

    it('should show/hide zoom controls', async () => {
      await expect(element(by.id('zoom-in-button'))).toBeVisible();
      await expect(element(by.id('zoom-out-button'))).toBeVisible();
      
      // Tap zoom in
      await element(by.id('zoom-in-button')).tap();
      const zoomLevel1 = await element(by.id('map-zoom-level')).getAttributes();
      
      // Tap zoom out
      await element(by.id('zoom-out-button')).tap();
      const zoomLevel2 = await element(by.id('map-zoom-level')).getAttributes();
      
      expect(parseInt(zoomLevel1.text)).toBeGreaterThan(parseInt(zoomLevel2.text));
    });

    it('should disable zoom controls at min/max zoom levels', async () => {
      // Zoom out to minimum level
      for (let i = 0; i < 10; i++) {
        await element(by.id('zoom-out-button')).tap();
        await LocationPermissionHelpers.sleep(100);
      }
      
      // Zoom out button should be disabled
      const zoomOutButton = element(by.id('zoom-out-button'));
      await expect(zoomOutButton).toHaveValue('disabled');
      
      // Zoom in to maximum level
      for (let i = 0; i < 20; i++) {
        await element(by.id('zoom-in-button')).tap();
        await LocationPermissionHelpers.sleep(100);
      }
      
      // Zoom in button should be disabled
      const zoomInButton = element(by.id('zoom-in-button'));
      await expect(zoomInButton).toHaveValue('disabled');
    });
  });

  describe('Venue Marker Interactions', () => {
    beforeEach(async () => {
      // Load test venue data
      await element(by.id('load-test-venues-button')).tap();
      await waitFor(element(by.id('venues-loaded-indicator')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should display venue details modal on marker tap', async () => {
      await element(by.id('venue-marker-test-club')).tap();
      
      await expect(element(by.id('venue-details-modal'))).toBeVisible();
      await expect(element(by.text('Test Club Downtown'))).toBeVisible();
      await expect(element(by.text('123 Test Street'))).toBeVisible();
      await expect(element(by.text('Open: 6:00 PM - 2:00 AM'))).toBeVisible();
    });

    it('should differentiate continuous vs one-time client markers', async () => {
      // Continuous client marker should be blue
      const continuousMarker = element(by.id('venue-marker-continuous-client'));
      await expect(continuousMarker).toHaveValue('blue');
      
      // One-time client marker should be orange
      const onetimeMarker = element(by.id('venue-marker-onetime-client'));
      await expect(onetimeMarker).toHaveValue('orange');
    });

    it('should show marker clustering at high zoom levels', async () => {
      // Zoom out to trigger clustering
      for (let i = 0; i < 5; i++) {
        await element(by.id('zoom-out-button')).tap();
        await LocationPermissionHelpers.sleep(200);
      }
      
      // Should see cluster markers instead of individual markers
      await expect(element(by.id('marker-cluster-5'))).toBeVisible();
      
      // Tap cluster to expand
      await element(by.id('marker-cluster-5')).tap();
      
      // Map should zoom in and show individual markers
      await waitFor(element(by.id('venue-marker-test-club')))
        .toBeVisible()
        .withTimeout(2000);
    });

    it('should handle marker tap on clustered markers', async () => {
      // Create dense marker area for clustering
      await LocationPermissionHelpers.setMockLocation(
        LocationPermissionHelpers.TEST_LOCATIONS.NYC
      );
      
      await element(by.id('load-dense-test-data')).tap();
      await waitFor(element(by.id('dense-venues-loaded')))
        .toBeVisible()
        .withTimeout(3000);
      
      // Zoom out to create clusters
      await element(by.id('zoom-out-button')).multiTap(3);
      
      // Should see cluster marker
      await expect(element(by.id('marker-cluster-10'))).toBeVisible();
      
      // Double tap cluster should zoom in
      await element(by.id('marker-cluster-10')).multiTap(2);
      
      const finalZoom = await element(by.id('map-zoom-level')).getAttributes();
      expect(parseInt(finalZoom.text)).toBeGreaterThan(14);
    });

    it('should close venue modal on map tap', async () => {
      // Open venue modal
      await element(by.id('venue-marker-test-club')).tap();
      await expect(element(by.id('venue-details-modal'))).toBeVisible();
      
      // Tap on map background
      await element(by.id('mapbox-map')).tap();
      
      // Modal should close
      await waitFor(element(by.id('venue-details-modal')))
        .not.toBeVisible()
        .withTimeout(1000);
    });
  });

  describe('Map Loading States', () => {
    it('should show loading indicator while map tiles load', async () => {
      await device.launchApp({
        newInstance: true,
        permissions: { location: 'always' }
      });
      
      await element(by.id('map-button')).tap();
      
      // Should show loading state
      await expect(element(by.id('map-loading-spinner'))).toBeVisible();
      
      // Loading should complete within 5 seconds
      await waitFor(element(by.id('map-loading-spinner')))
        .not.toBeVisible()
        .withTimeout(5000);
      
      await expect(element(by.id('mapbox-map'))).toBeVisible();
    });

    it('should show venue loading indicator', async () => {
      await LocationPermissionHelpers.waitForMapReady();
      
      // Should show venues loading
      await expect(element(by.id('venues-loading-indicator'))).toBeVisible();
      
      // Venues should load within 3 seconds
      await waitFor(element(by.id('venues-loaded-indicator')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should handle slow network gracefully', async () => {
      await device.setNetworkConditions('slow-3g');
      
      await element(by.id('map-button')).tap();
      
      // Should show slow network warning
      await waitFor(element(by.text('Slow connection detected')))
        .toBeVisible()
        .withTimeout(10000);
      
      // Map should still load eventually
      await waitFor(element(by.id('mapbox-map')))
        .toBeVisible()
        .withTimeout(15000);
      
      await device.setNetworkConditions('wifi');
    });
  });

  describe('Map Style and Appearance', () => {
    it('should apply Hooked brand styling to map', async () => {
      await LocationPermissionHelpers.waitForMapReady();
      
      // Check map style attributes
      const mapStyle = await element(by.id('mapbox-map')).getAttributes();
      expect(mapStyle.style).toContain('hooked-custom-style');
      
      // Check brand colors are applied
      await expect(element(by.id('map-brand-overlay'))).toBeVisible();
    });

    it('should show user location with custom marker', async () => {
      await LocationPermissionHelpers.waitForMapReady();
      
      const userMarker = element(by.id('user-location-marker'));
      await expect(userMarker).toBeVisible();
      
      // Should use custom Hooked user location design
      const markerStyle = await userMarker.getAttributes();
      expect(markerStyle.style).toContain('hooked-user-marker');
    });

    it('should display venue type icons correctly', async () => {
      await element(by.id('load-test-venues-button')).tap();
      await waitFor(element(by.id('venues-loaded-indicator')))
        .toBeVisible()
        .withTimeout(3000);
      
      // Check different venue type markers
      await expect(element(by.id('club-marker-icon'))).toBeVisible();
      await expect(element(by.id('restaurant-marker-icon'))).toBeVisible();
      await expect(element(by.id('bar-marker-icon'))).toBeVisible();
    });
  });

  describe('Accessibility Testing', () => {
    it('should support VoiceOver/TalkBack navigation', async () => {
      await device.enableAccessibility();
      
      await LocationPermissionHelpers.waitForMapReady();
      
      // Check map accessibility labels
      await expect(element(by.id('mapbox-map'))).toHaveAccessibilityLabel('Interactive map showing nearby venues');
      
      // Check button accessibility
      await expect(element(by.id('center-location-button'))).toHaveAccessibilityLabel('Center map on my location');
      await expect(element(by.id('zoom-in-button'))).toHaveAccessibilityLabel('Zoom in');
      await expect(element(by.id('zoom-out-button'))).toHaveAccessibilityLabel('Zoom out');
      
      await device.disableAccessibility();
    });

    it('should announce venue information for screen readers', async () => {
      await device.enableAccessibility();
      
      await element(by.id('load-test-venues-button')).tap();
      await waitFor(element(by.id('venues-loaded-indicator')))
        .toBeVisible()
        .withTimeout(3000);
      
      const venueMarker = element(by.id('venue-marker-test-club'));
      await expect(venueMarker).toHaveAccessibilityLabel('Test Club Downtown, continuous client, tap for details');
      
      await device.disableAccessibility();
    });
  });

  describe('Error Handling', () => {
    it('should handle map initialization failure', async () => {
      // Simulate map SDK failure
      await device.setNetworkConditions('airplane');
      
      await element(by.id('map-button')).tap();
      
      await waitFor(element(by.text('Unable to load map')))
        .toBeVisible()
        .withTimeout(10000);
      
      await expect(element(by.id('retry-map-button'))).toBeVisible();
      
      // Restore network and retry
      await device.setNetworkConditions('wifi');
      await element(by.id('retry-map-button')).tap();
      
      await LocationPermissionHelpers.waitForMapReady();
    });

    it('should handle venue data loading failure', async () => {
      await LocationPermissionHelpers.waitForMapReady();
      
      // Simulate API failure
      await element(by.id('simulate-api-failure')).tap();
      
      await expect(element(by.text('Unable to load venues'))).toBeVisible();
      await expect(element(by.id('retry-venues-button'))).toBeVisible();
      
      // Retry should work
      await element(by.id('retry-venues-button')).tap();
      await waitFor(element(by.id('venues-loaded-indicator')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should handle memory warnings during map usage', async () => {
      await LocationPermissionHelpers.waitForMapReady();
      
      // Simulate memory pressure
      await element(by.id('simulate-memory-warning')).tap();
      
      // Map should handle memory warning gracefully
      await expect(element(by.text('Optimizing map performance'))).toBeVisible();
      
      // Map should remain functional
      await element(by.id('mapbox-map')).pinchWithAngle('outward', 1.5, 0);
      await expect(element(by.id('mapbox-map'))).toBeVisible();
    });
  });

  describe('Performance Benchmarks', () => {
    it('should render 50+ markers without performance degradation', async () => {
      await LocationPermissionHelpers.waitForMapReady();
      
      // Load performance test data
      await element(by.id('load-performance-test-data')).tap();
      
      await waitFor(element(by.id('50-venues-loaded')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Enable FPS monitoring
      await element(by.id('performance-monitor-toggle')).tap();
      
      // Perform stress test gestures
      await element(by.id('mapbox-map')).swipe('up', 'fast');
      await element(by.id('mapbox-map')).swipe('down', 'fast');
      await element(by.id('mapbox-map')).pinchWithAngle('outward', 2.0, 0);
      
      // Check performance metrics
      const fps = await element(by.id('performance-fps')).getAttributes();
      const memoryUsage = await element(by.id('memory-usage-mb')).getAttributes();
      
      expect(parseInt(fps.text)).toBeGreaterThan(45); // 45+ FPS
      expect(parseInt(memoryUsage.text)).toBeLessThan(150); // < 150MB
    });
  });
});

/**
 * Utility functions for map interaction testing
 */
export const MapInteractionHelpers = {
  async performStressTest() {
    const gestures = [
      () => element(by.id('mapbox-map')).swipe('up', 'fast'),
      () => element(by.id('mapbox-map')).swipe('down', 'fast'),
      () => element(by.id('mapbox-map')).swipe('left', 'fast'),
      () => element(by.id('mapbox-map')).swipe('right', 'fast'),
      () => element(by.id('mapbox-map')).pinchWithAngle('outward', 1.5, 0),
      () => element(by.id('mapbox-map')).pinchWithAngle('inward', 0.7, 0)
    ];
    
    for (let i = 0; i < 10; i++) {
      const randomGesture = gestures[Math.floor(Math.random() * gestures.length)];
      await randomGesture();
      await LocationPermissionHelpers.sleep(100);
    }
  },

  async measureMapLoadTime() {
    const startTime = Date.now();
    await element(by.id('map-button')).tap();
    
    await waitFor(element(by.id('map-loaded-indicator')))
      .toBeVisible()
      .withTimeout(10000);
    
    return Date.now() - startTime;
  },

  async verifyMarkerAccuracy(expectedVenues) {
    for (const venue of expectedVenues) {
      const marker = element(by.id(`venue-marker-${venue.id}`));
      await expect(marker).toBeVisible();
      
      // Verify marker position matches expected coordinates
      const markerPosition = await marker.getAttributes();
      expect(markerPosition.coordinates).toEqual(venue.coordinates);
    }
  }
};