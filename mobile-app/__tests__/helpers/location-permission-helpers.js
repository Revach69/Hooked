/**
 * Platform-specific Location Permission Test Helpers
 * Utilities for handling iOS and Android location permission testing
 */

import { device, element, by, expect } from 'detox';

/**
 * Platform-specific permission request handling
 */
export const LocationPermissionHelpers = {
  /**
   * Handle initial permission request based on platform
   * @param {string} response - 'allow' | 'deny'
   */
  async handlePermissionRequest(response) {
    const platform = device.getPlatform();
    
    if (platform === 'ios') {
      await this.handleIOSPermissionRequest(response);
    } else if (platform === 'android') {
      await this.handleAndroidPermissionRequest(response);
    }
  },

  /**
   * Handle iOS permission dialog
   */
  async handleIOSPermissionRequest(response) {
    if (response === 'allow') {
      // Try different iOS permission button texts
      try {
        await element(by.text('Allow While Using App')).tap();
      } catch (e) {
        try {
          await element(by.text('Allow')).tap();
        } catch (e2) {
          await element(by.text('OK')).tap();
        }
      }
    } else if (response === 'deny') {
      await element(by.text('Don\'t Allow')).tap();
    }
  },

  /**
   * Handle Android permission dialog
   */
  async handleAndroidPermissionRequest(response) {
    if (response === 'allow') {
      try {
        await element(by.text('Allow only while using the app')).tap();
      } catch (e) {
        try {
          await element(by.text('ALLOW')).tap();
        } catch (e2) {
          await element(by.text('Allow')).tap();
        }
      }
    } else if (response === 'deny') {
      try {
        await element(by.text('Don\'t allow')).tap();
      } catch (e) {
        await element(by.text('DENY')).tap();
      }
    }
  },

  /**
   * Verify permission state in app UI
   */
  async verifyPermissionState(expectedState) {
    const platform = device.getPlatform();
    
    switch (expectedState) {
      case 'granted':
        await expect(element(by.id('user-location-marker'))).toBeVisible();
        await expect(element(by.id('center-location-button'))).toBeVisible();
        break;
        
      case 'denied':
        await expect(element(by.id('default-city-view'))).toBeVisible();
        await expect(element(by.id('location-denied-banner'))).toBeVisible();
        break;
        
      case 'requesting':
        if (platform === 'ios') {
          await expect(element(by.text('Allow "Hooked" to access your location?'))).toBeVisible();
        } else {
          await expect(element(by.text('Allow Hooked to access this device\'s location?'))).toBeVisible();
        }
        break;
    }
  },

  /**
   * Mock location data for testing
   */
  async setMockLocation(coordinates, accuracy = 10) {
    const { latitude, longitude } = coordinates;
    
    await device.setLocation(latitude, longitude, {
      horizontalAccuracy: accuracy,
      verticalAccuracy: accuracy
    });
  },

  /**
   * Common test location coordinates
   */
  TEST_LOCATIONS: {
    NYC: { latitude: 40.7128, longitude: -74.0060 },
    LA: { latitude: 34.0522, longitude: -118.2437 },
    CHICAGO: { latitude: 41.8781, longitude: -87.6298 },
    MIAMI: { latitude: 25.7617, longitude: -80.1918 }
  },

  /**
   * Wait for map to be ready
   */
  async waitForMapReady(timeout = 5000) {
    await waitFor(element(by.id('mapbox-map')))
      .toBeVisible()
      .withTimeout(timeout);
    
    // Wait for map tiles to load
    await waitFor(element(by.id('map-loaded-indicator')))
      .toBeVisible()
      .withTimeout(timeout);
  },

  /**
   * Verify location accuracy indicator
   */
  async verifyLocationAccuracy(expectedAccuracy = 'high') {
    const accuracyElement = element(by.id('location-accuracy-value'));
    const accuracy = await accuracyElement.getAttributes();
    
    switch (expectedAccuracy) {
      case 'high':
        expect(parseInt(accuracy.text)).toBeLessThan(20); // < 20 meters
        break;
      case 'medium':
        expect(parseInt(accuracy.text)).toBeLessThan(100); // < 100 meters
        break;
      case 'low':
        expect(parseInt(accuracy.text)).toBeGreaterThan(100); // > 100 meters
        break;
    }
  },

  /**
   * Test location service recovery
   */
  async testLocationRecovery() {
    // Start with denied permission
    await device.launchApp({
      newInstance: true,
      permissions: { location: 'never' }
    });
    
    await element(by.id('map-button')).tap();
    await this.verifyPermissionState('denied');
    
    // Grant permission
    await device.setPermissions({ location: 'always' });
    
    // Trigger location refresh
    await element(by.id('enable-location-settings-button')).tap();
    
    // Verify recovery
    await this.waitForMapReady();
    await this.verifyPermissionState('granted');
  },

  /**
   * Test app state transitions with location
   */
  async testAppStateTransitions() {
    await device.launchApp({
      permissions: { location: 'always' }
    });
    
    await element(by.id('map-button')).tap();
    await this.waitForMapReady();
    await this.verifyPermissionState('granted');
    
    const initialLocation = await element(by.id('map-center-coordinates')).getAttributes();
    
    // Background app
    await device.sendToHome();
    await this.sleep(2000);
    
    // Foreground app  
    await device.launchApp({ newInstance: false });
    
    // Verify location persists
    await this.verifyPermissionState('granted');
    
    const currentLocation = await element(by.id('map-center-coordinates')).getAttributes();
    expect(currentLocation.text).toEqual(initialLocation.text);
  },

  /**
   * Generate permission test matrix
   */
  generatePermissionTestMatrix() {
    return [
      {
        name: 'iOS - Always Allow',
        platform: 'ios',
        permission: 'always',
        expected: 'granted'
      },
      {
        name: 'iOS - While Using App',
        platform: 'ios', 
        permission: 'inuse',
        expected: 'granted'
      },
      {
        name: 'iOS - Never',
        platform: 'ios',
        permission: 'never',
        expected: 'denied'
      },
      {
        name: 'Android - Fine Location',
        platform: 'android',
        permission: 'always',
        expected: 'granted'
      },
      {
        name: 'Android - Denied',
        platform: 'android',
        permission: 'never',
        expected: 'denied'
      }
    ];
  },

  /**
   * Helper for async delays
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Clear app data and permissions
   */
  async resetAppState() {
    await device.terminateApp();
    await device.uninstallApp();
    await device.installApp();
    await device.launchApp({
      newInstance: true,
      permissions: { location: 'unset' }
    });
  },

  /**
   * Validate permission error messages
   */
  async validatePermissionErrorMessages(platform) {
    if (platform === 'ios') {
      await expect(element(by.text('Location access is required to show nearby venues.'))).toBeVisible();
      await expect(element(by.text('Open Settings > Privacy & Security > Location Services > Hooked'))).toBeVisible();
    } else if (platform === 'android') {
      await expect(element(by.text('Location permission needed for venue discovery.'))).toBeVisible();
      await expect(element(by.text('Open Settings > Apps > Hooked > Permissions > Location'))).toBeVisible();
    }
  }
};

/**
 * Mock location service for testing
 */
export class MockLocationService {
  constructor() {
    this.currentLocation = null;
    this.accuracy = 10;
    this.isEnabled = false;
  }

  async getCurrentPosition(options = {}) {
    if (!this.isEnabled) {
      throw new Error('Location services disabled');
    }

    return {
      coords: {
        latitude: this.currentLocation?.latitude || 0,
        longitude: this.currentLocation?.longitude || 0,
        accuracy: this.accuracy,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null
      },
      timestamp: Date.now()
    };
  }

  async requestPermission() {
    // Mock permission request
    return this.isEnabled ? 'granted' : 'denied';
  }

  setLocation(latitude, longitude, accuracy = 10) {
    this.currentLocation = { latitude, longitude };
    this.accuracy = accuracy;
  }

  setEnabled(enabled) {
    this.isEnabled = enabled;
  }

  simulateGPSError() {
    this.accuracy = 1000; // Very poor accuracy
  }

  simulateLocationTimeout() {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(new Error('Location request timeout'));
      }, 10000);
    });
  }
}

export default LocationPermissionHelpers;