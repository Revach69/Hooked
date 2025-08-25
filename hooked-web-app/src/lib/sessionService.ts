'use client';

import { doc, setDoc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { getDb } from './firebase';
import { useSessionStore, SessionManager, UserProfile } from './sessionManager';

export interface FirebaseSession {
  sessionId: string;
  userId?: string;
  deviceInfo: {
    userAgent: string;
    screen: string;
    platform: string;
    isMobile: boolean;
  };
  createdAt: any; // Firebase Timestamp
  lastActivity: any; // Firebase Timestamp
  isActive: boolean;
  metadata?: {
    eventId?: string;
    referrer?: string;
    source?: 'qr' | 'link' | 'direct';
  };
}

export class SessionService {
  private static readonly COLLECTION_NAME = 'webSessions';
  private static readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

  static async createSession(metadata?: FirebaseSession['metadata']): Promise<string> {
    try {
      const db = getDb();
      const sessionId = SessionManager.initializeSession();
      
      // Get device info for tracking
      const deviceInfo = {
        userAgent: navigator.userAgent,
        screen: `${screen.width}x${screen.height}`,
        platform: navigator.platform,
        isMobile: /Mobi|Android/i.test(navigator.userAgent),
      };

      const sessionData: FirebaseSession = {
        sessionId,
        deviceInfo,
        createdAt: serverTimestamp(),
        lastActivity: serverTimestamp(),
        isActive: true,
        metadata,
      };

      // Store session in Firebase
      await setDoc(doc(db, this.COLLECTION_NAME, sessionId), sessionData);
      
      console.log(`Session created: ${sessionId}`);
      return sessionId;
    } catch (error) {
      console.error('Failed to create session:', error);
      // Fall back to local session if Firebase fails
      return SessionManager.initializeSession();
    }
  }

  static async validateSession(sessionId: string): Promise<boolean> {
    try {
      const db = getDb();
      const sessionDoc = await getDoc(doc(db, this.COLLECTION_NAME, sessionId));
      
      if (!sessionDoc.exists()) {
        return false;
      }

      const data = sessionDoc.data() as FirebaseSession;
      
      // Check if session is expired
      if (data.lastActivity) {
        const lastActivity = data.lastActivity.toDate();
        const isExpired = Date.now() - lastActivity.getTime() > this.SESSION_TIMEOUT;
        
        if (isExpired) {
          await this.expireSession(sessionId);
          return false;
        }
      }

      return data.isActive;
    } catch (error) {
      console.error('Session validation failed:', error);
      // Fall back to local validation
      return useSessionStore.getState().isSessionValid();
    }
  }

  static async updateActivity(sessionId: string): Promise<void> {
    try {
      const db = getDb();
      await updateDoc(doc(db, this.COLLECTION_NAME, sessionId), {
        lastActivity: serverTimestamp(),
      });

      // Also update local state
      useSessionStore.getState().updateActivity();
    } catch (error) {
      console.error('Failed to update activity:', error);
      // Still update local state
      useSessionStore.getState().updateActivity();
    }
  }

  static async setUserProfile(sessionId: string, profile: UserProfile): Promise<void> {
    try {
      const db = getDb();
      await updateDoc(doc(db, this.COLLECTION_NAME, sessionId), {
        userId: profile.id,
        lastActivity: serverTimestamp(),
      });

      // Update local state
      useSessionStore.getState().setProfile(profile);
    } catch (error) {
      console.error('Failed to set user profile:', error);
      // Still update local state
      useSessionStore.getState().setProfile(profile);
    }
  }

  static async joinEvent(sessionId: string, eventId: string): Promise<void> {
    try {
      const db = getDb();
      await updateDoc(doc(db, this.COLLECTION_NAME, sessionId), {
        'metadata.eventId': eventId,
        lastActivity: serverTimestamp(),
      });

      // Update local state
      useSessionStore.getState().joinEvent(eventId);
    } catch (error) {
      console.error('Failed to join event:', error);
      // Still update local state
      useSessionStore.getState().joinEvent(eventId);
    }
  }

  static async leaveEvent(sessionId: string): Promise<void> {
    try {
      const db = getDb();
      await updateDoc(doc(db, this.COLLECTION_NAME, sessionId), {
        'metadata.eventId': null,
        lastActivity: serverTimestamp(),
      });

      // Update local state
      useSessionStore.getState().leaveEvent();
    } catch (error) {
      console.error('Failed to leave event:', error);
      // Still update local state
      useSessionStore.getState().leaveEvent();
    }
  }

  static async expireSession(sessionId: string): Promise<void> {
    try {
      const db = getDb();
      await updateDoc(doc(db, this.COLLECTION_NAME, sessionId), {
        isActive: false,
        lastActivity: serverTimestamp(),
      });

      // Clear local state
      useSessionStore.getState().clearSession();
      console.log(`Session expired: ${sessionId}`);
    } catch (error) {
      console.error('Failed to expire session:', error);
      // Still clear local state
      useSessionStore.getState().clearSession();
    }
  }

  static async deleteSession(sessionId: string): Promise<void> {
    try {
      const db = getDb();
      await deleteDoc(doc(db, this.COLLECTION_NAME, sessionId));
      
      // Clear local state
      useSessionStore.getState().clearSession();
      console.log(`Session deleted: ${sessionId}`);
    } catch (error) {
      console.error('Failed to delete session:', error);
      // Still clear local state
      useSessionStore.getState().clearSession();
    }
  }

  static async getSession(sessionId: string): Promise<FirebaseSession | null> {
    try {
      const db = getDb();
      const sessionDoc = await getDoc(doc(db, this.COLLECTION_NAME, sessionId));
      
      if (!sessionDoc.exists()) {
        return null;
      }

      return sessionDoc.data() as FirebaseSession;
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  }

  // Cleanup expired sessions (could be called periodically)
  static async cleanupExpiredSessions(): Promise<void> {
    // This would typically be implemented as a Firebase Function
    // For now, we'll just clean up local storage
    await SessionManager.cleanupExpiredSessions();
  }

  // Initialize session with proper Firebase integration
  static async initialize(metadata?: FirebaseSession['metadata']): Promise<string> {
    const localSessionId = SessionManager.getSessionId();
    
    if (localSessionId && await this.validateSession(localSessionId)) {
      // Session exists and is valid, just update activity
      await this.updateActivity(localSessionId);
      return localSessionId;
    }
    
    // Create new session
    return await this.createSession(metadata);
  }
}