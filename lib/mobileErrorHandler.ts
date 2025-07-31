// Enhanced Mobile Error Handling System with Offline Queue and Retry Mechanisms

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import { logFirebaseError } from './errorMonitoring';

export interface OfflineAction {
  id: string;
  operation: string;
  action: () => Promise<any>;
  metadata: Record<string, any>;
  timestamp: string;
  retryCount: number;
  maxRetries: number;
}

export interface ErrorHandlerConfig {
  maxRetries: number;
  baseDelay: number;
  maxOfflineActions: number;
  retryableErrors: string[];
  nonRetryableErrors: string[];
}

class MobileErrorHandler {
  private static instance: MobileErrorHandler;
  private offlineQueue: OfflineAction[] = [];
  private isProcessingQueue = false;
  private isOnline = true;
  private config: ErrorHandlerConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxOfflineActions: 100,
    retryableErrors: [
      'unavailable',
      'deadline-exceeded',
      'network',
      'timeout',
      'connection',
      'ECONNRESET',
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'ENETUNREACH'
    ],
    nonRetryableErrors: [
      'permission-denied',
      'not-found',
      'invalid-argument',
      'auth/user-not-found',
      'auth/wrong-password',
      'auth/invalid-email',
      'auth/email-already-in-use',
      'auth/weak-password'
    ]
  };

  private constructor() {
    this.initializeNetworkListener();
    this.loadOfflineQueue();
  }

  static getInstance(): MobileErrorHandler {
    if (!MobileErrorHandler.instance) {
      MobileErrorHandler.instance = new MobileErrorHandler();
    }
    return MobileErrorHandler.instance;
  }

  private async initializeNetworkListener() {
    // Get initial network status
    const netInfo = await NetInfo.fetch();
    this.isOnline = netInfo.isConnected ?? false;

    // Listen for network changes
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;

      if (!wasOnline && this.isOnline) {
        console.log('🌐 Mobile device is back online');
        this.processOfflineQueue();
        this.dispatchEvent('appOnline');
      } else if (wasOnline && !this.isOnline) {
        console.log('📴 Mobile device is offline');
        this.dispatchEvent('appOffline');
      }
    });
  }

  private dispatchEvent(eventName: string) {
    // For React Native, we'll use a simple event emitter pattern
    if ((global as any).eventEmitter) {
      (global as any).eventEmitter.emit(eventName);
    }
  }

  // Enhanced retry operation with exponential backoff and jitter
  async retryOperation<T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number;
      baseDelay?: number;
      operationName?: string;
      shouldRetry?: (error: any, attempt: number) => boolean;
      onRetry?: (error: any, attempt: number, delay: number) => void;
    } = {}
  ): Promise<T> {
    const {
      maxRetries = this.config.maxRetries,
      baseDelay = this.config.baseDelay,
      operationName = 'Unknown operation',
      shouldRetry = this.shouldRetryError.bind(this),
      onRetry
    } = options;

    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Check connectivity before attempting
        if (!(await this.checkConnectivity())) {
          throw new Error('No internet connection');
        }

        const result = await operation();
        return result;
      } catch (error) {
        lastError = error;

        // Log error with context
        this.logError(error, {
          operation: operationName,
          attempt,
          maxRetries,
          isOnline: this.isOnline
        });

        // Check if we should retry this error
        if (!shouldRetry(error, attempt)) {
          throw error;
        }

        if (attempt < maxRetries) {
          // Calculate delay with exponential backoff and jitter
          const delay = this.calculateDelay(attempt, baseDelay);

          console.log(`⏳ Retrying ${operationName} in ${Math.round(delay)}ms (attempt ${attempt}/${maxRetries})`);

          // Call onRetry callback if provided
          if (onRetry) {
            onRetry(error, attempt, delay);
          }

          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  // Determine if an error should be retried
  shouldRetryError(error: any, attempt: number): boolean {
    // Don't retry on certain Firebase errors
    if (this.config.nonRetryableErrors.some(code => 
      error.code === code || error.message?.includes(code)
    )) {
      return false;
    }

    // Retry on network errors, timeouts, and server errors
    return this.config.retryableErrors.some(code => 
      error.code === code || 
      error.message?.includes(code) ||
      error.message?.includes('No internet connection')
    );
  }

  // Calculate delay with exponential backoff and jitter
  calculateDelay(attempt: number, baseDelay: number): number {
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000;
    return Math.min(exponentialDelay + jitter, 10000); // Cap at 10 seconds
  }

  // Queue action for when device comes back online
  queueOfflineAction(
    action: () => Promise<any>,
    metadata: Record<string, any> = {}
  ): string {
    const offlineAction: OfflineAction = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      operation: metadata.operation || 'Unknown',
      action,
      metadata,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      maxRetries: metadata.maxRetries || this.config.maxRetries
    };

    this.offlineQueue.push(offlineAction);

    // Limit queue size
    if (this.offlineQueue.length > this.config.maxOfflineActions) {
      this.offlineQueue.shift(); // Remove oldest action
    }

    this.saveOfflineQueue();

    console.log(`📝 Queued offline action: ${metadata.operation || 'Unknown'}`);

    return offlineAction.id;
  }

  // Process queued offline actions when back online
  async processOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0 || this.isProcessingQueue) {
      return;
    }

    console.log(`🔄 Processing ${this.offlineQueue.length} queued actions`);
    this.isProcessingQueue = true;

    try {
      const queue = [...this.offlineQueue];
      this.offlineQueue = [];

      for (const action of queue) {
        try {
          await this.retryOperation(
            () => action.action(),
            {
              operationName: `Offline action: ${action.operation}`,
              maxRetries: action.maxRetries,
              baseDelay: 2000
            }
          );

          console.log(`✅ Successfully processed offline action: ${action.operation}`);
        } catch (error) {
          console.error(`❌ Failed to process offline action:`, error);

          // Re-queue if it's still a retryable error and hasn't exceeded max retries
          if (this.shouldRetryError(error, action.retryCount + 1) && 
              action.retryCount < action.maxRetries) {
            action.retryCount++;
            this.offlineQueue.push(action);
          }
        }
      }
    } finally {
      this.isProcessingQueue = false;
      this.saveOfflineQueue();
    }
  }

  // Save offline queue to AsyncStorage
  private async saveOfflineQueue(): Promise<void> {
    try {
      // Convert actions to serializable format
      const serializableQueue = this.offlineQueue.map(action => ({
        ...action,
        action: null // Remove function as it can't be serialized
      }));

      await AsyncStorage.setItem('hooked_mobile_offline_queue', JSON.stringify(serializableQueue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  // Load offline queue from AsyncStorage
  private async loadOfflineQueue(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem('hooked_mobile_offline_queue');
      if (saved) {
        const parsedQueue = JSON.parse(saved);
        console.log(`📋 Loaded ${parsedQueue.length} offline actions`);
        // Note: We can't restore the actual action functions, so we'll just track the count
        this.offlineQueue = [];
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
      this.offlineQueue = [];
    }
  }

  // Check connectivity
  async checkConnectivity(): Promise<boolean> {
    try {
      const netInfo = await NetInfo.fetch();
      this.isOnline = netInfo.isConnected ?? false;
      return this.isOnline;
    } catch (error) {
      this.isOnline = false;
      return false;
    }
  }

  // Get user-friendly error message
  getErrorMessage(error: any): string {
    if (!error) return 'An unknown error occurred';

    // Network/connectivity errors
    if (error.message?.includes('No internet connection') || 
        error.code === 'unavailable' ||
        !this.isOnline) {
      return 'No internet connection. Please check your network and try again.';
    }

    // Firebase specific errors
    switch (error.code) {
      case 'permission-denied':
        return 'You don\'t have permission to perform this action.';
      case 'not-found':
        return 'The requested resource was not found.';
      case 'already-exists':
        return 'This resource already exists.';
      case 'deadline-exceeded':
        return 'The operation timed out. Please try again.';
      case 'auth/user-not-found':
        return 'User account not found.';
      case 'auth/wrong-password':
        return 'Incorrect password.';
      case 'auth/invalid-email':
        return 'Invalid email address.';
      case 'auth/email-already-in-use':
        return 'This email is already registered.';
      case 'auth/weak-password':
        return 'Password is too weak. Please choose a stronger password.';
      default:
        return error.message || 'An unexpected error occurred. Please try again.';
    }
  }

  // Log error with enhanced context
  private logError(error: any, context: Record<string, any> = {}): void {
    const errorInfo = {
      message: error.message,
      code: error.code,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      isOnline: this.isOnline,
      platform: Platform.OS,
      ...context
    };

    console.error('🚨 Mobile error occurred:', errorInfo);

    // Use existing error monitoring
    logFirebaseError(error, context.operation || 'Unknown', {
      networkStatus: this.isOnline ? 'connected' : 'disconnected',
      retryCount: context.attempt || 0,
      platform: Platform.OS,
      isDev: __DEV__
    });
  }

  // Utility function for sleeping
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get current online status
  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  // Get offline queue length
  getOfflineQueueLength(): number {
    return this.offlineQueue.length;
  }

  // Clear offline queue
  clearOfflineQueue(): void {
    this.offlineQueue = [];
    this.saveOfflineQueue();
  }

  // Get queue processing status
  isQueueProcessing(): boolean {
    return this.isProcessingQueue;
  }

  // Update configuration
  updateConfig(newConfig: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Create singleton instance
const mobileErrorHandler = MobileErrorHandler.getInstance();

// Export utility functions
export const withErrorHandling = <T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    operationName?: string;
  } = {}
): Promise<T> => {
  return mobileErrorHandler.retryOperation(operation, options);
};

export const queueOfflineAction = (
  action: () => Promise<any>,
  metadata: Record<string, any> = {}
): string => {
  return mobileErrorHandler.queueOfflineAction(action, metadata);
};

export const getErrorMessage = (error: any): string => {
  return mobileErrorHandler.getErrorMessage(error);
};

export const isOnline = (): boolean => {
  return mobileErrorHandler.getOnlineStatus();
};

export const getOfflineQueueLength = (): number => {
  return mobileErrorHandler.getOfflineQueueLength();
};

export const clearOfflineQueue = (): void => {
  mobileErrorHandler.clearOfflineQueue();
};

export const isQueueProcessing = (): boolean => {
  return mobileErrorHandler.isQueueProcessing();
};

export default mobileErrorHandler;