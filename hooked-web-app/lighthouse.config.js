module.exports = {
  ci: {
    collect: {
      url: [
        'https://hooked-app.com/',
        'https://hooked-app.com/mobile-only-access'
      ],
      settings: {
        chromeFlags: '--no-sandbox',
        emulatedFormFactor: 'mobile',
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0
        }
      }
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.85 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'speed-index': ['warn', { maxNumericValue: 3000 }],
        'interactive': ['error', { maxNumericValue: 3500 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }]
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
};