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
      // Check notification permissions first
      const hasPermissions = await this.checkNotificationPermissions();
      if (!hasPermissions) {
        // Still schedule the notification in storage for manual app open checks
        // This ensures users can still get surveys even without notification permissions
        await this.addEventToHistory(eventId, eventName, sessionId, expiresAt);

        return null;
      }
      
      // Validate event data first
      const validation = this.validateEventData(eventId, eventName, expiresAt, sessionId);
      if (!validation.isValid) {

        return null;
      }
      
      // Check if user has already filled survey in their lifetime
      const surveyFilled = await AsyncStorage.getItem(this.SURVEY_FILLED_KEY);
      if (surveyFilled === 'true') {

        return null;
      }

      // Calculate notification time
      const eventEndTime = new Date(expiresAt).getTime();
      const notificationTime = eventEndTime + (delayHours * 60 * 60 * 1000);
      const now = Date.now();
      
      // Check if notification time is in the future
      if (notificationTime <= now) {

        return null;
      }

      // Check if event hasn't ended yet (don't schedule for past events)
      if (eventEndTime <= now) {

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
              // Error scheduling survey notification
      // Even if notification scheduling fails, still add to history for manual checks
      try {
        await this.addEventToHistory(eventId, eventName, sessionId, expiresAt);

      } catch (historyError) {
        // Failed to add event to history as fallback
      }
      return null;
    }
  }

  /**
   * Check if survey should be shown (either from notification response or app load within survey timeframe)
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
      
      // Find any event that's within the survey visibility window (2h delay + 24h survey window)
      const now = Date.now();
      const twoHours = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
      const twentySixHours = 26 * 60 * 60 * 1000; // 26 hours in milliseconds

      for (const event of eventHistory) {
        const eventEndTime = new Date(event.expiresAt).getTime();
        const timeSinceEventEnd = now - eventEndTime;
        
        // Check if event ended between 2 hours ago and 26 hours ago
        // This creates the survey visibility window: from 2h after expiry to 26h after expiry
        if (timeSinceEventEnd >= twoHours && timeSinceEventEnd <= twentySixHours) {
          return event; // Return the first eligible event
        }
      }

      return null;
    } catch (error) {
              // Error checking if survey should be shown
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
              // Error cancelling survey notification
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
              // Error cancelling all survey notifications
    }
  }

  /**
   * Check and request notification permissions
   */
  static async checkNotificationPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {

        return false;
      }
      
      return true;
    } catch (error) {
              // Error checking notification permissions
      return false;
    }
  }





  /**
   * Cancel any existing survey notifications for the same event
   */
  static async cancelExistingSurveyNotification(eventId: string): Promise<void> {
    try {
      const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const existingNotifications = allNotifications.filter(n => 
        n.content.data?.type === 'survey_request' && 
        n.content.data?.eventId === eventId
      );
      
      if (existingNotifications.length > 0) {
        
        for (const notification of existingNotifications) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }
      
      // Also remove stored notification data for this event
      const notificationKey = `${this.NOTIFICATION_PREFIX}${eventId}`;
      await AsyncStorage.removeItem(notificationKey);
      
    } catch (error) {
              // Error cancelling existing survey notifications
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
              // Error adding event to history
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
              // Error getting event history
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
              // Error checking survey notification validity
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
              // Error getting survey data
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
   * Comprehensive survey system status check
   */
  static async getSurveySystemStatus(): Promise<{
    surveyFilled: boolean;
    eventHistory: SurveyData[];
    pendingNotifications: any[];
    currentTime: string;
    systemStatus: 'healthy' | 'warning' | 'error';
    issues: string[];
  }> {
    try {
      const issues: string[] = [];
      let systemStatus: 'healthy' | 'warning' | 'error' = 'healthy';
      
      // Check if survey is filled
      const surveyFilled = await AsyncStorage.getItem(this.SURVEY_FILLED_KEY) === 'true';
      
      // Get event history
      const eventHistory = await this.getEventHistory();
      
      // Get pending notifications
      const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const pendingNotifications = allNotifications.filter(n => 
        n.content.data?.type === 'survey_request'
      );
      
      const currentTime = new Date().toISOString();
      
      // Check for potential issues
      if (eventHistory.length === 0) {
        issues.push('No events in history');
        systemStatus = 'warning';
      }
      
      if (pendingNotifications.length === 0 && eventHistory.length > 0) {
        issues.push('No pending notifications but events exist in history');
        systemStatus = 'warning';
      }
      
      // Check for expired events in history
      const now = Date.now();
      const expiredEvents = eventHistory.filter(event => {
        const eventEndTime = new Date(event.expiresAt).getTime();
        const twentySixHours = 26 * 60 * 60 * 1000;
        return (now - eventEndTime) > twentySixHours;
      });
      
      if (expiredEvents.length > 0) {
        issues.push(`${expiredEvents.length} expired events in history`);
        systemStatus = 'warning';
      }
      
      return {
        surveyFilled,
        eventHistory,
        pendingNotifications: pendingNotifications.map(n => ({
          id: n.identifier,
          eventId: n.content.data?.eventId,
          eventName: n.content.data?.eventName,
          scheduledFor: (n.trigger as any)?.date
        })),
        currentTime,
        systemStatus,
        issues
      };
    } catch (error) {
              // Error getting survey system status
      return {
        surveyFilled: false,
        eventHistory: [],
        pendingNotifications: [],
        currentTime: new Date().toISOString(),
        systemStatus: 'error',
        issues: [`Error: ${error}`]
      };
    }
  }

  /**
   * Clear all survey-related data
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
              // Error clearing survey data
    }
  }
} 