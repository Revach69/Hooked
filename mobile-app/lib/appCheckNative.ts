/**
 * Native App Check implementation using React Native Firebase
 * This replaces the web-based App Check that was causing 60-second delays
 */

import { Platform } from 'react-native';

let appCheckInstance: any = null;
let isInitialized = false;

/**
 * Initialize App Check using native providers (App Attest for iOS, Play Integrity for Android)
 * This properly uses the native attestation providers configured in Firebase Console
 */
export async function initializeNativeAppCheck(): Promise<void> {
  // Skip if already initialized
  if (isInitialized) {
    console.log('🔒 Native App Check already initialized, skipping');
    return;
  }

  try {
    // Skip in development for faster startup
    if (__DEV__) {
      console.log('🔒 Native App Check: Skipped in development for faster startup');
      isInitialized = true;
      return;
    }

    // Dynamically import React Native Firebase App Check
    // This prevents issues if the native module isn't properly linked
    const appCheckModule = await import('@react-native-firebase/app-check');
    const appCheck = appCheckModule.default;

    if (!appCheck) {
      console.warn('🔒 React Native Firebase App Check module not available');
      return;
    }

    console.log('🔒 Initializing Native App Check for platform:', Platform.OS);

    // Initialize with native providers
    // App Attest for iOS, Play Integrity for Android
    // React Native Firebase auto-selects the right provider
    const initOptions: any = {
      isTokenAutoRefreshEnabled: true,
    };

    // Only set provider if explicitly needed
    // Otherwise let React Native Firebase auto-select
    await appCheck().initializeAppCheck(initOptions);

    appCheckInstance = appCheck();
    isInitialized = true;

    console.log('✅ Native App Check initialized successfully');
    console.log('🔒 App Check Provider:', Platform.OS === 'ios' ? 'App Attest' : 'Play Integrity');

    // Optional: Get and log the initial token for debugging
    if (__DEV__) {
      try {
        const token = await appCheckInstance.getToken(true);
        console.log('🔒 App Check token obtained, expires:', new Date(token.expireTime));
      } catch (tokenError) {
        console.warn('🔒 Could not get initial App Check token:', tokenError);
      }
    }

  } catch (error) {
    console.error('❌ Failed to initialize Native App Check:', error);
    
    // Check for common issues
    if (error instanceof Error) {
      if (error.message.includes('No Firebase App')) {
        console.error('🔥 React Native Firebase App not initialized. Ensure @react-native-firebase/app is properly configured');
      } else if (error.message.includes('not installed')) {
        console.error('📦 React Native Firebase App Check module not properly installed or linked');
      } else if (error.message.includes('Play Integrity')) {
        console.error('🤖 Play Integrity API not configured properly in Firebase Console');
      } else if (error.message.includes('App Attest')) {
        console.error('🍎 App Attest not configured properly in Firebase Console');
      }
    }

    // Don't throw - allow app to continue without App Check
    // Functions might fail but app will still work
    isInitialized = true; // Mark as initialized to prevent retry loops
  }
}

/**
 * Get the current App Check token
 * Useful for debugging or manual token verification
 */
export async function getAppCheckToken(): Promise<string | null> {
  if (!appCheckInstance) {
    console.warn('🔒 App Check not initialized');
    return null;
  }

  try {
    const tokenResult = await appCheckInstance.getToken(false);
    return tokenResult.token;
  } catch (error) {
    console.error('❌ Failed to get App Check token:', error);
    return null;
  }
}

/**
 * Check if App Check is properly initialized
 */
export function isAppCheckInitialized(): boolean {
  return isInitialized;
}

/**
 * Force refresh the App Check token
 * Useful if token is rejected by backend
 */
export async function refreshAppCheckToken(): Promise<void> {
  if (!appCheckInstance) {
    console.warn('🔒 App Check not initialized');
    return;
  }

  try {
    const tokenResult = await appCheckInstance.getToken(true); // Force refresh
    console.log('🔒 App Check token refreshed, expires:', new Date(tokenResult.expireTime));
  } catch (error) {
    console.error('❌ Failed to refresh App Check token:', error);
  }
}