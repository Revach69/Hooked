# Android Critical Fixes Guide - Google Play Store Compliance

## 🚨 IMMEDIATE FIXES REQUIRED

### 1. Fix Release Signing Configuration

#### Step 1: Generate Production Keystore
```bash
# Navigate to android/app directory
cd android/app

# Generate production keystore
keytool -genkey -v -keystore hooked-release-key.keystore -alias hooked-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

#### Step 2: Update build.gradle
Edit `android/app/build.gradle`:

```gradle
android {
    // ... existing config ...
    
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            storeFile file('hooked-release-key.keystore')
            storePassword 'YOUR_STORE_PASSWORD'
            keyAlias 'hooked-key-alias'
            keyPassword 'YOUR_KEY_PASSWORD'
        }
    }
    
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            signingConfig signingConfigs.release  // ✅ Changed from debug to release
            shrinkResources (findProperty('android.enableShrinkResourcesInReleaseBuilds')?.toBoolean() ?: false)
            minifyEnabled enableProguardInReleaseBuilds
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
            crunchPngs (findProperty('android.enablePngCrunchInReleaseBuilds')?.toBoolean() ?: true)
        }
    }
}
```

#### Step 3: Secure Keystore Passwords
Create `android/app/gradle.properties` (or add to existing):
```properties
HOOKED_STORE_PASSWORD=your_secure_store_password
HOOKED_KEY_PASSWORD=your_secure_key_password
```

Then update build.gradle to use these properties:
```gradle
release {
    storeFile file('hooked-release-key.keystore')
    storePassword HOOKED_STORE_PASSWORD
    keyAlias 'hooked-key-alias'
    keyPassword HOOKED_KEY_PASSWORD
}
```

### 2. Fix Debug Manifest Security Issue

Edit `android/app/src/debug/AndroidManifest.xml`:
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">

    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW"/>

    <application 
        android:usesCleartextTraffic="false"  <!-- ✅ Changed from true to false -->
        tools:targetApi="28" 
        tools:ignore="GoogleAppIndexingWarning" 
        tools:replace="android:usesCleartextTraffic" />
</manifest>
```

### 3. Update Target SDK Version

Edit `android/app/build.gradle`:
```gradle
defaultConfig {
    applicationId 'com.hookedapp.app'
    minSdkVersion rootProject.ext.minSdkVersion
    targetSdkVersion 34  // ✅ Changed from 35 to 34 for better stability
    versionCode 1
    versionName "1.0.0"
}
```

### 4. Update ProGuard Rules

Edit `android/app/proguard-rules.pro`:
```proguard
# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Firebase rules
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }

# React Native rules
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }

# Expo rules
-keep class expo.modules.** { *; }

# Add any project specific keep options here:
```

### 5. Configure AAB Build

Edit `android/app/build.gradle`:
```gradle
android {
    // ... existing config ...
    
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            signingConfig signingConfigs.release
            shrinkResources (findProperty('android.enableShrinkResourcesInReleaseBuilds')?.toBoolean() ?: false)
            minifyEnabled enableProguardInReleaseBuilds
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
            crunchPngs (findProperty('android.enablePngCrunchInReleaseBuilds')?.toBoolean() ?: true)
        }
    }
    
    // Add this section for AAB support
    bundle {
        language {
            enableSplit = true
        }
        density {
            enableSplit = true
        }
        abi {
            enableSplit = true
        }
    }
}
```

### 6. Add Network Security Configuration

Create `android/app/src/main/res/xml/network_security_config.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="true">hooked-app.com</domain>
        <domain includeSubdomains="true">firebaseapp.com</domain>
        <domain includeSubdomains="true">googleapis.com</domain>
    </domain-config>
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system"/>
        </trust-anchors>
    </base-config>
</network-security-config>
```

