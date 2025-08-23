# Version Changes and Production Deployment Checklist

## Version 1.1.0 - Development to Production Migration

This document tracks changes made during development environment setup that will need to be applied to production during the v1.1.0 release.

### 📦 **Dependencies Added**
- [ ] `expo-image-manipulator` - Required for ImageOptimizationService photo processing
  ```bash
  npm install expo-image-manipulator
  ```

### 🔧 **Configuration Changes**
- [ ] Environment-specific app configurations implemented
  - Development uses `app.development.json`
  - Production continues using `app.json` (no changes needed)
  - Staging configuration available in `eas.json` but unused

### 📱 **App Configuration Files**
- [x] `app.development.json` - Development-specific configuration (dev only)
- [x] `app.json` - Production configuration (unchanged, ready for prod)
- [x] `eas.json` - Updated to use development config for dev builds

### 🔥 **Firebase Configuration**
- [ ] **Development Environment Setup** (dev only)
  - Development Firebase project: `hooked-development` 
  - Development Google Services files in place
  - All Cloud Functions deployed to development project

- [ ] **Production Environment** (no changes needed)
  - Production Firebase project: `hooked-69` (unchanged)
  - Production Google Services files unchanged
  - Production Cloud Functions already deployed

### 🔐 **EAS Secrets Configuration**
- [ ] **Already configured for both environments:**
  - Development secrets: `*_DEV` variants
  - Production secrets: Standard variants
  - All keystore and certificate configurations ready

### 🎯 **Sentry Configuration**
- [ ] **Development Sentry Project:** `hooked-dev` (dev only)
- [ ] **Production Sentry Project:** `hooked` (unchanged, ready for prod)
- [x] Environment-specific Sentry configurations in place

### 📊 **Test Data & Development Tools**
- [ ] **Development Only (not for production):**
  - Mock profile generation scripts
  - Development test event with code `TEST`
  - 18 test profiles in development Firebase
  - Cleanup scripts for development data

### 🔄 **Workflow & Environment Switching**
- [x] Environment switching commands ready:
  ```bash
  npm run env:dev    # Development
  npm run env:prod   # Production
  ```
- [x] Firebase project switching integrated
- [x] EAS build configurations for both environments

### 🏗️ **Build Configuration**
- [ ] **Development builds** use `app.development.json`
  - Bundle ID: `com.hookedapp.app.dev`
  - Package: `com.hooked.hookeddev`
  - Development Firebase project
  
- [ ] **Production builds** continue using `app.json`
  - Bundle ID: `com.hookedapp.app` (unchanged)
  - Package: `com.hookedapp.app` (unchanged)
  - Production Firebase project

### 🚀 **Pre-Release Production Checklist**

Before deploying v1.1.0 to production:

#### Required Actions:
1. [ ] Install `expo-image-manipulator` in production environment
2. [ ] Verify all production EAS secrets are configured
3. [ ] Ensure production Firebase Cloud Functions are up to date
4. [ ] Test production builds use correct `app.json` configuration
5. [ ] Verify production Sentry project receives error reports correctly
6. [ ] Test environment switching works in production CI/CD

#### Optional/Development Only (DO NOT deploy to production):
- [ ] Mock profile generation scripts (keep in dev only)
- [ ] Test event data (keep in development Firebase only)
- [ ] `app.development.json` file (development builds only)

### 🔍 **Testing Verification**
Before production release, verify:
- [ ] Production builds connect to production Firebase
- [ ] Development builds connect to development Firebase
- [ ] Photo upload works in both environments
- [ ] Push notifications work in both environments
- [ ] Error reporting goes to correct Sentry projects
- [ ] No cross-environment data contamination

### 📝 **Documentation Updates Needed**
- [ ] Update README.md with environment setup instructions
- [ ] Document the new environment switching workflow
- [ ] Add troubleshooting section for environment issues

---

## Summary for v1.1.0 Production Release

**Critical for Production:**
- Install `expo-image-manipulator` package
- Verify existing configurations are working
- Test build and deployment pipeline

**Development Infrastructure:**
- Complete environment separation achieved
- Development tools and test data in place
- Ready for team onboarding and testing

**Risk Assessment:** ✅ Low risk
- Minimal production changes required
- Most changes are development environment additions
- Production configurations remain unchanged and tested