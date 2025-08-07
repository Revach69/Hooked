# Firebase Performance SDK Setup & Usage

This document outlines the Firebase Performance SDK setup and usage in the Hooked mobile app.

## Overview

Firebase Performance Monitoring helps you understand and improve your app's performance by providing insights into:
- App startup time
- Screen rendering performance
- Network request latency
- Custom performance traces
- User interaction timing

## Installation

The Firebase Performance SDK has been installed and configured in the project:

```bash
npm install firebase
```

**Note**: This implementation uses the Firebase Web SDK for performance monitoring, which is compatible with React Native through Expo managed workflow. For native iOS/Android development, you would use the React Native Firebase SDK, but that requires additional configuration files (GoogleService-Info.plist, google-services.json) and is not compatible with Expo managed workflow.

## Configuration Files

### 1. Firebase Performance Configuration (`lib/firebasePerformance.ts`)

This file contains the main performance monitoring setup:

```typescript
import { firebasePerformance, trace, monitorNetworkRequest } from '../lib/firebasePerformance';

// Start a custom trace
const trace = await firebasePerformance.startTrace('custom_operation');

// Monitor network requests
const result = await monitorNetworkRequest('https://api.example.com', 'GET', async () => {
  return await fetch('https://api.example.com/data');
});
```

### 2. Performance Monitoring Hook (`lib/hooks/usePerformanceMonitoring.ts`)

React hook for easy performance tracking in components:

```typescript
import { usePerformanceMonitoring } from '../lib/hooks/usePerformanceMonitoring';

const { 
  trackUserInteraction, 
  trackAsyncOperation, 
  trackCustomMetric 
} = usePerformanceMonitoring({ 
  screenName: 'discovery',
  enableScreenTracking: true,
  enableUserInteractionTracking: true 
});
```

## Usage Examples

### 1. Screen Performance Tracking

```typescript
// Automatically tracks screen load time
const { trackCustomMetric } = usePerformanceMonitoring({ 
  screenName: 'discovery' 
});

// Add custom metrics
await trackCustomMetric('profiles_loaded', profiles.length);
await trackCustomMetric('filter_applied', 1);
```

### 2. User Interaction Tracking

```typescript
const { trackUserInteraction, stopUserInteraction } = usePerformanceMonitoring();

// Track button press
const handleButtonPress = async () => {
  await trackUserInteraction('button_press', { 
    button_name: 'like_button',
    target_id: 'profile_123' 
  });
  
  // Perform action...
  
  await stopUserInteraction('button_press');
};
```

### 3. Async Operation Tracking

```typescript
const { trackAsyncOperation } = usePerformanceMonitoring();

// Track database operations
const profiles = await trackAsyncOperation('load_profiles', async () => {
  return await EventProfileAPI.filter({ event_id: eventId });
}, { event_id: eventId, filter_type: 'all' });
```

### 4. Network Request Monitoring

```typescript
const { trackNetworkRequest } = usePerformanceMonitoring();

// Monitor API calls
const data = await trackNetworkRequest(
  'https://firestore.googleapis.com/v1/projects/hooked-69/databases/(default)/documents/events',
  'GET',
  async () => {
    return await fetch(url);
  }
);
```

### 5. Custom Performance Traces

```typescript
import { firebasePerformance } from '../lib/firebasePerformance';

// Manual trace creation
const trace = await firebasePerformance.startTrace('complex_operation');
await firebasePerformance.addTraceAttribute(trace, 'operation_type', 'data_processing');
await firebasePerformance.addTraceMetric(trace, 'items_processed', 100);

// Perform operation...
const result = await complexOperation();

await firebasePerformance.stopTrace(trace);
```

## Performance Metrics Tracked

### Automatic Metrics
- **App startup time**: Tracked automatically
- **Screen load time**: Tracked per screen
- **Network request latency**: Tracked for all HTTP requests
- **Memory usage**: Tracked automatically

### Custom Metrics
- **User interactions**: Button presses, swipes, taps
- **Database operations**: Read/write operations
- **Async operations**: Custom business logic timing
- **Error rates**: Failed operations tracking

### Screen-Specific Metrics
- **Discovery Screen**:
  - Profile load time
  - Like operation duration
  - Match creation time
  - Filter application time

- **Chat Screen**:
  - Message send time
  - Message load time
  - Real-time listener performance

