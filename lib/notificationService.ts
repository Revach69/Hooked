import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from './firebaseConfig';

export interface NotificationData {
  title: string;
  body: string;
  data?: Record<string, any>;
}

/**
 * Send push notification to a specific user (client-side implementation)
 * Note: This is a simplified version. In production, you'd use Firebase Cloud Functions
 */
export async function sendPushNotificationToUser(
  userId: string,
  notification: NotificationData
): Promise<boolean> {
  try {
    // Get user's push tokens from Firestore
    const tokens = await getUserPushTokens(userId);
    
    if (tokens.length === 0) {
      // No push tokens found for user
      return false;
    }

    // Send notification to all user's devices
    const results = await Promise.allSettled(
      tokens.map(token => sendPushNotification(token.token, notification))
    );

    const successCount = results.filter(
      result => result.status === 'fulfilled' && result.value
    ).length;

          // Sent notification to devices
    return successCount > 0;
  } catch (error) {
    console.error('Error sending push notification to user:', error);
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
      console.error(`Failed to send push notification: ${response.status} - ${errorText}`);
      return false;
    }

    const result = await response.json();
    
    // Check if the notification was sent successfully
    if (result.data && result.data.status === 'error') {
      console.error(`Push notification error: ${result.data.message}`);
      return false;
    }

          // Push notification sent successfully
    return true;
  } catch (error) {
    console.error('Error sending push notification:', error);
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
  userId: string,
  matchedUserName: string
): Promise<boolean> {
  const notification: NotificationData = {
    title: "It's a match!",
    body: `You're hooked up with ${matchedUserName}`,
    data: {
      type: 'match',
      matchedUserName,
    },
  };

  return await sendPushNotificationToUser(userId, notification);
}

/**
 * Send like notification (when someone likes you back)
 */
export async function sendLikeNotification(
  userId: string,
  likerName: string
): Promise<boolean> {
  const notification: NotificationData = {
    title: "Someone liked you! ❤️",
    body: `${likerName} liked your profile`,
    data: {
      type: 'like',
      likerName,
    },
  };

  return await sendPushNotificationToUser(userId, notification);
}

/**
 * Send message notification
 */
export async function sendMessageNotification(
  userId: string,
  senderName: string,
  messagePreview: string,
  isDeviceLocked: boolean = false
): Promise<boolean> {
  const notification: NotificationData = {
    title: isDeviceLocked ? "New Message" : `New message from ${senderName}`,
    body: isDeviceLocked ? "You got a new message" : messagePreview,
    data: {
      type: 'message',
      senderName,
      messagePreview,
    },
  };

  return await sendPushNotificationToUser(userId, notification);
}

/**
 * Send generic notification
 */
export async function sendGenericNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<boolean> {
  const notification: NotificationData = {
    title,
    body,
    data,
  };

  return await sendPushNotificationToUser(userId, notification);
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
    console.error('Error scheduling local notification:', error);
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
    console.error('Error cancelling scheduled notification:', error);
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
    console.error('Error cancelling all scheduled notifications:', error);
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
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
} 