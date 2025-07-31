# Mobile Error Handling & Offline Support System

This document describes the comprehensive error handling and offline support system implemented in the Hooked mobile application (React Native/Expo).

## Overview

The mobile error handling system provides:
- **Offline Detection**: Automatic detection of network connectivity using NetInfo
- **Retry Mechanisms**: Exponential backoff with jitter for failed operations
- **Offline Queue**: Actions queued when offline, executed when back online
- **User-Friendly Error Messages**: Clear, actionable error messages
- **Error Boundaries**: React error boundaries for component-level error handling
- **AsyncStorage Integration**: Persistent offline queue storage

## Core Components

### 1. MobileErrorHandler (`lib/mobileErrorHandler.ts`)

The main error handling class that manages:
- Online/offline state detection using NetInfo
- Retry logic with exponential backoff
- Offline action queuing with AsyncStorage persistence
- Error message formatting

```typescript
import mobileErrorHandler, { 
  withErrorHandling, 
  queueOfflineAction, 
  getErrorMessage 
} from '../lib/mobileErrorHandler';

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

### 2. React Native Hooks (`lib/hooks/useMobileErrorHandling.ts`)

Custom hooks for React Native components:

#### `useMobileErrorHandling()`
Provides basic error handling functionality:
```typescript
const { 
  isOnline, 
  offlineQueueLength, 
  executeWithRetry, 
  queueForOffline 
} = useMobileErrorHandling();
```

#### `useMobileAsyncOperation()`
Manages async operations with loading states and error alerts:
```typescript
const { 
  isLoading, 
  error, 
  executeOperation, 
  executeOperationWithOfflineFallback,
  showErrorAlert
} = useMobileAsyncOperation();

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

#### `useMobileOfflineStatus()`
Provides offline status information:
```typescript
const { 
  isOnline, 
  offlineQueueLength, 
  statusMessage 
} = useMobileOfflineStatus();
```

### 3. UI Components

#### `MobileOfflineStatusBar`
Displays current online/offline status:
```typescript
import MobileOfflineStatusBar from '../lib/components/MobileOfflineStatusBar';

// In your component
<MobileOfflineStatusBar />
```

## Usage Examples

### Basic Error Handling in Mobile Components

```typescript
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useMobileAsyncOperation } from '../lib/hooks/useMobileErrorHandling';

function MyComponent() {
  const { executeOperation, isLoading, error, showErrorAlert } = useMobileAsyncOperation();

  const handleAction = async () => {
    try {
      await executeOperation(async () => {
        // Your async operation here
        return await apiCall();
      });
    } catch (err) {
      // Error is automatically handled by the hook
      showErrorAlert(err, () => handleAction());
    }
  };

  return (
    <View>
      <TouchableOpacity onPress={handleAction} disabled={isLoading}>
        <Text>{isLoading ? 'Loading...' : 'Perform Action'}</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### Offline-First Operations

```typescript
import { useMobileAsyncOperation } from '../lib/hooks/useMobileErrorHandling';

function DataForm() {
  const { executeOperationWithOfflineFallback } = useMobileAsyncOperation();

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
      Alert.alert('Offline', 'Data will be saved when you\'re back online');
    } else if (result.success) {
      // Show success message
      Alert.alert('Success', 'Data saved successfully');
    }
  };
}
```

### Integration with Existing Firebase API

The Firebase API has been updated to use the new error handling system:

```typescript
// Before (basic error handling)
try {
  const events = await Event.filter({ id: eventId });
} catch (error) {
  console.error('Error:', error);
}

// After (enhanced error handling)
const result = await executeOperationWithOfflineFallback(
  async () => {
    const events = await Event.filter({ id: eventId });
    return events;
  },
  { operation: 'Fetch events' }
);

if (result.queued) {
  // Handle offline scenario
} else if (result.success) {
  // Handle success
}
```

## Configuration

### Error Handler Configuration

The error handler can be configured by modifying the default values:

```typescript
// In mobileErrorHandler.ts
class MobileErrorHandler {
  private config: ErrorHandlerConfig = {
    maxRetries: 3,        // Default retry attempts
    baseDelay: 1000,      // Base delay in milliseconds
    maxOfflineActions: 100, // Maximum queued actions
    // ... other config
  };
}
```

### Retry Logic

The system uses exponential backoff with jitter:
- Base delay: 1000ms
- Exponential factor: 2
- Jitter: Random 0-1000ms
- Maximum delay: 10 seconds

### Offline Queue Persistence

Offline actions are automatically saved to AsyncStorage and restored when the app loads.

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
- Displayed with retry options using Alert
- Logged for debugging

## Integration with Existing Mobile Infrastructure

### Firebase Error Boundary
The existing `FirebaseErrorBoundary` component works alongside the new system:

```typescript
import { FirebaseErrorBoundary } from '../lib/FirebaseErrorBoundary';

<FirebaseErrorBoundary>
  <YourComponent />
</FirebaseErrorBoundary>
```

### Error Monitoring
The new system integrates with the existing error monitoring:

```typescript
// Uses existing logFirebaseError function
logFirebaseError(error, operationName, {
  networkStatus: isOnline ? 'connected' : 'disconnected',
  retryCount: attempt,
  platform: Platform.OS,
  isDev: __DEV__
});
```

## Best Practices

1. **Always use error handling hooks** in React Native components
2. **Provide retry functions** for user-initiated actions
3. **Use offline-first approach** for critical operations
4. **Show appropriate loading states** during operations
5. **Log errors appropriately** for debugging
6. **Test offline scenarios** during development

## Testing

### Testing Offline Scenarios

1. Use React Native Debugger or Flipper to simulate offline mode
2. Test retry mechanisms by temporarily disabling network
3. Verify offline queue functionality
4. Test error boundary with intentional errors

### Testing Error Handling

```typescript
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

In production, you can implement error reporting by connecting to services like Sentry or LogRocket.

## Migration Guide

### From Basic Error Handling

1. Replace try-catch blocks with `useMobileAsyncOperation` hook
2. Add `MobileOfflineStatusBar` to your app layout
3. Wrap critical components with `FirebaseErrorBoundary`
4. Replace direct API calls with enhanced error handling

### Example Migration

**Before:**
```typescript
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
```typescript
const { executeOperationWithOfflineFallback, isLoading, error } = useMobileAsyncOperation();

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

## Platform-Specific Considerations

### iOS
- Uses NetInfo for network detection
- AsyncStorage for persistent storage
- Alert component for error dialogs

### Android
- Same NetInfo integration
- Same AsyncStorage usage
- Consistent error handling across platforms

### Expo
- Compatible with Expo managed workflow
- No additional configuration required
- Works with Expo's networking stack 