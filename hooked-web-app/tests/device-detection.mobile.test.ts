/**
 * Device Detection & Mobile-Only Access Testing
 * QA Engineer #1 - Task 2: Comprehensive mobile-only access validation
 * 
 * Tests:
 * 1. Mobile device access validation
 * 2. Desktop device blocking/redirection  
 * 3. Middleware device detection accuracy
 * 4. CDN-level access controls
 * 5. Edge case device detection
 */

import { test, expect } from '@playwright/test';
import { mobileDeviceMatrix, deviceHelpers, type MobileDeviceConfig } from '../__tests__/config/mobile-web-device-matrix';

// Test group: Mobile Device Access Validation
test.describe('Mobile Device Access Validation', () => {
  const mobileDevices = deviceHelpers.getMobileDevices();

  for (const device of mobileDevices) {
    test(`${device.name} - Should access application normally`, async ({ page }) => {
      // Configure the page to use specific device
      await page.setExtraHTTPHeaders({
        'User-Agent': device.userAgent
      });
      await page.setViewportSize(device.viewport);

      // Navigate to homepage
      const response = await page.goto('/');
      
      // Verify successful access (no redirect to mobile-only-access)
      expect(response?.status()).toBe(200);
      expect(page.url()).not.toContain('/mobile-only-access');
      
      // Verify mobile device detection headers
      const headers = response?.headers();
      if (headers && headers['x-is-mobile']) {
        expect(headers['x-is-mobile']).toBe('true');
      }
      
      // Verify page content loads properly
      await expect(page.locator('body')).toBeVisible();
      
      // Verify no desktop blocking message
      await expect(page.locator('text=Mobile Only Access')).not.toBeVisible();
      
      console.log(`✅ ${device.name}: Access granted successfully`);
    });
  }
});

// Test group: Desktop Device Blocking Validation  
test.describe('Desktop Device Blocking Validation', () => {
  const desktopDevices = deviceHelpers.getDesktopDevices();

  for (const device of desktopDevices) {
    test(`${device.name} - Should redirect to mobile-only-access page`, async ({ page }) => {
      // Configure the page to use desktop device
      await page.setExtraHTTPHeaders({
        'User-Agent': device.userAgent
      });
      await page.setViewportSize(device.viewport);

      // Navigate to homepage - should redirect
      await page.goto('/');
      
      // Wait for potential redirect
      await page.waitForLoadState('networkidle');
      
      // Verify redirect to mobile-only-access page
      expect(page.url()).toContain('/mobile-only-access');
      
      // Verify mobile-only-access page content
      await expect(page.locator('h1')).toContainText('📱 Mobile Only Access');
      await expect(page.locator('text=This application is designed exclusively for mobile devices')).toBeVisible();
      
      // Verify download links are present
      await expect(page.locator('text=Download for iOS')).toBeVisible();
      await expect(page.locator('text=Download for Android')).toBeVisible();
      
      console.log(`✅ ${device.name}: Properly blocked and redirected`);
    });
  }
});

// Test group: Middleware Device Detection Accuracy
test.describe('Middleware Device Detection Accuracy', () => {
  const testCases = [
    {
      name: 'iPhone 15 Pro iOS Safari',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      expectedMobile: true,
      expectedDeviceType: 'mobile'
    },
    {
      name: 'Android Chrome Mobile',
      userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36',
      expectedMobile: true,
      expectedDeviceType: 'mobile'
    },
    {
      name: 'iPad Tablet',
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      expectedMobile: true,
      expectedDeviceType: 'tablet'
    },
    {
      name: 'Desktop Chrome',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
      expectedMobile: false,
      expectedDeviceType: 'desktop'
    },
    {
      name: 'Desktop Safari macOS',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      expectedMobile: false,
      expectedDeviceType: 'desktop'
    },
  ];

  for (const testCase of testCases) {
    test(`Device Detection: ${testCase.name}`, async ({ page }) => {
      // Set custom user agent
      await page.setExtraHTTPHeaders({
        'User-Agent': testCase.userAgent
      });
      
      // Navigate to homepage
      const response = await page.goto('/');
      
      // Check response headers for device detection
      const headers = response?.headers();
      
      if (testCase.expectedMobile) {
        // Mobile devices should access normally
        expect(response?.status()).toBe(200);
        expect(page.url()).not.toContain('/mobile-only-access');
        
        if (headers) {
          expect(headers['x-is-mobile']).toBe('true');
          expect(headers['x-device-type']).toBe(testCase.expectedDeviceType);
        }
        
        console.log(`✅ ${testCase.name}: Correctly identified as mobile`);
      } else {
        // Desktop devices should be redirected
        await page.waitForLoadState('networkidle');
        expect(page.url()).toContain('/mobile-only-access');
        
        console.log(`✅ ${testCase.name}: Correctly blocked as desktop`);
      }
    });
  }
});

// Test group: CDN-Level Access Controls  
test.describe('CDN-Level Access Controls (Vercel Configuration)', () => {
  test('Verify Vercel rewrites for mobile devices', async ({ page }) => {
    // Test with mobile Chrome user agent
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36'
    });
    
    // Navigate to root path
    const response = await page.goto('/');
    
    // Verify successful access without redirect
    expect(response?.status()).toBe(200);
    expect(page.url()).not.toContain('/mobile-only-access');
    
    // Verify security headers are present
    const headers = response?.headers();
    expect(headers).toBeDefined();
    expect(headers?.['strict-transport-security']).toBeDefined();
    expect(headers?.['x-frame-options']).toBe('DENY');
    
    console.log('✅ CDN-level mobile access validated');
  });

  test('Verify Vercel rewrites redirect desktop devices', async ({ page }) => {
    // Test with desktop Chrome user agent
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'
    });
    
    // Navigate to root path
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Verify redirect to mobile-only-access
    expect(page.url()).toContain('/mobile-only-access');
    
    console.log('✅ CDN-level desktop blocking validated');
  });
});

