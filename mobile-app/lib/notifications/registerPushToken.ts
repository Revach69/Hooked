import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { app, getFunctionsForEvent } from '../firebaseConfig';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { getInstallationId } from '../session/sessionId';
import { AsyncStorageUtils } from '../asyncStorageUtils';

export async function registerPushToken(sessionId: string): Promise<boolean> {
  try {
    if (!sessionId) {
      console.log({
        message: 'Push token registration failed: No session ID provided',
        level: 'warning',
        category: 'push_notification'
      });
      return false;
    }

    // Enhanced permission checking with platform-specific edge cases
    const perms = await Notifications.getPermissionsAsync();
    console.log('registerPushToken: Current permissions:', {
      status: perms.status,
      ios: perms.ios,
      android: perms.android
    });
    
    let granted = perms.status === 'granted';
    
    // iOS specific: Also accept 'provisional' authorization
    if (Platform.OS === 'ios' && perms.ios) {
      granted = granted || perms.ios.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    }
    
    if (!granted) {
      console.log({
        message: 'Push notification permissions not granted, requesting...',
        level: 'info',
        category: 'push_notification',
        data: { 
          currentStatus: perms.status,
          platform: Platform.OS
        }
      });
      
      // Try to request permissions
      const requestResult = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowDisplayInCarPlay: false,
          allowCriticalAlerts: false,
          provideAppNotificationSettings: false,
          allowProvisional: true, // Allow provisional notifications on iOS
          // allowAnnouncements: false, // Not available in current Expo SDK
        },
      });
      
      console.log('registerPushToken: Permission request result:', requestResult);
      
      let newGranted = requestResult.status === 'granted';
      
      // iOS: Also accept provisional
      if (Platform.OS === 'ios' && requestResult.ios) {
        newGranted = newGranted || requestResult.ios.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
      }
      
      if (!newGranted) {
        const errorMessage = Platform.OS === 'ios' 
          ? 'iOS notification permissions denied - user will not receive any push notifications'
          : 'Android notification permissions denied - user will not receive any push notifications';
          
        console.warn('registerPushToken:', errorMessage);
        
        console.log({
          message: 'Push notification permissions permanently denied',
          level: 'warning',
          category: 'push_notification',
          data: { 
            requestResult,
            platform: Platform.OS,
            canAskAgain: perms.canAskAgain
          }
        });
        return false;
      }
      
      console.log({
        message: 'Push notification permissions granted',
        level: 'info',
        category: 'push_notification',
        data: {
          status: requestResult.status,
          platform: Platform.OS,
          provisional: Platform.OS === 'ios' && requestResult.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
        }
      });
    }

    // Get the Expo push token
    console.log({
      message: 'Requesting Expo push token',
      level: 'info',
      category: 'push_notification'
    });
    
    const expoToken = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID || '7a1de260-e3cb-4cbb-863c-1557213d69f0'
    });

    if (!expoToken?.data) {
      console.log({
        message: 'Failed to obtain Expo push token',
        level: 'error',
        category: 'push_notification'
      });
      return false;
    }

    console.log({
      message: 'Expo push token obtained successfully',
      level: 'info',
      category: 'push_notification',
      data: { tokenPrefix: expoToken.data.substring(0, 50) }
    });
    
    const platform = Platform.OS;

    // Call the savePushToken callable function
    try {
      // Note: Regular users are NOT authenticated to Firebase Auth
      // Only App Check verification is required for security
      console.log('Calling savePushToken with App Check verification (no user auth required)');
      
      // Get current event country for regional function selection
      let eventCountry: string | null = null;
      try {
        const event = await AsyncStorageUtils.getItem<{ location?: string }>('currentEvent');
        eventCountry = event?.location || null;
        console.log('Push token registration: Using event country for regional function:', eventCountry);
      } catch (error) {
        console.warn('Failed to get event country, using default region for push token registration:', error);
      }
      
      // Use regional Functions instance or fallback to us-central1
      const functions = eventCountry ? getFunctionsForEvent(eventCountry) : getFunctions(app, 'us-central1');
      const savePushToken = httpsCallable(functions, 'savePushToken');
      
      // Get installation ID
      const installationId = await getInstallationId();
      
      console.log('Calling savePushToken with:', {
        tokenPrefix: expoToken.data.substring(0, 50) + '...',
        platform,
        sessionId: sessionId.substring(0, 8) + '...',
        installationId: installationId.substring(0, 8) + '...'
      });
      
      // Get current event ID for regional database selection (optional)
      const eventId = await AsyncStorageUtils.getItem<string>('currentEventId');
      
      if (!eventId) {
        console.log('Push token registration: No event ID, will use default database');
        console.log({
          message: 'Push token registration: No event ID, using default database',
          level: 'info',
          category: 'push_notification'
        });
      } else {
        console.log('Push token registration: Using event ID for regional storage:', eventId);
      }
      
      const result = await savePushToken({
        token: expoToken.data,
        platform,
        sessionId,
        installationId,
        eventId // Include event ID for regional database selection
      });
      
      console.log('savePushToken result:', result);
      
      console.log({
        message: 'Push token registered successfully',
        level: 'info',
        category: 'push_notification',
        data: { result }
      });
      
      return true;
    } catch (callableError: unknown) {
      // Log the error but don't treat it as critical since push notifications are optional
      const error = callableError as { code?: string; message?: string; details?: unknown };
      if (error.code === 'functions/unauthenticated') {
        console.log('savePushToken: Skipping due to authentication requirements (App Check disabled)');
        console.log('ℹ️  Push notifications will work via local fallback system when needed');
        
        // Don't send to Sentry for expected auth errors - this is a known configuration issue
        console.log({
          message: 'Push token registration skipped - App Check disabled, using local fallbacks',
          level: 'info',
          category: 'push_notification',
          data: {
            fallbackAvailable: true,
            reason: 'app_check_disabled'
          }
        });
        
        // Return false to indicate server registration failed (local fallbacks will still work)
        return false;
      } else {
        console.error('savePushToken error:', {
          code: error.code,
          message: error.message,
          details: error.details
        });
        
        console.error('Push token registration error:', error.message || 'Unknown error', {
          operation: 'push_token_registration',
          source: 'savePushToken_callable',
          sessionId,
          platform,
          tokenLength: expoToken.data.length,
          errorMessage: error.message,
          errorCode: error.code,
          errorDetails: error.details
        });
      }
      return false;
    }
    
  } catch (error) {
    console.error(error);
    return false;
  }
}
