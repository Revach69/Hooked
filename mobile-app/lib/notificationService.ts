import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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

// Legacy functions removed - now using centralized Firebase Functions for push notifications

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