# OTA Updates Guide

This guide explains what changes can be deployed via Over-the-Air (OTA) updates versus what requires a full App Store/Play Store update for the Hooked dating app.

## Over-the-Air (OTA) Updates ✅
**Can be pushed instantly without app store approval using `eas update`**

### JavaScript/Logic Changes:
- **Bug fixes in business logic** - Fix matching algorithm, event scheduling bugs
- **UI updates** - Change colors, fonts, layouts, button positions
- **Text content** - Update error messages, help text, feature descriptions
- **Feature toggles** - Enable/disable features via remote config
- **API endpoint changes** - Switch between different backend URLs
- **Analytics tracking** - Add new event tracking, modify existing events
- **State management** - Fix Redux/Zustand store logic
- **Navigation changes** - Modify screen flows, routing logic
- **Form validation** - Update input validation rules
- **Image processing** - Change cropping, filtering logic (JavaScript only)

### Dating App Specific Examples:
```typescript
// ✅ Can push via OTA
- Fix swipe detection sensitivity
- Update matching preferences UI
- Change profile photo cropping logic
- Fix timezone display issues in events
- Update chat message rendering
- Modify notification text content
- Fix profile validation rules
- Update privacy settings options
- Change event creation flow
- Fix QR code scanning UI
- Update survey questions and logic
- Modify home screen layout
- Fix consent form validation
- Update discovery filters
```

### Files That Can Be Updated via OTA:
- All `.tsx`, `.ts`, `.js` files in `/app/` and `/lib/`
- Component files, service files, utility functions
- Configuration files (non-native)
- Asset references (but not the assets themselves if native)

## Store Updates Required ❌
**Must go through App Store/Play Store review (3-7 days approval time)**

### Native Code Changes:
- **New permissions** - Camera, location, contacts, microphone, storage access
- **Native dependencies** - Adding new native libraries or SDKs
- **Build configuration** - Changing target SDK, compile settings, architecture
- **App metadata** - App name, bundle ID, app icons, splash screens
- **Native modules** - Custom native code, bridges to iOS/Android APIs
- **Expo config changes** - Major changes to `app.json`/`expo.json`

### Dating App Specific Examples:
```typescript
// ❌ Requires store update
- Add voice message recording (needs microphone permission)
- Implement video calls (needs camera/microphone permissions)  
- Add photo editing with new native library
- Change app icon, name, or splash screen
- Add background location tracking for events
- Integrate new payment SDK for premium features
- Add biometric authentication (FaceID/TouchID)
- Change minimum iOS/Android version support
- Add push notification sounds/categories
- Implement native image filters
- Add contact syncing features
- Integrate native camera enhancements
```

### Files That Require Store Updates:
- `/ios/` and `/android/` native directories
- `app.json`, `expo.json` configuration
- `package.json` when adding native dependencies
- Native asset files (app icons, splash screens)

## How to Deploy Updates

### OTA Updates Process:
```bash
# 1. Make your JavaScript/TypeScript changes
# 2. Test thoroughly in development
# 3. Deploy to staging first
eas update --branch staging --message "Fix swipe detection sensitivity"

# 4. Test on staging, then deploy to production
eas update --branch production --message "Fix swipe detection bug"

# 5. Update your backend version endpoint if needed
# 6. The UpdateService automatically checks and prompts users
```

### Store Updates Process:
```bash
# 1. Make native code changes
# 2. Update version in app.json and package.json
# 3. Build and submit to stores
npm run build:prod
eas submit --platform all

# 4. Wait for store approval (3-7 days)
# 5. Release manually or automatically
```

## Update Strategy for Hooked App

### Hotfixes (Same Day) → OTA
- Critical bugs affecting user experience
- Matching algorithm issues
- UI/UX problems
- API integration fixes
- Event timezone issues

### Feature Updates (Weekly) → OTA  
- New UI components and screens
- Modified user flows
- Enhanced existing features
- New survey questions
- Updated privacy settings

### Major Releases (Monthly) → Store
- New native permissions
- Significant new features requiring native code
- Performance improvements requiring native changes
- Security updates requiring native modules

### Emergency Updates
- **Security issues in JS code** → OTA immediately
- **Security issues in native code** → Store update + temporary OTA fixes if possible
- **Critical crashes** → Determine if fixable via OTA or needs store update

## Version Management

### Current UpdateService Setup:
- **OTA updates**: Handled automatically by `expo-updates`
- **Store updates**: Detected via version comparison API
- **Update prompting**: Handled by `/lib/updateService.ts`

### Version Numbering:
- **Store versions**: `1.1.1`, `1.2.0`, `2.0.0` (semantic versioning)
- **OTA versions**: Managed internally by Expo Updates
- **API versions**: Track both store and OTA versions separately

## Testing Guidelines

### Before OTA Updates:
- [ ] Test on development environment
- [ ] Deploy to staging branch first
- [ ] Test on physical devices (iOS + Android)
- [ ] Verify no breaking changes to existing features
- [ ] Check performance impact

### Before Store Updates:
- [ ] Complete OTA testing checklist
- [ ] Test native functionality thoroughly  
- [ ] Verify permissions work correctly
- [ ] Test on multiple device types and OS versions
- [ ] Review App Store guidelines compliance
- [ ] Prepare store listing updates if needed

## Emergency Rollback

### OTA Updates:
```bash
# Rollback to previous OTA update
eas update --branch production --republish --group [previous-group-id]
```

### Store Updates:
- No rollback possible - must submit new version
- Use OTA updates to patch issues if possible
- Coordinate with app stores for expedited review if critical

## Monitoring

- Monitor update adoption rates via Expo dashboard
- Track crash rates after deployments
- Monitor user feedback and app store reviews
- Use analytics to measure feature usage post-update

---

**Remember**: When in doubt, choose store updates for safety. OTA updates are powerful but should be used responsibly to maintain app stability and user trust.