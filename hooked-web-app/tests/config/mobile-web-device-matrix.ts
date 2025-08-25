/**
 * Mobile Web Device Testing Matrix Configuration
 * Based on mobile-app/__tests__/config/cross-platform-device-matrix.ts patterns
 * Focus: Mobile browser testing for iOS Safari, Chrome Mobile, Firefox Mobile, Edge Mobile
 */

interface ScreenSize {
  width: number;
  height: number;
}

interface DeviceBase {
  name: string;
  userAgent: string;
  viewport: ScreenSize;
  deviceScaleFactor: number;
  isMobile: boolean;
  hasTouch: boolean;
  priority: 'high' | 'medium' | 'low';
  testTypes: string[];
}

interface IOSMobileDevice extends DeviceBase {
  browserEngine: 'webkit';
  osVersion: string;
}

interface AndroidMobileDevice extends DeviceBase {
  browserEngine: 'blink' | 'gecko';
  osVersion: string;
  manufacturer: string;
}

interface TestConfiguration {
  description: string;
  testFiles: string[];
  timeout: number;
  retry: number;
  requirements: string[];
}

interface NetworkCondition {
  name: string;
  downloadThroughput: number; // bytes per second
  uploadThroughput: number;
  latency: number; // milliseconds
}

interface PerformanceBenchmark {
  target: number;
  warning: number;
  critical: number;
}

export const MOBILE_WEB_DEVICE_MATRIX = {
  ios: {
    safari: [
      {
        name: 'iPhone 12 - Safari',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3.0,
        isMobile: true,
        hasTouch: true,
        browserEngine: 'webkit',
        osVersion: '17.0',
        priority: 'high',
        testTypes: ['device-detection', 'session-management', 'cross-platform', 'performance']
      },
      {
        name: 'iPhone 15 Pro - Safari',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
        viewport: { width: 393, height: 852 },
        deviceScaleFactor: 3.0,
        isMobile: true,
        hasTouch: true,
        browserEngine: 'webkit',
        osVersion: '18.0',
        priority: 'high',
        testTypes: ['device-detection', 'session-management', 'pwa-functionality', 'performance']
      },
      {
        name: 'iPhone SE 3rd Gen - Safari',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        viewport: { width: 375, height: 667 },
        deviceScaleFactor: 2.0,
        isMobile: true,
        hasTouch: true,
        browserEngine: 'webkit',
        osVersion: '16.0',
        priority: 'high',
        testTypes: ['small-screen', 'legacy-support']
      },
      {
        name: 'iPhone 14 Pro Max - Safari',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        viewport: { width: 430, height: 932 },
        deviceScaleFactor: 3.0,
        isMobile: true,
        hasTouch: true,
        browserEngine: 'webkit',
        osVersion: '17.0',
        priority: 'medium',
        testTypes: ['large-screen', 'pwa-functionality']
      }
    ] as IOSMobileDevice[]
  },
  android: {
    chrome: [
      {
        name: 'Samsung Galaxy S23 - Chrome',
        userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S911U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36',
        viewport: { width: 411, height: 915 },
        deviceScaleFactor: 2.75,
        isMobile: true,
        hasTouch: true,
        browserEngine: 'blink',
        osVersion: '13.0',
        manufacturer: 'Samsung',
        priority: 'high',
        testTypes: ['device-detection', 'session-management', 'samsung-specific', 'performance']
      },
      {
        name: 'Google Pixel 7 - Chrome',
        userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36',
        viewport: { width: 411, height: 869 },
        deviceScaleFactor: 2.75,
        isMobile: true,
        hasTouch: true,
        browserEngine: 'blink',
        osVersion: '14.0',
        manufacturer: 'Google',
        priority: 'high',
        testTypes: ['device-detection', 'session-management', 'cross-platform', 'stock-android']
      },
      {
        name: 'OnePlus 11 - Chrome',
        userAgent: 'Mozilla/5.0 (Linux; Android 13; CPH2449) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36',
        viewport: { width: 412, height: 919 },
        deviceScaleFactor: 2.75,
        isMobile: true,
        hasTouch: true,
        browserEngine: 'blink',
        osVersion: '13.0',
        manufacturer: 'OnePlus',
        priority: 'medium',
        testTypes: ['device-detection', 'oneplus-specific']
      },
      {
        name: 'Pixel 5 - Chrome (Legacy)',
        userAgent: 'Mozilla/5.0 (Linux; Android 12; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Mobile Safari/537.36',
        viewport: { width: 393, height: 851 },
        deviceScaleFactor: 2.75,
        isMobile: true,
        hasTouch: true,
        browserEngine: 'blink',
        osVersion: '12.0',
        manufacturer: 'Google',
        priority: 'high',
        testTypes: ['legacy-support', 'backwards-compatibility']
      }
    ] as AndroidMobileDevice[],
    firefox: [
      {
        name: 'Android - Firefox Mobile',
        userAgent: 'Mozilla/5.0 (Mobile; rv:109.0) Gecko/109.0 Firefox/117.0',
        viewport: { width: 393, height: 851 },
        deviceScaleFactor: 2.75,
        isMobile: true,
        hasTouch: true,
        browserEngine: 'gecko',
        osVersion: '13.0',
        manufacturer: 'Generic',
        priority: 'medium',
        testTypes: ['cross-browser', 'firefox-specific']
      }
    ] as AndroidMobileDevice[],
    edge: [
      {
        name: 'Android - Edge Mobile',
        userAgent: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36 EdgA/118.0.2088.69',
        viewport: { width: 393, height: 851 },
        deviceScaleFactor: 2.75,
        isMobile: true,
        hasTouch: true,
        browserEngine: 'blink',
        osVersion: '10.0',
        manufacturer: 'Generic',
        priority: 'medium',
        testTypes: ['cross-browser', 'edge-specific']
      }
    ] as AndroidMobileDevice[]
  }
} as const;