Update `android/app/src/main/AndroidManifest.xml`:
```xml
<application 
    android:name=".MainApplication" 
    android:label="@string/app_name" 
    android:icon="@mipmap/ic_launcher" 
    android:roundIcon="@mipmap/ic_launcher_round" 
    android:allowBackup="true" 
    android:theme="@style/AppTheme" 
    android:supportsRtl="true"
    android:networkSecurityConfig="@xml/network_security_config">  <!-- ✅ Added this line -->
    <!-- ... rest of application config ... -->
</application>
```

### 7. Implement Version Code Management

Create a script `android/version.sh`:
```bash
#!/bin/bash

# Get current version code from build.gradle
CURRENT_VERSION=$(grep "versionCode" app/build.gradle | sed 's/.*versionCode //' | sed 's/.*versionCode //')

# Increment version code
NEW_VERSION=$((CURRENT_VERSION + 1))

# Update build.gradle
sed -i '' "s/versionCode $CURRENT_VERSION/versionCode $NEW_VERSION/" app/build.gradle

echo "Updated version code from $CURRENT_VERSION to $NEW_VERSION"
```

Make it executable:
```bash
chmod +x android/version.sh
```

### 8. Build Commands

#### For Testing (Debug):
```bash
cd android
./gradlew assembleDebug
```

#### For Production (AAB):
```bash
cd android
./version.sh  # Increment version code
./gradlew bundleRelease
```

The AAB file will be generated at: `android/app/build/outputs/bundle/release/app-release.aab`

## 🔒 SECURITY CHECKLIST

### Before Building for Production:
- [ ] Production keystore generated and secured
- [ ] Keystore passwords stored securely (not in version control)
- [ ] Debug manifest cleartext traffic disabled
- [ ] ProGuard rules updated for all dependencies
- [ ] Network security configuration added
- [ ] Target SDK version set to 34
- [ ] Version code incremented

### Before Google Play Submission:
- [ ] AAB file generated successfully
- [ ] App tested on physical Android devices
- [ ] All permissions justified in Google Play Console
- [ ] Content rating questionnaire completed
- [ ] Privacy policy uploaded and accessible
- [ ] App store metadata prepared

## 🧪 TESTING COMMANDS

### Test Build Process:
```bash
# Clean and rebuild
cd android
./gradlew clean
./gradlew assembleDebug

# Test release build
./gradlew bundleRelease
```

### Verify AAB Contents:
```bash
# Install bundletool (if not already installed)
# Download from: https://github.com/google/bundletool/releases

# Extract AAB to see contents
bundletool build-apks --bundle=app-release.aab --output=app.apks
```

## 📱 GOOGLE PLAY CONSOLE SETUP

### Required Information:
1. **App Name**: "The Hooked App"
2. **Package Name**: `com.hookedapp.app`
3. **Privacy Policy URL**: `https://hooked-app.com/privacy`
4. **Support URL**: `https://hooked-app.com/support`
5. **Content Rating**: Complete questionnaire
6. **Permission Justifications**: Provide for each sensitive permission

### Permission Justifications to Prepare:
- **READ_EXTERNAL_STORAGE**: "Required to access user photos for profile picture upload"
- **WRITE_EXTERNAL_STORAGE**: "Required to save temporary images during profile creation"
- **SYSTEM_ALERT_WINDOW**: "Required for React Native development tools (can be removed for production)"

## 🚨 IMPORTANT NOTES

1. **Keep keystore secure**: Never commit the production keystore to version control
2. **Backup keystore**: Store a secure backup of your production keystore
3. **Test thoroughly**: Always test release builds on physical devices
4. **Monitor logs**: Check for any ProGuard-related crashes after obfuscation
5. **Update regularly**: Keep dependencies updated to avoid security vulnerabilities

## 📞 SUPPORT

If you encounter issues during the build process:
1. Check the Android build logs for specific error messages
2. Verify all file paths and configurations
3. Ensure all required dependencies are installed
4. Test with a clean build (`./gradlew clean`)

---

**Next Steps**: After implementing these fixes, test the app thoroughly on physical Android devices before submitting to Google Play Store. 