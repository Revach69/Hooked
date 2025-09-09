# Firebase App Check Setup Guide

## Step 1: Firebase Console Configuration

### 1.1 Enable App Check
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `hooked-development` 
3. Go to **App Check** in the left sidebar
4. Click **Get Started**

### 1.2 Configure iOS App
1. Select your **iOS app** from the list
2. Choose **App Attest** as the provider
3. Click **Register** and then **Done**

### 1.3 Configure Android App  
1. Select your **Android app** from the list
2. Choose **Play Integrity** as the provider
3. Click **Register** and then **Done**

### 1.4 Add Debug Token for Development
1. In App Check, find your **iOS app** → Click **Manage debug tokens**
2. Click **Add debug token**
3. Enter: `debug-token-development` value C92AB856-132F-4FE1-82AE-6F9BBEFEF430
4. Click **Done**

5. Repeat for **Android app**:
   - Click **Manage debug tokens** 
   - Add: `debug-token-development`
   - Click **Done**

## Step 2: Update Firebase Functions (if needed)

If your Firebase Functions don't already support App Check, you may need to update them:

```javascript
// In functions/src/index.js - for savePushToken function
const { https } = require('firebase-functions/v1');
const admin = require('firebase-admin');

exports.savePushToken = https.onCall(async (data, context) => {
  // App Check verification is now automatic with the new setup
  // No code changes needed - Firebase will verify tokens automatically
  
  const { token, platform, sessionId, installationId, eventId } = data;
  
  // Your existing function logic here...
});
```

## Step 3: Test the Setup

### 3.1 Check Logs
After implementing, you should see in your app logs:
```
🔒 Initializing Firebase App Check...
🔒 App Check: Development mode - using debug provider  
🔒 App Check initialized for development
✅ Firebase App Check initialization complete
```

### 3.2 Test Push Token Registration
1. Restart your app
2. Check logs for:
   ```
   LOG  savePushToken result: [success response]
   LOG  AppInitializationService: Idempotent push setup result: {"success": true}
   ```
   
3. **No more "App Check disabled" errors!**

### 3.3 Test Notifications
1. Create a match between two devices
2. Put one device in background
3. Both devices should now receive proper notifications

## Step 4: Production Deployment

### 4.1 Get reCAPTCHA v3 Keys (for web/production)
1. Go to [Google reCAPTCHA](https://www.google.com/recaptcha/admin)
2. Create a new site with reCAPTCHA v3
3. Get your site key
4. Update `appCheckConfig.ts`:
   ```typescript
   // Replace the test key with your real key:
   provider: new ReCaptchaV3Provider('YOUR_ACTUAL_RECAPTCHA_SITE_KEY')
   ```

### 4.2 Deploy Functions (if updated)
```bash
firebase deploy --only functions
```

### 4.3 Test Production Build
1. Create production builds for iOS/Android
2. Test on physical devices
3. Verify App Check tokens are working

## Troubleshooting

### Common Issues:
1. **"Invalid debug token"**: Make sure you added the exact token `debug-token-development` in Firebase Console
2. **"App Check initialization failed"**: Check your Firebase project permissions
3. **Still getting "App Check disabled"**: Clear app data and restart

### Success Indicators:
- ✅ No more infinite push token registration loops
- ✅ Push tokens successfully registered on server  
- ✅ Android background notifications work
- ✅ Both users receive match alerts properly
- ✅ Profile images show in match modals

## Expected Results

After successful setup:
1. **Push token registration succeeds** instead of failing with "App Check disabled"
2. **Android background notifications work** because server has valid push tokens
3. **Both likers get beautiful purple modals** with profile pictures
4. **No more console spam** from failed registration attempts

The root cause of your notification issues should be resolved! 🎉
