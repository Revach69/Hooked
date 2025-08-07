import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import { onSnapshot } from 'firebase/firestore';

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
  private readonly maxErrorsPerMinute = 10; // Limit error logging rate
  private errorCounts = new Map<string, number>();
  private lastResetTime = Date.now();

  async logError(error: any, operation: string, context?: {
    userId?: string;
    eventId?: string;
    retryCount?: number;
    networkStatus?: string;
  }): Promise<void> {
    try {
      // Rate limiting: reset counters every minute
      const now = Date.now();
      if (now - this.lastResetTime > 60000) {
        this.errorCounts.clear();
        this.lastResetTime = now;
      }

      // Check if we're logging too many errors
      const errorKey = `${operation}:${error.code || 'unknown'}`;
      const currentCount = this.errorCounts.get(errorKey) || 0;
      
      if (currentCount >= this.maxErrorsPerMinute) {
        // Don't log this error to prevent spam
        return;
      }
      
      this.errorCounts.set(errorKey, currentCount + 1);

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
      
      // Log to console in development only if not a recursive error
      if (__DEV__ && !error.message?.includes('Global error caught')) {
        // Error logged
      }
    } catch (storageError) {
      // Don't log storage errors to prevent infinite loops
      if (__DEV__) {
        // Failed to log error to storage (silenced to prevent loops)
      }
    }
  }

  async getLogs(): Promise<ErrorLog[]> {
    try {
      const logs = await AsyncStorage.getItem(this.storageKey);
      return logs ? JSON.parse(logs) : [];
    } catch (error) {
              // Failed to retrieve error logs
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
              // Error logs cleared
    } catch (error) {
              // Failed to clear error logs
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

export async function getErrorInsights() {
  const logs = await errorMonitor.getLogs();
  const stats = await errorMonitor.getStats(24);
  const patterns = await errorMonitor.getErrorPatterns();
  
  return {
    logs,
    stats,
    patterns,
    summary: {
      totalErrors: stats.totalErrors,
      recentErrors: stats.recentErrors.length,
      mostCommonError: patterns.mostCommonErrors[0]?.error || 'None',
      operationsWithIssues: patterns.operationsWithMostErrors.slice(0, 3)
    }
  };
}

// Global error handler setup to prevent recursive error logging
let isGlobalErrorHandlerSetup = false;
let errorLogCount = 0;
const MAX_ERROR_LOGS = 50; // Maximum number of error logs before stopping

export function setupGlobalErrorHandler() {
  if (isGlobalErrorHandlerSetup) {
    return; // Already setup
  }

  isGlobalErrorHandlerSetup = true;

  // Override console.error to prevent recursive logging
  const originalConsoleError = console.error;
  console.error = (...args) => {
    // Check if this is a recursive error log
    const message = args.join(' ');
    if (message.includes('Global error caught') || message.includes('🚨 Global error caught')) {
      errorLogCount++;
      if (errorLogCount > MAX_ERROR_LOGS) {
        // Stop logging after max count to prevent infinite loops
        return;
      }
    }
    
    // Call original console.error
    originalConsoleError.apply(console, args);
  };

  // Setup global error handler for unhandled promise rejections
  if (typeof global !== 'undefined') {
    const originalUnhandledRejectionHandler = global.onunhandledrejection;
    
    global.onunhandledrejection = (event) => {
      // Prevent recursive error handling
      if (event.reason && typeof event.reason === 'object' && event.reason.message) {
        const message = event.reason.message;
        if (message.includes('Global error caught') || message.includes('🚨 Global error caught')) {
          errorLogCount++;
          if (errorLogCount > MAX_ERROR_LOGS) {
            event.preventDefault();
            return;
          }
        }
      }
      
      // Call the original handler if it exists
      if (originalUnhandledRejectionHandler) {
        originalUnhandledRejectionHandler.call(window, event);
      }
    };
  }

          // Global error handler setup complete
}

// Reset error count (useful for testing or after app restart)
export function resetErrorCount() {
  errorLogCount = 0;
          // Error count reset
}

// Get current error count
export function getErrorCount() {
  return errorLogCount;
}

// Enhanced error monitoring with specific handling for internal assertion errors
export async function logFirebaseError(error: any, operation: string, context: Partial<FirebaseErrorContext> = {}) {
  // Setup global error handler if not already done
  setupGlobalErrorHandler();

  const errorContext: FirebaseErrorContext = {
    operation,
    timestamp: new Date().toISOString(),
    platform: Platform.OS,
    isDev: __DEV__,
    ...context
  };

  // Special handling for internal assertion errors
  if (error.message && error.message.includes('INTERNAL ASSERTION FAILED')) {
    // CRITICAL: Firebase Internal Assertion Error Detected

    // Log to persistent storage for debugging
    try {
      const errorLog = {
        type: 'INTERNAL_ASSERTION_ERROR',
        error: error.message,
        context: errorContext,
        timestamp: new Date().toISOString()
      };
      
      // Store in AsyncStorage for debugging
      const existingLogs = await AsyncStorage.getItem('firebase_critical_errors');
      const logs = existingLogs ? JSON.parse(existingLogs) : [];
      logs.push(errorLog);
      
      // Keep only last 10 critical errors
      if (logs.length > 10) {
        logs.splice(0, logs.length - 10);
      }
      
      await AsyncStorage.setItem('firebase_critical_errors', JSON.stringify(logs));
              // Internal assertion error logged to storage
    } catch (logError) {
              // Failed to log internal assertion error
    }

    return;
  }

  // Regular error logging with rate limiting
  if (errorLogCount < MAX_ERROR_LOGS) {
    console.error('❌ Firebase Error:', {
      error: error.message,
      code: error.code,
      context: errorContext
    });
  }
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
    
            // Listener registered
  }

  unregisterListener(id: string) {
    if (this.activeListeners.has(id)) {
      try {
        this.activeListeners.get(id)!();
        this.activeListeners.delete(id);
        const count = (this.listenerCounts.get(id) || 1) - 1;
        this.listenerCounts.set(id, Math.max(0, count));
        
        // Listener unregistered
      } catch (error) {
        console.warn(`Error unregistering listener ${id}:`, error);
      }
    }
  }

  cleanupAll() {
            // Cleaning up active listeners
    
    for (const [id, unsubscribe] of this.activeListeners) {
      try {
        unsubscribe();
        // Cleaned up listener
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

// Enhanced safe listener creation with better error handling
export function createSafeListener<T>(
  id: string,
  query: any,
  onNext: (data: T) => void,
  onError?: (error: any) => void
) {
  try {
    const unsubscribe = onSnapshot(
      query,
      (snapshot: any) => {
        try {
          const data = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
          })) as T;
          onNext(data);
        } catch (error: any) {
          console.error('Error processing snapshot data:', error);
          if (onError) onError(error);
        }
      },
      (error: any) => {
        console.error('Firestore listener error:', error);
        if (onError) onError(error);
      }
    );

    listenerManager.registerListener(id, unsubscribe);
    return unsubscribe;
  } catch (error) {
    logFirebaseError(error, `create_listener_${id}`, { listenerType: id });
    throw error;
  }
}

// Enhanced retry logic with better error classification
export function shouldRetryOperation(error: any, retryCount: number): boolean {
  // Don't retry if max retries reached
  if (retryCount >= 3) return false;
  
  // Don't retry on permission errors
  if (error.code === 'permission-denied') return false;
  
  // Don't retry on not found errors
  if (error.code === 'not-found') return false;
  
  // Don't retry on invalid arguments
  if (error.code === 'invalid-argument') return false;
  
  // Don't retry on already exists errors
  if (error.code === 'already-exists') return false;
  
  // Retry on network errors, unavailable, and internal errors
  if (error.code === 'unavailable' || 
      error.code === 'deadline-exceeded' ||
      error.message?.includes('INTERNAL ASSERTION FAILED') ||
      error.message?.includes('network') ||
      error.message?.includes('timeout')) {
    return true;
  }
  
  // Retry on unknown errors (might be network related)
  if (!error.code) return true;
  
  return false;
}

// Enhanced retry delay calculation
export function getRetryDelay(retryCount: number, baseDelay: number = 1000): number {
  // Use exponential backoff with jitter
  const exponentialDelay = baseDelay * Math.pow(2, retryCount);
  const jitter = Math.random() * 1000;
  
  // Cap the maximum delay at 30 seconds
  return Math.min(exponentialDelay + jitter, 30000);
}

// Error recovery utilities
export class ErrorRecovery {
  private static recoveryAttempts = new Map<string, number>();
  private static readonly maxRecoveryAttempts = 3;

  static async attemptRecovery(operation: string, recoveryFunction: () => Promise<void>): Promise<boolean> {
    const attempts = this.recoveryAttempts.get(operation) || 0;
    
    if (attempts >= this.maxRecoveryAttempts) {
      console.warn(`⚠️ Max recovery attempts reached for ${operation}`);
      return false;
    }

    try {
      await recoveryFunction();
      this.recoveryAttempts.set(operation, 0); // Reset on success
              // Recovery successful
      return true;
    } catch (error) {
      this.recoveryAttempts.set(operation, attempts + 1);
      console.error(`❌ Recovery attempt ${attempts + 1} failed for ${operation}:`, error);
      return false;
    }
  }

  static resetRecoveryAttempts(operation: string): void {
    this.recoveryAttempts.delete(operation);
  }

  static getRecoveryAttempts(operation: string): number {
    return this.recoveryAttempts.get(operation) || 0;
  }
}

// Network-aware error handling
export class NetworkAwareErrorHandler {
  static async handleError(error: any, operation: string): Promise<void> {
    const netInfo = await NetInfo.fetch();
    
    if (!netInfo.isConnected) {
      console.warn(`⚠️ Network disconnected during ${operation}, error may be network-related`);
      // Could trigger offline mode or queue operation
    }
    
    if (error.code === 'unavailable') {
      console.warn(`⚠️ Service unavailable for ${operation}, may be temporary`);
      // Could implement circuit breaker pattern
    }
    
    if (error.message?.includes('INTERNAL ASSERTION FAILED')) {
      console.error(`🚨 Internal assertion error in ${operation}, may require app restart`);
      // Could trigger app restart or Firebase reinitialization
    }
  }
}

// Error analytics and reporting
export class ErrorAnalytics {
  private static errorCounts = new Map<string, number>();
  private static errorTimestamps = new Map<string, string[]>();

  static recordError(error: any, operation: string): void {
    const errorKey = `${operation}:${error.code || 'unknown'}`;
    const count = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, count + 1);
    
    const timestamps = this.errorTimestamps.get(errorKey) || [];
    timestamps.push(new Date().toISOString());
    
    // Keep only last 24 hours of timestamps
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recentTimestamps = timestamps.filter(ts => ts > oneDayAgo);
    this.errorTimestamps.set(errorKey, recentTimestamps);
  }

  static getErrorStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const [key, count] of this.errorCounts) {
      stats[key] = count;
    }
    return stats;
  }

  static getErrorFrequency(errorKey: string, hours: number = 1): number {
    const timestamps = this.errorTimestamps.get(errorKey) || [];
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    return timestamps.filter(ts => ts > cutoff).length;
  }

  static clearStats(): void {
    this.errorCounts.clear();
    this.errorTimestamps.clear();
  }
} 