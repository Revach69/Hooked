# Deployment Guide

## Firestore Indexes

The notification system requires specific Firestore indexes for optimal performance. Deploy them with:

```bash
firebase deploy --only firestore:indexes
```

### Required Indexes

The following indexes are automatically created for the notification job queue:

1. **notification_jobs**: `status ASC, createdAt ASC`
   - Used for fetching queued jobs in chronological order
   
2. **notification_jobs**: `status ASC, attempts ASC, updatedAt ASC`
   - Used for retry logic and job prioritization

### Index Status

You can check index status in the Firebase Console:
1. Go to Firestore Database
2. Click on "Indexes" tab
3. Monitor the build status of new indexes

**Note**: New indexes may take several minutes to build, especially for large collections.

## Functions Deployment

Deploy the notification system functions:

```bash
firebase deploy --only functions
```

## Mobile App Deployment

### iOS
```bash
cd mobile-app
eas build --platform ios
```

### Android
```bash
cd mobile-app
eas build --platform android
```

## Firebase App Check Configuration

**CRITICAL**: Before using the callable functions, you must configure Firebase App Check in the Firebase Console.

### Required App Check Setup

1. **Enable App Check**:
   - Go to [Firebase Console > App Check](https://console.firebase.google.com/project/hooked-69/appcheck)
   - Click "Get started" if not already enabled

2. **Register iOS App** (com.hookedapp.app):
   - Bundle ID: `com.hookedapp.app`
   - Provider: **App Attest** (production) or **Debug** (development)
   - Click "Save"

3. **Register Android App** (com.hookedapp.app):
   - Package name: `com.hookedapp.app`
   - Provider: **Play Integrity API** (production) or **Debug** (development)
   - Click "Save"

4. **Enable App Check for Cloud Functions**:
   - Go to App Check > APIs tab
   - Find "Cloud Functions API"
   - Set to **"Enforce"** mode

### App Check Implementation

The following callable functions use Firebase's built-in `enforceAppCheck: true` option:

- ✅ `savePushToken` - Push token registration  
- ✅ `setAppState` - App state sync (foreground/background)
- ✅ `setMute` - Mute/unmute functionality
- ✅ `sendCrossDeviceNotification` - Cross-device notifications

These functions automatically reject requests with missing or invalid App Check tokens. The `context.app` parameter contains App Check data including the app ID.

**Note**: The legacy `updateAppState` function does NOT require App Check for backward compatibility.

## Callable Functions Migration Summary

All mobile-app-invoked Firebase Functions have been migrated from HTTP to Callable with App Check enforcement:

### Migrated Functions

| Function | Type | App Check | Mobile Usage |
|----------|------|-----------|--------------|
| `savePushToken` | Callable | ✅ Required | Push token registration |
| `setAppState` | Callable | ✅ Required | App state sync |
| `setMute` | Callable | ✅ Required | Mute/unmute users |
| `sendCrossDeviceNotification` | Callable | ✅ Required | Cross-device notifications |
| `updateAppState` | Callable (Legacy) | ❌ Not Required | Backward compatibility |

### Unchanged Functions

The following functions remain as HTTP endpoints (admin/external use):

- `notify` - HTTP endpoint for admin/external push notifications (requires API key)
- Firestore triggers (message/like notifications)
- Scheduled workers (cleanup, notification queue processing)

## Verification

After deployment, verify:

1. **Functions**: Check Firebase Console > Functions for successful deployment
2. **Indexes**: Verify indexes are built in Firestore > Indexes
3. **App Check**: Verify App Check is configured and enforced for callable functions
4. **Mobile**: Test push notifications on both platforms with App Check enabled
5. **Queue**: Monitor notification_jobs collection for job processing
6. **Callable Functions**: Test that all callable functions work with App Check tokens
