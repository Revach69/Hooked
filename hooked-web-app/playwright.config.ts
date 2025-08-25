/**
 * Playwright Configuration for Mobile Web Testing
 * Based on Squad Engineering - QA Engineer #1 requirements
 * Focus: iOS Safari, Chrome Mobile, Firefox Mobile, Edge Mobile
 */

import { defineConfig, devices } from '@playwright/test';

// Mobile browser device configurations for comprehensive testing
const mobileDevices = {
  // iOS Mobile Browsers
  'iPhone 12 - Safari': {
    ...devices['iPhone 12'],
    name: 'iPhone 12 - Safari',
  },
  'iPhone 15 Pro - Safari': {
    ...devices['iPhone 15 Pro'],
    name: 'iPhone 15 Pro - Safari',
  },
  'iPhone SE - Safari': {
    ...devices['iPhone SE'],
    name: 'iPhone SE - Safari',
  },
  
  // Android Mobile Browsers
  'Pixel 7 - Chrome': {
    ...devices['Pixel 7'],
    name: 'Pixel 7 - Chrome',
  },
  'Samsung Galaxy S23 - Chrome': {
    ...devices['Galaxy S23'],
    name: 'Samsung Galaxy S23 - Chrome',
  },
  'Pixel 5 - Chrome': {
    ...devices['Pixel 5'],
    name: 'Pixel 5 - Chrome',
  },

  // Mobile Firefox testing
  'Mobile Firefox - Android': {
    userAgent: 'Mozilla/5.0 (Mobile; rv:109.0) Gecko/109.0 Firefox/117.0',
    viewport: { width: 393, height: 851 },
    deviceScaleFactor: 2.75,
    isMobile: true,
    hasTouch: true,
    name: 'Mobile Firefox - Android',
  },

  // Mobile Edge testing  
  'Mobile Edge - Android': {
    userAgent: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36 EdgA/118.0.2088.69',
    viewport: { width: 393, height: 851 },
    deviceScaleFactor: 2.75,
    isMobile: true,
    hasTouch: true,
    name: 'Mobile Edge - Android',
  },
};

// Test environment configuration
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : 4,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  
  use: {
    // Global test configuration
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    
    // Mobile-specific settings
    actionTimeout: 15000,
    navigationTimeout: 30000,
    
    // Network conditions for mobile testing
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
    },
  },

  // Project configurations for each mobile browser
  projects: [
    // High Priority iOS Safari Testing
    {
      name: 'iphone-12-safari',
      use: {
        ...mobileDevices['iPhone 12 - Safari'],
      },
      testMatch: /.*\.(mobile|device-detection|session|cross-platform)\.test\.ts/,
    },
    {
      name: 'iphone-15-pro-safari',
      use: {
        ...mobileDevices['iPhone 15 Pro - Safari'],
      },
      testMatch: /.*\.(mobile|performance|pwa)\.test\.ts/,
    },
    {
      name: 'iphone-se-safari-small-screen',
      use: {
        ...mobileDevices['iPhone SE - Safari'],
      },
      testMatch: /.*\.(mobile|small-screen)\.test\.ts/,
    },

    // High Priority Android Chrome Testing
    {
      name: 'pixel-7-chrome',
      use: {
        ...mobileDevices['Pixel 7 - Chrome'],
      },
      testMatch: /.*\.(mobile|device-detection|session|cross-platform)\.test\.ts/,
    },
    {
      name: 'samsung-s23-chrome',
      use: {
        ...mobileDevices['Samsung Galaxy S23 - Chrome'],
      },
      testMatch: /.*\.(mobile|samsung-specific)\.test\.ts/,
    },

    // Medium Priority Firefox Mobile Testing
    {
      name: 'mobile-firefox',
      use: {
        ...mobileDevices['Mobile Firefox - Android'],
        channel: 'firefox' as const,
      },
      testMatch: /.*\.(mobile|cross-browser)\.test\.ts/,
    },

    // Medium Priority Edge Mobile Testing
    {
      name: 'mobile-edge',
      use: {
        ...mobileDevices['Mobile Edge - Android'],
        channel: 'msedge' as const,
      },
      testMatch: /.*\.(mobile|cross-browser)\.test\.ts/,
    },

    // Network condition testing projects
    {
      name: 'mobile-slow-3g',
      use: {
        ...mobileDevices['Pixel 7 - Chrome'],
        contextOptions: {
          offline: false,
          // Slow 3G network simulation
          extraHTTPHeaders: {
            'Connection': 'close',
          },
        },
      },
      testMatch: /.*\.performance\.test\.ts/,
    },

    // PWA testing project
    {
      name: 'pwa-testing',
      use: {
        ...mobileDevices['iPhone 12 - Safari'],
        contextOptions: {
          serviceWorkers: 'allow',
        },
      },
      testMatch: /.*\.pwa\.test\.ts/,
    },
  ],

  // Development server configuration
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },

  // Global timeout settings optimized for mobile testing
  timeout: 45000,
  expect: {
    timeout: 10000,
  },

  // Test output directories
  outputDir: 'test-results/',
});