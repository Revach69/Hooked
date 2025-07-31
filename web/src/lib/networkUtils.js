// Network utilities for handling requests with retry logic and offline support

import { withErrorHandling, queueOfflineAction } from './errorHandler';

// Enhanced fetch with retry logic
export const fetchWithRetry = async (url, options = {}, retryOptions = {}) => {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    timeout = 10000,
    ...fetchOptions
  } = retryOptions;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const fetchOperation = async () => {
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  };

  return withErrorHandling(fetchOperation, {
    maxRetries,
    baseDelay,
    operationName: `Fetch ${url}`
  });
};

// JSON fetch with retry logic
export const fetchJSON = async (url, options = {}, retryOptions = {}) => {
  const response = await fetchWithRetry(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  }, retryOptions);

  return response.json();
};

// POST JSON with retry logic
export const postJSON = async (url, data, options = {}, retryOptions = {}) => {
  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: JSON.stringify(data),
    ...options
  }, retryOptions);

  return response.json();
};

// PUT JSON with retry logic
export const putJSON = async (url, data, options = {}, retryOptions = {}) => {
  const response = await fetchWithRetry(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: JSON.stringify(data),
    ...options
  }, retryOptions);

  return response.json();
};

// DELETE with retry logic
export const deleteWithRetry = async (url, options = {}, retryOptions = {}) => {
  const response = await fetchWithRetry(url, {
    method: 'DELETE',
    ...options
  }, retryOptions);

  return response;
};

// Queue network request for offline execution
export const queueNetworkRequest = (requestFn, metadata = {}) => {
  return queueOfflineAction(requestFn, {
    type: 'network_request',
    ...metadata
  });
};

// Check if a response indicates a retryable error
export const isRetryableError = (error) => {
  if (!error) return false;

  // Network errors
  if (error.message.includes('network') || 
      error.message.includes('timeout') ||
      error.message.includes('fetch')) {
    return true;
  }

  // HTTP status codes that should be retried
  if (error.status >= 500 || error.status === 429) {
    return true;
  }

  // Specific error codes
  const retryableCodes = [
    'ECONNRESET',
    'ECONNREFUSED',
    'ENOTFOUND',
    'ETIMEDOUT',
    'ENETUNREACH'
  ];

  return retryableCodes.some(code => 
    error.message.includes(code) || error.code === code
  );
};

// Create a request queue for offline operations
export class RequestQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }

  add(requestFn, metadata = {}) {
    const request = {
      id: Date.now() + Math.random(),
      fn: requestFn,
      metadata,
      timestamp: new Date().toISOString()
    };

    this.queue.push(request);
    this.saveQueue();
    
    return request.id;
  }

  async process() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const requests = [...this.queue];
      this.queue = [];

      for (const request of requests) {
        try {
          await request.fn();
          console.log(`✅ Processed queued request: ${request.metadata.operation || 'Unknown'}`);
        } catch (error) {
          console.error(`❌ Failed to process queued request:`, error);
          
          // Re-queue if it's still a retryable error
          if (isRetryableError(error)) {
            this.queue.push(request);
          }
        }
      }
    } finally {
      this.isProcessing = false;
      this.saveQueue();
    }
  }

  clear() {
    this.queue = [];
    this.saveQueue();
  }

  getLength() {
    return this.queue.length;
  }

  saveQueue() {
    try {
      localStorage.setItem('hooked_request_queue', JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save request queue:', error);
    }
  }

  loadQueue() {
    try {
      const saved = localStorage.getItem('hooked_request_queue');
      if (saved) {
        this.queue = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load request queue:', error);
      this.queue = [];
    }
  }
}

// Global request queue instance
export const requestQueue = new RequestQueue();

// Load any saved queue on initialization
requestQueue.loadQueue(); 