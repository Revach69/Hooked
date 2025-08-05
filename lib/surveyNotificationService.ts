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
      console.log(`📅 Scheduling survey notification for event: ${eventName} (${eventId})`);
      console.log(`⏰ Event expires at: ${expiresAt}`);
      
      // Check notification permissions first
      const hasPermissions = await this.checkNotificationPermissions();
      if (!hasPermissions) {
        console.log(`❌ Notification permissions not granted, cannot schedule survey notification`);
        return null;
      }
      
      // Validate event data first
      const validation = this.validateEventData(eventId, eventName, expiresAt, sessionId);
      if (!validation.isValid) {
        console.log(`❌ Event data validation failed:`, validation.errors);
        return null;
      }
      
      // Check if user has already filled survey in their lifetime
      const surveyFilled = await AsyncStorage.getItem(this.SURVEY_FILLED_KEY);
      if (surveyFilled === 'true') {
        console.log(`❌ User has already filled survey in their lifetime, skipping notification`);
        return null;
      }

      // Calculate notification time
      const eventEndTime = new Date(expiresAt).getTime();
      const notificationTime = eventEndTime + (delayHours * 60 * 60 * 1000);
      const now = Date.now();
      
      console.log(`📊 Time calculations:`);
      console.log(`   - Current time: ${new Date(now).toISOString()}`);
      console.log(`   - Event end time: ${new Date(eventEndTime).toISOString()}`);
      console.log(`   - Notification time: ${new Date(notificationTime).toISOString()}`);
      console.log(`   - Time until notification: ${Math.round((notificationTime - now) / 1000 / 60)} minutes`);
      
      // Check if notification time is in the future
      if (notificationTime <= now) {
        console.log(`❌ Notification time is in the past, not scheduling survey notification`);
        console.log(`   - Notification time: ${new Date(notificationTime).toISOString()}`);
        console.log(`   - Current time: ${new Date(now).toISOString()}`);
        return null;
      }

      // Check if event hasn't ended yet (don't schedule for past events)
      if (eventEndTime <= now) {
        console.log(`❌ Event has already ended, not scheduling survey notification`);
        console.log(`   - Event end time: ${new Date(eventEndTime).toISOString()}`);
        console.log(`   - Current time: ${new Date(now).toISOString()}`);
        return null;
      }

      // Cancel any existing survey notifications for this event
      await this.cancelExistingSurveyNotification(eventId);

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

      console.log(`✅ Survey notification scheduled successfully`);
      console.log(`   - Notification ID: ${identifier}`);
      console.log(`   - Will fire at: ${new Date(notificationTime).toISOString()}`);

      // Store notification info for later reference
      await AsyncStorage.setItem(`${this.NOTIFICATION_PREFIX}${eventId}`, JSON.stringify({
        identifier,
        eventId,
        eventName,
        sessionId,
        scheduledFor: notificationTime,
        expiresAt
      }));

      return identifier;
    } catch (error) {
      console.error('❌ Error scheduling survey notification:', error);
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
        // Cancelled survey notification for event
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

              // Cancelled all survey notifications
    } catch (error) {
      console.error('Error cancelling all survey notifications:', error);
    }
  }

  /**
   * Check and request notification permissions
   */
  static async checkNotificationPermissions(): Promise<boolean> {
    try {
      console.log(`🔐 Checking notification permissions...`);
      
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      console.log(`📋 Current permission status: ${existingStatus}`);
      
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        console.log(`🔐 Requesting notification permissions...`);
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log(`📋 New permission status: ${finalStatus}`);
      }
      
      if (finalStatus !== 'granted') {
        console.log(`❌ Notification permissions not granted`);
        return false;
      }
      
      console.log(`✅ Notification permissions granted`);
      return true;
    } catch (error) {
      console.error('❌ Error checking notification permissions:', error);
      return false;
    }
  }

  /**
   * Test method to schedule a survey notification with a short delay (for debugging)
   */
  static async testSurveyNotification(
    eventId: string,
    eventName: string,
    sessionId: string,
    delayMinutes: number = 1
  ): Promise<string | null> {
    try {
      console.log(`🧪 Testing survey notification scheduling...`);
      console.log(`   - Event: ${eventName} (${eventId})`);
      console.log(`   - Delay: ${delayMinutes} minutes`);
      
      const notificationTime = Date.now() + (delayMinutes * 60 * 1000);
      
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: `TEST: You got Hooked at ${eventName}`,
          body: "TEST: We'd love to hear what you thought!",
          data: {
            type: 'survey_request',
            eventId,
            eventName,
            sessionId,
            expiresAt: new Date().toISOString(),
            isTest: true
          },
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          date: new Date(notificationTime),
        } as any,
      });

      console.log(`✅ Test notification scheduled successfully`);
      console.log(`   - Notification ID: ${identifier}`);
      console.log(`   - Will fire at: ${new Date(notificationTime).toISOString()}`);
      
      return identifier;
    } catch (error) {
      console.error('❌ Error scheduling test notification:', error);
      return null;
    }
  }

  /**
   * Cancel any existing survey notifications for the same event
   */
  static async cancelExistingSurveyNotification(eventId: string): Promise<void> {
    try {
      console.log(`🔍 Checking for existing survey notifications for event: ${eventId}`);
      
      const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const existingNotifications = allNotifications.filter(n => 
        n.content.data?.type === 'survey_request' && 
        n.content.data?.eventId === eventId
      );
      
      if (existingNotifications.length > 0) {
        console.log(`🗑️  Found ${existingNotifications.length} existing survey notification(s) for event ${eventId}, cancelling...`);
        
        for (const notification of existingNotifications) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
          console.log(`   ✅ Cancelled notification: ${notification.identifier}`);
        }
      } else {
        console.log(`✅ No existing survey notifications found for event ${eventId}`);
      }
      
      // Also remove stored notification data for this event
      const notificationKey = `${this.NOTIFICATION_PREFIX}${eventId}`;
      await AsyncStorage.removeItem(notificationKey);
      
    } catch (error) {
      console.error('❌ Error cancelling existing survey notifications:', error);
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
   * Validate event data for survey notification scheduling
   */
  static validateEventData(
    eventId: string,
    eventName: string,
    expiresAt: string,
    sessionId: string
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Validate required fields
    if (!eventId) errors.push('Event ID is required');
    if (!eventName) errors.push('Event name is required');
    if (!expiresAt) errors.push('Event expiration time is required');
    if (!sessionId) errors.push('Session ID is required');
    
    // Validate expiresAt format
    if (expiresAt) {
      const expiresDate = new Date(expiresAt);
      if (isNaN(expiresDate.getTime())) {
        errors.push('Invalid expires_at format. Expected ISO string.');
      } else {
        const now = new Date();
        if (expiresDate <= now) {
          errors.push('Event has already expired');
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Debug method to list all scheduled survey notifications
   */
  static async debugScheduledNotifications(): Promise<void> {
    try {
      console.log(`🔍 Debugging scheduled notifications...`);
      
      const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`📋 Total scheduled notifications: ${allNotifications.length}`);
      
      const surveyNotifications = allNotifications.filter(n => 
        n.content.data?.type === 'survey_request'
      );
      
      console.log(`📊 Survey notifications found: ${surveyNotifications.length}`);
      
      for (const notification of surveyNotifications) {
        const data = notification.content.data;
        const trigger = notification.trigger as any;
        const scheduledTime = trigger?.date ? new Date(trigger.date) : new Date();
        const now = new Date();
        const timeUntilNotification = scheduledTime.getTime() - now.getTime();
        
        console.log(`   📅 Notification ID: ${notification.identifier}`);
        console.log(`   🎯 Event: ${data?.eventName} (${data?.eventId})`);
        console.log(`   ⏰ Scheduled for: ${scheduledTime.toISOString()}`);
        console.log(`   ⏱️  Time until notification: ${Math.round(timeUntilNotification / 1000 / 60)} minutes`);
        console.log(`   📝 Data:`, data);
        console.log(`   ---`);
      }
      
      // Also check stored notification data
      const keys = await AsyncStorage.getAllKeys();
      const surveyKeys = keys.filter(key => key.startsWith(this.NOTIFICATION_PREFIX));
      
      console.log(`💾 Stored survey notification keys: ${surveyKeys.length}`);
      for (const key of surveyKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          console.log(`   🔑 Key: ${key}`);
          console.log(`   📊 Data:`, parsed);
        }
      }
      
    } catch (error) {
      console.error('❌ Error debugging notifications:', error);
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
              // Cleared all survey data
    } catch (error) {
      console.error('Error clearing survey data:', error);
    }
  }
} 