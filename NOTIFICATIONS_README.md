# Push Notifications System for Hooked App

This document describes the complete push notification system implemented in the Hooked app using Expo Notifications and Firebase.

## 🎯 Overview

The notification system provides real-time push notifications for:
- **Match notifications** - When two users like each other
- **Message notifications** - When a user receives a new message
- **Local notifications** - For testing and scheduled reminders

## 🏗️ Architecture

### Client-Side Implementation
- **Expo Notifications** for permission handling and token management
- **Firebase Firestore** for storing push tokens
- **Client-side notification sending** using Expo's push service

### Key Files
- `lib/notifications.ts` - Core notification setup and token management
- `lib/notificationService.ts` - Notification sending functions
- `lib/messageNotificationHelper.ts` - Message notification integration
- `app/_layout.tsx` - Notification initialization on app start
- `app/discovery.tsx` - Match notification integration
- `lib/firebaseApi.ts` - Message notification integration

## 🚀 Features

### 1. Permission Management
- Automatic permission checking on app start
- Custom permission request modal
- Graceful handling of denied permissions

### 2. Token Management
- Automatic push token generation
- Token storage in Firebase Firestore
- Token cleanup on app uninstall

### 3. Match Notifications
- Triggered when mutual likes occur
- Sent to both users involved in the match
- Includes matched user's name

### 4. Message Notifications
- Triggered when new messages are sent
- Includes sender name and message preview
- Different content for locked vs unlocked devices

### 5. Testing Tools
- Notification test screen (`/test-notifications`)
- Local notification scheduling
- Permission status checking

## 📱 Integration Points

### Match Notifications
**Location**: `app/discovery.tsx` - `handleLike` function
```typescript
// 🎉 SEND MATCH NOTIFICATIONS TO BOTH USERS
try {
  await Promise.all([
    sendMatchNotification(likerSessionId, likedProfile.first_name),
    sendMatchNotification(likedProfile.session_id, currentUserProfile.first_name)
  ]);
  console.log('Match notifications sent successfully!');
} catch (notificationError) {
  console.error('Error sending match notifications:', notificationError);
}
```

### Message Notifications
**Location**: `lib/firebaseApi.ts` - `MessageAPI.create` function
```typescript
// 🎉 SEND MESSAGE NOTIFICATION
try {
  await notifyNewMessage(
    data.event_id,
    data.from_profile_id,
    data.to_profile_id,
    data.content
  );
} catch (notificationError) {
  console.error('Error sending message notification:', notificationError);
}
```

## 🔧 Configuration

### Expo Configuration
**File**: `app.json`
```json
{
  "plugins": [
    [
      "expo-notifications",
      {
        "icon": "./assets/icon.png",
        "color": "#FF6B9D",
        "sounds": []
      }
    ]
  ]
}
```

### Firebase Configuration
**Project ID**: `5034a8e3` (Expo project ID)
**Firestore Rules**: Push tokens stored under `users/{userId}/pushTokens/{token}`

## 🧪 Testing

### Test Screen
Navigate to `/test-notifications` to access the testing interface:

1. **Permission Testing**
   - Check current permission status
   - Request notification permission
   - View permission state

2. **Token Testing**
   - Initialize notifications
   - Get and display push token
   - Verify token storage

3. **Notification Testing**
   - Test match notifications
   - Test message notifications
   - Schedule local notifications

### Manual Testing Steps
1. Build and install the app on a physical device
2. Grant notification permissions
3. Create test profiles and trigger matches
4. Send test messages between profiles
5. Verify notifications appear

## 🔒 Security

### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own push tokens
    match /users/{userId}/pushTokens/{tokenId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Token Storage
- Tokens stored per user under their Firebase Auth UID
- Automatic cleanup of deleted tokens
- Platform-specific token management

## 🐛 Troubleshooting

### Common Issues

1. **"Invalid project ID" error**
   - Ensure Expo project ID is correct (`5034a8e3`)
   - Use development build, not Expo Go

2. **Notifications not appearing**
   - Check device notification settings
   - Verify permission is granted
   - Test with local notifications first

3. **Token generation fails**
   - Ensure app is built with expo-notifications plugin
   - Check network connectivity
   - Verify Firebase configuration

### Debug Steps
1. Check notification permission status
2. Verify push token generation
3. Test local notifications
4. Check Firestore for token storage
5. Monitor network requests to Expo push service

## 📊 Monitoring

### Logs to Monitor
- Push token generation success/failure
- Notification sending results
- Permission request outcomes
- Token storage operations

### Key Metrics
- Permission grant rate
- Token generation success rate
- Notification delivery rate
- User engagement with notifications

## 🔄 Future Enhancements

### Potential Improvements
1. **Server-side notifications** - Move to Firebase Cloud Functions
2. **Rich notifications** - Add images and actions
3. **Notification preferences** - User-configurable settings
4. **Analytics integration** - Track notification effectiveness
5. **A/B testing** - Test different notification content

### Advanced Features
1. **Scheduled notifications** - Event reminders
2. **Geolocation notifications** - Proximity-based alerts
3. **Notification categories** - Different types of notifications
4. **Silent notifications** - Background data updates

## 📚 Resources

- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Push Notification Best Practices](https://developer.apple.com/design/human-interface-guidelines/ios/user-interaction/notifications/)

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Status**: ✅ Production Ready 