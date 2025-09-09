import * as Notifications from 'expo-notifications';

// Removed unused Firebase imports - functions moved to direct API calls
import { AsyncStorageUtils } from '../asyncStorageUtils';

export interface NotificationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: string;
}

/**
 * Check current notification permission status
 */
export async function checkNotificationPermission(): Promise<NotificationPermissionStatus> {
  try {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    return {
      granted: status === 'granted',
      canAskAgain,
      status,
    };
  } catch (error) {
    console.error(error);
    return {
      granted: false,
      canAskAgain: false,
      status: 'unknown',
    };
  }
}

/**
 * Request notification permissions
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  try {
    const { status, canAskAgain } = await Notifications.requestPermissionsAsync();
    return {
      granted: status === 'granted',
      canAskAgain,
      status,
    };
  } catch (error) {
    console.error(error);
    return {
      granted: false,
      canAskAgain: false,
      status: 'unknown',
    };
  }
}

/**
 * @deprecated App state tracking is no longer used - client handles notification display
 * Update app state on server (foreground/background)
 */
export async function updateAppState(): Promise<void> {
  // DEPRECATED: Server no longer tracks app state
  // Notifications are always sent, client decides whether to display
  console.warn('updateAppState is deprecated - client handles notification display');
  return Promise.resolve();
}

/**
 * @deprecated App state tracking is no longer used - client handles notification display
 * Set app state using the new session-based callable (preferred)
 */
export async function setAppState(): Promise<void> {
  // DEPRECATED: Server no longer tracks app state
  // Notifications are always sent, client decides whether to display
  console.warn('setAppState is deprecated - client handles notification display');
  return Promise.resolve();
}

/**
 * Set mute status between sessions using direct Firestore API
 */
export async function setMuteStatus(
  eventId: string, 
  muterSessionId: string, 
  mutedSessionId: string, 
  muted: boolean
): Promise<void> {
  // Add timeout to prevent hanging operations
  return Promise.race([
    setMuteStatusInternal(eventId, muterSessionId, mutedSessionId, muted),
    new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error('Mute operation timed out after 10 seconds')), 10000);
    })
  ]);
}

async function setMuteStatusInternal(
  eventId: string, 
  muterSessionId: string, 
  mutedSessionId: string, 
  muted: boolean
): Promise<void> {
  try {
    console.log('setMuteStatus: Using direct Firestore API with:', {
      event_id: eventId,
      muter_session_id: muterSessionId,
      muted_session_id: mutedSessionId,
      muted
    });
    
    // Get event country for correct database routing
    let eventCountry = await AsyncStorageUtils.getItem<string>('currentEventCountry');
    
    // If no event country stored, try to get it from the event
    if (!eventCountry) {
      try {
        const { EventAPI } = await import('../firebaseApi');
        const event = await EventAPI.get(eventId);
        eventCountry = event?.location || null;
        console.log('setMuteStatus: Retrieved event country from event:', eventCountry);
      } catch (eventError) {
        console.warn('setMuteStatus: Could not retrieve event country:', eventError);
      }
    }
    
    const { MutedMatchAPI } = await import('../firebaseApi');
    
    if (muted) {
      // Create mute record
      await MutedMatchAPI.create({
        event_id: eventId,
        muter_session_id: muterSessionId,
        muted_session_id: mutedSessionId
      });
      console.log('setMuteStatus: Successfully created mute record');
    } else {
      // Remove mute record(s)
      const mutedRecords = await MutedMatchAPI.filter({
        event_id: eventId,
        muter_session_id: muterSessionId,
        muted_session_id: mutedSessionId
      });
      
      await Promise.all(mutedRecords.map(record => MutedMatchAPI.delete(record.id, eventCountry || undefined)));
      console.log('setMuteStatus: Successfully removed', mutedRecords.length, 'mute record(s)');
    }
    
  } catch (error) {
    console.error('setMuteStatus: Error with direct Firestore API:', error);
    console.error(error);
    // Re-throw the error so the caller knows it failed
    throw error;
  }
}
