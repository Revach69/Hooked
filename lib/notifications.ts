import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { auth } from './firebaseConfig';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
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
 * Request notification permissions
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  const { status, canAskAgain } = await Notifications.requestPermissionsAsync();
  return {
    granted: status === 'granted',
    canAskAgain,
  };
}

/**
 * Get Expo push token for the current device
 */
export async function getPushToken(): Promise<string | null> {
  try {
    // Specify the project ID explicitly
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: '7a1de260' // Your expo project ID
    });
    return token.data;
  } catch (error) {
    console.error('Error getting push token:', error);
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
  } catch (error) {
    console.error('Error saving push token to Firestore:', error);
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
  } catch (error) {
    console.error('Error removing push token from Firestore:', error);
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
      console.log('Notification permission not granted');
      return { permissionGranted: false, tokenSaved: false };
    }

    // Get push token
    const token = await getPushToken();
    if (!token) {
      console.error('Failed to get push token');
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
  } catch (error) {
    console.error('Error initializing notifications:', error);
    return { permissionGranted: false, tokenSaved: false };
  }
}

/**
 * Request permission and initialize notifications if granted
 */
export async function requestAndInitializeNotifications(): Promise<{
  permissionGranted: boolean;
  tokenSaved: boolean;
}> {
  try {
    // Request permission
    const permission = await requestNotificationPermission();
    
    if (!permission.granted) {
      console.log('User denied notification permission');
      return { permissionGranted: false, tokenSaved: false };
    }

    // Initialize notifications with the granted permission
    return await initializeNotifications();
  } catch (error) {
    console.error('Error requesting and initializing notifications:', error);
    return { permissionGranted: false, tokenSaved: false };
  }
}

/**
 * Get all push tokens for a user
 */
export async function getUserPushTokens(userId: string): Promise<PushTokenData[]> {
  try {
    const tokensRef = doc(db, 'users', userId, 'pushTokens');
    const tokensDoc = await getDoc(tokensRef);
    
    if (!tokensDoc.exists()) {
      return [];
    }

    const tokens: PushTokenData[] = [];
    tokensDoc.data().forEach((tokenData: any) => {
      if (!tokenData.deleted) {
        tokens.push(tokenData);
      }
    });

    return tokens;
  } catch (error) {
    console.error('Error getting user push tokens:', error);
    return [];
  }
} 