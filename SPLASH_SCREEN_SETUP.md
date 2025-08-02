# Splash Screen Setup

## Overview

The app now has a custom splash screen that matches your design requirements:

- **Light Mode**: Light background with dark text
- **Dark Mode**: Dark gray background with white text
- **App Name**: "Hooked" (changed from "The Hooked App")
- **Gradient Icon**: Pink to purple gradient with white heart symbol
- **Progress Bar**: Shows loading progress with smooth animations

## Features

### ✅ Dark Mode Compatible
- Automatically detects system dark/light mode
- Different background colors and text colors for each mode
- Consistent branding across both themes

### ✅ Production Ready
- Works in both development and production builds
- Proper loading states with progress tracking
- Smooth transitions to the main app

### ✅ Design Matches Your Image
- Gradient icon with heart symbol
- Clean, modern typography
- Professional loading indicator

## How It Works

1. **App Launch**: Shows custom splash screen immediately
2. **Loading Progress**: Simulates loading steps (20% → 40% → 60% → 80% → 95% → 100%)
3. **Auto Transition**: Automatically transitions to the main app when ready
4. **Dark Mode**: Automatically adapts to system theme

## Testing

### Development Testing
```bash
# Start the app
npx expo start

# Test dark mode
# - On iOS: Settings → Display & Brightness → Dark
# - On Android: Settings → Display → Dark theme
```

### Production Testing
```bash
# Build for production
npx expo build:ios
npx expo build:android
```

## Customization

### Colors
You can customize the colors in `lib/components/SplashScreen.tsx`:

```typescript
// Light mode colors
backgroundColor: '#ffffff'
textColor: '#000000'

// Dark mode colors  
backgroundColor: '#1a1a1a'
textColor: '#ffffff'

// Gradient colors
colors={['#FF6B9D', '#8B5CF6']} // Pink to purple
```

### Loading Time
Adjust the loading duration in `app/_layout.tsx`:

```typescript
const steps = [
  { progress: 20, delay: 300 }, // 300ms delay
  { progress: 40, delay: 300 }, // 300ms delay
  // ... adjust delays as needed
];
```

### App Name
Change the app name in `lib/components/SplashScreen.tsx`:

```typescript
<Text style={styles.appName}>
  Hooked // Change this text
</Text>
```

## Files Modified

1. **`app/_layout.tsx`**: Main layout with splash screen logic
2. **`lib/components/SplashScreen.tsx`**: Custom splash screen component
3. **`app.json`**: App configuration with splash screen settings

## Notes

- The splash screen works independently of Expo's built-in splash screen
- It will show during both development and production
- Dark mode detection is automatic based on system settings
- The loading progress is simulated but can be connected to real loading tasks

## Troubleshooting

### Splash Screen Not Showing
- Make sure `app/_layout.tsx` is properly configured
- Check that the CustomSplashScreen component is imported correctly

### Dark Mode Not Working
- Verify `useColorScheme` is working on your device
- Test on both iOS and Android devices

### Loading Too Fast/Slow
- Adjust the delay values in the `steps` array in `app/_layout.tsx`
- Add real loading tasks (API calls, asset loading) to the prepare function 