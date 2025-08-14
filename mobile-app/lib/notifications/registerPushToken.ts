import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { app } from '../firebaseConfig';
import * as Sentry from '@sentry/react-native';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getInstallationId } from '../session/sessionId';

export async function registerPushToken(sessionId: string): Promise<boolean> {
  try {
    if (!sessionId) {
      Sentry.addBreadcrumb({
        message: 'Push token registration failed: No session ID provided',
        level: 'warning',
        category: 'push_notification'
      });
      return false;
    }

    // Check permissions first
    const perms = await Notifications.getPermissionsAsync();
    const granted = perms.status === 'granted';
    
    if (!granted) {
      Sentry.addBreadcrumb({
        message: 'Push notification permissions not granted, requesting...',
        level: 'info',
        category: 'push_notification'
      });
      
      // Try to request permissions
      const requestResult = await Notifications.requestPermissionsAsync();
      const newGranted = requestResult.status === 'granted';
      
      if (!newGranted) {
        Sentry.addBreadcrumb({
          message: 'Push notification permissions denied by user',
          level: 'warning',
          category: 'push_notification',
          data: { requestResult }
        });
        return false;
      }
      
      Sentry.addBreadcrumb({
        message: 'Push notification permissions granted',
        level: 'info',
        category: 'push_notification'
      });
    }

    // Get the Expo push token
    Sentry.addBreadcrumb({
      message: 'Requesting Expo push token',
      level: 'info',
      category: 'push_notification'
    });
    
    const expoToken = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID || '7a1de260-e3cb-4cbb-863c-1557213d69f0'
    });

    if (!expoToken?.data) {
      Sentry.addBreadcrumb({
        message: 'Failed to obtain Expo push token',
        level: 'error',
        category: 'push_notification'
      });
      return false;
    }

    Sentry.addBreadcrumb({
      message: 'Expo push token obtained successfully',
      level: 'info',
      category: 'push_notification',
      data: { tokenPrefix: expoToken.data.substring(0, 50) }
    });
    
    const platform = Platform.OS;

    // Call the savePushToken callable function
    try {
      Sentry.addBreadcrumb({
        message: 'Calling savePushToken Firebase function',
        level: 'info',
        category: 'push_notification'
      });
      
      const functions = getFunctions(app, 'us-central1');
      const savePushToken = httpsCallable(functions, 'savePushToken');
      
      // Get installation ID
      const installationId = await getInstallationId();
      
      await savePushToken({
        token: expoToken.data,
        platform,
        sessionId,
        installationId
      });
      
      Sentry.addBreadcrumb({
        message: 'Push token registered successfully',
        level: 'info',
        category: 'push_notification'
      });
      
      return true;
    } catch (callableError: any) {
      Sentry.captureException(callableError, {
        tags: {
          operation: 'push_token_registration',
          source: 'savePushToken_callable'
        },
        extra: {
          sessionId,
          platform,
          tokenLength: expoToken.data.length,
          errorMessage: callableError.message
        }
      });
      return false;
    }
    
  } catch (error) {
    Sentry.captureException(error);
    return false;
  }
}
