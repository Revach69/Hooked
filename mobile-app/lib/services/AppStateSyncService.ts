import { AppState, AppStateStatus } from 'react-native';
import { app } from '../firebaseConfig';
import { httpsCallable } from 'firebase/functions';
import { getFunctions } from 'firebase/functions';
import * as Sentry from '@sentry/react-native';
import { getInstallationId } from '../session/sessionId';

class AppStateSyncServiceClass {
  private sessionId: string | null = null;
  private isRunning = false;
  private debounceTimeout: ReturnType<typeof setTimeout> | null = null;
  private appStateListener: ((status: AppStateStatus) => void) | null = null;

  /**
   * Start syncing app state changes to Firestore
   */
  startAppStateSync(sessionId: string): void {
    if (this.isRunning) {
      console.log('AppStateSyncService: Already running, stopping first');
      this.stopAppStateSync();
    }

    this.sessionId = sessionId;
    this.isRunning = true;

    Sentry.addBreadcrumb({
      message: 'AppStateSyncService: Starting app state sync',
      level: 'info',
      category: 'app_state',
      data: { sessionId }
    });

    // Write initial state
    this.writeAppState(AppState.currentState === 'active');

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

      // Debounce the write to avoid excessive Firestore calls
      this.debouncedWriteAppState(isForeground);
    };

    AppState.addEventListener('change', this.appStateListener);

    console.log('AppStateSyncService: Started for session:', sessionId);
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

    console.log('AppStateSyncService: Stopped');
  }

  /**
   * Write app state to Firestore immediately (for app start/focus)
   */
  writeAppStateImmediate(isForeground: boolean): void {
    if (!this.sessionId) {
      console.warn('AppStateSyncService: No session ID, cannot write app state');
      return;
    }

    this.writeAppState(isForeground);
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
    this.debounceTimeout = setTimeout(() => {
      this.writeAppState(isForeground);
    }, 300);
  }

  /**
   * Write app state to Firestore via callable function
   */
  private async writeAppState(isForeground: boolean): Promise<void> {
    if (!this.sessionId) {
      return;
    }

    try {
      const functions = getFunctions(app, 'us-central1');
      const setAppState = httpsCallable(functions, 'setAppState');
      
      // Get installation ID
      const installationId = await getInstallationId();
      
      await setAppState({
        sessionId: this.sessionId,
        isForeground,
        installationId
      });

      Sentry.addBreadcrumb({
        message: 'AppStateSyncService: App state written via callable',
        level: 'info',
        category: 'app_state',
        data: { 
          sessionId: this.sessionId,
          isForeground,
          installationId: installationId.substring(0, 8) + '...'
        }
      });

    } catch (error) {
      console.error('AppStateSyncService: Error writing app state:', error);
      Sentry.captureException(error, {
        tags: {
          operation: 'app_state_sync',
          source: 'writeAppState'
        },
        extra: {
          sessionId: this.sessionId,
          isForeground
        }
      });
    }
  }

  /**
   * Get current sync status
   */
  getStatus(): { isRunning: boolean; sessionId: string | null } {
    return {
      isRunning: this.isRunning,
      sessionId: this.sessionId
    };
  }
}

export const AppStateSyncService = new AppStateSyncServiceClass();
export default AppStateSyncService;
