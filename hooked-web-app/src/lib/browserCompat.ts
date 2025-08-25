'use client';

/**
 * Cross-browser compatibility utilities for mobile browsers
 * Ensures consistent functionality across Chrome, Safari, Firefox, and Edge Mobile
 */

// Browser detection and feature support
export const browserInfo = {
  isChrome: typeof window !== 'undefined' && /Chrome/i.test(navigator.userAgent) && !/EdgA?/i.test(navigator.userAgent),
  isSafari: typeof window !== 'undefined' && /Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent),
  isFirefox: typeof window !== 'undefined' && /Firefox/i.test(navigator.userAgent),
  isEdge: typeof window !== 'undefined' && /EdgA?/i.test(navigator.userAgent),
  isIOS: typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent),
  isAndroid: typeof window !== 'undefined' && /Android/i.test(navigator.userAgent),
  
  // Feature detection
  supportsServiceWorker: typeof window !== 'undefined' && 'serviceWorker' in navigator,
  supportsPushManager: typeof window !== 'undefined' && 'PushManager' in window,
  supportsNotifications: typeof window !== 'undefined' && 'Notification' in window,
  supportsWebShare: typeof window !== 'undefined' && 'share' in navigator,
  supportsClipboard: typeof window !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText,
  supportsVibration: typeof window !== 'undefined' && 'vibrate' in navigator,
  supportsIntersectionObserver: typeof window !== 'undefined' && 'IntersectionObserver' in window,
  supportsResizeObserver: typeof window !== 'undefined' && 'ResizeObserver' in window,
  supportsWebP: false, // Will be set dynamically
  supportsAvif: false, // Will be set dynamically
};

// Initialize feature detection
if (typeof window !== 'undefined') {
  // WebP support detection
  const webpCanvas = document.createElement('canvas');
  webpCanvas.width = 1;
  webpCanvas.height = 1;
  browserInfo.supportsWebP = webpCanvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  
  // AVIF support detection (more complex)
  const testAvif = () => {
    const avif = new Image();
    avif.onload = avif.onerror = () => {
      browserInfo.supportsAvif = avif.height === 1;
    };
    avif.src = "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=";
  };
  testAvif();
}

// Safe area insets support for iOS
export const getSafeAreaInsets = () => {
  if (typeof window === 'undefined') return { top: 0, right: 0, bottom: 0, left: 0 };
  
  const style = getComputedStyle(document.documentElement);
  return {
    top: parseInt(style.getPropertyValue('env(safe-area-inset-top)') || '0'),
    right: parseInt(style.getPropertyValue('env(safe-area-inset-right)') || '0'),
    bottom: parseInt(style.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
    left: parseInt(style.getPropertyValue('env(safe-area-inset-left)') || '0'),
  };
};

// CSS Custom Properties fallbacks for older browsers
export const setCSSCustomProperty = (property: string, value: string) => {
  if (typeof document === 'undefined') return;
  
  try {
    document.documentElement.style.setProperty(property, value);
  } catch (error) {
    // Fallback for browsers that don't support CSS custom properties
    console.warn(`CSS custom property ${property} not supported, using fallback`);
  }
};

// Viewport height fixes for mobile browsers (especially iOS Safari)
export const getViewportHeight = () => {
  if (typeof window === 'undefined') return 0;
  
  // Use visual viewport if available (better for mobile)
  if ('visualViewport' in window && window.visualViewport) {
    return window.visualViewport.height;
  }
  
  // Fallback to window.innerHeight
  return window.innerHeight;
};

// Set CSS viewport height variable
export const setViewportHeight = () => {
  if (typeof window === 'undefined') return;
  
  const vh = getViewportHeight() * 0.01;
  setCSSCustomProperty('--vh', `${vh}px`);
  
  // Update on resize/orientation change
  const updateVH = () => {
    const vh = getViewportHeight() * 0.01;
    setCSSCustomProperty('--vh', `${vh}px`);
  };
  
  window.addEventListener('resize', updateVH);
  window.addEventListener('orientationchange', () => {
    // Delay to ensure viewport has updated
    setTimeout(updateVH, 100);
  });
  
  // Handle iOS Safari bottom bar show/hide
  if (browserInfo.isIOS && browserInfo.isSafari) {
    window.addEventListener('scroll', updateVH);
  }
};

// Touch event polyfills and normalizations
export const normalizeTouchEvent = (event: TouchEvent | MouseEvent) => {
  if ('touches' in event) {
    // Touch event
    const touch = event.touches[0] || event.changedTouches[0];
    return {
      clientX: touch.clientX,
      clientY: touch.clientY,
      pageX: touch.pageX,
      pageY: touch.pageY,
    };
  } else {
    // Mouse event
    return {
      clientX: event.clientX,
      clientY: event.clientY,
      pageX: event.pageX,
      pageY: event.pageY,
    };
  }
};

// Clipboard API with fallbacks
export const copyToClipboard = async (text: string): Promise<boolean> => {
  if (browserInfo.supportsClipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.warn('Clipboard API failed, using fallback');
    }
  }
  
  // Fallback for older browsers
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    return true;
  } catch (error) {
    console.error('Copy to clipboard failed:', error);
    return false;
  }
};

// Web Share API with fallbacks
export const shareContent = async (data: { title?: string; text?: string; url?: string }) => {
  if (browserInfo.supportsWebShare) {
    try {
      await navigator.share(data);
      return true;
    } catch (error) {
      if (error.name === 'AbortError') {
        // User cancelled, not an error
        return false;
      }
      console.warn('Web Share API failed, using fallback');
    }
  }
  
  // Fallback: copy URL to clipboard
  if (data.url) {
    const success = await copyToClipboard(data.url);
    if (success) {
      // Show toast notification
      console.log('Link copied to clipboard');
      return true;
    }
  }
  
  return false;
};

