# Firebase Listener Fixes - Comprehensive Solution

## Problem Summary

The app was experiencing Firebase Firestore internal assertion errors due to:
1. **Multiple listeners being created without proper cleanup**
2. **Rapid listener creation/destruction cycles**
3. **Conflicting listeners on the same collections**
4. **Poor error handling for internal assertion errors**

## Root Causes

### 1. Discovery Page Issues
- Multiple `useEffect` hooks creating separate listeners
- Listeners not being cleaned up properly when dependencies changed
- No coordination between different listener types

### 2. Matches Page Issues
- Nested listeners causing cleanup complexity
- Listeners being recreated unnecessarily

### 3. Chat Page Issues
- Simple listener but no proper error handling
- No cleanup on rapid navigation

### 4. Firebase Configuration Issues
- No specific handling for internal assertion errors
- Rapid network enable/disable cycles
- Insufficient delays for iOS simulator

## Comprehensive Solution

### 1. Consolidated Listener Management

**Before (Discovery Page):**
```typescript
// Multiple separate useEffect hooks
useEffect(() => {
  // User profile listener
}, [currentEvent?.id, currentSessionId]);

useEffect(() => {
  // Other profiles listener
}, [currentEvent?.id, currentSessionId, currentUserProfile?.is_visible]);

useEffect(() => {
  // Likes listener
}, [currentEvent?.id, currentSessionId]);
```

**After (Discovery Page):**
```typescript
// Single consolidated useEffect with proper cleanup
useEffect(() => {
  if (!currentEvent?.id || !currentSessionId) {
    cleanupAllListeners();
    return;
  }

  // Clean up existing listeners before creating new ones
  cleanupAllListeners();

  // Set up all listeners in a coordinated way
  setupUserProfileListener();
  if (currentUserProfile?.is_visible) {
    setupOtherListeners();
  }
}, [currentEvent?.id, currentSessionId, currentUserProfile?.is_visible]);
```

### 2. Enhanced Error Handling

**Internal Assertion Error Detection:**
```typescript
if (error.message && error.message.includes('INTERNAL ASSERTION FAILED')) {
  console.warn(`⚠️ Internal assertion error detected, retrying...`);
  // Use longer delays for internal assertion errors
  const delay = baseDelay * Math.pow(3, attempt - 1) + Math.random() * 2000;
  await new Promise(resolve => setTimeout(resolve, delay));
  continue;
}
```

### 3. Circuit Breaker Pattern

**Enhanced Circuit Breaker:**
```typescript
class NetworkCircuitBreaker {
  private internalAssertionErrorCount = 0;
  private readonly maxInternalAssertionErrors = 2;

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Special handling for internal assertion errors
    if (error.message && error.message.includes('INTERNAL ASSERTION FAILED')) {
      this.internalAssertionErrorCount++;
      
      if (this.internalAssertionErrorCount >= this.maxInternalAssertionErrors) {
        this.isOpen = true;
        throw new Error('Circuit breaker opened due to repeated internal assertion errors');
      }
      
      // Use longer delay for internal assertion errors
      const delay = 5000 + Math.random() * 5000;
      await new Promise(resolve => setTimeout(resolve, delay));
      throw error;
    }
  }
}
```

### 4. Listener Manager Utility

**Global Listener Management:**
```typescript
class ListenerManager {
  private activeListeners = new Map<string, () => void>();

  registerListener(id: string, unsubscribe: () => void) {
    // Clean up existing listener if it exists
    if (this.activeListeners.has(id)) {
      this.activeListeners.get(id)!();
    }
    this.activeListeners.set(id, unsubscribe);
  }

  cleanupAll() {
    for (const [id, unsubscribe] of this.activeListeners) {
      try {
        unsubscribe();
      } catch (error) {
        console.warn(`Error cleaning up listener ${id}:`, error);
      }
    }
    this.activeListeners.clear();
  }
}
```

### 5. Network Operation Throttling

**Prevent Rapid Network Operations:**
```typescript
let lastNetworkOperation = 0;
const MIN_NETWORK_OPERATION_INTERVAL = 3000; // 3 seconds minimum

if (now - lastNetworkOperation < MIN_NETWORK_OPERATION_INTERVAL) {
  console.log('⏳ Skipping network operation - too soon since last operation');
  return;
}
```

## Files Modified

### 1. `app/discovery.tsx`
- ✅ Consolidated all listeners into single useEffect
- ✅ Added proper cleanup functions
- ✅ Improved error handling
- ✅ Added listener coordination

### 2. `app/matches.tsx`
- ✅ Consolidated listeners with proper cleanup
- ✅ Added error handling for listener callbacks
- ✅ Improved listener lifecycle management

### 3. `app/chat.tsx`
- ✅ Added proper listener cleanup
- ✅ Enhanced error handling
- ✅ Added listener ref management

### 4. `lib/firebaseConfig.ts`
- ✅ Enhanced internal assertion error handling
- ✅ Improved circuit breaker pattern
- ✅ Added network operation throttling
- ✅ Increased delays for iOS simulator

### 5. `lib/errorMonitoring.ts`
- ✅ Added specific internal assertion error detection
- ✅ Created global listener manager
- ✅ Added safe listener creation utilities
- ✅ Enhanced error logging and retry logic

## Key Improvements

### 1. **Prevented Internal Assertion Errors**
- Proper listener cleanup before creating new ones
- Coordinated listener setup to prevent conflicts
- Enhanced error handling with specific retry logic

### 2. **Improved Performance**
- Reduced unnecessary listener recreations
- Better memory management with proper cleanup
- Optimized network operations

### 3. **Enhanced Stability**
- Circuit breaker prevents cascading failures
- Network operation throttling prevents rapid cycles
- Better error recovery mechanisms

### 4. **Better Debugging**
- Comprehensive error logging
- Listener lifecycle tracking
- Internal assertion error detection and handling

## Testing Recommendations

1. **Test rapid navigation** between discovery, matches, and chat pages
2. **Test network connectivity changes** (WiFi on/off, airplane mode)
3. **Test iOS simulator** specifically for internal assertion errors
4. **Monitor console logs** for listener registration/cleanup
5. **Test app backgrounding/foregrounding** to ensure proper cleanup

## Future Considerations

1. **Consider implementing listener pooling** for frequently accessed collections
2. **Add metrics collection** for listener performance
3. **Implement automatic recovery** for persistent internal assertion errors
4. **Add user-facing error messages** for critical Firebase issues

## Monitoring

The enhanced error monitoring will now:
- Track internal assertion errors specifically
- Log listener lifecycle events
- Provide circuit breaker status
- Monitor network operation frequency

This comprehensive solution should eliminate the Firebase internal assertion errors and provide a much more stable real-time experience. 