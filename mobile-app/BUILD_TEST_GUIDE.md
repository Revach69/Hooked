# Build Testing Guide - Development Builds

This guide explains how to install and test development builds on physical devices.

## 📱 **Development Build Information**

- **App Name**: Hooked Dev
- **Version**: 1.1.0
- **iOS Bundle ID**: `com.hookedapp.app.dev`
- **Android Package**: `com.hooked.hookeddev`
- **Firebase**: Development project (`hooked-development`)
- **Test Event Code**: `TEST`

## 🔧 **Prerequisites**

### For iOS:
- Mac computer with Xcode installed
- iPhone/iPad registered in Apple Developer account
- Lightning/USB-C cable

### For Android:
- Android device with USB debugging enabled
- USB cable
- ADB installed (optional but recommended)

## 📥 **Installing Development Builds**

### 🍏 **iOS Installation Methods**

#### **Method 1: Xcode (Recommended)**
1. **Download IPA file** from EAS build page
2. **Connect iPhone** to Mac via cable
3. **Open Xcode** → Window → Devices and Simulators
4. **Select your device** from the left sidebar
5. **Drag and drop** the `.ipa` file onto the device
6. **Trust the app** on device: Settings → General → VPN & Device Management → Trust "Roi Revach"

#### **Method 2: Apple Configurator (Alternative)**
1. **Download Apple Configurator 2** from Mac App Store
2. **Connect iPhone** to Mac
3. **Add** → Apps → Select the `.ipa` file
4. **Install** to device

#### **Method 3: TestFlight Internal Testing**
1. **Upload to App Store Connect** (if configured)
2. **Add internal testers**
3. **Send TestFlight invitation**
4. **Install via TestFlight app**

### 🤖 **Android Installation Methods**

#### **Method 1: Direct APK Install (Easiest)**
1. **Download APK file** from EAS build page to your phone
2. **Enable unknown sources**: Settings → Security → Install unknown apps → Chrome/Browser → Allow
3. **Tap the downloaded APK** to install
4. **Accept permissions** when prompted

#### **Method 2: ADB Install (Developer Method)**
1. **Enable Developer Options**: Settings → About Phone → Tap Build Number 7 times
2. **Enable USB Debugging**: Settings → Developer Options → USB Debugging
3. **Connect phone** to computer via USB
4. **Install via ADB**:
   ```bash
   adb install path/to/your-app.apk
   ```

#### **Method 3: Drag and Drop (Some devices)**
1. **Connect Android device** to computer
2. **Copy APK** to device storage
3. **Use file manager** on device to find and install APK

## 🎯 **Testing the Development Build**

### **1. App Installation Verification**
- [ ] App installs without errors
- [ ] App icon shows "Hooked Dev" name
- [ ] Can install alongside production "Hooked" app (different bundle ID)

### **2. Environment Verification**
- [ ] App connects to development Firebase
- [ ] Event code `TEST` works and shows test profiles
- [ ] Photo uploads work properly
- [ ] Push notifications have "[DEV]" prefix

### **3. Core Functionality Testing**
- [ ] Join event with code `TEST`
- [ ] View test profiles (18 profiles total)
- [ ] Upload profile photos
- [ ] Send/receive messages
- [ ] Match functionality works
- [ ] Discovery screen loads profiles

### **4. Development Features**
- [ ] Error reporting goes to development Sentry
- [ ] No interference with production app data
- [ ] Development Firebase data is isolated

## 🔍 **Getting Build Links**

### **From EAS CLI:**
```bash
# List recent builds
eas build:list

# Get specific build details
eas build:view [BUILD_ID]
```

### **From Expo Dashboard:**
1. Go to https://expo.dev/accounts/revach/projects/hooked/builds
2. Find your development builds
3. Click build to get download links

### **Build URLs (Current):**
- **Android**: https://expo.dev/accounts/revach/projects/hooked/builds/54173e4e-b989-4cd3-9234-02d9ccf014a9
- **iOS**: https://expo.dev/accounts/revach/projects/hooked/builds/e4daf978-3c91-4065-a722-298b61b7d228

## ⚠️ **Common Issues & Solutions**

### **iOS Issues:**

**"App Won't Install"**
- Check device is registered in Apple Developer account
- Verify provisioning profile includes your device UDID
- Make sure you're using the correct bundle ID build

**"Untrusted Developer"**
- Go to Settings → General → VPN & Device Management
- Trust the developer certificate
- Try opening the app again

### **Android Issues:**

**"App Not Installed"**
- Enable "Install unknown apps" for your browser/file manager
- Check if you have enough storage space
- Try uninstalling any existing version first

**"Parse Error"**
- Downloaded APK file may be corrupted
- Re-download from EAS build page
- Check Android version compatibility

## 🚀 **Development Workflow**

### **After Installing:**
1. **Test core features** using the checklist above
2. **Report bugs** in development environment
3. **Take screenshots** of issues (they'll go to dev Sentry)
4. **Test with real data** using the test event

### **For Continued Testing:**
1. **Keep both apps**: Production "Hooked" + Development "Hooked Dev"
2. **Use different accounts** if needed (dev vs production)
3. **Switch between builds** to compare behavior

## 📊 **Build Information**

You can always check build status and download links at:
- **EAS Dashboard**: https://expo.dev/accounts/revach/projects/hooked/builds
- **Build logs**: Available on each build page for debugging

## 🔄 **Next Steps After Testing**

1. **If tests pass**: Ready to merge `develop` → `main` for production
2. **If issues found**: Fix bugs, commit to develop, build again
3. **Production deployment**: Use production build profile for App Store/Play Store

---

**Need Help?**
- Check EAS build logs for build failures
- Use development Firebase console for data debugging
- Development Sentry for crash reports: https://sentry.io/organizations/hooked/projects/hooked-dev/