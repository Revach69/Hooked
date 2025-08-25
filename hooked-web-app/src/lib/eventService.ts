'use client';

import { doc, setDoc, getDoc, updateDoc, serverTimestamp, collection, getDocs, query, where } from 'firebase/firestore';
import { getFirestore } from './firebase';
import type { UserProfile } from './sessionManager';

export interface EventData {
  id: string;
  code: string;
  name: string;
  description: string;
  location: string;
  startTime: number;
  endTime: number;
  organizerId: string;
  isActive: boolean;
  maxParticipants?: number;
  currentParticipants: number;
  createdAt: number;
  lastUpdated: number;
}

export interface EventParticipant {
  sessionId: string;
  profile: UserProfile;
  joinedAt: number;
  isActive: boolean;
  lastSeen: number;
}

export class EventService {
  private static getFirestore() {
    const db = getFirestore();
    if (!db) {
      throw new Error('Firebase not initialized');
    }
    return db;
  }

  /**
   * Join an event using event code
   */
  static async joinEvent(
    sessionId: string, 
    eventCode: string, 
    userProfile: UserProfile
  ): Promise<EventData> {
    try {
      const db = this.getFirestore();
      
      // Find event by code
      const eventsRef = collection(db, 'events');
      const eventQuery = query(eventsRef, where('code', '==', eventCode.toUpperCase()));
      const eventSnapshot = await getDocs(eventQuery);

      if (eventSnapshot.empty) {
        throw new Error('Event not found. Please check the code and try again.');
      }

      const eventDoc = eventSnapshot.docs[0];
      const eventData = eventDoc.data() as EventData;

      // Check if event is active
      if (!eventData.isActive) {
        throw new Error('This event is no longer active.');
      }

      // Check if event has reached capacity
      if (eventData.maxParticipants && eventData.currentParticipants >= eventData.maxParticipants) {
        throw new Error('This event has reached maximum capacity.');
      }

      // Check if event has ended
      if (Date.now() > eventData.endTime) {
        throw new Error('This event has already ended.');
      }

      // Add participant to event
      const participantRef = doc(db, 'events', eventDoc.id, 'participants', sessionId);
      const participant: EventParticipant = {
        sessionId,
        profile: userProfile,
        joinedAt: Date.now(),
        isActive: true,
        lastSeen: Date.now(),
      };

      await setDoc(participantRef, participant);

      // Update event participant count
      await updateDoc(eventDoc.ref, {
        currentParticipants: eventData.currentParticipants + 1,
        lastUpdated: Date.now(),
      });

      // Update session with current event
      await this.updateSessionEvent(sessionId, eventDoc.id);

      return {
        ...eventData,
        id: eventDoc.id,
        currentParticipants: eventData.currentParticipants + 1,
      };

    } catch (error) {
      console.error('Error joining event:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to join event. Please try again.');
    }
  }

  /**
   * Leave an event
   */
  static async leaveEvent(sessionId: string, eventId: string): Promise<void> {
    try {
      const db = this.getFirestore();

      // Remove participant from event
      const participantRef = doc(db, 'events', eventId, 'participants', sessionId);
      const participantDoc = await getDoc(participantRef);

      if (participantDoc.exists()) {
        // Mark participant as inactive instead of deleting
        await updateDoc(participantRef, {
          isActive: false,
          lastSeen: Date.now(),
        });

        // Update event participant count
        const eventRef = doc(db, 'events', eventId);
        const eventDoc = await getDoc(eventRef);
        
        if (eventDoc.exists()) {
          const eventData = eventDoc.data() as EventData;
          await updateDoc(eventRef, {
            currentParticipants: Math.max(0, eventData.currentParticipants - 1),
            lastUpdated: Date.now(),
          });
        }
      }

      // Clear event from session
      await this.clearSessionEvent(sessionId);

    } catch (error) {
      console.error('Error leaving event:', error);
      throw new Error('Failed to leave event. Please try again.');
    }
  }

  /**
   * Get event details by ID
   */
  static async getEvent(eventId: string): Promise<EventData | null> {
    try {
      const db = this.getFirestore();
      const eventRef = doc(db, 'events', eventId);
      const eventDoc = await getDoc(eventRef);

      if (!eventDoc.exists()) {
        return null;
      }

      return {
        ...eventDoc.data() as EventData,
        id: eventDoc.id,
      };

    } catch (error) {
      console.error('Error getting event:', error);
      return null;
    }
  }

  /**
   * Get participants of an event
   */
  static async getEventParticipants(eventId: string): Promise<EventParticipant[]> {
    try {
      const db = this.getFirestore();
      const participantsRef = collection(db, 'events', eventId, 'participants');
      const activeParticipantsQuery = query(participantsRef, where('isActive', '==', true));
      const participantsSnapshot = await getDocs(activeParticipantsQuery);

      return participantsSnapshot.docs.map(doc => doc.data() as EventParticipant);

    } catch (error) {
      console.error('Error getting event participants:', error);
      return [];
    }
  }

  /**
   * Update session activity for an event
   */
  static async updateSessionActivity(sessionId: string, eventId: string): Promise<void> {
    try {
      const db = this.getFirestore();
      const participantRef = doc(db, 'events', eventId, 'participants', sessionId);
      
      await updateDoc(participantRef, {
        lastSeen: Date.now(),
      });

    } catch (error) {
      console.error('Error updating session activity:', error);
      // Don't throw error for activity updates
    }
  }

  /**
   * Check if user is in an event
   */
  static async getUserEvent(sessionId: string): Promise<{ eventId: string; eventData: EventData } | null> {
    try {
      const db = this.getFirestore();
      const sessionRef = doc(db, 'sessions', sessionId);
      const sessionDoc = await getDoc(sessionRef);

      if (!sessionDoc.exists()) {
        return null;
      }

      const sessionData = sessionDoc.data();
      const currentEventId = sessionData.currentEventId;

      if (!currentEventId) {
        return null;
      }

      const eventData = await this.getEvent(currentEventId);
      if (!eventData) {
        // Clean up invalid event reference
        await this.clearSessionEvent(sessionId);
        return null;
      }

      return {
        eventId: currentEventId,
        eventData,
      };

    } catch (error) {
      console.error('Error getting user event:', error);
      return null;
    }
  }

  /**
   * Update session with current event ID
   */
  private static async updateSessionEvent(sessionId: string, eventId: string): Promise<void> {
    try {
      const db = this.getFirestore();
      const sessionRef = doc(db, 'sessions', sessionId);
      
      await updateDoc(sessionRef, {
        currentEventId: eventId,
        lastEventJoinedAt: Date.now(),
        lastUpdated: serverTimestamp(),
      });

    } catch (error) {
      console.error('Error updating session event:', error);
      throw error;
    }
  }

  /**
   * Clear event from session
   */
  private static async clearSessionEvent(sessionId: string): Promise<void> {
    try {
      const db = this.getFirestore();
      const sessionRef = doc(db, 'sessions', sessionId);
      
      await updateDoc(sessionRef, {
        currentEventId: null,
        lastEventLeftAt: Date.now(),
        lastUpdated: serverTimestamp(),
      });

    } catch (error) {
      console.error('Error clearing session event:', error);
      throw error;
    }
  }

  /**
   * Validate event code format
   */
  static validateEventCode(code: string): boolean {
    // Event codes should be 4-20 alphanumeric characters
    const regex = /^[A-Z0-9]{4,20}$/;
    return regex.test(code.toUpperCase());
  }

  /**
   * Generate a random event code (utility for testing)
   */
  static generateEventCode(length: number = 6): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing characters
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}