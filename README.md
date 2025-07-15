# Hooked - React Native Mobile App

A React Native mobile app built with Expo for connecting singles at events.

## Features

- Event-based matching system
- Real-time profile discovery
- Mutual like notifications
- Profile management
- Firebase integration

## Tech Stack

- **Framework**: React Native 0.79.5
- **Expo**: SDK 53
- **Navigation**: Expo Router
- **Backend**: Firebase (Auth + Firestore)
- **Language**: TypeScript
- **Styling**: React Native StyleSheet

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI
- iOS Simulator or Android Emulator

### Installation

```bash
npm install
```

### Development

```bash
# Start Expo development server
npx expo start

# Run on iOS
npx expo run:ios

# Run on Android
npx expo run:android
```

### Building

```bash
# Prebuild native code
npx expo prebuild

# Build for production
npx expo build:ios
npx expo build:android
```

## Project Structure

```
app/           # Expo Router pages
lib/           # Utilities and Firebase config
assets/        # Images and static assets
```

## Firebase Setup

1. Create a Firebase project
2. Enable Authentication and Firestore
3. Update `lib/firebaseConfig.ts` with your project credentials
4. Set up Firestore database in `me-west1` region