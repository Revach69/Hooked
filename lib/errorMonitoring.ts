import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface ErrorLog {
  id: string;
  timestamp: string;
  operation: string;
  error: string;
  code?: string;
  platform: string;
  isDev: boolean;
  networkStatus?: string;
  retryCount?: number;
  userId?: string;
  eventId?: string;
}

export interface ErrorStats {
  totalErrors: number;
  errorsByOperation: Record<string, number>;
  errorsByCode: Record<string, number>;
  errorsByHour: Record<string, number>;
  recentErrors: ErrorLog[];
}

export interface FirebaseErrorContext {
  operation: string;
  retryCount?: number;
  networkStatus?: string;
  listenerType?: string;
  timestamp: string;
  platform: string;
  isDev: boolean;
}

class ErrorMonitor {
  private readonly maxLogs = 1000;
  private readonly storageKey = 'firebase_error_logs';

  async logError(error: any, operation: string, context?: {
    userId?: string;
    eventId?: string;
    retryCount?: number;
    networkStatus?: string;
  }): Promise<void> {
    try {
      const errorLog: ErrorLog = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        operation,
        error: error.message || error.toString(),
        code: error.code,
        platform: 'react-native',
        isDev: __DEV__,
        networkStatus: context?.networkStatus,
        retryCount: context?.retryCount,
        userId: context?.userId,
        eventId: context?.eventId
      };

      const existingLogs = await this.getLogs();
      existingLogs.unshift(errorLog);

      // Keep only the most recent logs
      if (existingLogs.length > this.maxLogs) {
        existingLogs.splice(this.maxLogs);
      }

      await AsyncStorage.setItem(this.storageKey, JSON.stringify(existingLogs));
      
      // Log to console in development
      if (__DEV__) {
        console.error('📊 Error logged:', errorLog);
      }
    } catch (storageError) {
      console.error('❌ Failed to log error to storage:', storageError);
    }
  }

  async getLogs(): Promise<ErrorLog[]> {
    try {
      const logs = await AsyncStorage.getItem(this.storageKey);
      return logs ? JSON.parse(logs) : [];
    } catch (error) {
      console.error('❌ Failed to retrieve error logs:', error);
      return [];
    }
  }

  async getStats(hours: number = 24): Promise<ErrorStats> {
    const logs = await this.getLogs();
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const recentLogs = logs.filter(log => new Date(log.timestamp) > cutoffTime);
    
    const stats: ErrorStats = {
      totalErrors: recentLogs.length,
      errorsByOperation: {},
      errorsByCode: {},
      errorsByHour: {},
      recentErrors: recentLogs.slice(0, 50) // Last 50 errors
    };

    recentLogs.forEach(log => {
      // Count by operation
      stats.errorsByOperation[log.operation] = (stats.errorsByOperation[log.operation] || 0) + 1;
      
      // Count by error code
      const code = log.code || 'unknown';
      stats.errorsByCode[code] = (stats.errorsByCode[code] || 0) + 1;
      
      // Count by hour
      const hour = new Date(log.timestamp).getHours().toString();
      stats.errorsByHour[hour] = (stats.errorsByHour[hour] || 0) + 1;
    });

    return stats;
  }

  async clearLogs(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.storageKey);
      console.log('✅ Error logs cleared');
    } catch (error) {
      console.error('❌ Failed to clear error logs:', error);
    }
  }

  async exportLogs(): Promise<string> {
    const logs = await this.getLogs();
    return JSON.stringify(logs, null, 2);
  }

  // Get error patterns for debugging
  async getErrorPatterns(): Promise<{
    mostCommonErrors: Array<{ error: string; count: number }>;
    operationsWithMostErrors: Array<{ operation: string; count: number }>;
    timeOfDayWithMostErrors: Array<{ hour: string; count: number }>;
  }> {
    const stats = await this.getStats(24);
    
    const mostCommonErrors = Object.entries(stats.errorsByCode)
      .map(([code, count]) => ({ error: code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const operationsWithMostErrors = Object.entries(stats.errorsByOperation)
      .map(([operation, count]) => ({ operation, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const timeOfDayWithMostErrors = Object.entries(stats.errorsByHour)
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      mostCommonErrors,
      operationsWithMostErrors,
      timeOfDayWithMostErrors
    };
  }
}

export const errorMonitor = new ErrorMonitor();

// Enhanced error monitoring with specific handling for internal assertion errors
export async function logFirebaseError(error: any, operation: string, context: Partial<FirebaseErrorContext> = {}) {
  const errorContext: FirebaseErrorContext = {
    operation,
    timestamp: new Date().toISOString(),
    platform: Platform.OS,
    isDev: __DEV__,
    ...context
  };

  // Special handling for internal assertion errors
  if (error.message && error.message.includes('INTERNAL ASSERTION FAILED')) {
    console.error('🚨 CRITICAL: Firebase Internal Assertion Error Detected:', {
      error: error.message,
      context: errorContext,
      recommendation: 'This may require app restart or Firebase reinitialization'
    });

    // Log to persistent storage for debugging
    try {
      const errorLog = {
        type: 'INTERNAL_ASSERTION_ERROR',
        error: error.message,
        context: errorContext,
        timestamp: new Date().toISOString()
      };
      
      // You could send this to a logging service or store locally
      console.log('📝 Internal assertion error logged:', errorLog);
    } catch (logError) {
      console.error('Failed to log internal assertion error:', logError);
    }

    return;
  }

  // Regular error logging
  console.error('❌ Firebase Error:', {
    error: error.message,
    code: error.code,
    context: errorContext
  });
}

// Listener management utility to prevent conflicts
class ListenerManager {
  private activeListeners = new Map<string, () => void>();
  private listenerCounts = new Map<string, number>();

  registerListener(id: string, unsubscribe: () => void) {
    // Clean up existing listener if it exists
    if (this.activeListeners.has(id)) {
      try {
        this.activeListeners.get(id)!();
      } catch (error) {
        console.warn(`Error cleaning up existing listener ${id}:`, error);
      }
    }

    this.activeListeners.set(id, unsubscribe);
    this.listenerCounts.set(id, (this.listenerCounts.get(id) || 0) + 1);
    
    console.log(`📡 Listener registered: ${id} (total: ${this.listenerCounts.get(id)})`);
  }

  unregisterListener(id: string) {
    if (this.activeListeners.has(id)) {
      try {
        this.activeListeners.get(id)!();
        this.activeListeners.delete(id);
        const count = (this.listenerCounts.get(id) || 1) - 1;
        this.listenerCounts.set(id, Math.max(0, count));
        
        console.log(`📡 Listener unregistered: ${id} (remaining: ${count})`);
      } catch (error) {
        console.warn(`Error unregistering listener ${id}:`, error);
      }
    }
  }

  cleanupAll() {
    console.log(`🧹 Cleaning up ${this.activeListeners.size} active listeners...`);
    
    for (const [id, unsubscribe] of this.activeListeners) {
      try {
        unsubscribe();
        console.log(`📡 Cleaned up listener: ${id}`);
      } catch (error) {
        console.warn(`Error cleaning up listener ${id}:`, error);
      }
    }
    
    this.activeListeners.clear();
    this.listenerCounts.clear();
  }

  getActiveListenerCount() {
    return this.activeListeners.size;
  }

  getListenerInfo() {
    return {
      activeCount: this.activeListeners.size,
      listeners: Array.from(this.activeListeners.keys()),
      counts: Object.fromEntries(this.listenerCounts)
    };
  }
}

// Global listener manager instance
export const listenerManager = new ListenerManager();

// Utility function to safely create listeners with error handling
export function createSafeListener<T>(
  id: string,
  query: any,
  onNext: (data: T) => void,
  onError?: (error: any) => void
) {
  try {
    // Clean up existing listener first
    listenerManager.unregisterListener(id);

    const unsubscribe = query.onSnapshot(
      (snapshot: any) => {
        try {
          onNext(snapshot);
        } catch (error) {
          console.error(`Error in listener callback for ${id}:`, error);
          logFirebaseError(error, `listener_callback_${id}`);
        }
      },
      (error: any) => {
        console.error(`Listener error for ${id}:`, error);
        logFirebaseError(error, `listener_error_${id}`, { listenerType: id });
        
        if (onError) {
          onError(error);
        }
      }
    );

    listenerManager.registerListener(id, unsubscribe);
    return unsubscribe;
  } catch (error) {
    console.error(`Error creating listener ${id}:`, error);
    logFirebaseError(error, `create_listener_${id}`, { listenerType: id });
    throw error;
  }
}

// Utility to check if we should retry operations
export function shouldRetryOperation(error: any, retryCount: number): boolean {
  const maxRetries = 3;
  
  if (retryCount >= maxRetries) {
    return false;
  }

  // Don't retry internal assertion errors immediately
  if (error.message && error.message.includes('INTERNAL ASSERTION FAILED')) {
    return false;
  }

  // Don't retry permission errors
  if (error.code === 'permission-denied') {
    return false;
  }

  return true;
}

// Utility to get retry delay with exponential backoff
export function getRetryDelay(retryCount: number, baseDelay: number = 1000): number {
  return baseDelay * Math.pow(2, retryCount) + Math.random() * 1000;
} 