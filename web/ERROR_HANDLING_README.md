# Error Handling & Offline Support System

This document describes the comprehensive error handling and offline support system implemented in the Hooked web application.

## Overview

The error handling system provides:
- **Offline Detection**: Automatic detection of network connectivity
- **Retry Mechanisms**: Exponential backoff with jitter for failed operations
- **Offline Queue**: Actions queued when offline, executed when back online
- **User-Friendly Error Messages**: Clear, actionable error messages
- **Error Boundaries**: React error boundaries for component-level error handling
- **Network Utilities**: Enhanced fetch functions with retry logic

## Core Components

### 1. ErrorHandler (`lib/errorHandler.js`)

The main error handling class that manages:
- Online/offline state detection
- Retry logic with exponential backoff
- Offline action queuing
- Error message formatting

```javascript
import errorHandler, { 
  withErrorHandling, 
  queueOfflineAction, 
  getErrorMessage 
} from '../lib/errorHandler';

// Execute operation with retry
const result = await withErrorHandling(async () => {
  return await someAsyncOperation();
}, {
  maxRetries: 3,
  baseDelay: 1000,
  operationName: 'My Operation'
});

// Queue action for offline execution
const actionId = queueOfflineAction(async () => {
  await saveData();
}, {
  operation: 'Save user data',
  userId: '123'
});

// Get user-friendly error message
const message = getErrorMessage(error);
```

### 2. React Hooks (`hooks/useErrorHandling.jsx`)

Custom hooks for React components:

#### `useErrorHandling()`
Provides basic error handling functionality:
```javascript
const { 
  isOnline, 
  offlineQueueLength, 
  executeWithRetry, 
  queueForOffline 
} = useErrorHandling();
```

#### `useAsyncOperation()`
Manages async operations with loading states:
```javascript
const { 
  isLoading, 
  error, 
  executeOperation, 
  executeOperationWithOfflineFallback 
} = useAsyncOperation();

const handleSubmit = async () => {
  const result = await executeOperationWithOfflineFallback(
    async () => await saveData(),
    { operation: 'Save data' }
  );
  
  if (result.queued) {
    console.log('Action queued for offline execution');
  } else if (result.success) {
    console.log('Operation successful');
  }
};
```

#### `useOfflineStatus()`
Provides offline status information:
```javascript
const { 
  isOnline, 
  offlineQueueLength, 
  statusMessage 
} = useOfflineStatus();
```

### 3. UI Components

#### `OfflineStatusBar`
Displays current online/offline status:
```javascript
import OfflineStatusBar from '../components/OfflineStatusBar';

// In your component
<OfflineStatusBar />
```

#### `ErrorToast`
Shows user-friendly error messages with retry options:
```javascript
import ErrorToast from '../components/ErrorToast';

{error && (
  <ErrorToast
    error={error}
    onRetry={() => retryOperation()}
    onDismiss={() => setError(null)}
  />
)}
```

#### `ErrorBoundary`
Catches JavaScript errors in React components:
```javascript
import ErrorBoundary from '../components/ErrorBoundary';

<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

### 4. Network Utilities (`lib/networkUtils.js`)

Enhanced network functions with retry logic:

```javascript
import { 
  fetchWithRetry, 
  fetchJSON, 
  postJSON, 
  queueNetworkRequest 
} from '../lib/networkUtils';

// Fetch with retry
const data = await fetchJSON('/api/data', {}, {
  maxRetries: 3,
  timeout: 10000
});

// POST with retry
const result = await postJSON('/api/save', { data }, {}, {
  maxRetries: 2
});

// Queue network request for offline execution
queueNetworkRequest(
  () => postJSON('/api/save', { data }),
  { operation: 'Save data' }
);
```

## Usage Examples

### Basic Error Handling in Components

```javascript
import React from 'react';
import { useAsyncOperation } from '../hooks/useErrorHandling';
import ErrorToast from '../components/ErrorToast';

