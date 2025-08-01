#!/bin/bash

# Get current version code from build.gradle
CURRENT_VERSION=$(grep "versionCode" app/build.gradle | sed 's/.*versionCode //')

# Increment version code
NEW_VERSION=$((CURRENT_VERSION + 1))

# Update build.gradle
sed -i '' "s/versionCode $CURRENT_VERSION/versionCode $NEW_VERSION/" app/build.gradle

echo "Updated version code from $CURRENT_VERSION to $NEW_VERSION" 