- **Admin Dashboard**:
  - Event creation time
  - Analytics generation time
  - User management operations

## Firebase Console Integration

### Viewing Performance Data

1. **Go to Firebase Console**: https://console.firebase.google.com
2. **Select your project**: `hooked-69`
3. **Navigate to Performance**: Left sidebar → Performance
4. **View metrics**:
   - App startup time
   - Screen rendering
   - Network requests
   - Custom traces

### Key Performance Indicators

- **App startup time**: Should be < 3 seconds
- **Screen load time**: Should be < 1 second
- **Network latency**: Should be < 500ms
- **Database operations**: Should be < 200ms

## Best Practices

### 1. Trace Naming Convention

Use descriptive, hierarchical names:
```typescript
// Good
'user_interaction_like_profile'
'async_operation_load_profiles'
'network_request_firestore_read'

// Avoid
'op1'
'func'
'api'
```

### 2. Attribute and Metric Limits

- **Attributes**: Max 5 per trace
- **Metrics**: Max 32 per trace
- **Attribute values**: Max 100 characters
- **Metric names**: Max 32 characters

### 3. Performance Impact

- Performance monitoring adds minimal overhead
- Traces are batched and sent periodically
- Network requests are automatically monitored
- Custom traces should be used sparingly for critical operations

### 4. Error Handling

```typescript
try {
  await trackAsyncOperation('critical_operation', async () => {
    return await performOperation();
  });
} catch (error) {
  // Performance tracking will automatically record the error
  console.error('Operation failed:', error);
}
```

## Debugging Performance Issues

### 1. Enable Debug Logging

```typescript
// In development
await firebasePerformance.setPerformanceCollectionEnabled(true);
```

### 2. Check Console Logs

Look for performance-related logs:
```
Started performance trace: screen_load_discovery
Performance trace stopped successfully
Started network request trace: GET https://firestore.googleapis.com
```

### 3. Firebase Console Alerts

Set up alerts for:
- App startup time > 5 seconds
- Screen load time > 2 seconds
- Network latency > 1 second
- Error rate > 5%

## Troubleshooting

### Common Issues

1. **Performance data not showing**:
   - Check internet connection
   - Verify Firebase configuration
   - Ensure performance collection is enabled

2. **High memory usage**:
   - Limit concurrent traces
   - Stop traces when operations complete
   - Use batch operations for multiple metrics

3. **Network request not tracked**:
   - Ensure using `trackNetworkRequest` wrapper
   - Check URL format
   - Verify HTTP method

### Performance Optimization

1. **Reduce trace frequency** for high-volume operations
2. **Use batch operations** for multiple database calls
3. **Implement caching** for frequently accessed data
4. **Optimize queries** with proper indexing

## Monitoring Dashboard

Create a custom dashboard to monitor key metrics:

```typescript
// Track app-wide metrics
const trackAppMetrics = async () => {
  await trackCustomMetric('active_users', getActiveUserCount());
  await trackCustomMetric('events_active', getActiveEventCount());
  await trackCustomMetric('matches_today', getTodayMatchCount());
};
```

## Next Steps

1. **Monitor performance** in Firebase Console
2. **Set up alerts** for performance degradation
3. **Optimize slow operations** based on metrics
4. **Add more custom traces** for critical user journeys
5. **Implement A/B testing** for performance improvements

## Support

For issues with Firebase Performance:
- [Firebase Performance Documentation](https://firebase.google.com/docs/perf-mon)
- [Firebase Web SDK Performance](https://firebase.google.com/docs/perf-mon/get-started-web)
- [Performance Best Practices](https://firebase.google.com/docs/perf-mon/performance-get-started)
- [Expo Firebase Integration](https://docs.expo.dev/guides/using-firebase/)

## Important Notes

### Expo Managed Workflow vs Native Development

**Our Implementation (Expo Managed Workflow):**
- Uses Firebase Web SDK
- Compatible with Expo managed workflow
- No additional configuration files required
- Works with existing Firebase setup

**Native iOS/Android Development:**
- Would use React Native Firebase SDK
- Requires GoogleService-Info.plist (iOS) and google-services.json (Android)
- Requires additional build configuration
- Not compatible with Expo managed workflow

The documentation you referenced is for **native iOS development** (Swift/SwiftUI), but our project uses **React Native with Expo managed workflow**, which requires a different approach. 