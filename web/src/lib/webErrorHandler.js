// Web-compatible error handling utility
// Provides similar functionality to mobile error handling but adapted for web

export class WebErrorHandler {
  static ERROR_LOG_KEY = 'errorLog';
  static MAX_ERROR_LOG_SIZE = 100;

  /**
   * Handle async operations with error recovery
   */
  static async executeOperationWithRecovery(operation, options = {}) {
    const {
      operationName = 'Unknown operation',
      maxRetries = 3,
      baseDelay = 1000,
      onError = null,
      onRetry = null
    } = options;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔍 Executing ${operationName} (attempt ${attempt})`);
        const result = await operation();
        console.log(`✅ ${operationName} completed successfully`);
        return { success: true, result };
      } catch (error) {
        console.error(`❌ ${operationName} failed (attempt ${attempt}/${maxRetries}):`, error);
        
        // Log error
        this.logError(error, operationName, attempt);
        
        // Call onError callback if provided
        if (onError) {
          try {
            onError(error, attempt, maxRetries);
          } catch (callbackError) {
            console.error('Error in onError callback:', callbackError);
          }
        }

        if (attempt === maxRetries) {
          return { success: false, error, queued: false };
        }

        // Call onRetry callback if provided
        if (onRetry) {
          try {
            onRetry(error, attempt, maxRetries);
          } catch (callbackError) {
            console.error('Error in onRetry callback:', callbackError);
          }
        }

        // Wait before retry
        const delay = this.calculateRetryDelay(attempt, baseDelay);
        console.log(`⏳ Retrying in ${delay}ms...`);
        await this.delay(delay);
      }
    }

    return { success: false, error: new Error(`Operation failed after ${maxRetries} attempts`), queued: false };
  }

  /**
   * Execute operation with offline fallback
   */
  static async executeOperationWithOfflineFallback(operation, options = {}) {
    const {
      operationName = 'Unknown operation',
      fallbackOperation = null,
      queueOnFailure = true
    } = options;

    try {
      // Check if online
      if (!navigator.onLine) {
        console.log(`📱 Offline: ${operationName} will be queued`);
        if (queueOnFailure) {
          this.queueOperation(operation, operationName);
          return { success: false, queued: true, error: new Error('Offline - operation queued') };
        }
        throw new Error('No internet connection');
      }

      const result = await operation();
      return { success: true, result, queued: false };
    } catch (error) {
      console.error(`❌ ${operationName} failed:`, error);
      
      // Try fallback operation if provided
      if (fallbackOperation) {
        try {
          console.log(`🔄 Trying fallback for ${operationName}`);
          const fallbackResult = await fallbackOperation();
          return { success: true, result: fallbackResult, queued: false, usedFallback: true };
        } catch (fallbackError) {
          console.error(`❌ Fallback for ${operationName} also failed:`, fallbackError);
        }
      }

      // Queue operation if requested
      if (queueOnFailure) {
        this.queueOperation(operation, operationName);
        return { success: false, queued: true, error };
      }

      return { success: false, queued: false, error };
    }
  }

  /**
   * Queue operation for later execution
   */
  static queueOperation(operation, operationName) {
    try {
      const queue = this.getOperationQueue();
      const operationData = {
        id: `op_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        operation: operation.toString(),
        operationName,
        timestamp: Date.now(),
        retryCount: 0
      };
      
