// Enhanced Error Handling System for Offline Scenarios and Retry Mechanisms

class ErrorHandler {
  constructor() {
    this.isOnline = navigator.onLine;
    this.retryQueue = [];
    this.maxRetries = 3;
    this.baseDelay = 1000;
    this.offlineActions = new Map();
    
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Initialize offline detection
    this.checkConnectivity();
  }

  // Check if the app is online
  async checkConnectivity() {
    try {
      // Try to fetch a small resource to verify connectivity
      const response = await fetch('/favicon.png', { 
        method: 'HEAD',
        cache: 'no-cache',
        timeout: 5000 
      });
      this.isOnline = response.ok;
    } catch (error) {
      this.isOnline = false;
    }
    
    // Also check navigator.onLine as fallback
    this.isOnline = this.isOnline && navigator.onLine;
    
    return this.isOnline;
  }

  // Handle when device comes online
  async handleOnline() {
    console.log('🌐 Device is back online');
    this.isOnline = true;
    
    // Process queued offline actions
    await this.processOfflineQueue();
    
    // Dispatch custom event for components to react
    window.dispatchEvent(new CustomEvent('appOnline'));
  }

  // Handle when device goes offline
  handleOffline() {
    console.log('📴 Device is offline');
    this.isOnline = false;
    
    // Dispatch custom event for components to react
    window.dispatchEvent(new CustomEvent('appOffline'));
  }

  // Enhanced retry mechanism with exponential backoff and jitter
  async retryOperation(operation, options = {}) {
    const {
      maxRetries = this.maxRetries,
      baseDelay = this.baseDelay,
      operationName = 'Unknown operation',
      shouldRetry = this.shouldRetryError,
      onRetry = null
    } = options;

    let lastError;
    
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
  shouldRetryError(error, attempt) {
    // Don't retry on certain Firebase errors
    if (error.code === 'permission-denied' || 
        error.code === 'not-found' || 
        error.code === 'invalid-argument') {
      return false;
    }
    
    // Don't retry on authentication errors (except network issues)
    if (error.code === 'auth/user-not-found' || 
        error.code === 'auth/wrong-password' ||
        error.code === 'auth/invalid-email') {
      return false;
    }
    
    // Retry on network errors, timeouts, and server errors
    return error.code === 'unavailable' || 
           error.code === 'deadline-exceeded' ||
           error.message.includes('network') ||
           error.message.includes('timeout') ||
           error.message.includes('No internet connection') ||
           error.code >= 500;
  }

  // Calculate delay with exponential backoff and jitter
  calculateDelay(attempt, baseDelay) {
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000;
    return Math.min(exponentialDelay + jitter, 10000); // Cap at 10 seconds
  }

  // Queue action for when device comes back online
  queueOfflineAction(action, metadata = {}) {
    const queuedAction = {
      id: Date.now() + Math.random(),
      action,
      metadata,
      timestamp: new Date().toISOString()
    };
    
    this.retryQueue.push(queuedAction);
    this.saveOfflineQueue();
    
    console.log(`📝 Queued offline action: ${metadata.operation || 'Unknown'}`);
    
    return queuedAction.id;
  }

  // Process queued offline actions when back online
  async processOfflineQueue() {
    if (this.retryQueue.length === 0) return;
    
    console.log(`🔄 Processing ${this.retryQueue.length} queued actions`);
    
    const queue = [...this.retryQueue];
    this.retryQueue = [];
    
    for (const queuedAction of queue) {
      try {
        await this.retryOperation(
          () => queuedAction.action(),
          {
            operationName: `Offline action: ${queuedAction.metadata.operation || 'Unknown'}`,
            maxRetries: 2,
            baseDelay: 2000
          }
        );
        
        console.log(`✅ Successfully processed offline action: ${queuedAction.metadata.operation || 'Unknown'}`);
      } catch (error) {
        console.error(`❌ Failed to process offline action:`, error);
        
        // Re-queue if it's still a network issue
        if (this.shouldRetryError(error, 1)) {
          this.retryQueue.push(queuedAction);
        }
      }
    }
    
    this.saveOfflineQueue();
  }

  // Save offline queue to localStorage
  saveOfflineQueue() {
    try {
      localStorage.setItem('hooked_offline_queue', JSON.stringify(this.retryQueue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  // Load offline queue from localStorage
  loadOfflineQueue() {
    try {
      const saved = localStorage.getItem('hooked_offline_queue');
      if (saved) {
        this.retryQueue = JSON.parse(saved);
        console.log(`📋 Loaded ${this.retryQueue.length} offline actions`);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
      this.retryQueue = [];
    }
  }

  // Get user-friendly error message
  getErrorMessage(error) {
    if (!error) return 'An unknown error occurred';
    
    // Network/connectivity errors
    if (error.message.includes('No internet connection') || 
        error.code === 'unavailable' ||
        !navigator.onLine) {
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
  logError(error, context = {}) {
    const errorInfo = {
      message: error.message,
      code: error.code,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      isOnline: this.isOnline,
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...context
    };
    
    console.error('🚨 Error occurred:', errorInfo);
    
    // In production, you might want to send this to an error tracking service
    // this.reportError(errorInfo);
  }

  // Report error to external service (placeholder)
  reportError(errorInfo) {
    // Implementation for error reporting service (e.g., Sentry, LogRocket)
    // console.log('Would report error:', errorInfo);
  }

  // Utility function for sleeping
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get current online status
  getOnlineStatus() {
    return this.isOnline;
  }

  // Get offline queue length
  getOfflineQueueLength() {
    return this.retryQueue.length;
  }

  // Clear offline queue
  clearOfflineQueue() {
    this.retryQueue = [];
    this.saveOfflineQueue();
  }
}

// Create singleton instance
const errorHandler = new ErrorHandler();

// Load any saved offline queue on initialization
errorHandler.loadOfflineQueue();

export default errorHandler;

// Export utility functions
export const withErrorHandling = (operation, options = {}) => {
  return errorHandler.retryOperation(operation, options);
};

export const queueOfflineAction = (action, metadata) => {
  return errorHandler.queueOfflineAction(action, metadata);
};

export const getErrorMessage = (error) => {
  return errorHandler.getErrorMessage(error);
};

export const isOnline = () => {
  return errorHandler.getOnlineStatus();
};

export const getOfflineQueueLength = () => {
  return errorHandler.getOfflineQueueLength();
}; 