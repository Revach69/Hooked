import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from './firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Initialize notification channels for Android
 */
export async function initializeNotificationChannels(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      // Create notification channel for messages
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        description: 'Notifications for new messages and matches',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });

      // Create notification channel for matches
      await Notifications.setNotificationChannelAsync('matches', {
        name: 'Matches',
        description: 'Notifications for new matches',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });

      // Create notification channel for likes
      await Notifications.setNotificationChannelAsync('likes', {
        name: 'Likes',
        description: 'Notifications for new likes',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
    } catch (error) {
      // Error creating notification channels
    }
  }
}

export interface NotificationData {
  title: string;
  body: string;
  data?: Record<string, any>;
}

/**
 * Store push token for a session
 */
export async function storePushToken(sessionId: string, token: string): Promise<void> {
  try {
    const tokenData = {
      token,
      platform: Platform.OS,
      sessionId,
      createdAt: new Date().toISOString(),
    };

    // Store in Firestore
    await setDoc(doc(db, 'push_tokens', `${sessionId}_${Platform.OS}`), tokenData);
    
    // Also store locally for backup
    await AsyncStorage.setItem(`pushToken_${sessionId}`, token);
  } catch (error) {
    // Error storing push token
  }
}

/**
 * Get push token for a session
 */
export async function getPushToken(sessionId: string): Promise<string | null> {
  try {
    // Try to get from local storage first
    const localToken = await AsyncStorage.getItem(`pushToken_${sessionId}`);
    if (localToken) {
      return localToken;
    }

    // Fallback to Firestore
    const tokenDoc = await getDoc(doc(db, 'push_tokens', `${sessionId}_${Platform.OS}`));
    if (tokenDoc.exists()) {
      const tokenData = tokenDoc.data();
      return tokenData.token;
    }

    return null;
  } catch (error) {
    // Error getting push token
    return null;
  }
}

/**
 * Send push notification to a specific session (client-side implementation)
 */
export async function sendPushNotificationToSession(
  sessionId: string,
  notification: NotificationData
): Promise<boolean> {
  try {
    // Get push token for the session
    const token = await getPushToken(sessionId);
    
    if (!token) {
      // No push token found for session
      return false;
    }

    // Send notification to the device
    const success = await sendPushNotification(token, notification);
    return success;
  } catch (error) {
    // Error sending push notification to session
    return false;
  }
}

/**
 * Send push notification to a specific device using Expo's push service
 */
async function sendPushNotification(
  token: string,
  notification: NotificationData
): Promise<boolean> {
  try {
    const message = {
      to: token,
      sound: 'default',
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      priority: 'high',
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Failed to send push notification
      return false;
    }

    const result = await response.json();
    
    // Check if the notification was sent successfully
    if (result.data && result.data.status === 'error') {
      // Push notification error
      return false;
    }

    // Push notification sent successfully
    return true;
  } catch (error) {
    // Error sending push notification
    return false;
  }
}

/**
 * Get all push tokens for a user from Firestore
 * NOTE: This is disabled for the session-based app since it requires Firebase Auth
 */
async function getUserPushTokens(userId: string): Promise<Array<{ token: string; platform: string }>> {
  // Push tokens are not supported in the session-based version
  // since they require Firebase Auth and the app doesn't use authentication
  // Push tokens not supported in session-based app
  return [];
}

/**
 * Send match notification
 */
export async function sendMatchNotification(
  sessionId: string,
  matchedUserName: string
): Promise<boolean> {
  const notification: NotificationData = {
    title: "You got Hooked!",
    body: `You matched with ${matchedUserName}`,
    data: {
      type: 'match',
      matchedUserName,
    },
  };

  // For Android, use local notification
  if (Platform.OS === 'android') {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data,
          sound: 'default',
        },
        trigger: null, // Send immediately
      });
      return true;
    } catch (error) {
      // Fallback to push notification
    }
  }

  return await sendPushNotificationToSession(sessionId, notification);
}

/**
 * Send like notification (when someone likes you back)
 * Only sends push notification if user is not in app
 */
export async function sendLikeNotification(
  sessionId: string,
  likerName: string
): Promise<boolean> {
  try {
    // Check if user is currently in the app
    const currentSessionId = await AsyncStorage.getItem('currentSessionId');
    const isUserInApp = currentSessionId === sessionId;
    
    // If user is in app, don't send push notification (toast will be shown instead)
    if (isUserInApp) {
      return false;
    }
    
    // Additional check: look for recent activity timestamp
    const lastActivityKey = `lastActivity_${sessionId}`;
    const lastActivity = await AsyncStorage.getItem(lastActivityKey);
    
    if (lastActivity) {
      const lastActivityTime = new Date(lastActivity).getTime();
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
      
      // If user was active less than 5 minutes ago, don't send notification
      if ((now - lastActivityTime) < fiveMinutes) {
        return false;
      }
    }
    
    const notification: NotificationData = {
      title: "Someone liked you! ❤️",
      body: "", // Empty body to not reveal the name
      data: {
        type: 'like',
        likerName,
      },
    };

    return await sendPushNotificationToSession(sessionId, notification);
  } catch (error) {
    // Error sending like notification
    return false;
  }
}

/**
 * Send message notification
 */
export async function sendMessageNotification(
  sessionId: string,
  senderName: string,
  messagePreview: string,
  isDeviceLocked: boolean = false
): Promise<boolean> {
  try {
    // Check if user has push notification permissions
    const { status } = await Notifications.getPermissionsAsync();
    
    if (status !== 'granted') {
      return false;
    }
    
    const notification: NotificationData = {
      title: isDeviceLocked ? "New Message" : `New message from ${senderName}`,
      body: isDeviceLocked ? "You got a new message" : messagePreview,
      data: {
        type: 'message',
        senderName,
        messagePreview,
      },
    };

    // For Android, use local notification
    if (Platform.OS === 'android') {
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: notification.title,
            body: notification.body,
            data: notification.data,
            sound: 'default',
          },
          trigger: null, // Send immediately
        });
        return true;
      } catch (error) {
        // Fallback to push notification
      }
    }

    return await sendPushNotificationToSession(sessionId, notification);
  } catch (error) {
    // Error sending message notification
    return false;
  }
}

/**
 * Send generic notification
 */
export async function sendGenericNotification(
  sessionId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<boolean> {
  const notification: NotificationData = {
    title,
    body,
    data,
  };

  return await sendPushNotificationToSession(sessionId, notification);
}

/**
 * Schedule a local notification
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  trigger: Notifications.NotificationTriggerInput,
  data?: Record<string, any>
): Promise<string | null> {
  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
      },
      trigger,
    });
    
    // Local notification scheduled
    return identifier;
  } catch (error) {
    // Error scheduling local notification
    return null;
  }
}

/**
 * Cancel a scheduled notification
 */
export async function cancelScheduledNotification(identifier: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
    // Cancelled scheduled notification
  } catch (error) {
    // Error cancelling scheduled notification
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllScheduledNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    // Cancelled all scheduled notifications
  } catch (error) {
    // Error cancelling all scheduled notifications
  }
}

/**
 * Get all scheduled notifications
 */
export async function getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    return notifications;
  } catch (error) {
    // Error getting scheduled notifications
    return [];
  }
} 