export const WEB_TEST_CONFIGURATIONS: Record<string, TestConfiguration> = {
  'device-detection': {
    description: 'Mobile-only access and device detection tests',
    testFiles: ['device-detection.mobile.test.ts'],
    timeout: 30000,
    retry: 2,
    requirements: ['User-Agent Detection', 'Mobile-Only Access']
  },
  'session-management': {
    description: 'Session-based access and persistence tests',
    testFiles: ['session-management.mobile.test.ts'],
    timeout: 25000,
    retry: 3,
    requirements: ['localStorage', 'Session Persistence']
  },
  'cross-platform': {
    description: 'Cross-platform compatibility with mobile app',
    testFiles: ['cross-platform.mobile.test.ts'],
    timeout: 35000,
    retry: 2,
    requirements: ['Firebase Integration', 'Real-time Sync']
  },
  'profile-system': {
    description: 'Profile creation and editing without authentication',
    testFiles: ['profile-system.mobile.test.ts'],
    timeout: 30000,
    retry: 2,
    requirements: ['Profile Management', 'Photo Upload']
  },
  'event-access': {
    description: 'QR code scanning and manual event entry',
    testFiles: ['event-access.mobile.test.ts'],
    timeout: 35000,
    retry: 2,
    requirements: ['QR Code Scanner', 'Session ID Handling']
  },
  'messaging': {
    description: 'Real-time messaging between web and mobile users',
    testFiles: ['messaging.mobile.test.ts'],
    timeout: 40000,
    retry: 3,
    requirements: ['Real-time Chat', 'Message Sync']
  },
  'pwa-functionality': {
    description: 'Progressive Web App features and installation',
    testFiles: ['pwa.mobile.test.ts'],
    timeout: 45000,
    retry: 2,
    requirements: ['Service Workers', 'PWA Manifest']
  },
  'performance': {
    description: 'Core Web Vitals and mobile performance testing',
    testFiles: ['performance.mobile.test.ts'],
    timeout: 60000,
    retry: 1,
    requirements: ['Performance Monitoring', 'Core Web Vitals']
  },
  'push-notifications': {
    description: 'Web push notifications for matches and messages',
    testFiles: ['push-notifications.mobile.test.ts'],
    timeout: 30000,
    retry: 2,
    requirements: ['Web Push API', 'Notification Permission']
  },
  'small-screen': {
    description: 'Small screen layout and usability testing',
    testFiles: ['small-screen.mobile.test.ts'],
    timeout: 20000,
    retry: 2,
    requirements: ['Responsive Design', 'Touch Interactions']
  },
  'large-screen': {
    description: 'Large mobile screen optimization',
    testFiles: ['large-screen.mobile.test.ts'],
    timeout: 20000,
    retry: 2,
    requirements: ['Large Screen Layout', 'Touch Interactions']
  },
  'samsung-specific': {
    description: 'Samsung device specific browser features',
    testFiles: ['samsung-specific.mobile.test.ts'],
    timeout: 25000,
    retry: 2,
    requirements: ['Samsung Internet', 'Samsung Services']
  },
  'stock-android': {
    description: 'Stock Android Chrome experience',
    testFiles: ['stock-android.mobile.test.ts'],
    timeout: 25000,
    retry: 2,
    requirements: ['Stock Android Chrome']
  },
  'legacy-support': {
    description: 'Backwards compatibility with older mobile browsers',
    testFiles: ['legacy-support.mobile.test.ts'],
    timeout: 30000,
    retry: 3,
    requirements: ['Legacy Browser Support']
  },
  'cross-browser': {
    description: 'Cross-browser compatibility testing',
    testFiles: ['cross-browser.mobile.test.ts'],
    timeout: 25000,
    retry: 2,
    requirements: ['Multi-browser Support']
  }
};

export const NETWORK_CONDITIONS: Record<string, NetworkCondition> = {
  wifi: {
    name: 'WiFi',
    downloadThroughput: 50 * 1024 * 1024 / 8, // 50 Mbps
    uploadThroughput: 10 * 1024 * 1024 / 8,   // 10 Mbps
    latency: 20
  },
  '4g': {
    name: '4G',
    downloadThroughput: 10 * 1024 * 1024 / 8, // 10 Mbps
    uploadThroughput: 5 * 1024 * 1024 / 8,    // 5 Mbps
    latency: 50
  },
  '3g': {
    name: '3G',
    downloadThroughput: 1.5 * 1024 * 1024 / 8, // 1.5 Mbps
    uploadThroughput: 750 * 1024 / 8,           // 750 Kbps
    latency: 300
  },
  'slow-3g': {
    name: 'Slow 3G',
    downloadThroughput: 500 * 1024 / 8,  // 500 Kbps
    uploadThroughput: 250 * 1024 / 8,    // 250 Kbps
    latency: 2000
  }
};

