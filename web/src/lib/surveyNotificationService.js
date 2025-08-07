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
      console.log(`📅 Scheduling survey notification for event: ${eventName} (${eventId})`);
      console.log(`⏰ Event expires at: ${expiresAt}`);
      
      // Check if user has already filled survey in their lifetime
      const surveyFilled = localStorage.getItem(this.SURVEY_FILLED_KEY);
      if (surveyFilled === 'true') {
        console.log('❌ User has already filled survey in their lifetime');
        return null;
      }

      // Calculate notification time
      const eventEndTime = new Date(expiresAt).getTime();
      const notificationTime = eventEndTime + (delayHours * 60 * 60 * 1000);
      
      // Check if notification time is in the future
      if (notificationTime <= Date.now()) {
        console.log('❌ Event already ended, not scheduling survey notification');
        return null;
      }

      // Check if event hasn't ended yet (don't schedule for past events)
      if (eventEndTime <= Date.now()) {
        console.log('❌ Event has already ended, not scheduling survey notification');
        return null;
      }

      // Store event in history for later reference (this is the primary mechanism for web)
      await this.addEventToHistory(eventId, eventName, sessionId, expiresAt);

      // For web, we can't reliably schedule notifications far in advance
      // So we rely on the manual check when user opens the app
      // But we can still try to schedule a notification if the user is currently on the site
      const timeUntilNotification = notificationTime - Date.now();
      
      // Only schedule if it's within a reasonable time (less than 1 hour)
      // This is because setTimeout won't persist if browser is closed
      if (timeUntilNotification < 60 * 60 * 1000) { // Less than 1 hour
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

        console.log(`✅ Survey notification scheduled for ${new Date(notificationTime).toLocaleString()}`);
        return timeoutId;
      } else {
        console.log(`ℹ️  Survey notification time is too far in the future (${Math.round(timeUntilNotification / 1000 / 60)} minutes), will rely on manual checks`);
        console.log(`✅ Event added to history for manual survey checks`);
        return null;
      }
    } catch (error) {
      console.error('❌ Error scheduling survey notification:', error);
      // Even if scheduling fails, still add to history for manual checks
      try {
        await this.addEventToHistory(eventId, eventName, sessionId, expiresAt);
        console.log(`✅ Event added to history as fallback for manual survey checks`);
      } catch (historyError) {
        console.error('❌ Failed to add event to history as fallback:', historyError);
      }
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

  /**
   * Comprehensive survey system status check
   */
  static async getSurveySystemStatus() {
    try {
      const issues = [];
      let systemStatus = 'healthy';
      
      // Check if survey is filled
      const surveyFilled = localStorage.getItem(this.SURVEY_FILLED_KEY) === 'true';
      
      // Get event history
      const eventHistory = await this.getEventHistory();
      
      // Get pending survey
      const pendingSurvey = localStorage.getItem('pendingSurvey');
      const pendingNotifications = pendingSurvey ? [JSON.parse(pendingSurvey)] : [];
      
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
        pendingNotifications,
        currentTime,
        systemStatus,
        issues
      };
    } catch (error) {
      console.error('Error getting survey system status:', error);
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
   * Test method to verify survey logic requirements
   */
  static async testSurveyLogicRequirements() {
    const details = [];
    let lifetimeCheck = false;
    let timeWindowCheck = false;
    let notificationScheduling = false;
    
    try {
      console.log(`🧪 Testing survey logic requirements...`);
      
      // Test 1: Lifetime survey check
      const surveyFilled = localStorage.getItem(this.SURVEY_FILLED_KEY);
      lifetimeCheck = surveyFilled !== 'true';
      details.push(`Lifetime check: ${lifetimeCheck ? 'PASS' : 'FAIL'} - User ${surveyFilled === 'true' ? 'has already' : 'has not'} filled survey`);
      
      // Test 2: Time window check (26 hours after event)
      const eventHistory = await this.getEventHistory();
      const now = Date.now();
      const twentySixHours = 26 * 60 * 60 * 1000;
      
      const validEvents = eventHistory.filter(event => {
        const eventEndTime = new Date(event.expiresAt).getTime();
        const timeSinceEventEnd = now - eventEndTime;
        return timeSinceEventEnd >= 0 && timeSinceEventEnd <= twentySixHours;
      });
      
      timeWindowCheck = validEvents.length > 0;
      details.push(`Time window check: ${timeWindowCheck ? 'PASS' : 'FAIL'} - Found ${validEvents.length} events within 26-hour window`);
      
      // Test 3: Notification scheduling capability (browser notifications)
      notificationScheduling = 'Notification' in window && Notification.permission === 'granted';
      details.push(`Notification scheduling: ${notificationScheduling ? 'PASS' : 'FAIL'} - Browser notifications ${notificationScheduling ? 'available' : 'not available'}`);
      
      const overallStatus = (lifetimeCheck && timeWindowCheck && notificationScheduling) ? 'pass' : 'fail';
      
      console.log(`🧪 Survey logic test results:`);
      details.forEach(detail => console.log(`   - ${detail}`));
      console.log(`   Overall status: ${overallStatus.toUpperCase()}`);
      
      return {
        lifetimeCheck,
        timeWindowCheck,
        notificationScheduling,
        overallStatus,
        details
      };
    } catch (error) {
      console.error('❌ Error testing survey logic requirements:', error);
      return {
        lifetimeCheck: false,
        timeWindowCheck: false,
        notificationScheduling: false,
        overallStatus: 'fail',
        details: [`Error: ${error}`]
      };
    }
  }
} 