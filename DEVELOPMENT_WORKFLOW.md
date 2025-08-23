# Development Workflow Guide

## Overview

This project uses a three-environment setup to support continuous development while maintaining production stability:

- **Development**: Active feature development and testing
- **Staging**: Pre-production testing (configured but unused for now)
- **Production**: Live app serving users

## Branch Strategy

### Branch Structure
```
main         → Production (hooked-69)
staging      → Staging (hooked-staging) - configured but unused
develop      → Development (hooked-development)
hotfix/*     → Emergency production fixes
feature/*    → New feature development
```

### Current Active Workflow (Development + Production)
```
feature/* → develop → main
           ↓          ↓
      Dev Env    Prod Env
```

### Future Full Workflow (When Staging is Activated)
```
feature/* → develop → staging → main
           ↓          ↓          ↓
      Dev Env   Staging    Prod Env
```

## Environment Configuration

### Firebase Projects
- **Production**: `hooked-69`
- **Staging**: `hooked-staging` 
- **Development**: `hooked-development`

### Environment Files
- `.env.production` → Production Firebase config
- `.env.staging` → Staging Firebase config  
- `.env.development` → Development Firebase config

## Available Commands

### Local Development
```bash
# Switch to development environment
npm run env:dev

# Start with specific environment
npm run start:dev      # Development
npm run start:staging  # Staging
npm run start:prod     # Production
```

### Building
```bash
# Build for specific environment
npm run build:dev      # Development build
npm run build:staging  # Staging build
npm run build:prod     # Production build
```

### Firebase Management
```bash
# Switch Firebase projects
npm run firebase:dev
npm run firebase:staging
npm run firebase:prod
```

## Development Workflow

### 1. Normal Feature Development
```bash
# Create feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/new-feature

# Work on your feature
# Commit changes

# Push and create PR to develop
git push origin feature/new-feature
# Create PR: feature/new-feature → develop
```

### 2. Production Hotfixes
```bash
# Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug

# Fix the bug
# Test against production environment
npm run env:prod

# Push and create PR to main
git push origin hotfix/critical-bug
# Create PR: hotfix/critical-bug → main

# After merge, auto-merge to develop happens via GitHub Actions
```

### 3. Release Process (Current)
```bash
# When ready to release from develop
git checkout main
git pull origin main
git merge develop
git push origin main

# This triggers production deployment
```

## GitHub Actions

### Automated Workflows
1. **Development Deployment**: Triggers on push to `develop`
2. **Production Deployment**: Triggers on push to `main`
3. **Hotfix Auto-merge**: Automatically merges hotfixes from `main` to `develop`

### Required Secrets
Add these to GitHub repository secrets:
- `EXPO_TOKEN`: EAS CLI token
- `FIREBASE_TOKEN`: Firebase CLI token
- `GITHUB_TOKEN`: Automatically provided by GitHub

## Environment Variables

### Required for Each Environment
- Firebase configuration (API keys, project IDs)
- Sentry DSN and tokens
- Function URLs and API keys
- EAS project IDs

### Security Notes
- Never commit actual API keys to environment files
- Use placeholder values in repository
- Set real values via EAS secrets or CI/CD variables

## Testing Strategy

### Development Environment
- Use Firebase emulators when possible
- Test with development Firebase project
- Safe to experiment and break things

### Production Environment  
- Only for hotfix testing
- Minimal testing with real data
- Always use production Firebase project

## Migration to Full Three-Environment Setup

When ready to activate staging:

1. **Update GitHub Actions**: Uncomment staging workflow
2. **Configure Staging Firebase**: Add real configuration to `.env.staging`
3. **Update Workflow**: Change to `develop → staging → main`
4. **Train Team**: Update development practices

## Troubleshooting

### Environment Issues
```bash
# Check current environment
cat .env | grep EXPO_PUBLIC_ENVIRONMENT

# Check Firebase project
firebase use

# Reset to specific environment
npm run env:dev  # or env:staging, env:prod
```

### Build Issues
```bash
# Clear EAS cache
eas build --clear-cache

# Check build logs
eas build:list
```

### Firebase Issues
```bash
# Check active project
firebase projects:list

# Switch projects
firebase use <project-id>
```

## Best Practices

