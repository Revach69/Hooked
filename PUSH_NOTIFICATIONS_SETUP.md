# Push Notifications Setup Guide - Hooked App

This guide covers the implementation of push notifications for the Hooked app using Expo + Firebase.

## 📦 What's Been Implemented

### Phase 1: Permission & Device Registration ✅
- **`lib/notifications.ts`** - Core notification management
- **`lib/NotificationPermissionModal.tsx`** - Custom permission request UI
- **`app/_layout.tsx`** - App-level notification initialization
- **`lib/notificationService.ts`** - Client-side notification sending

### Phase 2: Firebase Cloud Functions (Ready for Deployment)
- **`firebase/functions/sendPushNotification.ts`** - Server-side notification logic
- **`firebase/functions/index.ts`** - Firestore triggers for matches & messages
- **`firebase/functions/package.json`** - Functions dependencies

## 🚀 Setup Instructions

### 1. Expo Configuration

Make sure your `app.json` includes the necessary permissions:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff",
          "sounds": ["./assets/notification-sound.wav"]
        }
      ]
    ]
  }
}
```

### 2. Firebase Setup

1. **Enable Firestore** in your Firebase console
2. **Set up security rules** for the `pushTokens` collection:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own push tokens
    match /users/{userId}/pushTokens/{tokenId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow access to user profiles for notification purposes
    match /users/{userId} {
      allow read: if request.auth != null;
    }
  }
}
```

### 3. Deploy Firebase Functions (Optional)

If you want server-side notification triggers:

```bash
cd firebase/functions
npm install
npm run build
firebase deploy --only functions
```

## 📱 How It Works

### Permission Flow
1. App starts → checks notification permission
2. If denied & can ask again → shows custom modal
3. User enables → gets Expo push token → saves to Firestore
4. If already granted → initializes notifications automatically

### Notification Triggers
- **New Match**: Both users get "It's a match!" notification
- **New Message**: Receiver gets message preview notification
- **Device Locked**: Generic "New message" notification
- **Device Unlocked**: Specific "New message from [Name]" notification

## 🔧 Usage Examples

### Request Permission Manually
```typescript
import { requestAndInitializeNotifications } from '../lib/notifications';

const handleEnableNotifications = async () => {
  const result = await requestAndInitializeNotifications();
  if (result.permissionGranted) {
    console.log('Notifications enabled!');
  }
};
```

### Send Test Notification
```typescript
import { sendGenericNotification } from '../lib/notificationService';

const sendTest = async () => {
  await sendGenericNotification(
    'user123',
    'Test Notification',
    'This is a test message'
  );
};
```

### Handle Notification Taps
```typescript
import * as Notifications from 'expo-notifications';

// In your app initialization
Notifications.addNotificationResponseReceivedListener((response) => {
  const data = response.notification.request.content.data;
  
  if (data.type === 'match') {
    // Navigate to matches screen
  } else if (data.type === 'message') {
    // Navigate to chat screen
  }
});
```

## 📊 Firestore Data Structure

### Push Tokens Collection
```
users/{userId}/pushTokens/{tokenId}
{
  token: "ExponentPushToken[...]",
  platform: "ios" | "android",
  createdAt: Timestamp,
  updatedAt: Timestamp,
  deleted: false
}
```

### Example Match Document
```
matches/{matchId}
{
  user1Id: "user123",
  user2Id: "user456",
  createdAt: Timestamp,
  status: "active"
}
```

### Example Message Document
```
messages/{messageId}
{
  senderId: "user123",
  receiverId: "user456",
  content: "Hey there!",
  timestamp: Timestamp,
  read: false
}
```

## 🧪 Testing

### Test Permission Flow
1. Delete app → reinstall
2. App should show permission modal after 2 seconds
3. Test both "Enable" and "Maybe Later" options

### Test Notifications
1. Use Expo Go app for testing
2. Send test notifications via the service
3. Verify tokens are saved to Firestore

### Test Firebase Functions (if deployed)
1. Create test match/message documents
2. Check function logs in Firebase console
3. Verify notifications are sent

## 🔒 Security Considerations

1. **Token Storage**: Push tokens are stored under user's document
2. **Access Control**: Only authenticated users can access their tokens
3. **Token Cleanup**: Implement token cleanup for deleted users
4. **Rate Limiting**: Consider rate limiting for notification sending

## 🐛 Troubleshooting

### Common Issues

1. **Permission Denied**
   - Check device settings
   - Verify app permissions in iOS/Android settings

2. **Tokens Not Saving**
   - Check Firebase authentication
   - Verify Firestore security rules
   - Check network connectivity

3. **Notifications Not Received**
   - Verify Expo project ID in `getPushToken()`
   - Check token format in Firestore
   - Test with Expo's push tool

4. **Firebase Functions Errors**
   - Check function logs in Firebase console
   - Verify function deployment
   - Check function permissions

### Debug Commands

```bash
# Check notification permissions
npx expo notifications:permissions

# Test push notification
npx expo notifications:send --to "ExponentPushToken[...]"

# View function logs
firebase functions:log
```

## 📈 Next Steps

1. **Analytics**: Track notification open rates
2. **A/B Testing**: Test different notification messages
3. **Scheduling**: Implement notification scheduling
4. **Rich Notifications**: Add images and actions
5. **Silent Notifications**: Background data sync

## 📞 Support

For issues or questions:
1. Check Expo documentation: https://docs.expo.dev/versions/latest/sdk/notifications/
2. Check Firebase documentation: https://firebase.google.com/docs/cloud-messaging
3. Review this implementation guide 