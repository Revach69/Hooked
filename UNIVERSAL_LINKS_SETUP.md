# Universal Links & App Links Setup Guide

This guide explains how to set up Universal Links (iOS) and App Links (Android) for the Hooked app to handle join links and QR codes.

## 🔗 **How It Works**

1. **User clicks link/QR** → Opens `https://www.hooked-app.com/join?code=TEST123`
2. **If app installed** → Automatically opens the app with the code
3. **If app not installed** → Redirects to App Store/Play Store

## 📱 **iOS Universal Links Setup**

### 1. **Update App Configuration**
The `app.json` already includes:
```json
"ios": {
  "associatedDomains": [
    "applinks:hooked.com"
  ]
}
```

### 2. **Deploy Apple App Site Association**
The file `web-admin-hooked/public/.well-known/apple-app-site-association` needs to be deployed to `https://www.hooked-app.com/.well-known/apple-app-site-association`

**Update the file with your actual Team ID:**
```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "YOUR_TEAM_ID.com.hookedapp.app",
        "paths": [
          "/join*"
        ]
      }
    ]
  }
}
```

### 3. **Get Your Team ID**
1. Go to [Apple Developer Portal](https://developer.apple.com/account/)
2. Click on "Membership" in the left sidebar
3. Copy your Team ID (10-character string)

## 🤖 **Android App Links Setup**

### 1. **Update App Configuration**
The `app.json` already includes the intent filters for Android.

### 2. **Deploy Digital Asset Links**
The file `web-admin-hooked/public/.well-known/assetlinks.json` needs to be deployed to `https://www.hooked-app.com/.well-known/assetlinks.json`

**Update the file with your actual signing certificate fingerprint:**
```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.hookedapp.app",
      "sha256_cert_fingerprints": [
        "YOUR_APP_SIGNING_SHA256_FINGERPRINT"
      ]
    }
  }
]
```

### 3. **Get Your App Signing Certificate Fingerprint**

#### **For Development:**
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

#### **For Production:**
1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app
3. Go to "Setup" → "App signing"
4. Copy the SHA-256 certificate fingerprint

## 🌐 **Web Handler Setup**

### 1. **Deploy the Web Handler**
The file `web-admin-hooked/public/join.html` needs to be deployed to `https://www.hooked-app.com/join.html`

### 2. **Update App Store URLs**
In `join.html`, replace the placeholder URLs:
```javascript
const APP_STORE_URL = 'https://apps.apple.com/app/hooked/YOUR_APP_STORE_ID';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.hookedapp.app';
```

### 3. **Get Your App Store ID**
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Select your app
3. Copy the App ID from the URL or app info

## 🚀 **Deployment Steps**

### 1. **Deploy to Vercel**
The web handler files are in `web-admin-hooked/public/` and will be deployed automatically with your Vercel deployment.

### 2. **Update Configuration Files**
Before deploying, update these files with your actual values:
- `web-admin-hooked/public/.well-known/apple-app-site-association`
- `web-admin-hooked/public/.well-known/assetlinks.json`
- `web-admin-hooked/public/join.html`

### 3. **Test the Setup**

#### **Test Universal Links (iOS):**
1. Build and install the app on a device
2. Send yourself a link: `https://www.hooked-app.com/join?code=TEST123`
3. Click the link - it should open the app directly

#### **Test App Links (Android):**
1. Build and install the app on a device
2. Send yourself a link: `https://www.hooked-app.com/join?code=TEST123`
3. Click the link - it should open the app directly

#### **Test Fallback:**
1. Uninstall the app
2. Click the link - it should redirect to the app store

## 🔧 **Troubleshooting**

### **iOS Issues:**
- Ensure the `apple-app-site-association` file is served with `Content-Type: application/json`
- Verify the Team ID is correct
- Check that the bundle identifier matches exactly

### **Android Issues:**
- Ensure the `assetlinks.json` file is served with `Content-Type: application/json`
- Verify the package name matches exactly
- Check that the SHA-256 fingerprint is correct

### **General Issues:**
- Clear browser cache and app data
- Test on physical devices (not simulators)
- Check that the domain `www.hooked-app.com` is properly configured

## 📋 **Checklist**

- [ ] Update `apple-app-site-association` with your Team ID
- [ ] Update `assetlinks.json` with your SHA-256 fingerprint
- [ ] Update `join.html` with your App Store ID
- [ ] Deploy all files to `https://www.hooked-app.com`
- [ ] Test Universal Links on iOS device
- [ ] Test App Links on Android device
- [ ] Test fallback to app stores
- [ ] Verify QR codes work correctly

## 🎯 **Expected Behavior**

1. **User with app installed**: Link opens app directly and enters the event code
2. **User without app**: Link shows the web page with download buttons
3. **Invalid/expired code**: Shows appropriate error message
4. **QR code**: Same behavior as direct links

The setup provides a seamless experience for users to join events whether they have the app installed or not! 