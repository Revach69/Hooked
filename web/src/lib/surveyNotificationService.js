// Web-compatible survey notification service
// Uses localStorage instead of AsyncStorage and browser notifications instead of Expo notifications

export class SurveyNotificationService {
  static SURVEY_FILLED_KEY = 'surveyFilledLifetime';
  static NOTIFICATION_PREFIX = 'surveyNotification_';
  static EVENT_HISTORY_PREFIX = 'eventHistory_';

  /**
   * Schedule survey notification for after event ends
   */
  static async scheduleSurveyNotification(
    eventId,
    eventName,
    expiresAt,
    sessionId,
    delayHours = 2
  ) {
    try {
      // Check if user has already filled survey in their lifetime
      const surveyFilled = localStorage.getItem(this.SURVEY_FILLED_KEY);
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

      // Schedule the notification using setTimeout
      const timeUntilNotification = notificationTime - Date.now();
      const timeoutId = setTimeout(async () => {
        try {
          // Check if user is still on the site
          if (document.visibilityState === 'visible') {
            // Show browser notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(`You got Hooked at ${eventName}`, {
                body: "We'd love to hear what you thought!",
                icon: '/favicon.ico',
                tag: 'survey-request',
                data: {
                  type: 'survey_request',
                  eventId,
                  eventName,
                  sessionId,
                  expiresAt
                }
              });
            }
            
            // Store survey data for manual access
            localStorage.setItem('pendingSurvey', JSON.stringify({
              eventId,
              eventName,
              sessionId,
              expiresAt
            }));
          }
        } catch (error) {
          console.error('Error showing survey notification:', error);
        }
      }, timeUntilNotification);

      // Store notification info for later reference
      localStorage.setItem(`${this.NOTIFICATION_PREFIX}${eventId}`, JSON.stringify({
        identifier: timeoutId,
        eventId,
        eventName,
        sessionId,
        scheduledFor: notificationTime,
        expiresAt
      }));

      console.log(`Survey notification scheduled for ${new Date(notificationTime).toLocaleString()}`);
      return timeoutId;
    } catch (error) {
      console.error('Error scheduling survey notification:', error);
      return null;
    }
  }

  /**
   * Check if survey should be shown (either from notification or manual app open)
   */
  static async shouldShowSurvey() {
    try {
      // Check for pending survey in localStorage
      const pendingSurvey = localStorage.getItem('pendingSurvey');
      if (pendingSurvey) {
        const surveyData = JSON.parse(pendingSurvey);
        
        // Check if survey is still valid
        const isValid = await this.isSurveyNotificationValid(surveyData.eventId);
        if (isValid) {
          // Remove from pending and return data
          localStorage.removeItem('pendingSurvey');
          return surveyData;
        } else {
          // Remove invalid survey
          localStorage.removeItem('pendingSurvey');
        }
      }

      // Check event history for valid surveys
      const eventHistory = await this.getEventHistory();
      const now = new Date();
      
      for (const event of eventHistory) {
        const eventEndTime = new Date(event.expiresAt);
        const twoHoursAfterEvent = new Date(eventEndTime.getTime() + (2 * 60 * 60 * 1000));
        
        // If event ended more than 2 hours ago but less than 24 hours ago
        if (now >= twoHoursAfterEvent && now <= new Date(eventEndTime.getTime() + (24 * 60 * 60 * 1000))) {
          const isValid = await this.isSurveyNotificationValid(event.eventId);
          if (isValid) {
            return {
              eventId: event.eventId,
              eventName: event.eventName,
              sessionId: event.sessionId,
              expiresAt: event.expiresAt
            };
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error checking for survey:', error);
      return null;
    }
  }

  /**
   * Mark survey as filled (lifetime)
   */
  static async markSurveyFilled() {
    try {
      localStorage.setItem(this.SURVEY_FILLED_KEY, 'true');
      console.log('Survey marked as filled for lifetime');
    } catch (error) {
      console.error('Error marking survey as filled:', error);
    }
  }

  /**
   * Cancel survey notification for specific event
   */
  static async cancelSurveyNotification(eventId) {
    try {
      const notificationData = localStorage.getItem(`${this.NOTIFICATION_PREFIX}${eventId}`);
      if (notificationData) {
        const data = JSON.parse(notificationData);
        if (data.identifier) {
          clearTimeout(data.identifier);
        }
        localStorage.removeItem(`${this.NOTIFICATION_PREFIX}${eventId}`);
        console.log(`Survey notification cancelled for event ${eventId}`);
      }
    } catch (error) {
      console.error('Error cancelling survey notification:', error);
    }
  }

  /**
   * Cancel all survey notifications
   */
  static async cancelAllSurveyNotifications() {
    try {
      const keys = Object.keys(localStorage);
      const notificationKeys = keys.filter(key => key.startsWith(this.NOTIFICATION_PREFIX));
      
      for (const key of notificationKeys) {
        const notificationData = localStorage.getItem(key);
        if (notificationData) {
          try {
            const data = JSON.parse(notificationData);
            if (data.identifier) {
              clearTimeout(data.identifier);
            }
          } catch (error) {
            console.error('Error parsing notification data:', error);
          }
        }
        localStorage.removeItem(key);
      }
      
      console.log('All survey notifications cancelled');
    } catch (error) {
      console.error('Error cancelling all survey notifications:', error);
    }
  }

  /**
   * Add event to history for later reference
   */
  static async addEventToHistory(eventId, eventName, sessionId, expiresAt) {
    try {
      const eventHistory = await this.getEventHistory();
      
      // Check if event already exists
      const existingIndex = eventHistory.findIndex(event => event.eventId === eventId);
      if (existingIndex >= 0) {
        // Update existing event
        eventHistory[existingIndex] = {
          eventId,
          eventName,
          sessionId,
          expiresAt
        };
      } else {
        // Add new event
        eventHistory.push({
          eventId,
          eventName,
          sessionId,
          expiresAt
        });
      }
      
      localStorage.setItem(`${this.EVENT_HISTORY_PREFIX}events`, JSON.stringify(eventHistory));
    } catch (error) {
      console.error('Error adding event to history:', error);
    }
  }

  /**
   * Get event history from localStorage
   */
  static async getEventHistory() {
    try {
      const historyData = localStorage.getItem(`${this.EVENT_HISTORY_PREFIX}events`);
      return historyData ? JSON.parse(historyData) : [];
    } catch (error) {
      console.error('Error getting event history:', error);
      return [];
    }
  }

  /**
   * Check if survey notification is still valid
   */
  static async isSurveyNotificationValid(eventId) {
    try {
      const notificationData = localStorage.getItem(`${this.NOTIFICATION_PREFIX}${eventId}`);
      if (!notificationData) {
        return false;
      }

      const data = JSON.parse(notificationData);
      const eventEndTime = new Date(data.expiresAt);
      const now = new Date();
      
      // Survey is valid if event ended more than 2 hours ago but less than 24 hours ago
      const twoHoursAfterEvent = new Date(eventEndTime.getTime() + (2 * 60 * 60 * 1000));
      const twentyFourHoursAfterEvent = new Date(eventEndTime.getTime() + (24 * 60 * 60 * 1000));
      
      return now >= twoHoursAfterEvent && now <= twentyFourHoursAfterEvent;
    } catch (error) {
      console.error('Error checking survey notification validity:', error);
      return false;
    }
  }

  /**
   * Get survey data for specific event
   */
  static async getSurveyData(eventId) {
    try {
      const notificationData = localStorage.getItem(`${this.NOTIFICATION_PREFIX}${eventId}`);
      if (notificationData) {
        const data = JSON.parse(notificationData);
        return {
          eventId: data.eventId,
          eventName: data.eventName,
          sessionId: data.sessionId,
          expiresAt: data.expiresAt
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting survey data:', error);
      return null;
    }
  }

  /**
   * Clear all survey data
   */
  static async clearAllSurveyData() {
    try {
      const keys = Object.keys(localStorage);
      const surveyKeys = keys.filter(key => 
        key.startsWith(this.NOTIFICATION_PREFIX) || 
        key.startsWith(this.EVENT_HISTORY_PREFIX) ||
        key === this.SURVEY_FILLED_KEY ||
        key === 'pendingSurvey'
      );
      
      for (const key of surveyKeys) {
        localStorage.removeItem(key);
      }
      
      console.log('All survey data cleared');
    } catch (error) {
      console.error('Error clearing survey data:', error);
    }
  }
} 