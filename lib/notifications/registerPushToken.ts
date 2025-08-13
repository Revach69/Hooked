import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { app } from '../firebaseConfig';
import * as Sentry from '@sentry/react-native';

export async function registerPushToken(sessionId: string): Promise<boolean> {
  try {
    if (!sessionId) {
      return false;
    }

    // Check permissions first
    const perms = await Notifications.getPermissionsAsync();
    const granted = perms.granted || perms.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED;
    
    if (!granted) {
      return false;
    }

    // Get the Expo push token
    const expoToken = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID
    });

    if (!expoToken?.data) {
      return false;
    }

    const platform = Platform.OS;

    // Call the savePushToken callable function
    try {
      const firebaseFunctions = await import('firebase/functions');
      const functions = (firebaseFunctions as any).getFunctions(app, 'us-central1');
      const savePushToken = (firebaseFunctions as any).httpsCallable(functions, 'savePushToken');
      
      await savePushToken({
        token: expoToken.data,
        platform,
        sessionId
      });
      
      return true;
    } catch (callableError) {
      Sentry.captureException(callableError);
      return false;
    }
    
  } catch (error) {
    Sentry.captureException(error);
    return false;
  }
}
