import { initializeAppCheck as firebaseInitializeAppCheck, getToken, ReCaptchaEnterpriseProvider, CustomProvider } from 'firebase/app-check';
import { app } from './firebaseConfig';
import { Platform } from 'react-native';
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

  try {
    console.log('Initializing Firebase App Check (Web SDK)...');
    
    const isProduction = process.env.EXPO_PUBLIC_ENV === 'production';
    const debugToken = process.env.APP_CHECK_DEBUG_TOKEN;
    const recaptchaSiteKey = process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY;
    
    console.log('App Check environment:', {
      isDev: __DEV__,
      isProduction,
      hasDebugToken: !!debugToken,
      hasRecaptchaSiteKey: !!recaptchaSiteKey,
      platform: Platform.OS
    });
    
    if (__DEV__ && !isProduction) {
      // Skip App Check in development for now - will re-enable after testing
      console.log('Skipping App Check initialization in development mode');
      appCheckInitialized = true;
      return;
    } else {
      // For production builds, use reCAPTCHA Enterprise
      console.log('Using App Check reCAPTCHA Enterprise provider for production');
      
      if (!recaptchaSiteKey) {
        throw new Error('reCAPTCHA site key not found in environment variables');
      }
      
      const recaptchaProvider = new ReCaptchaEnterpriseProvider(recaptchaSiteKey);
      
      appCheckInstance = firebaseInitializeAppCheck(app, {
        provider: recaptchaProvider,
        isTokenAutoRefreshEnabled: true,
      });
    }
    
    appCheckInitialized = true;
    
    // Try to get a token immediately to verify it's working
    try {
      const appCheckTokenResponse = await getToken(appCheckInstance);
      console.log('App Check token obtained successfully:', appCheckTokenResponse.token.substring(0, 20) + '...');
    } catch (tokenError) {
      console.error('Failed to get App Check token after initialization:', tokenError);
    }
    
    Sentry.addBreadcrumb({
      message: 'Firebase App Check (Web SDK) initialized successfully',
      level: 'info',
      category: 'app_check',
      data: { 
        platform: Platform.OS,
        isDev: __DEV__ 
      }
    });
    
    console.log('Firebase App Check (Web SDK) initialized successfully');
    
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