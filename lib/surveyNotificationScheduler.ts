import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ScheduledSurveyNotification {
  id: string;
  eventId: string;
  eventName: string;
  sessionId: string;
  expiresAt: string;
  scheduledFor: number; // timestamp
  notificationId?: string; // expo notification identifier
}

export class SurveyNotificationScheduler {
  private static readonly SCHEDULED_NOTIFICATIONS_KEY = 'scheduledSurveyNotifications';

  /**
   * Schedule a survey notification for an event (expires_at + 2 hours)
   */
  static async scheduleSurveyNotification(
    eventId: string,
    eventName: string,
    sessionId: string,
    expiresAt: string
  ): Promise<string | null> {
    try {
      // Calculate notification time (expires_at + 2 hours)
      const eventEndTime = new Date(expiresAt).getTime();
      const notificationTime = eventEndTime + (2 * 60 * 60 * 1000); // 2 hours in milliseconds
      const now = Date.now();

      // Check if notification time is in the future
      if (notificationTime <= now) {
        console.log('Survey notification time has already passed');
        return null;
      }

      // Check if notification already exists for this event and session
      const existingNotification = await this.getScheduledNotification(eventId, sessionId);
      if (existingNotification) {
        console.log('Survey notification already scheduled for this event');
        return existingNotification.notificationId || null;
      }

      // Request notification permissions
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        if (newStatus !== 'granted') {
          console.log('Notification permissions not granted');
          return null;
        }
      }

      // Schedule the notification
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `You got Hooked at ${eventName}`,
          body: "We'd love to hear what you thought! Tap to share your feedback.",
          data: {
            type: 'survey_reminder',
            eventId,
            eventName,
            sessionId,
            expiresAt
          },
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          date: new Date(notificationTime),
        } as any,
      });

      // Store the scheduled notification data
      const scheduledNotification: ScheduledSurveyNotification = {
        id: `${eventId}_${sessionId}`,
        eventId,
        eventName,
        sessionId,
        expiresAt,
        scheduledFor: notificationTime,
        notificationId
      };

      await this.saveScheduledNotification(scheduledNotification);

      console.log(`Survey notification scheduled for ${new Date(notificationTime).toLocaleString()}`);
      return notificationId;

    } catch (error) {
      console.error('Error scheduling survey notification:', error);
      return null;
    }
  }

  /**
   * Get all scheduled survey notifications
   */
  static async getScheduledNotifications(): Promise<ScheduledSurveyNotification[]> {
    try {
      const data = await AsyncStorage.getItem(this.SCHEDULED_NOTIFICATIONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  /**
   * Get a specific scheduled notification
   */
  static async getScheduledNotification(eventId: string, sessionId: string): Promise<ScheduledSurveyNotification | null> {
    try {
      const notifications = await this.getScheduledNotifications();
      return notifications.find(n => n.eventId === eventId && n.sessionId === sessionId) || null;
    } catch (error) {
      console.error('Error getting scheduled notification:', error);
      return null;
    }
  }

  /**
   * Save a scheduled notification to local storage
   */
  private static async saveScheduledNotification(notification: ScheduledSurveyNotification): Promise<void> {
    try {
      const notifications = await this.getScheduledNotifications();
      
      // Remove existing notification for this event and session if it exists
      const filteredNotifications = notifications.filter(n => 
        !(n.eventId === notification.eventId && n.sessionId === notification.sessionId)
      );
      
      // Add new notification
      filteredNotifications.push(notification);
      
      await AsyncStorage.setItem(this.SCHEDULED_NOTIFICATIONS_KEY, JSON.stringify(filteredNotifications));
    } catch (error) {
      console.error('Error saving scheduled notification:', error);
    }
  }

  /**
   * Cancel a scheduled survey notification
   */
  static async cancelSurveyNotification(eventId: string, sessionId: string): Promise<void> {
    try {
      const notification = await this.getScheduledNotification(eventId, sessionId);
      if (notification?.notificationId) {
        await Notifications.cancelScheduledNotificationAsync(notification.notificationId);
      }

      // Remove from local storage
      const notifications = await this.getScheduledNotifications();
      const filteredNotifications = notifications.filter(n => 
        !(n.eventId === eventId && n.sessionId === sessionId)
      );
      
      await AsyncStorage.setItem(this.SCHEDULED_NOTIFICATIONS_KEY, JSON.stringify(filteredNotifications));
      
      console.log('Survey notification cancelled');
    } catch (error) {
      console.error('Error cancelling survey notification:', error);
    }
  }

  /**
   * Cancel all scheduled survey notifications
   */
  static async cancelAllSurveyNotifications(): Promise<void> {
    try {
      const notifications = await this.getScheduledNotifications();
      
      // Cancel all notifications
      for (const notification of notifications) {
        if (notification.notificationId) {
          await Notifications.cancelScheduledNotificationAsync(notification.notificationId);
        }
      }

      // Clear local storage
      await AsyncStorage.removeItem(this.SCHEDULED_NOTIFICATIONS_KEY);
      
      console.log('All survey notifications cancelled');
    } catch (error) {
      console.error('Error cancelling all survey notifications:', error);
    }
  }

  /**
   * Clean up expired notifications
   */
  static async cleanupExpiredNotifications(): Promise<void> {
    try {
      const notifications = await this.getScheduledNotifications();
      const now = Date.now();
      const validNotifications = notifications.filter(n => n.scheduledFor > now);
      
      if (validNotifications.length !== notifications.length) {
        // Remove expired notifications from local storage
        await AsyncStorage.setItem(this.SCHEDULED_NOTIFICATIONS_KEY, JSON.stringify(validNotifications));
        
        // Cancel expired notifications
        const expiredNotifications = notifications.filter(n => n.scheduledFor <= now);
        for (const notification of expiredNotifications) {
          if (notification.notificationId) {
            await Notifications.cancelScheduledNotificationAsync(notification.notificationId);
          }
        }
        
        console.log(`Cleaned up ${expiredNotifications.length} expired notifications`);
      }
    } catch (error) {
      console.error('Error cleaning up expired notifications:', error);
    }
  }

  /**
   * Check if a survey notification is scheduled for an event
   */
  static async isSurveyNotificationScheduled(eventId: string, sessionId: string): Promise<boolean> {
    try {
      const notification = await this.getScheduledNotification(eventId, sessionId);
      return notification !== null;
    } catch (error) {
      console.error('Error checking if survey notification is scheduled:', error);
      return false;
    }
  }
}
