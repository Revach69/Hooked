/**
 * React Native Firebase initialization
 * This must be initialized before using any React Native Firebase modules
 */

import { Platform } from 'react-native';

let isNativeFirebaseInitialized = false;

/**
 * Initialize React Native Firebase App
 * This is required before using any React Native Firebase services
 */
export async function initializeReactNativeFirebase(): Promise<void> {
  if (isNativeFirebaseInitialized) {
    console.log('🔥 React Native Firebase already initialized');
    return;
  }

  try {
    // Import React Native Firebase App
    const firebaseAppModule = await import('@react-native-firebase/app');
    const firebase = firebaseAppModule.default;
    
    if (!firebase) {
      console.warn('🔥 React Native Firebase App module not available');
      return;
    }

    // Check if default app exists
    const apps = firebase.apps;
    
    if (apps && apps.length > 0) {
      console.log('🔥 React Native Firebase default app already exists');
      isNativeFirebaseInitialized = true;
      return;
    }

    // The native module should auto-initialize from GoogleService-Info.plist (iOS) 
    // and google-services.json (Android) files
    console.log('🔥 React Native Firebase initialized for platform:', Platform.OS);
    
    // Log app details for debugging
    if (__DEV__) {
      try {
        const defaultApp = firebase.app();
        console.log('🔥 Firebase App Name:', defaultApp.name);
        console.log('🔥 Firebase App Options:', {
          projectId: defaultApp.options.projectId,
          appId: defaultApp.options.appId,
          apiKey: defaultApp.options.apiKey ? '***' : 'not set',
        });
      } catch (e) {
        console.log('🔥 React Native Firebase app details not available yet');
      }
    }

    isNativeFirebaseInitialized = true;
    console.log('✅ React Native Firebase initialization complete');

  } catch (error) {
    console.error('❌ Failed to initialize React Native Firebase:', error);
    
    // Check for common issues
    if (error instanceof Error) {
      if (error.message.includes('Native module')) {
        console.error('📦 React Native Firebase native module not properly linked');
        console.error('🔧 Run: cd ios && pod install');
      } else if (error.message.includes('GoogleService')) {
        console.error('📄 GoogleService-Info.plist (iOS) or google-services.json (Android) missing or invalid');
      }
    }

    // Don't throw - allow app to continue with web Firebase SDK
  }
}

/**
 * Check if React Native Firebase is initialized
 */
export function isReactNativeFirebaseInitialized(): boolean {
  return isNativeFirebaseInitialized;
}