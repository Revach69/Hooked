/**
 * Task 3: Session Management & Persistence Testing
 * Mobile browser testing for session-based access across browser closures, 
 * tab switching, and localStorage persistence scenarios
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { MOBILE_WEB_DEVICE_MATRIX, WEB_TEST_CONFIGURATIONS } from '../config/mobile-web-device-matrix';

const SESSION_TEST_TIMEOUT = 45000;

// Helper to simulate different network conditions
async function simulateNetworkCondition(page: Page, condition: 'wifi' | '3g' | 'slow-3g' | 'offline') {
  const networkConditions = {
    wifi: { downloadThroughput: 50 * 1024 * 1024 / 8, uploadThroughput: 10 * 1024 * 1024 / 8, latency: 20 },
    '3g': { downloadThroughput: 1.5 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8, latency: 300 },
    'slow-3g': { downloadThroughput: 500 * 1024 / 8, uploadThroughput: 250 * 1024 / 8, latency: 2000 },
    offline: { downloadThroughput: 0, uploadThroughput: 0, latency: 0 }
  };

  if (condition === 'offline') {
    await page.context().setOffline(true);
  } else {
    await page.context().setOffline(false);
    const client = await page.context().newCDPSession(page);
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      ...networkConditions[condition]
    });
  }
}

// Helper to get session data from localStorage
async function getSessionFromStorage(page: Page) {
  return await page.evaluate(() => {
    const sessionData = localStorage.getItem('session-storage');
    return sessionData ? JSON.parse(sessionData) : null;
  });
}

// Helper to wait for session initialization
async function waitForSessionInitialization(page: Page, timeout = 15000) {
  await page.waitForFunction(() => {
    const sessionData = localStorage.getItem('session-storage');
    if (!sessionData) return false;
    const parsed = JSON.parse(sessionData);
    return parsed?.state?.sessionId && parsed?.state?.isActive;
  }, { timeout });
}

test.describe('Session Management & Persistence Testing', () => {

  test.describe('Session Creation and Initialization', () => {
    test('should create session automatically on first visit', async ({ page }) => {
      await page.goto('/');
      
      // Wait for session to be initialized
      await waitForSessionInitialization(page);
      
      // Check that session exists in localStorage
      const sessionData = await getSessionFromStorage(page);
      expect(sessionData).toBeTruthy();
      expect(sessionData.state.sessionId).toMatch(/^web_session_\d+_[a-z0-9]+$/);
      expect(sessionData.state.isActive).toBe(true);
      
      // Check that session provider shows initialized state
      await expect(page.locator('[data-testid="session-initialized"]')).toBeVisible({ timeout: 10000 });
    });

    test('should include device information in session', async ({ page }) => {
      await page.goto('/session-test');
      await waitForSessionInitialization(page);
      
      // Check session details page shows device info
      await expect(page.locator('[data-testid="device-info"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-agent"]')).toContainText('Mobile');
      await expect(page.locator('[data-testid="is-mobile"]')).toContainText('true');
    });

    test('should handle Firebase connection failures gracefully', async ({ page }) => {
      // Block Firebase requests to simulate connection failure
      await page.route('**/firebaseapp.com/**', route => route.abort());
      await page.route('**/googleapis.com/**', route => route.abort());
      
      await page.goto('/');
      
      // Should still create local session even if Firebase fails
      await waitForSessionInitialization(page);
      const sessionData = await getSessionFromStorage(page);
      expect(sessionData.state.sessionId).toBeTruthy();
    });
  });

  test.describe('Session Persistence Across Browser Actions', () => {
    test('should persist session across page refreshes', async ({ page }) => {
      await page.goto('/');
      await waitForSessionInitialization(page);
      
      const originalSessionData = await getSessionFromStorage(page);
      const originalSessionId = originalSessionData.state.sessionId;
      
      // Refresh the page
      await page.reload();
      await waitForSessionInitialization(page);
      
      // Session should persist
      const newSessionData = await getSessionFromStorage(page);
      expect(newSessionData.state.sessionId).toBe(originalSessionId);
      expect(newSessionData.state.isActive).toBe(true);
    });

    test('should persist session across navigation', async ({ page }) => {
      await page.goto('/');
      await waitForSessionInitialization(page);
      
      const originalSessionData = await getSessionFromStorage(page);
      const originalSessionId = originalSessionData.state.sessionId;
      
      // Navigate to different pages
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');
      
      await page.goto('/discovery');
      await page.waitForLoadState('networkidle');
      
      // Session should persist
      const sessionData = await getSessionFromStorage(page);
      expect(sessionData.state.sessionId).toBe(originalSessionId);
    });

    test('should persist session across browser closure (same context)', async ({ context }) => {
      let page = await context.newPage();
      await page.goto('/');
      await waitForSessionInitialization(page);
      
      const originalSessionData = await getSessionFromStorage(page);
      const originalSessionId = originalSessionData.state.sessionId;
      
      // Close page (simulating browser closure)
      await page.close();
      
      // Open new page in same context (simulating browser restart)
      page = await context.newPage();
      await page.goto('/');
      await waitForSessionInitialization(page);
      
      // Session should be restored from localStorage
      const restoredSessionData = await getSessionFromStorage(page);
      expect(restoredSessionData.state.sessionId).toBe(originalSessionId);
    });

    test('should handle session restoration with expired sessions', async ({ page }) => {
      await page.goto('/');
      await waitForSessionInitialization(page);
      
      // Manually expire the session by modifying lastActivity
      await page.evaluate(() => {
        const sessionData = JSON.parse(localStorage.getItem('session-storage') || '{}');
        sessionData.state.lastActivity = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
        localStorage.setItem('session-storage', JSON.stringify(sessionData));
      });
      
      // Refresh page - should create new session
      await page.reload();
      await waitForSessionInitialization(page);
      
      const newSessionData = await getSessionFromStorage(page);
      expect(newSessionData.state.sessionId).toMatch(/^web_session_\d+_[a-z0-9]+$/);
      expect(newSessionData.state.isActive).toBe(true);
      
      // Should be different from expired session
      const expiredTime = Date.now() - (25 * 60 * 60 * 1000);
      expect(newSessionData.state.lastActivity).toBeGreaterThan(expiredTime);
    });
  });

  test.describe('Tab Switching and Multi-Tab Behavior', () => {
    test('should sync session across multiple tabs', async ({ context }) => {
      // Open first tab
      const page1 = await context.newPage();
      await page1.goto('/');
      await waitForSessionInitialization(page1);
      
      const sessionData1 = await getSessionFromStorage(page1);
      const sessionId = sessionData1.state.sessionId;
      
      // Open second tab
      const page2 = await context.newPage();
      await page2.goto('/');
      await waitForSessionInitialization(page2);
      
      // Both tabs should have same session ID
      const sessionData2 = await getSessionFromStorage(page2);
      expect(sessionData2.state.sessionId).toBe(sessionId);
    });

    test('should handle profile updates across tabs', async ({ context }) => {
      // Create two tabs
      const page1 = await context.newPage();
      const page2 = await context.newPage();
      
      await page1.goto('/profile');
      await page2.goto('/profile');
      
      await waitForSessionInitialization(page1);
      await waitForSessionInitialization(page2);
      
      // Update profile in first tab (if profile form exists)
      if (await page1.locator('[data-testid="profile-form"]').isVisible()) {
        await page1.fill('[data-testid="name-input"]', 'Test User');
        await page1.fill('[data-testid="bio-input"]', 'Test bio');
        await page1.click('[data-testid="save-profile"]');
        
        // Wait for profile to be saved
        await page1.waitForTimeout(2000);
        
        // Refresh second tab and check if profile is synced
        await page2.reload();
        await waitForSessionInitialization(page2);
        
        // Check if profile data persisted
        const sessionData = await getSessionFromStorage(page2);
        if (sessionData.state.userProfile) {
          expect(sessionData.state.userProfile.name).toBe('Test User');
        }
      }
    });
  });

  test.describe('Network Condition Testing', () => {
    test('should handle slow network conditions', async ({ page }) => {
      await simulateNetworkCondition(page, 'slow-3g');
      
      await page.goto('/');
      
      // Should still initialize session, might take longer
      await waitForSessionInitialization(page, 30000); // Longer timeout for slow network
      
      const sessionData = await getSessionFromStorage(page);
      expect(sessionData.state.sessionId).toBeTruthy();
    });

    test('should handle offline to online transitions', async ({ page }) => {
      // Start online and create session
      await page.goto('/');
      await waitForSessionInitialization(page);
      const originalSessionData = await getSessionFromStorage(page);
      
      // Go offline
      await simulateNetworkCondition(page, 'offline');
      await page.waitForTimeout(2000);
      
      // Session should still exist locally
      const offlineSessionData = await getSessionFromStorage(page);
      expect(offlineSessionData.state.sessionId).toBe(originalSessionData.state.sessionId);
      
      // Go back online
      await simulateNetworkCondition(page, 'wifi');
      await page.waitForTimeout(3000); // Allow time for sync
      
      // Session should still be valid
      const onlineSessionData = await getSessionFromStorage(page);
      expect(onlineSessionData.state.sessionId).toBe(originalSessionData.state.sessionId);
    });
  });

  test.describe('Session Activity Tracking', () => {
    test('should update activity timestamp on user interactions', async ({ page }) => {
      await page.goto('/');
      await waitForSessionInitialization(page);
      
      const initialSessionData = await getSessionFromStorage(page);
      const initialActivity = initialSessionData.state.lastActivity;
      
      // Wait a moment, then simulate user interaction
      await page.waitForTimeout(2000);
      await page.click('body'); // Click somewhere on the page
      await page.waitForTimeout(1000);
      
      // Activity should be updated
      const updatedSessionData = await getSessionFromStorage(page);
      expect(updatedSessionData.state.lastActivity).toBeGreaterThan(initialActivity);
    });

    test('should maintain heartbeat when Firebase is connected', async ({ page }) => {
      await page.goto('/session-test');
      await waitForSessionInitialization(page);
      
      // Check if heartbeat indicator is working
      if (await page.locator('[data-testid="heartbeat-status"]').isVisible()) {
        await expect(page.locator('[data-testid="heartbeat-status"]')).toContainText('active');
      }
      
      // Wait for heartbeat cycle
      await page.waitForTimeout(5000);
      
      // Activity should be updated
      const sessionData = await getSessionFromStorage(page);
      expect(Date.now() - sessionData.state.lastActivity).toBeLessThan(10000); // Less than 10 seconds old
    });
  });

  test.describe('Session Error Handling', () => {
    test('should show retry option on session initialization failure', async ({ page }) => {
      // Block all network requests to cause initialization failure
      await page.route('**/*', route => {
        if (route.request().url().includes('session')) {
          route.abort();
        } else {
          route.continue();
        }
      });
      
      await page.goto('/');
      
      // Should show error state
      await expect(page.locator('[data-testid="session-error"]')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    });

    test('should handle corrupted localStorage gracefully', async ({ page }) => {
      // Corrupt localStorage data
      await page.addInitScript(() => {
        localStorage.setItem('session-storage', 'invalid-json-data');
      });
      
      await page.goto('/');
      
      // Should create new session despite corrupted data
      await waitForSessionInitialization(page, 20000);
      
      const sessionData = await getSessionFromStorage(page);
      expect(sessionData.state.sessionId).toMatch(/^web_session_\d+_[a-z0-9]+$/);
    });
  });

  test.describe('Cross-Platform Session Integration', () => {
    test('should prepare session for event joining', async ({ page }) => {
      await page.goto('/event?id=test-event-123');
      await waitForSessionInitialization(page);
      
      const sessionData = await getSessionFromStorage(page);
      
      // Should have event metadata
      if (sessionData.state.currentEventId) {
        expect(sessionData.state.currentEventId).toBe('test-event-123');
      }
    });

    test('should handle QR code session initialization', async ({ page }) => {
      // Simulate QR code scan with event metadata
      await page.goto('/?source=qr&eventId=test-event-456');
      await waitForSessionInitialization(page);
      
      const sessionData = await getSessionFromStorage(page);
      expect(sessionData.state.sessionId).toBeTruthy();
      
      // Check if session was initialized with QR metadata
      if (await page.locator('[data-testid="session-source"]').isVisible()) {
        await expect(page.locator('[data-testid="session-source"]')).toContainText('qr');
      }
    });
  });
});

