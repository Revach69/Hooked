import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { auth } from './firebaseConfig';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationPermission {
  granted: boolean;
  canAskAgain: boolean;
}

export interface PushTokenData {
  token: string;
  platform: 'ios' | 'android';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Check current notification permission status
 */
export async function checkNotificationPermission(): Promise<NotificationPermission> {
  const { status, canAskAgain } = await Notifications.getPermissionsAsync();
  return {
    granted: status === 'granted',
    canAskAgain,
  };
}

/**
 * Request notification permissions with platform-specific handling
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  try {
    // For iOS, this will show the native permission popup
    // For Android 13+ (API level 33+), this will also show the native permission popup
    const { status, canAskAgain } = await Notifications.requestPermissionsAsync();
    
    return {
      granted: status === 'granted',
      canAskAgain,
    };
  } catch {
            // Error requesting notification permission
    return {
      granted: false,
      canAskAgain: false,
    };
  }
}

/**
 * Get Expo push token for the current device
 */
export async function getPushToken(): Promise<string | null> {
  try {
    // Use the correct project ID from app.json
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: '7a1de260-e3cb-4cbb-863c-1557213d69f0'
    });
    return token.data;
  } catch {
            // Error getting push token
    return null;
  }
}

/**
 * Save push token to Firestore under current user's profile
 */
export async function savePushTokenToFirestore(token: string): Promise<boolean> {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error('No authenticated user found');
      return false;
    }

    const tokenData: PushTokenData = {
      token,
      platform: Platform.OS as 'ios' | 'android',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(doc(db, 'users', user.uid, 'pushTokens', token), tokenData);
    return true;
  } catch {
            // Error saving push token to Firestore
    return false;
  }
}

/**
 * Remove push token from Firestore
 */
export async function removePushTokenFromFirestore(token: string): Promise<boolean> {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error('No authenticated user found');
      return false;
    }

    const tokenRef = doc(db, 'users', user.uid, 'pushTokens', token);
    await setDoc(tokenRef, { deleted: true, deletedAt: new Date() });
    return true;
  } catch {
            // Error removing push token from Firestore
    return false;
  }
}

/**
 * Initialize notifications - check permission and save token if granted
 */
export async function initializeNotifications(): Promise<{
  permissionGranted: boolean;
  tokenSaved: boolean;
}> {
  try {
    // Check current permission status
    const permission = await checkNotificationPermission();
    
    if (!permission.granted) {
      // Notification permission not granted
      return { permissionGranted: false, tokenSaved: false };
    }

    // Get push token
    const token = await getPushToken();
    if (!token) {
              // Failed to get push token
      return { permissionGranted: true, tokenSaved: false };
    }

    // Only save to Firestore if user is authenticated
    const user = auth.currentUser;
    let tokenSaved = false;
    
    if (user) {
      tokenSaved = await savePushTokenToFirestore(token);
    } else {
      tokenSaved = false;
    }
    
    return {
      permissionGranted: true,
      tokenSaved,
    };
  } catch {
            // Error initializing notifications
    return { permissionGranted: false, tokenSaved: false };
  }
}

/**
 * Request permission and initialize notifications if granted
 * This function is now simplified to avoid double permission requests
 */
export async function requestAndInitializeNotifications(): Promise<{
  permissionGranted: boolean;
  tokenSaved: boolean;
}> {
  try {
    // Request permission directly - this will show the native popup
    const permission = await requestNotificationPermission();
    
    if (!permission.granted) {
      // User denied notification permission
      return { permissionGranted: false, tokenSaved: false };
    }

    // Initialize notifications with the granted permission
    return await initializeNotifications();
  } catch {
            // Error requesting and initializing notifications
    return { permissionGranted: false, tokenSaved: false };
  }
}

/**
 * Get all push tokens for a user
 * NOTE: This is disabled for the session-based app since it requires Firebase Auth
 */
export async function getUserPushTokens(): Promise<PushTokenData[]> {
  // Push tokens are not supported in the session-based version
  // since they require Firebase Auth and the app doesn't use authentication
        // Push tokens not supported in session-based app
  return [];
} 