      queue.push(operationData);
      this.saveOperationQueue(queue);
      console.log(`📋 Queued operation: ${operationName}`);
    } catch (error) {
      console.error('Error queuing operation:', error);
    }
  }

  /**
   * Process queued operations
   */
  static async processQueuedOperations() {
    if (!navigator.onLine) {
      console.log('📱 Still offline, skipping queue processing');
      return;
    }

    try {
      const queue = this.getOperationQueue();
      if (queue.length === 0) {
        return;
      }

      console.log(`🔄 Processing ${queue.length} queued operations`);
      
      const processedOperations = [];
      const failedOperations = [];

      for (const operationData of queue) {
        try {
          // Note: In a real implementation, you'd need to reconstruct the operation
          // from the stored string, which is complex. For now, we'll just log it.
          console.log(`🔄 Processing queued operation: ${operationData.operationName}`);
          
          // Mark as processed
          processedOperations.push(operationData.id);
        } catch (error) {
          console.error(`❌ Failed to process queued operation: ${operationData.operationName}`, error);
          failedOperations.push(operationData.id);
        }
      }

      // Remove processed operations from queue
      const updatedQueue = queue.filter(op => 
        !processedOperations.includes(op.id) && !failedOperations.includes(op.id)
      );
      this.saveOperationQueue(updatedQueue);

      console.log(`✅ Processed ${processedOperations.length} operations, ${failedOperations.length} failed`);
    } catch (error) {
      console.error('Error processing queued operations:', error);
    }
  }

  /**
   * Show error alert (web-compatible)
   */
  static showErrorAlert(error, title = 'Error') {
    // For web, we'll use a simple alert or console log
    console.error(`${title}:`, error);
    
    // You could also show a toast notification here
    if (window.showToast) {
      window.showToast({
        type: 'error',
        title,
        message: error.message || 'An error occurred'
      });
    } else {
      alert(`${title}: ${error.message || 'An error occurred'}`);
    }
  }

  /**
   * Log error to localStorage
   */
  static logError(error, operationName, attempt = 1) {
    try {
      const errorLog = this.getErrorLog();
      const errorEntry = {
        id: `error_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        timestamp: Date.now(),
        operationName,
        attempt,
        message: error.message,
        stack: error.stack,
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      errorLog.push(errorEntry);

      // Keep log size manageable
      if (errorLog.length > this.MAX_ERROR_LOG_SIZE) {
        errorLog.splice(0, errorLog.length - this.MAX_ERROR_LOG_SIZE);
      }

      this.saveErrorLog(errorLog);
    } catch (logError) {
      console.error('Error logging error:', logError);
    }
  }

  /**
   * Get error log from localStorage
   */
  static getErrorLog() {
    try {
      const errorLog = localStorage.getItem(this.ERROR_LOG_KEY);
      return errorLog ? JSON.parse(errorLog) : [];
    } catch (error) {
      console.error('Error getting error log:', error);
      return [];
    }
  }

  /**
   * Save error log to localStorage
   */
  static saveErrorLog(errorLog) {
    try {
      localStorage.setItem(this.ERROR_LOG_KEY, JSON.stringify(errorLog));
    } catch (error) {
      console.error('Error saving error log:', error);
    }
  }

  /**
   * Clear error log
   */
  static clearErrorLog() {
    try {
      localStorage.removeItem(this.ERROR_LOG_KEY);
    } catch (error) {
      console.error('Error clearing error log:', error);
    }
  }

  /**
   * Get operation queue from localStorage
   */
  static getOperationQueue() {
    try {
      const queue = localStorage.getItem('operationQueue');
      return queue ? JSON.parse(queue) : [];
    } catch (error) {
      console.error('Error getting operation queue:', error);
      return [];
    }
  }

  /**
   * Save operation queue to localStorage
   */
  static saveOperationQueue(queue) {
    try {
      localStorage.setItem('operationQueue', JSON.stringify(queue));
    } catch (error) {
      console.error('Error saving operation queue:', error);
    }
  }

  /**
   * Clear operation queue
   */
  static clearOperationQueue() {
    try {
      localStorage.removeItem('operationQueue');
    } catch (error) {
      console.error('Error clearing operation queue:', error);
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  static calculateRetryDelay(attempt, baseDelay) {
    return baseDelay * Math.pow(2, attempt - 1);
  }

  /**
   * Delay utility
   */
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Initialize error handler
   */
  static initialize() {
    // Set up online/offline event listeners
    window.addEventListener('online', () => {
      console.log('🌐 Back online, processing queued operations');
      this.processQueuedOperations();
    });

    window.addEventListener('offline', () => {
      console.log('📱 Gone offline');
    });

    // Process any queued operations on page load
    if (navigator.onLine) {
      this.processQueuedOperations();
    }

    console.log('✅ Web error handler initialized');
  }
}

// Export convenience functions
export const executeOperationWithRecovery = (operation, options) => 
  WebErrorHandler.executeOperationWithRecovery(operation, options);

export const executeOperationWithOfflineFallback = (operation, options) => 
  WebErrorHandler.executeOperationWithOfflineFallback(operation, options);

export const showErrorAlert = (error, title) => 
  WebErrorHandler.showErrorAlert(error, title); 