#!/bin/bash

echo "🧹 Cleaning up Java/Gradle issues in React Native project..."

# Remove VS Code Java-related cache
echo "📁 Cleaning VS Code cache..."
rm -rf .vscode/.react
rm -rf .vscode/settings.json.bak

# Clear node_modules cache
echo "📦 Clearing node_modules cache..."
rm -rf node_modules/.cache
rm -rf node_modules/.vscode

# Clear Metro cache
echo "🚇 Clearing Metro cache..."
npx expo start --clear

# Clear TypeScript cache
echo "📝 Clearing TypeScript cache..."
rm -rf *.tsbuildinfo
rm -rf .tscache

# Clear Expo cache
echo "📱 Clearing Expo cache..."
rm -rf .expo
rm -rf .expo-shared

# Clear React Native cache
echo "⚛️ Clearing React Native cache..."
rm -rf $TMPDIR/react-*
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/haste-*

# Clear Watchman cache (if installed)
if command -v watchman &> /dev/null; then
    echo "👀 Clearing Watchman cache..."
    watchman watch-del-all
fi

# Clear npm cache
echo "📦 Clearing npm cache..."
npm cache clean --force

echo "✅ Cleanup complete! Please restart VS Code to apply all changes."
echo "💡 If you still see Java errors, try:"
echo "   1. Reload VS Code window (Cmd+Shift+P -> 'Developer: Reload Window')"
echo "   2. Restart TypeScript language server (Cmd+Shift+P -> 'TypeScript: Restart TS Server')"
echo "   3. Open the workspace file: .vscode/workspace.code-workspace" 