function MyComponent() {
  const { executeOperation, isLoading, error } = useAsyncOperation();

  const handleAction = async () => {
    try {
      await executeOperation(async () => {
        // Your async operation here
        return await apiCall();
      });
    } catch (err) {
      // Error is automatically handled by the hook
      console.error('Operation failed:', err);
    }
  };

  return (
    <div>
      <button onClick={handleAction} disabled={isLoading}>
        {isLoading ? 'Loading...' : 'Perform Action'}
      </button>
      
      {error && (
        <ErrorToast
          error={error}
          onRetry={handleAction}
          onDismiss={() => setError(null)}
        />
      )}
    </div>
  );
}
```

### Offline-First Operations

```javascript
import { useAsyncOperation } from '../hooks/useErrorHandling';

function DataForm() {
  const { executeOperationWithOfflineFallback } = useAsyncOperation();

  const handleSubmit = async (formData) => {
    const result = await executeOperationWithOfflineFallback(
      async () => {
        return await api.saveData(formData);
      },
      { 
        operation: 'Save form data',
        formId: formData.id 
      }
    );

    if (result.queued) {
      // Show message that action will be performed when online
      showMessage('Data will be saved when you\'re back online');
    } else if (result.success) {
      // Show success message
      showMessage('Data saved successfully');
    }
  };
}
```

### Error Boundary Usage

```javascript
import ErrorBoundary from '../components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/discovery" element={<Discovery />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
```

## Configuration

### Error Handler Configuration

The error handler can be configured by modifying the default values:

```javascript
// In errorHandler.js
class ErrorHandler {
  constructor() {
    this.maxRetries = 3;        // Default retry attempts
    this.baseDelay = 1000;      // Base delay in milliseconds
    // ... other config
  }
}
```

### Retry Logic

The system uses exponential backoff with jitter:
- Base delay: 1000ms
- Exponential factor: 2
- Jitter: Random 0-1000ms
- Maximum delay: 10 seconds

### Offline Queue Persistence

Offline actions are automatically saved to localStorage and restored when the app loads.

## Error Types and Handling

### Network Errors
- Automatically retried with exponential backoff
- Queued for offline execution if device is offline
- User-friendly messages provided

### Firebase Errors
- Permission errors: Not retried
- Not found errors: Not retried
- Network errors: Retried and queued
- Authentication errors: Not retried (except network issues)

### Application Errors
- Caught by Error Boundaries
- Displayed with retry options
- Logged for debugging

## Best Practices

1. **Always use error handling hooks** in React components
2. **Provide retry functions** for user-initiated actions
3. **Use offline-first approach** for critical operations
4. **Show appropriate loading states** during operations
5. **Log errors appropriately** for debugging
6. **Test offline scenarios** during development

## Testing

### Testing Offline Scenarios

1. Use browser dev tools to simulate offline mode
2. Test retry mechanisms by temporarily disabling network
3. Verify offline queue functionality
4. Test error boundary with intentional errors

### Testing Error Handling

```javascript
// Simulate network error
const mockApi = jest.fn().mockRejectedValue(new Error('Network error'));

// Test retry logic
await expect(executeOperation(mockApi)).rejects.toThrow();
expect(mockApi).toHaveBeenCalledTimes(3); // Default retry count
```

## Monitoring and Debugging

### Console Logging

The system provides detailed console logging:
- `🌐` Online status changes
- `📴` Offline status changes
- `⏳` Retry attempts
- `✅` Successful operations
- `❌` Failed operations
- `📝` Queued actions
- `🔄` Processing offline queue

### Error Reporting

In production, you can implement error reporting by uncommenting the `reportError` method in the ErrorHandler class and connecting it to services like Sentry or LogRocket.

## Migration Guide

### From Basic Error Handling

1. Replace try-catch blocks with `useAsyncOperation` hook
2. Add `OfflineStatusBar` to your app layout
3. Wrap critical components with `ErrorBoundary`
4. Replace direct API calls with enhanced network utilities

### Example Migration

**Before:**
```javascript
const handleSubmit = async () => {
  try {
    setIsLoading(true);
    await api.saveData(data);
    setSuccess(true);
  } catch (error) {
    setError(error.message);
  } finally {
    setIsLoading(false);
  }
};
```

**After:**
```javascript
const { executeOperationWithOfflineFallback, isLoading, error } = useAsyncOperation();

const handleSubmit = async () => {
  const result = await executeOperationWithOfflineFallback(
    () => api.saveData(data),
    { operation: 'Save data' }
  );
  
  if (result.success) {
    setSuccess(true);
  }
};
``` 