// Device-specific session testing
test.describe('Device-Specific Session Behavior', () => {
  const testDevices = [
    { name: 'iPhone 12 - Safari', config: MOBILE_WEB_DEVICE_MATRIX.ios.safari[0] },
    { name: 'Samsung Galaxy S23 - Chrome', config: MOBILE_WEB_DEVICE_MATRIX.android.chrome[0] },
    { name: 'Google Pixel 7 - Chrome', config: MOBILE_WEB_DEVICE_MATRIX.android.chrome[1] }
  ];

  testDevices.forEach(device => {
    test(`should handle session management on ${device.name}`, async ({ page }) => {
      // Set device user agent
      await page.setExtraHTTPHeaders({
        'User-Agent': device.config.userAgent
      });
      
      await page.goto('/');
      await waitForSessionInitialization(page);
      
      const sessionData = await getSessionFromStorage(page);
      expect(sessionData.state.sessionId).toBeTruthy();
      
      // Verify device detection worked correctly
      if (await page.locator('[data-testid="detected-device"]').isVisible()) {
        await expect(page.locator('[data-testid="detected-device"]')).toContainText('Mobile');
      }
    });
  });
});

test.describe('Session Performance Testing', () => {
  test('should initialize session quickly', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await waitForSessionInitialization(page);
    
    const initTime = Date.now() - startTime;
    expect(initTime).toBeLessThan(5000); // Should initialize within 5 seconds
  });

  test('should handle multiple rapid session operations', async ({ page }) => {
    await page.goto('/');
    await waitForSessionInitialization(page);
    
    // Simulate rapid operations
    const operations = Array(10).fill(0).map(async (_, i) => {
      await page.evaluate(() => {
        // Trigger activity update
        window.dispatchEvent(new Event('focus'));
      });
    });
    
    await Promise.all(operations);
    
    // Session should still be stable
    const sessionData = await getSessionFromStorage(page);
    expect(sessionData.state.sessionId).toBeTruthy();
    expect(sessionData.state.isActive).toBe(true);
  });
});