// Vibration API with fallbacks
export const vibrate = (pattern: number | number[]) => {
  if (!browserInfo.supportsVibration) return false;
  
  try {
    return navigator.vibrate(pattern);
  } catch (error) {
    console.warn('Vibration not supported or failed:', error);
    return false;
  }
};

// Fullscreen API normalization
export const requestFullscreen = (element: Element) => {
  if (!element) return Promise.reject('No element provided');
  
  if (element.requestFullscreen) {
    return element.requestFullscreen();
  } else if ((element as any).webkitRequestFullscreen) {
    return (element as any).webkitRequestFullscreen();
  } else if ((element as any).mozRequestFullScreen) {
    return (element as any).mozRequestFullScreen();
  } else if ((element as any).msRequestFullscreen) {
    return (element as any).msRequestFullscreen();
  }
  
  return Promise.reject('Fullscreen not supported');
};

export const exitFullscreen = () => {
  if (document.exitFullscreen) {
    return document.exitFullscreen();
  } else if ((document as any).webkitExitFullscreen) {
    return (document as any).webkitExitFullscreen();
  } else if ((document as any).mozCancelFullScreen) {
    return (document as any).mozCancelFullScreen();
  } else if ((document as any).msExitFullscreen) {
    return (document as any).msExitFullscreen();
  }
  
  return Promise.reject('Exit fullscreen not supported');
};

// LocalStorage with error handling
export const storage = {
  get: (key: string, defaultValue: any = null) => {
    if (typeof window === 'undefined') return defaultValue;
    
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`LocalStorage get failed for key ${key}:`, error);
      return defaultValue;
    }
  },
  
  set: (key: string, value: any): boolean => {
    if (typeof window === 'undefined') return false;
    
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn(`LocalStorage set failed for key ${key}:`, error);
      return false;
    }
  },
  
  remove: (key: string): boolean => {
    if (typeof window === 'undefined') return false;
    
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`LocalStorage remove failed for key ${key}:`, error);
      return false;
    }
  },
};

// Network connection API
export const getNetworkInfo = () => {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return { effectiveType: 'unknown', downlink: 0, rtt: 0, saveData: false };
  }
  
  const connection = (navigator as any).connection;
  return {
    effectiveType: connection.effectiveType || 'unknown',
    downlink: connection.downlink || 0,
    rtt: connection.rtt || 0,
    saveData: connection.saveData || false,
  };
};

// Image loading with format fallbacks
export const loadOptimizedImage = (src: string, options: { width?: number; quality?: number } = {}) => {
  const { width, quality = 75 } = options;
  
  // Build srcset with format fallbacks
  const srcset: string[] = [];
  
  if (browserInfo.supportsAvif) {
    srcset.push(`${src}?format=avif&w=${width}&q=${quality} 1x`);
  }
  
  if (browserInfo.supportsWebP) {
    srcset.push(`${src}?format=webp&w=${width}&q=${quality} 1x`);
  }
  
  // Always include fallback
  srcset.push(`${src}?w=${width}&q=${quality} 1x`);
  
  return {
    src: `${src}?w=${width}&q=${quality}`,
    srcSet: srcset.join(', '),
  };
};

// Performance observer fallbacks
export const observePerformance = (callback: (entries: PerformanceEntry[]) => void, options: { type: string; buffered?: boolean }) => {
  if (!('PerformanceObserver' in window)) {
    console.warn('PerformanceObserver not supported');
    return null;
  }
  
  try {
    const observer = new PerformanceObserver((list) => {
      callback(list.getEntries());
    });
    
    observer.observe(options);
    return observer;
  } catch (error) {
    console.warn('PerformanceObserver failed:', error);
    return null;
  }
};

// Initialize compatibility fixes on load
export const initBrowserCompat = () => {
  if (typeof window === 'undefined') return;
  
  // Set viewport height
  setViewportHeight();
  
  // Add browser-specific classes to body
  const browserClasses = [];
  if (browserInfo.isChrome) browserClasses.push('browser-chrome');
  if (browserInfo.isSafari) browserClasses.push('browser-safari');
  if (browserInfo.isFirefox) browserClasses.push('browser-firefox');
  if (browserInfo.isEdge) browserClasses.push('browser-edge');
  if (browserInfo.isIOS) browserClasses.push('platform-ios');
  if (browserInfo.isAndroid) browserClasses.push('platform-android');
  
  document.body.classList.add(...browserClasses);
  
  // Add safe area support
  const safeAreaInsets = getSafeAreaInsets();
  setCSSCustomProperty('--safe-area-inset-top', `${safeAreaInsets.top}px`);
  setCSSCustomProperty('--safe-area-inset-right', `${safeAreaInsets.right}px`);
  setCSSCustomProperty('--safe-area-inset-bottom', `${safeAreaInsets.bottom}px`);
  setCSSCustomProperty('--safe-area-inset-left', `${safeAreaInsets.left}px`);
  
  console.log('Browser compatibility initialized:', {
    browser: Object.keys(browserInfo).filter(key => key.startsWith('is') && browserInfo[key as keyof typeof browserInfo]),
    features: Object.keys(browserInfo).filter(key => key.startsWith('supports') && browserInfo[key as keyof typeof browserInfo]),
  });
};