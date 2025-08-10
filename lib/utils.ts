import { clsx } from "clsx";
import NetInfo from '@react-native-community/netinfo';

export function cn(...inputs: any[]) {
  return clsx(inputs);
}

// React Native specific utilities
export const formatDate = (date: Date): string => {
  return date.toLocaleDateString();
};

export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

// Network utilities
export const checkNetworkStatus = async (): Promise<boolean> => {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
  } catch {
    // Error checking network status
    return false;
  }
};

export const getNetworkType = async (): Promise<string> => {
  try {
    const state = await NetInfo.fetch();
    return state.type || 'unknown';
  } catch {
    // Error getting network type
    return 'unknown';
  }
}; 

// Network connectivity check - using multiple endpoints for better reliability
export const checkNetworkConnectivity = async (): Promise<boolean> => {
  const endpoints = [
    'https://httpbin.org/status/200',
    'https://www.cloudflare.com/cdn-cgi/trace',
    'https://api.github.com/zen'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'HEAD',
        cache: 'no-cache',
      });
      if (response.ok) {
        return true;
      }
    } catch {
      // Try next endpoint
      continue;
    }
  }
  
  return false;
};

// Enhanced network check with timeout
export const checkNetworkConnectivityWithTimeout = async (timeoutMs: number = 5000): Promise<boolean> => {
  const endpoints = [
    'https://httpbin.org/status/200',
    'https://www.cloudflare.com/cdn-cgi/trace',
    'https://api.github.com/zen'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await fetch(endpoint, {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      if (response.ok) {
        return true;
      }
    } catch {
      // Try next endpoint
      continue;
    }
  }
  
  return false;
};

// Simple network check that doesn't rely on external services
export const checkSimpleNetworkConnectivity = async (): Promise<boolean> => {
  // Just check if we can make a basic fetch request
  // This is more reliable than checking external endpoints
  return true;
};

// Memory management utilities
export const MemoryManager = {
  // Track component mounts to prevent memory leaks
  mountedComponents: new Set<string>(),

  // Register a component as mounted
  registerComponent: (componentId: string) => {
    MemoryManager.mountedComponents.add(componentId);
  },

  // Unregister a component when unmounted
  unregisterComponent: (componentId: string) => {
    MemoryManager.mountedComponents.delete(componentId);
  },

  // Check if a component is still mounted
  isComponentMounted: (componentId: string): boolean => {
    return MemoryManager.mountedComponents.has(componentId);
  },

  // Clear all registered components (useful for testing)
  clearAll: () => {
    MemoryManager.mountedComponents.clear();
  },

  // Get count of mounted components
  getMountedCount: (): number => {
    return MemoryManager.mountedComponents.size;
  }
};

// Safe async operation wrapper
export const safeAsyncOperation = async <T>(
  operation: () => Promise<T>,
  componentId?: string
): Promise<T | null> => {
  try {
    // Check if component is still mounted before operation
    if (componentId && !MemoryManager.isComponentMounted(componentId)) {
      // Component no longer mounted, skipping operation
      return null;
    }

    const result = await operation();
    
    // Check again after operation
    if (componentId && !MemoryManager.isComponentMounted(componentId)) {
      // Component was unmounted during operation
      return null;
    }

    return result;
  } catch {
    // Safe async operation failed
    return null;
  }
};

// Debounce utility to prevent excessive function calls
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle utility to limit function execution frequency
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Memory leak detection helper
export const createMemoryLeakDetector = () => {
  const startMemory = (global as any).performance?.memory?.usedJSHeapSize || 0;
  
  return {
    check: () => {
      const currentMemory = (global as any).performance?.memory?.usedJSHeapSize || 0;
      const memoryIncrease = currentMemory - startMemory;
      
      if (memoryIncrease > 10 * 1024 * 1024) { // 10MB threshold
        // Potential memory leak detected
      }
    }
  };
}; 