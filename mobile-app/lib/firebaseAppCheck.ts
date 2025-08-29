import { getToken } from 'firebase/app-check';
import * as Sentry from '@sentry/react-native';

let appCheckInitialized = false;
let appCheckInstance: any = null;

/**
 * Initialize Firebase App Check for the mobile app using Web SDK
 * This should be called early in the app lifecycle, before any callable functions are used
 */
export async function initializeAppCheck(): Promise<void> {
  if (appCheckInitialized) {
    console.log('App Check already initialized');
    return;
  }

  // App Check is disabled for this app
  console.log('App Check is disabled - skipping initialization');
  appCheckInitialized = true;
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
    if (!appCheckInitialized || !appCheckInstance) {
      console.warn('App Check not initialized, cannot get token');
      return null;
    }
    
    const appCheckTokenResponse = await getToken(appCheckInstance);
    return appCheckTokenResponse.token;
  } catch (error) {
    console.error('Failed to get App Check token:', error);
    Sentry.captureException(error);
    return null;
  }
}