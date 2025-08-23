/**
 * Playwright Configuration for Web Admin Dashboard Testing
 * Supports cross-browser testing for Map Clients management
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './__tests__',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }]
  ],
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Global timeout for actions */
    actionTimeout: 10000,
    
    /* Global timeout for navigation */
    navigationTimeout: 30000
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Use Chrome for better debugging
        channel: 'chrome'
      },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports for responsive design */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Test against branded browsers */
    {
      name: 'Microsoft Edge',
      use: { 
        ...devices['Desktop Edge'], 
        channel: 'msedge' 
      },
    },

    /* Test against older browser versions for compatibility */
    {
      name: 'Chrome 100',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        // Simulate older Chrome version constraints
        viewport: { width: 1280, height: 720 }
      }
    }
  ],

  /* Global setup and teardown */
  globalSetup: require.resolve('./playwright-global-setup.js'),
  globalTeardown: require.resolve('./playwright-global-teardown.js'),

  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: 'npm run build && npm run start',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        NODE_ENV: 'test',
        FIREBASE_PROJECT: 'hooked-test',
        MAPBOX_ACCESS_TOKEN: process.env.MAPBOX_ACCESS_TOKEN || 'pk.test.token'
      }
    },
    {
      command: 'firebase emulators:start --only firestore,functions',
      url: 'http://localhost:8080',
      reuseExistingServer: !process.env.CI,
      timeout: 60000
    }
  ],

  /* Test configuration specific to Map Clients testing */
  expect: {
    // Increase timeout for API calls and data loading
    timeout: 10000
  },

  /* Artifacts and output configuration */
  outputDir: 'test-results',
  
  /* Test patterns */
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/__tests__/**/*.spec.js'
  ],

  /* Ignore patterns */
  testIgnore: [
    '**/__tests__/helpers/**',
    '**/__tests__/fixtures/**',
    '**/__tests__/config/**'
  ]
});