export const WEB_PERFORMANCE_BENCHMARKS: Record<string, PerformanceBenchmark> = {
  // Core Web Vitals - Mobile specific thresholds
  largestContentfulPaint: {
    target: 2500,   // 2.5s (good)
    warning: 4000,  // 4.0s (needs improvement)
    critical: 4000  // >4.0s (poor)
  },
  firstInputDelay: {
    target: 100,    // 100ms (good)
    warning: 300,   // 300ms (needs improvement)
    critical: 300   // >300ms (poor)
  },
  cumulativeLayoutShift: {
    target: 0.1,    // 0.1 (good)
    warning: 0.25,  // 0.25 (needs improvement)
    critical: 0.25  // >0.25 (poor)
  },
  
  // Additional mobile performance metrics
  timeToFirstByte: {
    target: 600,    // 600ms
    warning: 1000,  // 1s
    critical: 1500  // 1.5s
  },
  speedIndex: {
    target: 3400,   // 3.4s
    warning: 5800,  // 5.8s
    critical: 5800  // >5.8s
  },
  totalBlockingTime: {
    target: 200,    // 200ms
    warning: 600,   // 600ms
    critical: 600   // >600ms
  }
};

export const PWA_TEST_CRITERIA = {
  manifestValidation: {
    requiredFields: ['name', 'short_name', 'start_url', 'display', 'theme_color', 'background_color', 'icons'],
    minIconSizes: ['192x192', '512x512'],
    displayModes: ['standalone', 'minimal-ui']
  },
  serviceWorkerRequirements: {
    registration: true,
    caching: true,
    offlineSupport: true,
    backgroundSync: false // Optional for this phase
  },
  installabilityChecks: {
    httpsRequired: true,
    manifestRequired: true,
    serviceWorkerRequired: true,
    userEngagementRequired: false // For testing purposes
  }
};

/**
 * Generate comprehensive mobile web testing matrix
 */
export function generateMobileWebTestMatrix() {
  const matrix: any[] = [];
  
  // High priority iOS Safari tests
  MOBILE_WEB_DEVICE_MATRIX.ios.safari
    .filter(device => device.priority === 'high')
    .forEach(device => {
      device.testTypes.forEach(testType => {
        matrix.push({
          platform: 'ios',
          browser: 'safari',
          device: device.name,
          testType: testType,
          config: WEB_TEST_CONFIGURATIONS[testType],
          deviceConfig: device
        });
      });
    });
  
  // High priority Android Chrome tests
  MOBILE_WEB_DEVICE_MATRIX.android.chrome
    .filter(device => device.priority === 'high')
    .forEach(device => {
      device.testTypes.forEach(testType => {
        matrix.push({
          platform: 'android',
          browser: 'chrome',
          device: device.name,
          testType: testType,
          config: WEB_TEST_CONFIGURATIONS[testType],
          deviceConfig: device
        });
      });
    });
  
  // Medium priority cross-browser tests
  [...MOBILE_WEB_DEVICE_MATRIX.android.firefox, ...MOBILE_WEB_DEVICE_MATRIX.android.edge]
    .forEach(device => {
      device.testTypes.forEach(testType => {
        matrix.push({
          platform: 'android',
          browser: device.browserEngine === 'gecko' ? 'firefox' : 'edge',
          device: device.name,
          testType: testType,
          config: WEB_TEST_CONFIGURATIONS[testType],
          deviceConfig: device
        });
      });
    });
  
  return matrix;
}

/**
 * Get device configuration for testing
 */
export function getMobileWebDeviceConfig(platform: 'ios' | 'android', browser: string, deviceName: string) {
  if (platform === 'ios' && browser === 'safari') {
    return MOBILE_WEB_DEVICE_MATRIX.ios.safari.find(device => device.name === deviceName);
  } else if (platform === 'android') {
    const browserMap: Record<string, keyof typeof MOBILE_WEB_DEVICE_MATRIX.android> = {
      'chrome': 'chrome',
      'firefox': 'firefox',
      'edge': 'edge'
    };
    const browserKey = browserMap[browser];
    if (browserKey) {
      return MOBILE_WEB_DEVICE_MATRIX.android[browserKey].find(device => device.name === deviceName);
    }
  }
  return undefined;
}

export default {
  MOBILE_WEB_DEVICE_MATRIX,
  WEB_TEST_CONFIGURATIONS,
  NETWORK_CONDITIONS,
  WEB_PERFORMANCE_BENCHMARKS,
  PWA_TEST_CRITERIA,
  generateMobileWebTestMatrix,
  getMobileWebDeviceConfig
};