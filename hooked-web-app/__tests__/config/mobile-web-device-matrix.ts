/**
 * Mobile Web Device Testing Matrix
 * QA Engineer #1 - Comprehensive device configurations for mobile browser testing
 * Focus: Cross-platform compatibility, performance benchmarks, mobile-only access validation
 */

export interface MobileDeviceConfig {
  name: string;
  userAgent: string;
  viewport: { width: number; height: number };
  deviceScaleFactor: number;
  isMobile: boolean;
  hasTouch: boolean;
  brand?: string;
  category: 'smartphone' | 'tablet' | 'desktop';
  priority: 'high' | 'medium' | 'low';
  networkConditions?: {
    offline: boolean;
    downloadThroughput: number;
    uploadThroughput: number;
    latency: number;
  };
}

export const mobileDeviceMatrix: MobileDeviceConfig[] = [
  // High Priority iOS Devices (Primary Test Target)
  {
    name: 'iPhone 15 Pro',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    brand: 'Apple',
    category: 'smartphone',
    priority: 'high',
  },
  {
    name: 'iPhone 12',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    brand: 'Apple',
    category: 'smartphone',
    priority: 'high',
  },
  {
    name: 'iPhone SE (3rd generation)',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 375, height: 667 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    brand: 'Apple',
    category: 'smartphone',
    priority: 'high',
  },
  {
    name: 'iPad Pro 12.9"',
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 1024, height: 1366 },
    deviceScaleFactor: 2,
    isMobile: false, // Note: iPad should be treated as mobile device for our app
    hasTouch: true,
    brand: 'Apple',
    category: 'tablet',
    priority: 'high',
  },

  // High Priority Android Devices (Primary Test Target)
  {
    name: 'Pixel 7',
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36',
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2.625,
    isMobile: true,
    hasTouch: true,
    brand: 'Google',
    category: 'smartphone',
    priority: 'high',
  },
  {
    name: 'Samsung Galaxy S23',
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36',
    viewport: { width: 360, height: 780 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    brand: 'Samsung',
    category: 'smartphone',
    priority: 'high',
  },
  {
    name: 'OnePlus 11',
    userAgent: 'Mozilla/5.0 (Linux; Android 13; CPH2449) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36',
    viewport: { width: 412, height: 919 },
    deviceScaleFactor: 2.625,
    isMobile: true,
    hasTouch: true,
    brand: 'OnePlus',
    category: 'smartphone',
    priority: 'high',
  },

  // Medium Priority Cross-Browser Testing
  {
    name: 'Mobile Firefox Android',
    userAgent: 'Mozilla/5.0 (Mobile; rv:109.0) Gecko/109.0 Firefox/117.0',
    viewport: { width: 393, height: 851 },
    deviceScaleFactor: 2.75,
    isMobile: true,
    hasTouch: true,
    brand: 'Firefox',
    category: 'smartphone',
    priority: 'medium',
  },
  {
    name: 'Mobile Edge Android',
    userAgent: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36 EdgA/118.0.2088.69',
    viewport: { width: 393, height: 851 },
    deviceScaleFactor: 2.75,
    isMobile: true,
    hasTouch: true,
    brand: 'Microsoft',
    category: 'smartphone',
    priority: 'medium',
  },
  {
    name: 'Samsung Internet Browser',
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-A515F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36',
    viewport: { width: 360, height: 760 },
    deviceScaleFactor: 2.75,
    isMobile: true,
    hasTouch: true,
    brand: 'Samsung',
    category: 'smartphone',
    priority: 'medium',
  },

  // Desktop User Agents (for blocking validation)
  {
    name: 'Desktop Chrome (Should Block)',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    brand: 'Chrome',
    category: 'desktop',
    priority: 'high', // High priority for testing blocking
  },
  {
    name: 'Desktop Safari (Should Block)',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: false,
    brand: 'Safari',
    category: 'desktop',
    priority: 'high',
  },
];

