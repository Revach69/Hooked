import appCheck from '@react-native-firebase/app-check';
import { Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

let appCheckInitialized = false;

/**
 * Initialize Firebase App Check for the mobile app
 * This should be called early in the app lifecycle, before any callable functions are used
 */
export async function initializeAppCheck(): Promise<void> {
  if (appCheckInitialized) {
    console.log('App Check already initialized');
    return;
  }

  try {
    console.log('Initializing Firebase App Check...');
    
    if (__DEV__) {
      // Temporarily disable App Check for development
      console.log('App Check disabled for development - skipping initialization');
      appCheckInitialized = true;
      return;
    } else {
      // For production builds, use platform-specific providers
      console.log('Using App Check production providers');
      
      const rnfbProvider = appCheck().newReactNativeFirebaseAppCheckProvider();
      rnfbProvider.configure({
        android: {
          provider: 'playIntegrity', // Play Integrity API for Android
        },
        apple: {
          provider: 'appAttestWithDeviceCheckFallback', // App Attest with DeviceCheck fallback for iOS
        },
      });
      
      await appCheck().initializeAppCheck({
        provider: rnfbProvider,
        isTokenAutoRefreshEnabled: true,
      });
    }
    
    appCheckInitialized = true;
    
    Sentry.addBreadcrumb({
      message: 'Firebase App Check initialized successfully',
      level: 'info',
      category: 'app_check',
      data: { 
        platform: Platform.OS,
        isDev: __DEV__ 
      }
    });
    
    console.log('Firebase App Check initialized successfully');
    
  } catch (error) {
    console.error('Failed to initialize Firebase App Check:', error);
    
    Sentry.captureException(error, {
      tags: {
        operation: 'app_check_initialization',
        source: 'firebaseAppCheck'
      },
      extra: {
        platform: Platform.OS,
        isDev: __DEV__
      }
    });
    
    // Don't throw the error - continue without App Check in case of initialization failure
    // The server-side functions will reject requests without App Check tokens
  }
}

/**
 * Get App Check initialization status
 */
export function isAppCheckInitialized(): boolean {
  return appCheckInitialized;
}

/**
 * Get an App Check token (for debugging purposes)
 */
export async function getAppCheckToken(): Promise<string | null> {
  try {
    if (!appCheckInitialized) {
      console.warn('App Check not initialized, cannot get token');
      return null;
    }
    
    const { token } = await appCheck().getToken();
    return token;
  } catch (error) {
    console.error('Failed to get App Check token:', error);
    Sentry.captureException(error);
    return null;
  }
}