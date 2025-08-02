import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SurveyNotificationData {
  eventId: string;
  eventName: string;
  expiresAt: string;
  sessionId: string;
}

export interface SurveyData {
  eventId: string;
  eventName: string;
  sessionId: string;
  expiresAt: string;
}

export class SurveyNotificationService {
  private static readonly SURVEY_FILLED_KEY = 'surveyFilledLifetime';
  private static readonly NOTIFICATION_PREFIX = 'surveyNotification_';
  private static readonly EVENT_HISTORY_PREFIX = 'eventHistory_';

  /**
   * Schedule survey notification for after event ends
   */
  static async scheduleSurveyNotification(
    eventId: string,
    eventName: string,
    expiresAt: string,
    sessionId: string,
    delayHours: number = 2
  ): Promise<string | null> {
    try {
      // Check if user has already filled survey in their lifetime
      const surveyFilled = await AsyncStorage.getItem(this.SURVEY_FILLED_KEY);
      if (surveyFilled === 'true') {
        console.log('User has already filled survey in their lifetime');
        return null;
      }

      // Calculate notification time
      const eventEndTime = new Date(expiresAt).getTime();
      const notificationTime = eventEndTime + (delayHours * 60 * 60 * 1000);
      
      // Check if notification time is in the future
      if (notificationTime <= Date.now()) {
        console.log('Event already ended, not scheduling survey notification');
        return null;
      }

      // Check if event hasn't ended yet (don't schedule for past events)
      if (eventEndTime <= Date.now()) {
        console.log('Event has already ended, not scheduling survey notification');
        return null;
      }

      // Store event in history for later reference
      await this.addEventToHistory(eventId, eventName, sessionId, expiresAt);

      // Schedule the notification
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: `You got Hooked at ${eventName}`,
          body: "We'd love to hear what you thought!",
          data: {
            type: 'survey_request',
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

      // Store notification info for later reference
      await AsyncStorage.setItem(`${this.NOTIFICATION_PREFIX}${eventId}`, JSON.stringify({
        identifier,
        eventId,
        eventName,
        sessionId,
        scheduledFor: notificationTime,
        expiresAt
      }));

      console.log(`Survey notification scheduled for ${new Date(notificationTime).toLocaleString()}`);
      return identifier;
    } catch (error) {
      console.error('Error scheduling survey notification:', error);
      return null;
    }
  }

  /**
   * Check if survey should be shown (either from notification or manual app open)
   */
  static async shouldShowSurvey(): Promise<SurveyData | null> {
    try {
      // Check if user has already filled survey in their lifetime
      const surveyFilled = await AsyncStorage.getItem(this.SURVEY_FILLED_KEY);
      if (surveyFilled === 'true') {
        return null;
      }

      // Get all events from history
      const eventHistory = await this.getEventHistory();
      
      // Find any event that's within the 26-hour window (2h delay + 24h survey window)
      const now = Date.now();
      const twentySixHours = 26 * 60 * 60 * 1000;

      for (const event of eventHistory) {
        const eventEndTime = new Date(event.expiresAt).getTime();
        const timeSinceEventEnd = now - eventEndTime;
        
        // Check if event ended within last 26 hours (2h delay + 24h survey window)
        if (timeSinceEventEnd >= 0 && timeSinceEventEnd <= twentySixHours) {
          return event; // Return the first eligible event
        }
      }

      return null;
    } catch (error) {
      console.error('Error checking if survey should be shown:', error);
      return null;
    }
  }

  /**
   * Mark survey as filled for lifetime
   */
  static async markSurveyFilled(): Promise<void> {
    await AsyncStorage.setItem(this.SURVEY_FILLED_KEY, 'true');
    
    // Cancel all pending survey notifications
    await this.cancelAllSurveyNotifications();
  }

  /**
   * Cancel survey notification for an event
   */
  static async cancelSurveyNotification(eventId: string): Promise<void> {
    try {
      const notificationData = await AsyncStorage.getItem(`${this.NOTIFICATION_PREFIX}${eventId}`);
      if (notificationData) {
        const { identifier } = JSON.parse(notificationData);
        await Notifications.cancelScheduledNotificationAsync(identifier);
        await AsyncStorage.removeItem(`${this.NOTIFICATION_PREFIX}${eventId}`);
        console.log(`Cancelled survey notification for event ${eventId}`);
      }
    } catch (error) {
      console.error('Error cancelling survey notification:', error);
    }
  }

  /**
   * Cancel all survey notifications
   */
  static async cancelAllSurveyNotifications(): Promise<void> {
    try {
      const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      for (const notification of allNotifications) {
        const { type } = notification.content.data;
        if (type === 'survey_request') {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }

      // Clear all stored notification data
      const keys = await AsyncStorage.getAllKeys();
      const surveyKeys = keys.filter(key => key.startsWith(this.NOTIFICATION_PREFIX));
      if (surveyKeys.length > 0) {
        await AsyncStorage.multiRemove(surveyKeys);
      }

      console.log('Cancelled all survey notifications');
    } catch (error) {
      console.error('Error cancelling all survey notifications:', error);
    }
  }

  /**
   * Add event to user's event history
   */
  private static async addEventToHistory(
    eventId: string, 
    eventName: string, 
    sessionId: string, 
    expiresAt: string
  ): Promise<void> {
    try {
      const eventHistory = await this.getEventHistory();
      
      // Add new event to the beginning (most recent first)
      eventHistory.unshift({
        eventId,
        eventName,
        sessionId,
        expiresAt
      });

      // Keep only last 10 events to prevent storage bloat
      const trimmedHistory = eventHistory.slice(0, 10);
      
      await AsyncStorage.setItem('eventHistory', JSON.stringify(trimmedHistory));
    } catch (error) {
      console.error('Error adding event to history:', error);
    }
  }

  /**
   * Get user's event history
   */
  private static async getEventHistory(): Promise<SurveyData[]> {
    try {
      const historyData = await AsyncStorage.getItem('eventHistory');
      return historyData ? JSON.parse(historyData) : [];
    } catch (error) {
      console.error('Error getting event history:', error);
      return [];
    }
  }

  /**
   * Check if survey notification is still valid (within 26h window)
   */
  static async isSurveyNotificationValid(eventId: string): Promise<boolean> {
    try {
      const eventHistory = await this.getEventHistory();
      const event = eventHistory.find(e => e.eventId === eventId);
      
      if (!event) return false;

      const eventEndTime = new Date(event.expiresAt).getTime();
      const now = Date.now();
      const twentySixHours = 26 * 60 * 60 * 1000;

      // Check if within 26 hours of event end (2h delay + 24h survey window)
      return (now - eventEndTime) >= 0 && (now - eventEndTime) <= twentySixHours;
    } catch (error) {
      console.error('Error checking survey notification validity:', error);
      return false;
    }
  }

  /**
   * Get survey data for a specific event
   */
  static async getSurveyData(eventId: string): Promise<SurveyData | null> {
    try {
      const eventHistory = await this.getEventHistory();
      return eventHistory.find(e => e.eventId === eventId) || null;
    } catch (error) {
      console.error('Error getting survey data:', error);
      return null;
    }
  }

  /**
   * Clear all survey-related data (for testing/debugging)
   */
  static async clearAllSurveyData(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const surveyKeys = keys.filter(key => 
        key.startsWith(this.NOTIFICATION_PREFIX) || 
        key === this.SURVEY_FILLED_KEY ||
        key === 'eventHistory'
      );
      
      if (surveyKeys.length > 0) {
        await AsyncStorage.multiRemove(surveyKeys);
      }
      
      await this.cancelAllSurveyNotifications();
      console.log('Cleared all survey data');
    } catch (error) {
      console.error('Error clearing survey data:', error);
    }
  }
} 