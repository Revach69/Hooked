import { AppState, AppStateStatus } from 'react-native';
import { app, getDbForEvent } from '../firebaseConfig';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import * as Sentry from '@sentry/react-native';
import { getInstallationId } from '../session/sessionId';
import { AsyncStorageUtils } from '../asyncStorageUtils';

class AppStateSyncServiceClass {
  private sessionId: string | null = null;
  private eventId: string | null = null;
  private eventCountry: string | null = null;
  private isRunning = false;
  private debounceTimeout: ReturnType<typeof setTimeout> | null = null;
  private appStateListener: ((_status: AppStateStatus) => void) | null = null;
  private foregroundCallbacks: Set<() => void> = new Set();

  /**
   * Start syncing app state changes to Firestore with regional database support
   */
  async startAppStateSync(sessionId: string): Promise<void> {
    if (this.isRunning) {
      console.log('AppStateSyncService: Already running, stopping first');
      this.stopAppStateSync();
    }

    this.sessionId = sessionId;
    
    // Get current event ID and country for regional database selection
    try {
      this.eventId = await AsyncStorageUtils.getItem<string>('currentEventId');
      if (this.eventId) {
        // Get event details to determine country/region
        const { EventAPI } = await import('../firebaseApi');
        const event = await EventAPI.get(this.eventId);
        this.eventCountry = (event as any)?.country || null;
        console.log('AppStateSyncService: Event context loaded:', {
          eventId: this.eventId,
          eventCountry: this.eventCountry
        });
      }
    } catch (error) {
      console.warn('AppStateSyncService: Failed to load event context, using default database:', error);
      this.eventId = null;
      this.eventCountry = null;
    }
    
    this.isRunning = true;

    Sentry.addBreadcrumb({
      message: 'AppStateSyncService: Starting app state sync',
      level: 'info',
      category: 'app_state',
      data: { sessionId, eventId: this.eventId, eventCountry: this.eventCountry }
    });

    // Write initial state immediately - using regional database
    await this.writeAppState(AppState.currentState === 'active');

    // Set up listener for app state changes
    this.appStateListener = (nextAppState: AppStateStatus) => {
      const isForeground = nextAppState === 'active';
      
      Sentry.addBreadcrumb({
        message: 'AppStateSyncService: App state changed',
        level: 'info',
        category: 'app_state',
        data: { 
          sessionId: this.sessionId,
          appState: nextAppState,
          isForeground 
        }
      });

      // Trigger refresh callbacks when app comes to foreground
      if (isForeground) {
        this.triggerForegroundCallbacks();
      }

      // Debounce the write to avoid excessive Firestore calls
      this.debouncedWriteAppState(isForeground);
    };

    AppState.addEventListener('change', this.appStateListener);

    if (__DEV__) console.log('AppStateSyncService: Started for session:', sessionId);
  }

  /**
   * Stop syncing app state changes
   */
  stopAppStateSync(): void {
    if (!this.isRunning) {
      return;
    }

    Sentry.addBreadcrumb({
      message: 'AppStateSyncService: Stopping app state sync',
      level: 'info',
      category: 'app_state',
      data: { sessionId: this.sessionId }
    });

    // Clear debounce timeout
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }

    // Remove app state listener (AppState doesn't have removeEventListener in newer versions)
    // The listener will be garbage collected when the service is stopped
    this.appStateListener = null;

    this.isRunning = false;
    this.sessionId = null;
    this.eventId = null;
    this.eventCountry = null;

    if (__DEV__) console.log('AppStateSyncService: Stopped');
  }

  /**
   * Write app state to Firestore immediately (for app start/focus)
   */
  async writeAppStateImmediate(isForeground: boolean): Promise<void> {
    if (!this.sessionId) {
      console.warn('AppStateSyncService: No session ID, cannot write app state');
      return;
    }

    await this.writeAppState(isForeground);
  }

  /**
   * Debounced write to avoid excessive Firestore calls
   */
  private debouncedWriteAppState(isForeground: boolean): void {
    // Clear existing timeout
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    // Set new timeout (300ms debounce)
    this.debounceTimeout = setTimeout(async () => {
      await this.writeAppState(isForeground);
    }, 300);
  }

  /**
   * Write app state directly to regional Firestore database
   */
  private async writeAppState(isForeground: boolean): Promise<void> {
    if (!this.sessionId) {
      return;
    }

    try {
      // Use regional database based on event country, fallback to default
      const db = this.eventCountry ? getDbForEvent(this.eventCountry) : getFirestore(app);
      const appStateRef = doc(db, 'app_states', this.sessionId);
      
      console.log('AppStateSyncService: Using database:', {
        eventCountry: this.eventCountry,
        isRegional: !!this.eventCountry,
        sessionId: this.sessionId.substring(0, 8) + '...'
      });
      
      // Get installation ID
      const installationId = await getInstallationId();
      
      await setDoc(appStateRef, {
        isForeground,
        installationId: installationId || null,
        updatedAt: serverTimestamp(),
      });

      console.log('AppStateSyncService: App state written to regional database', {
        sessionId: this.sessionId.substring(0, 8) + '...',
        isForeground,
        eventCountry: this.eventCountry,
        isRegional: !!this.eventCountry
      });

      Sentry.addBreadcrumb({
        message: 'AppStateSyncService: App state written to regional database',
        level: 'info',
        category: 'app_state',
        data: { 
          sessionId: this.sessionId,
          isForeground,
          installationId: installationId ? installationId.substring(0, 8) + '...' : null,
          eventCountry: this.eventCountry,
          isRegional: !!this.eventCountry
        }
      });

    } catch (error: any) {
      console.error('AppStateSyncService: Error writing app state to regional database:', {
        error: error.message,
        code: error.code,
        sessionId: this.sessionId.substring(0, 8) + '...',
        eventCountry: this.eventCountry,
        isRegional: !!this.eventCountry
      });
      
      Sentry.captureException(error, {
        tags: {
          operation: 'app_state_sync',
          source: 'writeAppState_direct'
        },
        extra: {
          sessionId: this.sessionId,
          isForeground,
          errorCode: error.code,
          errorMessage: error.message
        }
      });
    }
  }

  /**
   * Get current sync status
   */
  getStatus(): { isRunning: boolean; sessionId: string | null; eventId: string | null; eventCountry: string | null; isRegional: boolean } {
    return {
      isRunning: this.isRunning,
      sessionId: this.sessionId,
      eventId: this.eventId,
      eventCountry: this.eventCountry,
      isRegional: !!this.eventCountry
    };
  }

  /**
   * Register a callback to be called when app comes to foreground
   */
  onAppForeground(callback: () => void): () => void {
    this.foregroundCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.foregroundCallbacks.delete(callback);
    };
  }

  /**
   * Trigger all registered foreground callbacks
   */
  private triggerForegroundCallbacks(): void {
    if (__DEV__) console.log('AppStateSyncService: Triggering foreground callbacks, count:', this.foregroundCallbacks.size);
    
    this.foregroundCallbacks.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        console.error('AppStateSyncService: Error in foreground callback:', error);
        Sentry.captureException(error, {
          tags: { operation: 'foreground_callback' }
        });
      }
    });
  }
}

export const AppStateSyncService = new AppStateSyncServiceClass();
export default AppStateSyncService;
