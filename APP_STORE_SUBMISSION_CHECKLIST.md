# App Store Submission Checklist - Hooked App

## 🚨 Critical Issues (Must Fix Before Submission)

### 1. Development Team Configuration
- [ ] **Add Apple Developer Team ID** to Xcode project
  - Open `ios/Hooked.xcodeproj` in Xcode
  - Select project → Signing & Capabilities
  - Add your Team ID (found in Apple Developer account)
  - Ensure "Automatically manage signing" is checked

### 2. Push Notification Entitlements
- [ ] **Update entitlements for production**
  - Change `aps-environment` from "development" to "production" in `ios/Hooked/Hooked.entitlements`
  - Ensure push notification certificates are configured for production

### 3. Bundle Version Management
- [ ] **Increment build number** for each submission
  - Current: `CFBundleVersion = "1"` in `Info.plist`
  - Must be unique for each App Store submission

## ⚠️ Potential Issues (Review & Fix)

### 4. Privacy Declarations ✅ FIXED
- [x] **Camera and Photo Library privacy declarations** added to `PrivacyInfo.xcprivacy`
- [ ] **Verify all privacy reasons** are accurate and complete

### 5. App Transport Security
- [ ] **Review ATS configuration** in `Info.plist`
  - Current: Allows local networking (`NSAllowsLocalNetworking = true`)
  - Ensure this is justified for your app's functionality

### 6. App Store Metadata
- [ ] **App Store Connect setup**
  - App name: "The Hooked App"
  - Category: Social Networking ✅
  - Age rating: Determine appropriate rating
  - Privacy policy URL required
  - App description and keywords

### 7. App Icon Requirements
- [ ] **Verify app icon** meets Apple's requirements
  - 1024x1024 PNG format
  - No transparency
  - No rounded corners (Apple adds them automatically)
  - Current: `./assets/icon.png`

### 8. Screenshots & App Preview
- [ ] **Create required screenshots**
  - iPhone 6.7" (iPhone 14 Pro Max)
  - iPhone 6.5" (iPhone 11 Pro Max)
  - iPhone 5.5" (iPhone 8 Plus)
  - iPad Pro 12.9" (if supporting tablets)

## 🔧 Technical Requirements

### 9. Code Signing
- [ ] **Production certificates**
  - Distribution certificate
  - App Store provisioning profile
  - Push notification certificate (production)

### 10. Build Configuration
- [ ] **Release build settings**
  - Ensure `DEBUG = NO` for App Store builds
  - Verify bundle identifier: `com.hookedapp.app`
  - Check minimum iOS version: 15.0 ✅

### 11. Universal Links
- [ ] **Verify universal links configuration**
  - Domain: `www.hooked-app.com` ✅
  - Associated domains properly configured ✅
  - Test deep linking functionality

## 📱 App Store Guidelines Compliance

### 12. Content & Functionality
- [ ] **Review app functionality**
  - Ensure all features work as described
  - Test QR code scanning
  - Test photo upload
  - Test notifications
  - Test event joining flow

### 13. Privacy & Data Handling
- [ ] **Privacy policy**
  - Must be accessible from app
  - Must cover all data collection
  - Must explain data retention policies
  - Must explain user rights

### 14. User Experience
- [ ] **App review**
  - No crashes or bugs
  - Smooth navigation
  - Proper error handling
  - Loading states
  - Accessibility considerations

## 🚀 Pre-Submission Checklist

### 15. Final Testing
- [ ] **Test on physical devices**
  - iPhone (latest iOS)
  - Test all user flows
  - Test edge cases
  - Performance testing

### 16. Documentation
- [ ] **Prepare for review**
  - App Store description
  - Keywords optimization
  - Support URL
  - Marketing URL (optional)
  - Demo account credentials (if needed)

### 17. Build Submission
- [ ] **Archive and upload**
  - Create archive in Xcode
  - Validate archive
  - Upload to App Store Connect
  - Submit for review

## 📋 Current Status

### ✅ Completed
- Privacy declarations for camera and photo library
- Basic app configuration
- Universal links setup
- Push notification setup (needs production update)

### ❌ Needs Action
- Development team configuration
- Production push notification certificates
- Bundle version increment
- App Store Connect setup
- Screenshots and metadata
- Final testing and validation

## 🔗 Useful Resources

- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [iOS App Programming Guide](https://developer.apple.com/library/archive/documentation/iPhone/Conceptual/iPhoneOSProgrammingGuide/Introduction/Introduction.html)

---

**Next Steps:**
1. Configure development team in Xcode
2. Update push notification entitlements for production
3. Create App Store Connect listing
4. Prepare screenshots and metadata
5. Test thoroughly on physical devices
6. Submit for review 