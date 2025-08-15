import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { AsyncStorageUtils } from './asyncStorageUtils';

/**
 * Initialize notification channels for Android
 */
export async function initializeNotificationChannels(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      // Create default notification channel
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Hooked Notifications',
        description: 'Notifications for new messages and matches',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#8b5cf6',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });

      // Create notification channel for messages
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        description: 'Notifications for new messages',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#8b5cf6',
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
        lightColor: '#8b5cf6',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
    } catch (error) {
      console.error('Error creating notification channels:', error);
    }
  }
}

export interface NotificationData {
  title: string;
  body: string;
  data?: Record<string, any>;
}

// Flag to enable/disable legacy client-side push token storage
const LEGACY_PUSH_TOKEN_STORAGE_ENABLED = false;

// Flag to enable/disable legacy notification functions (now handled by centralized system)
const LEGACY_NOTIFICATION_FUNCTIONS_ENABLED = false;

/**
 * Store push token for a session (legacy - now handled by callable)
 */
export async function storePushToken(sessionId: string, token: string): Promise<void> {
  if (!LEGACY_PUSH_TOKEN_STORAGE_ENABLED) {
    return;
  }

  try {
    const tokenData = {
      token,
      platform: Platform.OS,
      sessionId,
      createdAt: new Date().toISOString(),
    };

    // Store in Firestore (legacy - will fail in production due to security rules)
    await setDoc(doc(db, 'push_tokens', `${sessionId}_${Platform.OS}`), tokenData);
    
    // Also store locally for backup
    await AsyncStorageUtils.setItem(`pushToken_${sessionId}`, token);
  } catch {
    // Error storing push token
  }
}

/**
 * Get push token for a session
 */
export async function getPushToken(sessionId: string): Promise<string | null> {
  try {
    // Try to get from local storage first
    const localToken = await AsyncStorageUtils.getItem<string>(`pushToken_${sessionId}`);
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
  } catch {
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
  } catch {
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
  } catch {
    // Error sending push notification
    return false;
  }
}



/**
 * Send match notification (legacy - now handled by centralized system)
 */
export async function sendMatchNotification(
  sessionId: string,
  matchedUserName: string,
  isLiker: boolean = false
): Promise<boolean> {
  if (!LEGACY_NOTIFICATION_FUNCTIONS_ENABLED) {
    return false;
  }
  // Determine notification content based on role
  let title: string;
  let body: string;
  
  if (isLiker) {
    // First liker - more casual notification
    title = "You got Hooked!";
    body = `You matched with ${matchedUserName}`;
  } else {
    // Second liker - more prominent notification
    title = "You got Hooked!";
    body = `You and ${matchedUserName} liked each other!`;
  }

  const notification: NotificationData = {
    title,
    body,
    data: {
      type: 'match',
      matchedUserName,
      isLiker,
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
    } catch {
      // Fallback to push notification
    }
  }

  return await sendPushNotificationToSession(sessionId, notification);
}

/**
 * Send like notification (legacy - now handled by centralized system)
 * Only sends push notification if user is not in app
 */
export async function sendLikeNotification(
  sessionId: string,
  likerName: string
): Promise<boolean> {
  if (!LEGACY_NOTIFICATION_FUNCTIONS_ENABLED) {
    return false;
  }
  try {
    // Check if user is currently in the app
    const currentSessionId = await AsyncStorageUtils.getItem<string>('currentSessionId');
    const isUserInApp = currentSessionId === sessionId;
    
    // If user is in app, don't send push notification (toast will be shown instead)
    if (isUserInApp) {
      return false;
    }
    
    // Additional check: look for recent activity timestamp
    const lastActivityKey = `lastActivity_${sessionId}`;
    const lastActivity = await AsyncStorageUtils.getItem<string>(lastActivityKey);
    
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
  } catch {
    // Error sending like notification
    return false;
  }
}

/**
 * Send message notification (legacy - now handled by centralized system)
 */
export async function sendMessageNotification(
  sessionId: string,
  senderName: string,
  messagePreview: string,
  isDeviceLocked: boolean = false
): Promise<boolean> {
  if (!LEGACY_NOTIFICATION_FUNCTIONS_ENABLED) {
    return false;
  }
  try {
    // Check if user has push notification permissions
    const { status } = await Notifications.getPermissionsAsync();
    
    if (status !== 'granted') {
      // Try to request permissions if not granted
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== 'granted') {
        return false;
      }
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

    // For cross-device communication, always use push notifications
    // Local notifications are only for the current device, which is not what we want here
    return await sendPushNotificationToSession(sessionId, notification);
  } catch {
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
  } catch {
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
  } catch {
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
  } catch {
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
  } catch {
    // Error getting scheduled notifications
    return [];
  }
} 