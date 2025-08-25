import { UAParser } from 'ua-parser-js';

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  browser: string;
  os: string;
  screenSize: 'small' | 'medium' | 'large';
}

// Device detection using user agent and screen dimensions
export function detectDevice(): DeviceInfo {
  if (typeof window === 'undefined') {
    // SSR fallback - assume mobile for mobile-first approach
    return {
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      deviceType: 'mobile',
      browser: 'unknown',
      os: 'unknown',
      screenSize: 'small',
    };
  }

  const parser = new UAParser();
  const result = parser.getResult();
  
  // Get screen dimensions
  const screenWidth = window.screen.width;
  const viewportWidth = window.innerWidth;
  
  // Determine device type based on user agent and screen size
  const deviceType = result.device.type || 'desktop';
  const isMobile = deviceType === 'mobile' || screenWidth <= 768;
  const isTablet = deviceType === 'tablet' || (screenWidth > 768 && screenWidth <= 1024);
  const isDesktop = !isMobile && !isTablet;

  // Determine screen size category
  let screenSize: 'small' | 'medium' | 'large';
  if (viewportWidth <= 640) {
    screenSize = 'small';
  } else if (viewportWidth <= 1024) {
    screenSize = 'medium';
  } else {
    screenSize = 'large';
  }

  return {
    isMobile,
    isTablet,
    isDesktop,
    deviceType: isDesktop ? 'desktop' : isTablet ? 'tablet' : 'mobile',
    browser: result.browser.name || 'unknown',
    os: result.os.name || 'unknown',
    screenSize,
  };
}

// Check if device should be blocked (desktop users)
export function shouldBlockDevice(deviceInfo?: DeviceInfo): boolean {
  const device = deviceInfo || detectDevice();
  return device.isDesktop;
}

// Get mobile-specific CSS classes
export function getMobileClasses(deviceInfo?: DeviceInfo): string {
  const device = deviceInfo || detectDevice();
  
  const classes = ['mobile-app'];
  
  if (device.isMobile) classes.push('is-mobile');
  if (device.isTablet) classes.push('is-tablet');
  if (device.screenSize === 'small') classes.push('screen-small');
  if (device.screenSize === 'medium') classes.push('screen-medium');
  
  return classes.join(' ');
}

// Touch capability detection
export function hasTouchSupport(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore - for older browsers
    navigator.msMaxTouchPoints > 0
  );
}

// Viewport utilities for mobile optimization
export function getViewportInfo() {
  if (typeof window === 'undefined') {
    return {
      width: 375, // iPhone default
      height: 667,
      aspectRatio: 375 / 667,
      orientation: 'portrait' as const,
    };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  
  return {
    width,
    height,
    aspectRatio: width / height,
    orientation: width > height ? 'landscape' as const : 'portrait' as const,
  };
}