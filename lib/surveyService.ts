import AsyncStorage from '@react-native-async-storage/async-storage';
import { EventFeedbackAPI } from './firebaseApi';

export interface SurveyData {
  eventId: string;
  eventName: string;
  sessionId: string;
  expiresAt: string;
}

export interface SurveyFeedback {
  easeOfUse: number;
  matchedWithOthers: string;
  wouldUseAgain: string;
  eventSatisfaction: number;
  improvements?: string;
}

export class SurveyService {
  private static readonly SURVEY_FILLED_KEY = 'surveyFilledLifetime';
  private static readonly EVENT_HISTORY_PREFIX = 'eventHistory_';

  /**
   * Check if survey should be shown (only during 2-26 hour window after event ends)
   */
  static async shouldShowSurvey(): Promise<SurveyData | null> {
    try {
      // Check if user has already filled survey in their lifetime
      const surveyFilled = await AsyncStorage.getItem(this.SURVEY_FILLED_KEY);
      if (surveyFilled === 'true') {
        return null;
      }

      // Get current session info
      const currentEventId = await AsyncStorage.getItem('currentEventId');
      const currentSessionId = await AsyncStorage.getItem('currentSessionId');

      // Get all events from user's history
      const eventHistory = await this.getEventHistory();
      
      const now = Date.now();
      const twoHours = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
      const twentySixHours = 26 * 60 * 60 * 1000; // 26 hours in milliseconds

      for (const event of eventHistory) {
        const eventEndTime = new Date(event.expiresAt).getTime();
        const timeSinceEventEnd = now - eventEndTime;
        
        // Check if event ended between 2 hours ago and 26 hours ago
        // This creates the survey visibility window: from 2h after expiry to 26h after expiry
        if (timeSinceEventEnd >= twoHours && timeSinceEventEnd <= twentySixHours) {
          // CRITICAL FIX: Don't show survey if user is currently in the SAME event
          // This prevents survey from showing when user is still actively in the event
          if (currentEventId === event.eventId && currentSessionId === event.sessionId) {
            continue; // Skip this event as user is still actively in it
          }

          // Check if user has already filled survey for this specific event
          const hasFilledSurvey = await this.hasUserFilledSurveyForEvent(event.eventId, event.sessionId);
          if (!hasFilledSurvey) {
            return event;
          }
        }
      }

      return null;
    } catch (error) {
      // Error checking if survey should be shown
      return null;
    }
  }

  /**
   * Check if user has already filled survey for a specific event
   */
  static async hasUserFilledSurveyForEvent(eventId: string, sessionId: string): Promise<boolean> {
    try {
      // Check if there's already feedback for this event and session
      const feedback = await EventFeedbackAPI.filter({ event_id: eventId, profile_id: sessionId });
      return feedback.length > 0;
    } catch (error) {
      // Error checking if user has filled survey
      return false;
    }
  }

  /**
   * Add event to user's event history when they join an event
   */
  static async addEventToHistory(
    eventId: string, 
    eventName: string, 
    sessionId: string, 
    expiresAt: string
  ): Promise<void> {
    try {
      const eventHistory = await this.getEventHistory();
      
      // Check if event already exists in history
      const existingEventIndex = eventHistory.findIndex(e => e.eventId === eventId && e.sessionId === sessionId);
      
      if (existingEventIndex >= 0) {
        // Update existing event
        eventHistory[existingEventIndex] = {
          eventId,
          eventName,
          sessionId,
          expiresAt
        };
      } else {
        // Add new event to the beginning (most recent first)
        eventHistory.unshift({
          eventId,
          eventName,
          sessionId,
          expiresAt
        });
      }

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
   * Mark survey as filled for lifetime
   */
  static async markSurveyFilled(): Promise<void> {
    await AsyncStorage.setItem(this.SURVEY_FILLED_KEY, 'true');
  }

  /**
   * Mark survey as filled for a specific event
   */
  static async markSurveyFilledForEvent(eventId: string, sessionId: string): Promise<void> {
    try {
      // Store that this user has filled the survey for this specific event
      const filledSurveys = await this.getFilledSurveys();
      filledSurveys.push(`${eventId}_${sessionId}`);
      await AsyncStorage.setItem('filledSurveys', JSON.stringify(filledSurveys));
    } catch (error) {
      // Error marking survey as filled for event
    }
  }

  /**
   * Get list of surveys user has already filled
   */
  private static async getFilledSurveys(): Promise<string[]> {
    try {
      const filledSurveysData = await AsyncStorage.getItem('filledSurveys');
      return filledSurveysData ? JSON.parse(filledSurveysData) : [];
    } catch (error) {
      // Error getting filled surveys
      return [];
    }
  }

  /**
   * Check if survey is available for a specific event (between 2h and 26h after event ends)
   */
  static async isSurveyAvailable(eventId: string): Promise<boolean> {
    try {
      const eventHistory = await this.getEventHistory();
      const event = eventHistory.find(e => e.eventId === eventId);
      
      if (!event) return false;

      const eventEndTime = new Date(event.expiresAt).getTime();
      const now = Date.now();
      const twoHours = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
      const twentySixHours = 26 * 60 * 60 * 1000; // 26 hours in milliseconds

      const timeSinceEventEnd = now - eventEndTime;
      
      // Check if event ended between 2 hours ago and 26 hours ago
      return timeSinceEventEnd >= twoHours && timeSinceEventEnd <= twentySixHours;
    } catch (error) {
      // Error checking survey availability
      return false;
    }
  }

  /**
   * Check if survey is still valid (within 26h window)
   */
  static async isSurveyValid(eventId: string): Promise<boolean> {
    try {
      const eventHistory = await this.getEventHistory();
      const event = eventHistory.find(e => e.eventId === eventId);
      
      if (!event) return false;

      const eventEndTime = new Date(event.expiresAt).getTime();
      const now = Date.now();
      const twentySixHours = 26 * 60 * 60 * 1000; // 26 hours in milliseconds

      const timeSinceEventEnd = now - eventEndTime;
      
      // Check if event ended within the last 26 hours
      return timeSinceEventEnd <= twentySixHours;
    } catch (error) {
      // Error checking survey validity
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
   * Clear all survey data (for testing or user logout)
   */
  static async clearAllSurveyData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        'eventHistory',
        'filledSurveys',
        this.SURVEY_FILLED_KEY
      ]);
    } catch (error) {
      // Error clearing survey data
    }
  }

  /**
   * Submit survey feedback for an event
   */
  static async submitSurveyFeedback(
    eventId: string,
    sessionId: string,
    feedback: SurveyFeedback
  ): Promise<void> {
    try {
      // Combine all feedback into a single feedback string
      const feedbackText = `Ease of Use: ${feedback.easeOfUse}/5, Matched with Others: ${feedback.matchedWithOthers}, Would Use Again: ${feedback.wouldUseAgain}, Event Satisfaction: ${feedback.eventSatisfaction}/5${feedback.improvements ? `, Improvements: ${feedback.improvements}` : ''}`;
      
      // Calculate overall rating (average of ease of use and event satisfaction)
      const overallRating = Math.round((feedback.easeOfUse + feedback.eventSatisfaction) / 2);
      
      // Submit feedback to database
      await EventFeedbackAPI.create({
        event_id: eventId,
        profile_id: sessionId,
        rating: overallRating,
        feedback: feedbackText,
      });

      // Mark survey as filled for this specific event
      await this.markSurveyFilledForEvent(eventId, sessionId);
    } catch (error) {
      // Error submitting survey feedback
      throw error;
    }
  }
}
