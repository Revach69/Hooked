# Mapbox Integration Setup Guide

## Overview
This guide covers the setup of Mapbox integration for the Hooked mobile app, including environment configuration, CI/CD secrets, and deployment requirements.

## Required Secrets

### GitHub Repository Secrets
The following secrets need to be configured in the GitHub repository settings:

1. **MAPBOX_ACCESS_TOKEN_DEV** - Development environment Mapbox public token
2. **MAPBOX_ACCESS_TOKEN_STAGING** - Staging environment Mapbox public token  
3. **MAPBOX_ACCESS_TOKEN_PROD** - Production environment Mapbox public token

### EAS Build Secrets
Configure these secrets in your EAS project for proper builds:

```bash
# Mapbox Downloads Token (required for native SDK installation)
eas secret:create --scope project --name MAPBOX_DOWNLOADS_TOKEN --value "sk.eyJ1..."

# Development environment
eas secret:create --scope project --name MAPBOX_ACCESS_TOKEN_DEV --value "pk.eyJ1..."

# Staging environment  
eas secret:create --scope project --name MAPBOX_ACCESS_TOKEN_STAGING --value "pk.eyJ1..."

# Production environment
eas secret:create --scope project --name MAPBOX_ACCESS_TOKEN_PROD --value "pk.eyJ1..."
```

**Important**: The `MAPBOX_DOWNLOADS_TOKEN` is a secret token (starts with `sk.`) required for downloading the Mapbox SDK during native builds. This is different from the public access tokens.

## Environment Files

### Development (.env.development)
```bash
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.development_mapbox_token_placeholder
```

### Staging (.env.staging)
```bash
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.staging_mapbox_token_placeholder
```

### Production (.env.production)
```bash
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.production_mapbox_token_placeholder
```

## CI/CD Integration

### Feature Branch Workflow
The `deploy-mobile-feature-mapbox.yml` workflow automatically:
- Builds the app with Mapbox integration
- Uses the `mapbox-dev` EAS build profile
- Injects development Mapbox tokens securely
- Runs security scans for hardcoded secrets

### Environment-Specific Workflows
Each deployment workflow (dev/staging/prod) has been updated to:
- Load environment-specific Mapbox tokens from GitHub secrets
- Override placeholder tokens in .env files during build
- Maintain secure token handling throughout the pipeline

## Build Profiles

### EAS Configuration
The `mapbox-dev` build profile includes:
```json
{
  "distribution": "internal",
  "env": {
    "EXPO_PUBLIC_ENV": "development",
    "EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN": "$MAPBOX_ACCESS_TOKEN_DEV",
    "GOOGLE_SERVICES_JSON": "$GOOGLE_SERVICES_JSON_DEV",
    "GOOGLE_SERVICE_INFO_PLIST": "$GOOGLE_SERVICE_INFO_PLIST_DEV"
  }
}
```

## Security Considerations

### Token Management
- **Never commit actual Mapbox tokens to version control**
- Use placeholders in .env files (e.g., `pk.development_mapbox_token_placeholder`)
- Real tokens are injected during CI/CD builds from secure secrets
- Different tokens for each environment (dev/staging/prod)

### Security Scanning
The CI/CD pipeline includes automated security scanning for:
- Hardcoded Mapbox tokens (`pk.` patterns)
- Secret key patterns (`sk_` patterns)
- Mapbox-related environment variables

## Local Development

### Setup Process
1. Copy `.env.example` to `.env`
2. Replace `your_mapbox_public_token_here` with your actual development token
3. Run `npm run start:dev` to use development configuration

### Testing Builds Locally
```bash
# Development build with Mapbox
npm run build:dev

# Dedicated Mapbox development build
npm run build:mapbox-dev

# Staging build with Mapbox
npm run build:staging

# Production build with Mapbox
npm run build:prod
```

## Troubleshooting

### Common Issues
1. **Build fails with Mapbox errors**: Ensure tokens are correctly set in EAS secrets
2. **Maps not loading**: Verify token has correct permissions in Mapbox dashboard
3. **CI/CD failures**: Check that GitHub repository secrets are configured

### Debug Commands
```bash
# Check EAS secrets
eas secret:list

# Verify environment loading
cat .env | grep MAPBOX

# Test local build
expo prebuild && expo run:ios
```

## Dependencies
- `@rnmapbox/maps`: React Native Mapbox SDK
- Environment variables: Secure token management
- EAS Build: Cloud build service with secret injection