1. **Always** work in feature branches
2. **Test** in development environment before merging
3. **Review** all PRs before merging to develop
4. **Hotfixes** should be minimal and well-tested
5. **Document** any environment-specific configurations
6. **Use** semantic versioning for releases
7. **Monitor** production after deployments

## Next Steps (Detailed Implementation Guide)

### 1. Configure Firebase Development Environment

**Purpose**: Set up the development Firebase project with real authentication, database, and cloud functions to enable full local development without affecting production data.

**Steps**:
```bash
# Switch to development Firebase project
firebase use development

# Enable Authentication
firebase auth:enable

# Deploy Firestore rules (copy from production)
firebase deploy --only firestore:rules

# Deploy Cloud Functions to development
cd functions
firebase deploy --only functions
```

**Update `.env.development` with real values**:
- Get Firebase config from Firebase Console → Project Settings → Your apps
- Replace placeholder values:
  ```
  EXPO_PUBLIC_FIREBASE_API_KEY=<real_dev_api_key>
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<real_dev_sender_id>
  EXPO_PUBLIC_FIREBASE_APP_ID=<real_dev_app_id>
  ```

**Why this matters**: Without proper Firebase configuration, developers can't test authentication, database operations, or push notifications locally.

### 2. Set Up Sentry Error Tracking

**Purpose**: Create separate error tracking for each environment to avoid mixing development errors with production issues, and senable proper debugging workflows.

**Steps**:
```bash
# Create Sentry projects for each environment
# 1. Go to sentry.io → Create Project
# 2. Create: hooked-dev, hooked-staging, hooked-production
# 3. Get DSN for each project
```

**Update environment files**:
- `.env.development`: Add development Sentry DSN
- `.env.staging`: Add staging Sentry DSN  
- `.env.production`: Keep existing production DSN

**Why this matters**: Separates development/testing crashes from real user issues, prevents noise in production monitoring, enables environment-specific alerting.

### 3. Configure EAS Secrets and Build Credentials

**Purpose**: Securely store sensitive information (API keys, certificates, keystores) needed for building and deploying apps without exposing them in code.

**Steps**:
```bash
# Set EAS secrets for each environment
eas secret:create --scope project --name GOOGLE_SERVICES_JSON_DEV --value "$(cat mobile-app/android/app/google-services-dev.json)"
eas secret:create --scope project --name GOOGLE_SERVICES_JSON_STAGING --value "$(cat mobile-app/google-services-staging.json)"
eas secret:create --scope project --name GOOGLE_SERVICES_JSON_PROD --value "$(cat mobile-app/google-services-prod.json)"

# iOS certificates for each environment
eas secret:create --scope project --name GOOGLE_SERVICE_INFO_PLIST_DEV --value "$(cat mobile-app/ios/Hooked/GoogleService-Info-dev.plist)"

# Android signing keys
eas secret:create --scope project --name KEYSTORE_PASSWORD --value "<your_keystore_password>"
eas secret:create --scope project --name KEY_ALIAS --value "hooked-key-alias"
eas secret:create --scope project --name KEY_PASSWORD --value "<your_key_password>"
```

**Whcy this matters**: Keeps sensitive build credentials secure, enables automated CI/CD builds, prevents accidental exposure of certificates/keys in version control.

### 4. Set Up GitHub Repository Secrets

**Purpose**: Enable GitHub Actions to authenticate with external services (Expo, Firebase) for automated deployments and CI/CD workflows.

**Steps**:
```bash
# Go to GitHub repo → Settings → Secrets and Variables → Actions
# Add the following repository secrets:

EXPO_TOKEN=<your_expo_access_token>
# Get from: npx expo whoami → expo.dev/accounts → Access tokens

FIREBASE_TOKEN=<your_firebase_ci_token>  
# Get from: firebase login:ci

GITHUB_TOKEN=<automatically_provided>
# GitHub automatically provides this
```

**Additional secrets for advanced workflows**:
```
SENTRY_AUTH_TOKEN_DEV=<dev_sentry_token>
SENTRY_AUTH_TOKEN_STAGING=<staging_sentry_token>
SENTRY_AUTH_TOKEN_PROD=<prod_sentry_token>
```

**Why this matters**: Without these tokens, GitHub Actions cannot deploy your app, upload sourcemaps, or interact with Firebase services automatically.

### 5. Test the Complete Workflow

**Purpose**: Validate that the entire development workflow works correctly before using it for real features, catching configuration issues early.

