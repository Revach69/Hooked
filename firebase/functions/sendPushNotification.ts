import * as functions from 'firebase-functions';
import { getUserPushTokens } from '../../lib/notifications';

interface NotificationData {
  title: string;
  body: string;
  data?: Record<string, any>;
}

/**
 * Send push notification to a specific user
 */
export async function sendPushNotificationToUser(
  userId: string,
  notification: NotificationData
): Promise<boolean> {
  try {
    // Get user's push tokens
    const tokens = await getUserPushTokens(userId);
    
    if (tokens.length === 0) {
      console.log(`No push tokens found for user ${userId}`);
      return false;
    }

    // Send notification to all user's devices
    const results = await Promise.allSettled(
      tokens.map(token => sendPushNotification(token.token, notification))
    );

    const successCount = results.filter(
      result => result.status === 'fulfilled' && result.value
    ).length;

    console.log(`Sent notification to ${successCount}/${tokens.length} devices for user ${userId}`);
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

    console.log(`Push notification sent successfully to token: ${token.substring(0, 20)}...`);
    return true;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
}

/**
 * Send match notification
 */
export async function sendMatchNotification(
  userId: string,
  matchedUserName: string
): Promise<boolean> {
  const notification: NotificationData = {
    title: "It's a match! 🎉",
    body: `You're hooked up with ${matchedUserName}`,
    data: {
      type: 'match',
      matchedUserId: userId,
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