// Network condition presets for performance testing
export const networkConditions = {
  '4g': {
    offline: false,
    downloadThroughput: 4 * 1024 * 1024 / 8, // 4 Mbps
    uploadThroughput: 3 * 1024 * 1024 / 8,   // 3 Mbps
    latency: 20, // 20ms
  },
  '3g': {
    offline: false,
    downloadThroughput: 1.6 * 1024 * 1024 / 8, // 1.6 Mbps
    uploadThroughput: 750 * 1024 / 8,           // 750 Kbps
    latency: 150, // 150ms
  },
  'slow3g': {
    offline: false,
    downloadThroughput: 500 * 1024 / 8, // 500 Kbps
    uploadThroughput: 500 * 1024 / 8,   // 500 Kbps
    latency: 400, // 400ms
  },
  'wifi': {
    offline: false,
    downloadThroughput: 30 * 1024 * 1024 / 8, // 30 Mbps
    uploadThroughput: 15 * 1024 * 1024 / 8,   // 15 Mbps
    latency: 2, // 2ms
  },
};

// Core Web Vitals benchmarks for mobile performance testing
export const performanceBenchmarks = {
  mobile: {
    // Lighthouse Core Web Vitals thresholds for mobile
    lcp: 2.5, // Largest Contentful Paint (seconds)
    fid: 100,  // First Input Delay (milliseconds)
    cls: 0.1,  // Cumulative Layout Shift
    speedIndex: 3.0, // Speed Index (seconds)
    ttiColdLoad: 3.5, // Time to Interactive for cold load (seconds)
    ttiWarmLoad: 2.0, // Time to Interactive for warm load (seconds)
    
    // Additional mobile-specific metrics
    firstPaint: 1.5, // First Paint (seconds)
    firstContentfulPaint: 2.0, // First Contentful Paint (seconds)
    
    // Resource loading benchmarks
    jsDownloadTime: 1.0, // JavaScript download time (seconds)
    cssDownloadTime: 0.5, // CSS download time (seconds)
    fontLoadingTime: 1.0, // Web font loading time (seconds)
    
    // PWA specific benchmarks
    serviceWorkerActivation: 1.0, // Service worker activation (seconds)
    offlinePageLoad: 2.0, // Offline page load (seconds)
    
    // Battery and resource efficiency
    cpuUsage: 50, // Maximum CPU usage percentage during testing
    memoryUsage: 100, // Maximum memory usage in MB
  }
};

// Test data for session management and cross-platform testing
export const testData = {
  sessionIds: [
    'test-session-001',
    'test-session-002', 
    'test-session-003',
    'mobile-web-session-001',
    'cross-platform-test-001'
  ],
  
  mockEvents: [
    {
      id: 'event-001',
      name: 'Test Event 1',
      sessionId: 'test-session-001',
      location: 'Test Venue',
      maxParticipants: 50
    }
  ],
  
  mockProfiles: [
    {
      id: 'web-user-001',
      name: 'Web Test User',
      platform: 'web',
      deviceType: 'mobile'
    },
    {
      id: 'mobile-user-001', 
      name: 'Mobile Test User',
      platform: 'mobile-app',
      deviceType: 'mobile'
    }
  ]
};

// Helper functions for device categorization
export const deviceHelpers = {
  isMobileDevice: (config: MobileDeviceConfig): boolean => {
    return config.category === 'smartphone' || config.category === 'tablet';
  },
  
  shouldBlockAccess: (config: MobileDeviceConfig): boolean => {
    return config.category === 'desktop';
  },
  
  getHighPriorityDevices: (): MobileDeviceConfig[] => {
    return mobileDeviceMatrix.filter(device => device.priority === 'high');
  },
  
  getMobileDevices: (): MobileDeviceConfig[] => {
    return mobileDeviceMatrix.filter(device => 
      device.category === 'smartphone' || device.category === 'tablet'
    );
  },
  
  getDesktopDevices: (): MobileDeviceConfig[] => {
    return mobileDeviceMatrix.filter(device => device.category === 'desktop');
  },
};

export default mobileDeviceMatrix;