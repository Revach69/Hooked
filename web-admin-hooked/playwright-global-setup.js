/**
 * Playwright Global Setup
 * Initializes test environment for Map Clients testing
 */

import { chromium } from '@playwright/test';

async function globalSetup() {
  console.log('🚀 Starting global setup for admin dashboard tests...');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Wait for web server to be ready
    console.log('⏳ Waiting for web server to be ready...');
    await page.goto('http://localhost:3000/health', { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });

    // Initialize test database with seed data
    console.log('🌱 Seeding test database...');
    await page.goto('http://localhost:3000/api/test/seed-data', {
      waitUntil: 'networkidle'
    });

    // Verify Firebase emulators are running
    console.log('🔥 Verifying Firebase emulators...');
    await page.goto('http://localhost:8080', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Setup admin user for testing
    console.log('👤 Setting up admin user...');
    await setupAdminUser(page);

    console.log('✅ Global setup completed successfully');

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function setupAdminUser(page) {
  try {
    await page.goto('http://localhost:3000/api/test/setup-admin', {
      method: 'POST',
      waitUntil: 'networkidle'
    });
  } catch (error) {
    console.warn('Admin user setup may have failed:', error);
    // Continue anyway - admin might already exist
  }
}

export default globalSetup;