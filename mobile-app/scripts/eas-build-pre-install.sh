#!/bin/bash

set -euo pipefail

echo "🔧 Setting up Google Services files for EAS build..."

# Debug: Show current directory and environment
echo "Current directory: $(pwd)"
echo "Environment variables available:"
env | grep -E "(GOOGLE_SERVICES|GOOGLE_SERVICE|SENTRY)" || echo "No Google Services or Sentry environment variables found"

# Remove any existing Google Services files to prevent conflicts
echo "🧹 Cleaning up existing Google Services files..."
rm -f android/app/google-services.json
rm -f ios/Hooked/GoogleService-Info.plist
rm -f ios/GoogleService-Info.plist
rm -f google-services.json
rm -f GoogleService-Info.plist

# Ensure directories exist
echo "📁 Ensuring directories exist..."
mkdir -p android/app
mkdir -p ios/Hooked

# Create the google-services.json for Android from EAS secrets
if [ ! -z "${GOOGLE_SERVICES_JSON:-}" ]; then
  echo "📱 Creating google-services.json for Android from EAS secret..."
  echo "📱 Secret length: ${#GOOGLE_SERVICES_JSON} characters"
  echo $GOOGLE_SERVICES_JSON | base64 --decode > android/app/google-services.json
  echo "✅ Android google-services.json created at: $(pwd)/android/app/google-services.json"
  echo "📊 File size: $(wc -c < android/app/google-services.json) bytes"
else
  echo "❌ GOOGLE_SERVICES_JSON environment variable not found - Android build will fail"
  exit 1
fi

# Create the GoogleService-Info.plist for iOS from EAS secrets
if [ ! -z "${GOOGLE_SERVICE_INFO_PLIST:-}" ]; then
  echo "🍎 Creating GoogleService-Info.plist for iOS from EAS secret..."
  echo "🍎 Secret length: ${#GOOGLE_SERVICE_INFO_PLIST} characters"
  echo $GOOGLE_SERVICE_INFO_PLIST | base64 --decode > ios/Hooked/GoogleService-Info.plist
  echo "✅ iOS GoogleService-Info.plist created at: $(pwd)/ios/Hooked/GoogleService-Info.plist"
  echo "📊 File size: $(wc -c < ios/Hooked/GoogleService-Info.plist) bytes"
else
  echo "❌ GOOGLE_SERVICE_INFO_PLIST environment variable not found - iOS build will fail"
  exit 1
fi

# Verify files were created
echo "🔍 Verifying created files..."
if [ -f "android/app/google-services.json" ]; then
  echo "✅ Android file exists"
else
  echo "❌ Android file missing!"
  exit 1
fi

if [ -f "ios/Hooked/GoogleService-Info.plist" ]; then
  echo "✅ iOS file exists"
else
  echo "❌ iOS file missing!"
  exit 1
fi

# Set up Sentry DSN if available
if [ ! -z "${EXPO_PUBLIC_SENTRY_DSN:-}" ]; then
  echo "🐛 Sentry DSN is configured: ${EXPO_PUBLIC_SENTRY_DSN:0:20}..."
else
  echo "⚠️  EXPO_PUBLIC_SENTRY_DSN not found - Sentry error reporting will be disabled"
fi

echo "🎉 Google Services files setup complete!"