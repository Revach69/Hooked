/**
 * Basic Device Detection Testing - Simplified Version
 * QA Engineer #1 - Task 2: Basic device detection validation without development server
 */

import { test, expect } from '@playwright/test';

// Test group: Basic Device Detection - Mobile-Only Access Page
test.describe('Basic Mobile-Only Access Page', () => {
  test('Mobile-only access page loads correctly', async ({ page }) => {
    // Navigate directly to the mobile-only-access page
    await page.goto('https://hooked-app.com/mobile-only-access');
    
    // Verify page loads successfully
    const response = await page.waitForResponse('https://hooked-app.com/mobile-only-access');
    expect(response.status()).toBe(200);
    
    // Verify page content
    await expect(page.locator('h1')).toContainText('📱 Mobile Only Access');
    await expect(page.locator('text=This application is designed exclusively for mobile devices')).toBeVisible();
    
    // Verify download links are present
    await expect(page.locator('text=Download for iOS')).toBeVisible();
    await expect(page.locator('text=Download for Android')).toBeVisible();
    
    console.log('✅ Mobile-only access page loads and renders correctly');
  });

  test('Homepage redirects desktop users', async ({ page }) => {
    // Set desktop user agent
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'
    });
    
    // Navigate to homepage
    await page.goto('https://hooked-app.com/');
    
    // Wait for potential redirect
    await page.waitForLoadState('networkidle');
    
    // Verify redirect to mobile-only-access page
    expect(page.url()).toContain('/mobile-only-access');
    
    console.log('✅ Desktop users are redirected to mobile-only-access page');
  });

  test('Mobile device can access homepage', async ({ page }) => {
    // Set mobile user agent
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    });
    
    // Navigate to homepage
    const response = await page.goto('https://hooked-app.com/');
    
    // Verify successful access (no redirect to mobile-only-access)
    expect(response?.status()).toBe(200);
    expect(page.url()).not.toContain('/mobile-only-access');
    
    console.log('✅ Mobile devices can access homepage without redirect');
  });
});

// Test group: Security Headers Validation
test.describe('Security Headers Validation', () => {
  test('Security headers are present', async ({ page }) => {
    const response = await page.goto('https://hooked-app.com/mobile-only-access');
    
    const headers = response?.headers();
    expect(headers).toBeDefined();
    
    // Verify critical security headers
    expect(headers?.['strict-transport-security']).toBeDefined();
    expect(headers?.['x-frame-options']).toBe('DENY');
    expect(headers?.['x-content-type-options']).toBe('nosniff');
    
    console.log('✅ Security headers are properly configured');
  });
});