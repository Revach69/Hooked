import { FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider, CustomProvider } from 'firebase/app-check';
// Sentry removed

/**
 * Initialize Firebase App Check for enhanced security
 * App Check helps protect your backend resources from abuse by verifying requests
 */
export async function initializeFirebaseAppCheck(app: FirebaseApp): Promise<void> {
  try {
    // Skip in development for faster startup
    if (__DEV__) {
      console.log('🔒 App Check: Skipped in development for faster startup');
      return;
    }

    console.log('🔒 Initializing Firebase App Check for app:', app.name);

    // Check if App Check is already initialized for this specific app
    const appSpecificKey = `__FIREBASE_APP_CHECK_INITIALIZED_${app.name}__`;
    if ((globalThis as any)[appSpecificKey]) {
      console.log('🔒 App Check already initialized for app:', app.name, 'skipping');
      return;
    }

    // Production mode: Use platform-specific providers
    console.log('🔒 App Check: Production mode - using platform providers');
    
    const appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY!),
      isTokenAutoRefreshEnabled: true,
    });

    console.log('🔒 App Check initialized for production');

    // Mark as initialized for this specific app
    (globalThis as any)[appSpecificKey] = true;

    console.log('App Check:', {
      message: 'Firebase App Check initialized successfully',
      level: 'info',
      category: 'app_check',
      data: { 
        mode: __DEV__ ? 'development' : 'production',
        autoRefresh: true 
      }
    });

    console.log('✅ Firebase App Check initialization complete');

  } catch (error) {
    console.error('❌ Failed to initialize Firebase App Check:', error);
    
    console.error('App Check error:', error, {
      tags: {
        operation: 'app_check_initialization',
        source: 'app_check_config'
      }
    });

    // Don't throw - allow app to continue without App Check
    // Push notifications will fall back to local notifications
  }
}

/**
 * Get debug token for development
 * Run this in development to get the debug token for Firebase Console
 */
export function getAppCheckDebugToken(): void {
  if (__DEV__) {
    console.log('🔒 App Check Debug Token Instructions:');
    console.log('1. Go to Firebase Console → App Check → Apps');
    console.log('2. Find your app and click "Manage debug tokens"');
    console.log('3. Add this debug token: C92AB856-132F-4FE1-82AE-6F9BBEFEF430');
    console.log('4. This allows your dev build to pass App Check verification');
  }
}