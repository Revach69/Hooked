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
  } catch (error) {
    console.error('Error checking network status:', error);
    return false;
  }
};

export const getNetworkType = async (): Promise<string> => {
  try {
    const state = await NetInfo.fetch();
    return state.type || 'unknown';
  } catch (error) {
    console.error('Error getting network type:', error);
    return 'unknown';
  }
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
      console.log(`Component ${componentId} is no longer mounted, skipping operation`);
      return null;
    }

    const result = await operation();
    
    // Check again after operation
    if (componentId && !MemoryManager.isComponentMounted(componentId)) {
      console.log(`Component ${componentId} was unmounted during operation`);
      return null;
    }

    return result;
  } catch (error) {
    console.error('Safe async operation failed:', error);
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
export const createMemoryLeakDetector = (componentName: string) => {
  const startTime = Date.now();
  const startMemory = (global as any).performance?.memory?.usedJSHeapSize || 0;
  
  return {
    check: () => {
      const currentMemory = (global as any).performance?.memory?.usedJSHeapSize || 0;
      const memoryIncrease = currentMemory - startMemory;
      const timeElapsed = Date.now() - startTime;
      
      if (memoryIncrease > 10 * 1024 * 1024) { // 10MB threshold
        console.warn(`Potential memory leak detected in ${componentName}:`, {
          memoryIncrease: `${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`,
          timeElapsed: `${(timeElapsed / 1000).toFixed(2)}s`
        });
      }
    }
  };
}; 