**Test Steps**:
```bash
# 1. Test environment switching
npm run env:dev
npm run start:dev    # Verify connects to dev Firebase

# 2. Test feature branch workflow
git checkout develop
git checkout -b feature/test-workflow
echo "// Test change" >> app/home.tsx
git commit -am "test: workflow validation"
git push origin feature/test-workflow
# Create PR: feature/test-workflow → develop

# 3. Test development build
npm run build:dev
# Check EAS dashboard for successful build

# 4. Test hotfix workflow  
git checkout main
git checkout -b hotfix/test-hotfix
echo "// Hotfix test" >> app/home.tsx
git commit -am "hotfix: test automated merge"
git push origin hotfix/test-hotfix
# Create PR: hotfix/test-hotfix → main
# Verify auto-merge to develop occurs after merge
```

**Why this matters**: Catches configuration errors, validates CI/CD pipelines, ensures team understands the workflow before production use.

### 6. Configure Development Data and Users

**Purpose**: Create realistic test data and user accounts for development testing without using production data or affecting real users.

**Steps**:
```bash
# Create test users in development Firebase
# Use Firebase Auth console or create via functions

# Add test event data
# Create sample events, users, matches for testing

# Set up Firebase Emulator (optional but recommended)
firebase init emulators
firebase emulators:start
```

**Use the new mock data scripts**:
```bash
# Generate test profiles for development
npm run generate:mock-profiles

# Clean up test data when needed
npm run clean:test-profiles
```

**Why this matters**: Provides realistic testing environment, protects production data privacy, enables comprehensive feature testing without side effects.

### 7. Environment-Specific Configuration Validation

**Purpose**: Ensure each environment is properly configured and isolated from others, preventing cross-environment data contamination.

**Validation Checklist**:
- [ ] Each environment connects to correct Firebase project
- [ ] Sentry errors go to correct project  
- [ ] Push notifications use correct EAS project ID
- [ ] App Check tokens are environment-specific
- [ ] API endpoints point to correct environment
- [ ] No production data accessible from development

**Test Commands**:
```bash
# Verify environment isolation
npm run env:dev && npm run start:dev
# Check logs: should show hooked-development project

npm run env:prod && npm run start:prod  
# Check logs: should show hooked-69 project
```

**Why this matters**: Prevents accidentally modifying production data during development, ensures clean separation between environments, maintains data integrity.

### 8. Team Onboarding and Documentation

**Purpose**: Ensure all team members understand and can use the new workflow effectively, reducing setup time and mistakes.

**Create Team Guide**:
- Document local setup process
- Provide troubleshooting for common issues
- Create workflow cheat sheet
- Record demo videos if needed

**Onboarding Checklist for New Developers**:
- [ ] Clone repository
- [ ] Install dependencies (`npm install`)
- [ ] Set up development environment (`npm run env:dev`)
- [ ] Run development build (`npm run build:dev`)
- [ ] Test feature branch workflow
- [ ] Verify access to Firebase development project

**Why this matters**: Reduces onboarding time, prevents workflow mistakes, ensures consistent development practices across team.

### 9. Monitoring and Alerting Setup

**Purpose**: Get notified when builds fail, deployments have issues, or environments are having problems, enabling quick response to issues.

**Setup Steps**:
```bash
# Configure GitHub notifications
# Settings → Notifications → Actions

# Set up Sentry alerting rules per environment
# Different alert thresholds for dev vs prod

# Monitor EAS build health
# Set up webhooks for build notifications
```

**Alert Types to Configure**:
- Build failures in CI/CD
- Deployment failures  
- High error rates in production
- Firebase quota warnings
- Certificate expiration notices

**Why this matters**: Enables proactive issue resolution, prevents prolonged outages, maintains development velocity.

### 10. Backup and Recovery Planning

**Purpose**: Ensure you can recover from various failure scenarios (corrupted environments, lost credentials, etc.) without losing development progress.

**Setup Items**:
- Export Firebase configurations regularly
- Backup EAS credentials and certificates
- Document credential recovery procedures  
- Create environment restore scripts
- Set up automated backups for development data

**Recovery Procedures**:
- How to recreate Firebase projects
- How to regenerate EAS build credentials
- How to recover from corrupted environment files
- How to restore GitHub Actions secrets

**Why this matters**: Prevents catastrophic loss of development infrastructure, reduces recovery time from failures, maintains business continuity.
