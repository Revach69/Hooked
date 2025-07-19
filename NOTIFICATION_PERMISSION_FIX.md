# Notification Permission Fix

## Problem
The app was showing a double permission popup for notifications:
1. First, a custom modal asking users to enable notifications
2. Then, the native iOS/Android permission popup

This created a poor user experience with redundant permission requests.

## Solution
Modified the notification permission flow to check permissions on app startup and only show the native permission popup when needed.

### Changes Made

#### 1. Updated `app/_layout.tsx`
- Removed the custom `NotificationPermissionModal` component
- Added direct permission checking on app startup
- If permissions are not granted and can be requested, directly call `requestNotificationPermission()` which shows the native popup
- Reduced delay from 3 seconds to 2 seconds for better UX

#### 2. Updated `lib/notifications.ts`
- Enhanced `requestNotificationPermission()` function with better error handling
- Added platform-specific comments explaining behavior for iOS and Android
- Simplified the permission request flow

#### 3. Updated Android Permissions
- Added `android.permission.POST_NOTIFICATIONS` to `android/app/src/main/AndroidManifest.xml`
- Added `android.permission.POST_NOTIFICATIONS` to `app.json` for Expo configuration

#### 4. Removed Unused Files
- Deleted `lib/NotificationPermissionModal.tsx` as it's no longer needed

## How It Works Now

### iOS
1. App starts and waits 2 seconds
2. Checks if notification permission is already granted
3. If not granted and can ask again, shows the native iOS permission popup
4. If granted, initializes notifications and saves push token

### Android
1. App starts and waits 2 seconds
2. Checks if notification permission is already granted
3. For Android 13+ (API level 33+), shows the native permission popup for POST_NOTIFICATIONS
4. For older Android versions, the permission is automatically granted
5. If granted, initializes notifications and saves push token

## Testing
Use the existing notification test screen at `/notificationTest` to verify:
- Permission status checking
- Permission requesting
- Token generation
- Notification sending

## Benefits
- ✅ Eliminates double permission popup
- ✅ Better user experience
- ✅ Works on both iOS and Android
- ✅ Handles Android 13+ notification permission requirements
- ✅ Maintains all existing notification functionality 