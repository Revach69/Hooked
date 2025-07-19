# Firebase Listener Error Fixes

## Problem
The app was experiencing Firebase errors:
```
ERROR  Error listening to profiles: [FirebaseError: Target ID already exists: 4]
ERROR  Error listening to likes: [FirebaseError: Target ID already exists: 6]
```

These errors occur when multiple Firebase listeners are created with the same target ID, typically due to:
1. Components re-rendering and creating new listeners before cleaning up old ones
2. Improper cleanup of listeners in useEffect hooks
3. Multiple instances of the same listener being active simultaneously

## Root Cause
The Firebase `onSnapshot` listeners were being created multiple times because:
- The `useEffect` dependencies were causing re-renders
- Listeners weren't being properly cleaned up before new ones were created
- No mechanism to track and manage active listeners

## Solution Implemented

### 1. Added useRef to Track Listeners
```typescript
const unsubscribeRef = useRef<(() => void) | null>(null);
const likesUnsubscribeRef = useRef<(() => void) | null>(null);
```

### 2. Enhanced Listener Cleanup
Before creating a new listener, we now:
- Check if an existing listener is active
- Properly unsubscribe from the existing listener
- Set the reference to null
- Create the new listener
- Store the new unsubscribe function

### 3. Improved useEffect Cleanup
```typescript
useEffect(() => {
  if (!currentEvent?.id || !currentSessionId) return;

  // Clean up existing listener
  if (unsubscribeRef.current) {
    unsubscribeRef.current();
    unsubscribeRef.current = null;
  }

  const unsubscribe = onSnapshot(query, callback, errorCallback);
  unsubscribeRef.current = unsubscribe;

  return () => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  };
}, [currentEvent?.id, currentSessionId]);
```

### 4. Component Unmount Cleanup
Added dedicated cleanup effects to ensure all listeners are properly removed when components unmount:
```typescript
useEffect(() => {
  return () => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    if (likesUnsubscribeRef.current) {
      likesUnsubscribeRef.current();
      likesUnsubscribeRef.current = null;
    }
  };
}, []);
```

## Files Modified

### app/discovery.tsx
- Added `useRef` import
- Added refs to track profile and likes listeners
- Enhanced both listener useEffects with proper cleanup
- Added component unmount cleanup effect

### app/matches.tsx
- Added `useRef` import
- Added ref to track matches listener
- Enhanced listener useEffect with proper cleanup
- Added component unmount cleanup effect

## Benefits

1. **Eliminates Duplicate Listener Errors**: Prevents multiple listeners with the same target ID
2. **Better Memory Management**: Ensures listeners are properly cleaned up
3. **Improved Performance**: Reduces unnecessary Firebase connections
4. **More Reliable Real-time Updates**: Single, stable listener per data type
5. **Prevents Memory Leaks**: Proper cleanup on component unmount

## Testing

To verify the fixes work:
1. Navigate between discovery and matches pages multiple times
2. Check console for Firebase listener errors
3. Verify real-time updates still work correctly
4. Test app state changes (background/foreground)
5. Monitor for any remaining listener-related errors

## Best Practices for Firebase Listeners

1. **Always use refs** to track unsubscribe functions
2. **Clean up before creating new listeners** in the same useEffect
3. **Add component unmount cleanup** as a safety net
4. **Use proper dependencies** in useEffect to avoid unnecessary re-renders
5. **Handle errors gracefully** in listener callbacks
6. **Test listener behavior** during navigation and app state changes 