// Test group: Edge Case Device Detection
test.describe('Edge Case Device Detection', () => {
  const edgeCases = [
    {
      name: 'Chrome iOS (CriOS)',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/118.0.5993.69 Mobile/15E148 Safari/604.1',
      shouldAllow: true
    },
    {
      name: 'Firefox iOS (FxiOS)', 
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/120.0 Mobile/15E148 Safari/605.1.15',
      shouldAllow: true
    },
    {
      name: 'Samsung Internet Browser',
      userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-A515F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36',
      shouldAllow: true
    },
    {
      name: 'Opera Mobile',
      userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-A515F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Mobile Safari/537.36 OPR/77.0.4095.74',
      shouldAllow: true
    },
    {
      name: 'BlackBerry Mobile',
      userAgent: 'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.1.0.346 Mobile Safari/534.11+',
      shouldAllow: true
    },
    {
      name: 'Windows Phone',
      userAgent: 'Mozilla/5.0 (compatible; MSIE 10.0; Windows Phone 8.0; Trident/6.0; IEMobile/10.0; ARM; Touch; NOKIA; Lumia 920)',
      shouldAllow: true
    },
  ];

  for (const edgeCase of edgeCases) {
    test(`Edge Case: ${edgeCase.name}`, async ({ page }) => {
      // Set edge case user agent
      await page.setExtraHTTPHeaders({
        'User-Agent': edgeCase.userAgent
      });
      
      // Navigate to homepage
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      if (edgeCase.shouldAllow) {
        // Should access normally
        expect(page.url()).not.toContain('/mobile-only-access');
        await expect(page.locator('text=Mobile Only Access')).not.toBeVisible();
        
        console.log(`✅ ${edgeCase.name}: Correctly allowed access`);
      } else {
        // Should be blocked
        expect(page.url()).toContain('/mobile-only-access');
        await expect(page.locator('h1')).toContainText('📱 Mobile Only Access');
        
        console.log(`✅ ${edgeCase.name}: Correctly blocked`);
      }
    });
  }
});

// Test group: API Routes and Static Assets Access
test.describe('API Routes and Static Assets Access', () => {
  test('API routes should bypass device detection', async ({ page }) => {
    // Use desktop user agent
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'
    });
    
    // Test API route access (should not redirect)
    const response = await page.goto('/api/health', { timeout: 10000 });
    
    // API routes should be accessible regardless of device type
    // Note: 404 is acceptable if the API route doesn't exist, 
    // but shouldn't redirect to mobile-only-access
    expect([200, 404, 405]).toContain(response?.status() || 404);
    expect(page.url()).toContain('/api/');
    
    console.log('✅ API routes bypass device detection');
  });

  test('Static assets should bypass device detection', async ({ page }) => {
    // Use desktop user agent
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'
    });
    
    // Test static asset access
    const response = await page.goto('/favicon.ico');
    
    // Static assets should be accessible regardless of device type
    expect([200, 404]).toContain(response?.status() || 404);
    expect(page.url()).not.toContain('/mobile-only-access');
    
    console.log('✅ Static assets bypass device detection');
  });
});

// Test group: Mobile-Only Access Page Functionality
test.describe('Mobile-Only Access Page Functionality', () => {
  test('Mobile-only access page renders correctly', async ({ page }) => {
    // Use desktop user agent to trigger redirect
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'
    });
    
    // Navigate to homepage (will redirect)
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Verify page content and structure
    await expect(page.locator('h1')).toContainText('📱 Mobile Only Access');
    await expect(page.locator('text=This application is designed exclusively for mobile devices')).toBeVisible();
    
    // Verify instruction text
    await expect(page.locator('text=To access the Hooked app, please:')).toBeVisible();
    await expect(page.locator('text=Visit this page on your mobile device')).toBeVisible();
    await expect(page.locator('text=Download the mobile app from your app store')).toBeVisible();
    
    // Verify download buttons
    await expect(page.locator('text=📱 Download for iOS')).toBeVisible();
    await expect(page.locator('text=🤖 Download for Android')).toBeVisible();
    
    // Verify styling and responsiveness  
    await expect(page.locator('.min-h-screen')).toBeVisible();
    await expect(page.locator('.bg-gradient-to-br')).toBeVisible();
    
    // Verify footer text
    await expect(page.locator('text=Hooked is optimized for the best mobile experience')).toBeVisible();
    
    console.log('✅ Mobile-only access page renders correctly');
  });

  test('Direct navigation to mobile-only-access page works', async ({ page }) => {
    // Use mobile user agent
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    });
    
    // Navigate directly to mobile-only-access page
    const response = await page.goto('/mobile-only-access');
    
    // Should load successfully even on mobile
    expect(response?.status()).toBe(200);
    expect(page.url()).toContain('/mobile-only-access');
    
    // Verify content loads
    await expect(page.locator('h1')).toContainText('📱 Mobile Only Access');
    
    console.log('✅ Direct navigation to mobile-only-access works');
  });
});