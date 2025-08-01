# Android Keystore Setup - Complete Guide

## ✅ What's Been Configured

I've successfully updated your Android build configuration for production release signing. Here's what's been done:

### 1. Updated `android/app/build.gradle`
- ✅ Added release signing configuration
- ✅ Changed targetSdkVersion from 35 to 34 (more stable)
- ✅ Added AAB bundle configuration
- ✅ Configured release builds to use production keystore

### 2. Updated `android/app/gradle.properties`
- ✅ Added keystore password properties
- ✅ Secure password storage configuration

### 3. Updated `android/.gitignore`
- ✅ Added keystore file to gitignore for security

### 4. Created `android/version.sh`
- ✅ Version code management script
- ✅ Made executable

## 🚨 NEXT STEPS - You Need to Complete

### Step 1: Generate the Production Keystore

Run this command in your terminal:

```bash
cd android/app
keytool -genkey -v -keystore hooked-release-key.keystore -alias hooked-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

**When prompted, provide:**
- **Keystore password**: Choose a strong password (e.g., `HookedApp2024!`)
- **Key password**: Can be the same as keystore password
- **First and Last Name**: Your name or company name
- **Organizational Unit**: Development team or department  
- **Organization**: Your company name
- **City**: Your city
- **State**: Your state
- **Country Code**: Your country code (e.g., US, CA, etc.)

### Step 2: Update Passwords in gradle.properties

Edit `android/app/gradle.properties` and replace the placeholder passwords:

```properties
# Replace these with your actual passwords
HOOKED_STORE_PASSWORD=your_actual_store_password
HOOKED_KEY_PASSWORD=your_actual_key_password
```

**Example:**
```properties
HOOKED_STORE_PASSWORD=HookedApp2024!
HOOKED_KEY_PASSWORD=HookedApp2024!
```

### Step 3: Test the Configuration

Test that everything works:

```bash
# Navigate to android directory
cd android

# Test debug build
./gradlew assembleDebug

# Test release build (this will use your new keystore)
./gradlew bundleRelease
```

## 📁 File Locations

After setup, your files should be:

```
android/
├── app/
│   ├── hooked-release-key.keystore    # Your production keystore
│   ├── build.gradle                   # Updated with release signing
│   └── gradle.properties              # Updated with passwords
├── version.sh                         # Version management script
└── .gitignore                         # Updated to exclude keystore
```

## 🔒 Security Notes

1. **Keep your keystore secure**: Never commit it to version control
2. **Backup your keystore**: Store it in a secure location
3. **Remember your passwords**: You'll need them for all future builds
4. **Don't share the keystore**: Keep it private and secure

## 🧪 Testing Commands

### Debug Build (for testing):
```bash
cd android
./gradlew assembleDebug
```

### Release Build (for Google Play):
```bash
cd android
./version.sh                    # Increment version code
./gradlew bundleRelease         # Generate AAB file
```

### Check Generated Files:
```bash
# Debug APK location
ls android/app/build/outputs/apk/debug/

# Release AAB location  
ls android/app/build/outputs/bundle/release/
```

## 🚨 Important Warnings

1. **Never lose your keystore**: If you lose it, you can't update your app on Google Play
2. **Keep passwords secure**: Store them safely, not in plain text files
3. **Test thoroughly**: Always test release builds on physical devices
4. **Backup everything**: Keep secure backups of keystore and passwords

## 📱 Google Play Submission

Once you've completed the setup:

1. **Generate AAB**: `./gradlew bundleRelease`
2. **Upload to Google Play Console**: Use the generated AAB file
3. **Complete store listing**: Add metadata, screenshots, etc.
4. **Submit for review**: Google Play will review your app

## 🔧 Troubleshooting

### If you get password errors:
- Check that passwords in `gradle.properties` match your keystore
- Ensure no extra spaces or characters

### If build fails:
- Run `./gradlew clean` first
- Check that keystore file exists in `android/app/`
- Verify all file paths are correct

### If version code issues:
- Run `./version.sh` to increment version code
- Check that version code is higher than previous releases

## ✅ Completion Checklist

- [ ] Generated production keystore with `keytool`
- [ ] Updated passwords in `gradle.properties`
- [ ] Tested debug build: `./gradlew assembleDebug`
- [ ] Tested release build: `./gradlew bundleRelease`
- [ ] Verified AAB file is generated
- [ ] Backed up keystore and passwords securely

---

**Status**: 🟡 **READY FOR KEYSTORE GENERATION**

Your build configuration is now properly set up. You just need to generate the keystore and update the passwords to complete the setup. 