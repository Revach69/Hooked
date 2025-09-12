/**
 * Centralized session validation utility
 * Ensures consistent session validation across all components
 */

import { AsyncStorageUtils } from '../asyncStorageUtils';
import { EventAPI, EventProfileAPI } from '../firebaseApi';
import { BackgroundDataPreloader } from '../services/BackgroundDataPreloader';
import { GlobalDataCache } from '../cache/GlobalDataCache';

export interface SessionValidationResult {
  isValid: boolean;
  reason?: string;
  eventId?: string;
  sessionId?: string;
  shouldClearData: boolean;
}

export interface SessionData {
  eventId: string;
  sessionId: string;
  eventCode?: string;
}

/**
 * Comprehensive session validation with consistent timeout handling
 */
export async function validateCurrentSession(timeoutMs: number = 15000): Promise<SessionValidationResult> {
  try {
    // Get session data
    const eventId = await AsyncStorageUtils.getItem<string>('currentEventId');
    const sessionId = await AsyncStorageUtils.getItem<string>('currentSessionId');
    
    if (!eventId || !sessionId) {
      return {
        isValid: false,
        reason: 'missing_session_data',
        shouldClearData: false
      };
    }
    
    // Create timeout promise for consistent timeout handling across components
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Session validation timeout')), timeoutMs);
    });
    
    try {
      // Step 1: Check if event still exists (with timeout)
      const eventCheckPromise = EventAPI.filter({ id: eventId });
      const events = await Promise.race([eventCheckPromise, timeoutPromise]);
      
      if (!events || events.length === 0) {
        console.log('SessionValidator: Event not found or expired');
        return {
          isValid: false,
          reason: 'event_expired',
          eventId,
          sessionId,
          shouldClearData: true
        };
      }
      
      // Step 2: Check if profile still exists for this session (with timeout)
      const profileCheckPromise = EventProfileAPI.filter({
        session_id: sessionId,
        event_id: eventId
      });
      const profiles = await Promise.race([profileCheckPromise, timeoutPromise]);
      
      if (!profiles || profiles.length === 0) {
        console.log('SessionValidator: Profile not found for session');
        return {
          isValid: false,
          reason: 'profile_not_found',
          eventId,
          sessionId,
          shouldClearData: true
        };
      }
      
      // Step 3: Validate event hasn't expired
      const event = events[0];
      const now = Date.now();
      
      if (event.expires_at) {
        const expiryTime = event.expires_at.toDate ? event.expires_at.toDate().getTime() : new Date(event.expires_at as any).getTime();
        if (now > expiryTime) {
          console.log('SessionValidator: Event has expired');
          return {
            isValid: false,
            reason: 'event_expired',
            eventId,
            sessionId,
            shouldClearData: true
          };
        }
      }
      
      // Session is valid
      return {
        isValid: true,
        eventId,
        sessionId,
        shouldClearData: false
      };
      
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        console.warn('SessionValidator: Validation timeout');
        return {
          isValid: false,
          reason: 'validation_timeout',
          eventId,
          sessionId,
          shouldClearData: false // Don't clear on network issues
        };
      }
      
      throw error; // Re-throw non-timeout errors
    }
    
  } catch (error) {
    console.error('SessionValidator: Validation error:', error);
    return {
      isValid: false,
      reason: 'validation_error',
      shouldClearData: false
    };
  }
}

/**
 * Clear all session-related data consistently
 */
export async function clearSessionData(reason: string): Promise<void> {
  console.log(`SessionValidator: Clearing session data (reason: ${reason})`);
  
  try {
    // Clear preloaded data
    BackgroundDataPreloader.clearPreloadedData();
    
    // Clear global cache
    GlobalDataCache.clearAll();
    
    // Clear AsyncStorage
    await AsyncStorageUtils.multiRemove([
      'currentEventId',
      'currentSessionId',
      'currentEventCode',
      'currentProfileColor',
      'currentProfilePhotoUrl',
      'currentEventCountry',
      'currentEventData',
      'isOnConsentPage'
    ]);
    
    console.log('SessionValidator: Session data cleared successfully');
  } catch (error) {
    console.error('SessionValidator: Failed to clear session data:', error);
  }
}

/**
 * Get current session data safely
 */
export async function getCurrentSessionData(): Promise<SessionData | null> {
  try {
    const eventId = await AsyncStorageUtils.getItem<string>('currentEventId');
    const sessionId = await AsyncStorageUtils.getItem<string>('currentSessionId');
    const eventCode = await AsyncStorageUtils.getItem<string>('currentEventCode');
    
    if (!eventId || !sessionId) {
      return null;
    }
    
    return {
      eventId,
      sessionId,
      eventCode: eventCode || undefined
    };
  } catch (error) {
    console.error('SessionValidator: Failed to get session data:', error);
    return null;
  }
}

/**
 * Validate session and handle cleanup if needed
 * Returns true if session is valid, false if user should be redirected
 */
export async function validateAndCleanupSession(): Promise<boolean> {
  const result = await validateCurrentSession();
  
  if (!result.isValid && result.shouldClearData) {
    await clearSessionData(result.reason || 'unknown');
    return false;
  }
  
  if (!result.isValid) {
    console.warn('SessionValidator: Session invalid but not clearing data:', result.reason);
    return false;
  }
  
  return true;
}