/**
 * Playwright Global Teardown
 * Cleanup test environment after Map Clients testing
 */

import { chromium } from '@playwright/test';

async function globalTeardown() {
  console.log('🧹 Starting global teardown...');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Cleanup test data
    console.log('🗑️  Cleaning up test data...');
    await page.goto('http://localhost:3000/api/test/cleanup', {
      method: 'POST',
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Generate test report summary
    console.log('📊 Generating test summary...');
    await generateTestSummary();

    console.log('✅ Global teardown completed successfully');

  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw - teardown failures shouldn't fail the build
  } finally {
    await browser.close();
  }
}

async function generateTestSummary() {
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    const resultsPath = path.join(process.cwd(), 'test-results', 'results.json');
    
    if (fs.existsSync(resultsPath)) {
      const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      
      const summary = {
        totalTests: results.stats?.total || 0,
        passed: results.stats?.passed || 0,
        failed: results.stats?.failed || 0,
        skipped: results.stats?.skipped || 0,
        duration: results.stats?.duration || 0,
        timestamp: new Date().toISOString()
      };
      
      console.log('📈 Test Summary:');
      console.log(`   Total: ${summary.totalTests}`);
      console.log(`   Passed: ${summary.passed}`);
      console.log(`   Failed: ${summary.failed}`);
      console.log(`   Skipped: ${summary.skipped}`);
      console.log(`   Duration: ${Math.round(summary.duration / 1000)}s`);
      
      // Save summary for CI/CD
      const summaryPath = path.join(process.cwd(), 'test-results', 'summary.json');
      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    }
  } catch (error) {
    console.warn('Could not generate test summary:', error);
  }
}

export default globalTeardown;