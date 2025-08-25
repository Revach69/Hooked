import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Session state interface
export interface SessionState {
  sessionId: string | null;
  isActive: boolean;
  userProfile: UserProfile | null;
  currentEventId: string | null;
  lastActivity: number;
}

// User profile interface (session-based, no auth required)
export interface UserProfile {
  id: string;
  name: string;
  age: number;
  bio: string;
  photos: string[];
  interests: string[];
  createdAt: number;
  lastUpdated: number;
}

// Session actions
interface SessionActions {
  createSession: () => string;
  setProfile: (profile: UserProfile) => void;
  joinEvent: (eventId: string) => void;
  leaveEvent: () => void;
  updateActivity: () => void;
  clearSession: () => void;
  isSessionValid: () => boolean;
}

// Session store with persistence
export const useSessionStore = create<SessionState & SessionActions>()(
  persist(
    (set, get) => ({
      // Initial state
      sessionId: null,
      isActive: false,
      userProfile: null,
      currentEventId: null,
      lastActivity: Date.now(),

      // Actions
      createSession: () => {
        const sessionId = `web_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        set({
          sessionId,
          isActive: true,
          lastActivity: Date.now(),
        });
        return sessionId;
      },

      setProfile: (profile: UserProfile) => {
        set({
          userProfile: profile,
          lastActivity: Date.now(),
        });
      },

      joinEvent: (eventId: string) => {
        set({
          currentEventId: eventId,
          lastActivity: Date.now(),
        });
      },

      leaveEvent: () => {
        set({
          currentEventId: null,
          lastActivity: Date.now(),
        });
      },

      updateActivity: () => {
        set({
          lastActivity: Date.now(),
        });
      },

      clearSession: () => {
        set({
          sessionId: null,
          isActive: false,
          userProfile: null,
          currentEventId: null,
          lastActivity: Date.now(),
        });
      },

      isSessionValid: () => {
        const { sessionId, lastActivity } = get();
        if (!sessionId) return false;
        
        // Session expires after 24 hours of inactivity
        const SESSION_TIMEOUT = 24 * 60 * 60 * 1000;
        return Date.now() - lastActivity < SESSION_TIMEOUT;
      },
    }),
    {
      name: 'hooked-web-session',
      // Only persist essential session data
      partialize: (state) => ({
        sessionId: state.sessionId,
        isActive: state.isActive,
        userProfile: state.userProfile,
        lastActivity: state.lastActivity,
      }),
    }
  )
);

// Session utilities
export class SessionManager {
  static async initializeSession(): Promise<string> {
    const { sessionId, isSessionValid, createSession } = useSessionStore.getState();
    
    if (sessionId && isSessionValid()) {
      // Update activity for existing valid session
      useSessionStore.getState().updateActivity();
      return sessionId;
    }
    
    // Create new session if none exists or expired
    return createSession();
  }

  static getSessionId(): string | null {
    return useSessionStore.getState().sessionId;
  }

  static isLoggedIn(): boolean {
    const { userProfile, isSessionValid } = useSessionStore.getState();
    return userProfile !== null && isSessionValid();
  }

  static requireProfile(): UserProfile {
    const { userProfile } = useSessionStore.getState();
    if (!userProfile) {
      throw new Error('User profile required but not found');
    }
    return userProfile;
  }

  static async cleanupExpiredSessions(): Promise<void> {
    const { isSessionValid, clearSession } = useSessionStore.getState();
    
    if (!isSessionValid()) {
      clearSession();
    }
  }

  // Activity heartbeat for mobile web
  static startActivityHeartbeat(): () => void {
    const updateActivity = useSessionStore.getState().updateActivity;
    
    // Update activity every 30 seconds when visible
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        updateActivity();
      }
    }, 30000);

    // Update activity on user interactions
    const events = ['touchstart', 'click', 'scroll', 'keypress'];
    const handleUserActivity = () => updateActivity();
    
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, { passive: true });
    });

    // Return cleanup function
    return () => {
      clearInterval(interval);
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity);
      });
    };
  }
}

// Hook for reactive session state
export function useSession() {
  return useSessionStore();
}