import * as Notifications from 'expo-notifications';
import * as Sentry from '@sentry/react-native';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebaseConfig';
import { getInstallationId } from '../session/sessionId';

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
    Sentry.captureException(error);
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
    Sentry.captureException(error);
    return {
      granted: false,
      canAskAgain: false,
      status: 'unknown',
    };
  }
}

/**
 * Update app state on server (foreground/background)
 */
export async function updateAppState(isForeground: boolean, sessionId?: string): Promise<void> {
  try {
    if (!sessionId) {
      console.warn('updateAppState: No sessionId provided, skipping');
      return;
    }

    const updateAppStateCallable = httpsCallable(functions, 'updateAppState');
    await updateAppStateCallable({ isForeground, sessionId });
  } catch (error) {
    Sentry.captureException(error);
  }
}

/**
 * Set app state using the new session-based callable (preferred)
 */
export async function setAppState(isForeground: boolean, sessionId: string): Promise<void> {
  try {
    const setAppStateCallable = httpsCallable(functions, 'setAppState');
    const installationId = await getInstallationId();
    
    await setAppStateCallable({ 
      sessionId, 
      isForeground, 
      installationId 
    });
  } catch (error) {
    Sentry.captureException(error);
  }
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
  try {
    console.log('setMuteStatus: Using direct Firestore API with:', {
      event_id: eventId,
      muter_session_id: muterSessionId,
      muted_session_id: mutedSessionId,
      muted
    });
    
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
      
      await Promise.all(mutedRecords.map(record => MutedMatchAPI.delete(record.id)));
      console.log('setMuteStatus: Successfully removed', mutedRecords.length, 'mute record(s)');
    }
    
  } catch (error: any) {
    console.error('setMuteStatus: Error with direct Firestore API:', error);
    Sentry.captureException(error);
    // Re-throw the error so the caller knows it failed
    throw error;
  }
}
