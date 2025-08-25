'use client';

import { SessionService } from './sessionService';
import { useSessionStore } from './sessionManager';

export class SessionCleanupService {
  private static readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private static cleanupInterval: NodeJS.Timeout | null = null;

  static startCleanup(): void {
    if (typeof window === 'undefined') return;

    this.stopCleanup(); // Clear any existing interval

    this.cleanupInterval = setInterval(async () => {
      await this.performCleanup();
    }, this.CLEANUP_INTERVAL);

    // Also perform cleanup on page visibility change
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    // Cleanup on page unload
    window.addEventListener('beforeunload', this.handleBeforeUnload);

    console.log('Session cleanup service started');
  }

  static stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);

    console.log('Session cleanup service stopped');
  }

  private static handleVisibilityChange = async (): Promise<void> => {
    if (document.visibilityState === 'visible') {
      // Page became visible, validate current session
      const sessionId = useSessionStore.getState().sessionId;
      if (sessionId) {
        const isValid = await SessionService.validateSession(sessionId);
        if (!isValid) {
          // Session expired while away, clear local state
          useSessionStore.getState().clearSession();
        }
      }
    }
  };

  private static handleBeforeUnload = (): void => {
    // Update last activity timestamp before page unload
    const sessionId = useSessionStore.getState().sessionId;
    if (sessionId) {
      // Use navigator.sendBeacon for reliable delivery
      if (navigator.sendBeacon) {
        const data = JSON.stringify({
          sessionId,
          action: 'updateActivity',
          timestamp: Date.now(),
        });
        navigator.sendBeacon('/api/session-activity', data);
      }
    }
  };

  private static async performCleanup(): Promise<void> {
    try {
      const { sessionId, isSessionValid } = useSessionStore.getState();

      if (!sessionId) return;

      // Check if local session is still valid
      if (!isSessionValid()) {
        console.log('Local session expired, clearing state');
        useSessionStore.getState().clearSession();
        return;
      }

      // Validate with Firebase
      const isFirebaseValid = await SessionService.validateSession(sessionId);
      if (!isFirebaseValid) {
        console.log('Firebase session invalid, clearing local state');
        useSessionStore.getState().clearSession();
        return;
      }

      // Update activity if everything is valid
      await SessionService.updateActivity(sessionId);
    } catch (error) {
      console.error('Session cleanup error:', error);
    }
  }

  // Clean up expired data from localStorage
  static cleanupLocalStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const keys = Object.keys(localStorage);
      const now = Date.now();
      const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

      keys.forEach(key => {
        if (key.startsWith('hooked-')) {
          try {
            const item = localStorage.getItem(key);
            if (item) {
              const parsed = JSON.parse(item);
              if (parsed.state && parsed.state.lastActivity) {
                const age = now - parsed.state.lastActivity;
                if (age > SEVEN_DAYS) {
                  localStorage.removeItem(key);
                  console.log(`Removed expired localStorage item: ${key}`);
                }
              }
            }
          } catch (error) {
            console.warn(`Failed to parse localStorage item ${key}:`, error);
            // Remove invalid items
            localStorage.removeItem(key);
          }
        }
      });
    } catch (error) {
      console.error('localStorage cleanup error:', error);
    }
  }

  // Initialize cleanup service
  static initialize(): () => void {
    this.cleanupLocalStorage();
    this.startCleanup();

    // Return cleanup function
    return () => {
      this.stopCleanup();
    };
  }
}