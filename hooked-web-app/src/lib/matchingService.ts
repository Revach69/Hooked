'use client';

import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { getFirestore } from './firebase';
import { NotificationHelpers } from './notificationHelpers';
import type { UserProfile } from './sessionManager';

export interface EventProfile {
  id: string;
  sessionId: string;
  eventId: string;
  profile: UserProfile;
  isVisible: boolean;
  lastSeen: number;
  createdAt: number;
}

export interface LikeRecord {
  id: string;
  eventId: string;
  likerSessionId: string;
  likedSessionId: string;
  isMutual: boolean;
  createdAt: number;
  likerNotifiedOfMatch?: boolean;
  likedNotifiedOfMatch?: boolean;
}

export interface SkipRecord {
  id: string;
  eventId: string;
  skipperSessionId: string;
  skippedSessionId: string;
  createdAt: number;
}

export interface MatchRecord {
  id: string;
  eventId: string;
  sessionId1: string;
  sessionId2: string;
  profile1: UserProfile;
  profile2: UserProfile;
  createdAt: number;
  lastMessageAt?: number;
  isActive: boolean;
}

export class MatchingService {
  private static getFirestore() {
    const db = getFirestore();
    if (!db) {
      throw new Error('Firebase not initialized');
    }
    return db;
  }

  /**
   * Get event profiles for discovery (excluding current user, liked, and skipped profiles)
   */
  static async getDiscoveryProfiles(
    eventId: string, 
    currentSessionId: string,
    excludeLiked: string[] = [],
    excludeSkipped: string[] = []
  ): Promise<EventProfile[]> {
    try {
      const db = this.getFirestore();
      
      // Get all visible profiles in the event
      const profilesRef = collection(db, 'event_profiles');
      const profilesQuery = query(
        profilesRef,
        where('eventId', '==', eventId),
        where('isVisible', '==', true),
        where('sessionId', '!=', currentSessionId),
        orderBy('sessionId'),
        orderBy('lastSeen', 'desc')
      );
      
      const profilesSnapshot = await getDocs(profilesQuery);
      const allProfiles = profilesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as EventProfile[];

      // Filter out liked and skipped profiles
      const excludeSet = new Set([...excludeLiked, ...excludeSkipped]);
      
      return allProfiles.filter(profile => 
        !excludeSet.has(profile.sessionId)
      );

    } catch (error) {
      console.error('Error getting discovery profiles:', error);
      throw error;
    }
  }

  /**
   * Create or update an event profile
   */
  static async upsertEventProfile(
    eventId: string,
    sessionId: string,
    userProfile: UserProfile,
    isVisible: boolean = true
  ): Promise<EventProfile> {
    try {
      const db = this.getFirestore();
      const profileId = `${eventId}_${sessionId}`;
      const profileRef = doc(db, 'event_profiles', profileId);

      const eventProfile: EventProfile = {
        id: profileId,
        sessionId,
        eventId,
        profile: userProfile,
        isVisible,
        lastSeen: Date.now(),
        createdAt: Date.now(),
      };

      await setDoc(profileRef, eventProfile, { merge: true });
      return eventProfile;

    } catch (error) {
      console.error('Error upserting event profile:', error);
      throw error;
    }
  }

  /**
   * Like a profile
   */
  static async likeProfile(
    eventId: string,
    likerSessionId: string,
    likedSessionId: string
  ): Promise<{ isMatch: boolean; matchId?: string }> {
    try {
      const db = this.getFirestore();
      
      // Check if already liked
      const existingLikeQuery = query(
        collection(db, 'likes'),
        where('eventId', '==', eventId),
        where('likerSessionId', '==', likerSessionId),
        where('likedSessionId', '==', likedSessionId)
      );
      
      const existingLikeSnapshot = await getDocs(existingLikeQuery);
      if (!existingLikeSnapshot.empty) {
        throw new Error('Profile already liked');
      }

      // Create like record
      const likeId = `${eventId}_${likerSessionId}_${likedSessionId}`;
      const likeRef = doc(db, 'likes', likeId);
      
      const likeRecord: LikeRecord = {
        id: likeId,
        eventId,
        likerSessionId,
        likedSessionId,
        isMutual: false,
        createdAt: Date.now(),
      };

      await setDoc(likeRef, likeRecord);

      // Check for mutual like
      const mutualLikeQuery = query(
        collection(db, 'likes'),
        where('eventId', '==', eventId),
        where('likerSessionId', '==', likedSessionId),
        where('likedSessionId', '==', likerSessionId)
      );

      const mutualLikeSnapshot = await getDocs(mutualLikeQuery);
      
      if (!mutualLikeSnapshot.empty) {
        // It's a match!
        const mutualLikeDoc = mutualLikeSnapshot.docs[0];
        const matchId = await this.createMatch(
          eventId,
          likerSessionId,
          likedSessionId
        );

        // Update both like records to mark as mutual
        await updateDoc(likeRef, { 
          isMutual: true,
          likerNotifiedOfMatch: false
        });
        
        await updateDoc(mutualLikeDoc.ref, { 
          isMutual: true,
          likedNotifiedOfMatch: false
        });

        return { isMatch: true, matchId };
      }

      return { isMatch: false };

    } catch (error) {
      console.error('Error liking profile:', error);
      throw error;
    }
  }

  /**
   * Skip a profile
   */
  static async skipProfile(
    eventId: string,
    skipperSessionId: string,
    skippedSessionId: string
  ): Promise<void> {
    try {
      const db = this.getFirestore();
      
      // Check if already skipped
      const existingSkipQuery = query(
        collection(db, 'skips'),
        where('eventId', '==', eventId),
        where('skipperSessionId', '==', skipperSessionId),
        where('skippedSessionId', '==', skippedSessionId)
      );
      
      const existingSkipSnapshot = await getDocs(existingSkipQuery);
      if (!existingSkipSnapshot.empty) {
        return; // Already skipped
      }

      // Create skip record
      const skipId = `${eventId}_${skipperSessionId}_${skippedSessionId}`;
      const skipRef = doc(db, 'skips', skipId);
      
      const skipRecord: SkipRecord = {
        id: skipId,
        eventId,
        skipperSessionId,
        skippedSessionId,
        createdAt: Date.now(),
      };

      await setDoc(skipRef, skipRecord);

    } catch (error) {
      console.error('Error skipping profile:', error);
      throw error;
    }
  }

  /**
   * Create a match between two users
   */
  private static async createMatch(
    eventId: string,
    sessionId1: string,
    sessionId2: string
  ): Promise<string> {
    try {
      const db = this.getFirestore();
      
      // Get profiles for both users
      const profile1Ref = doc(db, 'event_profiles', `${eventId}_${sessionId1}`);
      const profile2Ref = doc(db, 'event_profiles', `${eventId}_${sessionId2}`);
      
      const [profile1Doc, profile2Doc] = await Promise.all([
        getDoc(profile1Ref),
        getDoc(profile2Ref)
      ]);

      if (!profile1Doc.exists() || !profile2Doc.exists()) {
        throw new Error('One or both profiles not found');
      }

      const profile1Data = profile1Doc.data() as EventProfile;
      const profile2Data = profile2Doc.data() as EventProfile;

      // Create match record
      const matchId = `${eventId}_${[sessionId1, sessionId2].sort().join('_')}`;
      const matchRef = doc(db, 'matches', matchId);
      
      const matchRecord: MatchRecord = {
        id: matchId,
        eventId,
        sessionId1,
        sessionId2,
        profile1: profile1Data.profile,
        profile2: profile2Data.profile,
        createdAt: Date.now(),
        isActive: true,
      };

      await setDoc(matchRef, matchRecord);
      
      // Send notifications to both users about the new match
      try {
        await Promise.all([
          NotificationHelpers.notifyNewMatch(sessionId1, matchRecord, profile2Data.profile),
          NotificationHelpers.notifyNewMatch(sessionId2, matchRecord, profile1Data.profile)
        ]);
      } catch (notificationError) {
        console.warn('Failed to send match notifications:', notificationError);
        // Don't throw error - match creation should succeed even if notifications fail
      }
      
      return matchId;

    } catch (error) {
      console.error('Error creating match:', error);
      throw error;
    }
  }

  /**
   * Get user's matches in an event
   */
  static async getUserMatches(
    eventId: string,
    sessionId: string
  ): Promise<MatchRecord[]> {
    try {
      const db = this.getFirestore();
      
      const matchesRef = collection(db, 'matches');
      const matchesQuery = query(
        matchesRef,
        where('eventId', '==', eventId),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );
      
      const matchesSnapshot = await getDocs(matchesQuery);
      const allMatches = matchesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MatchRecord[];

      // Filter matches that include the current user
      return allMatches.filter(match => 
        match.sessionId1 === sessionId || match.sessionId2 === sessionId
      );

    } catch (error) {
      console.error('Error getting user matches:', error);
      throw error;
    }
  }

  /**
   * Get user's liked profiles
   */
  static async getUserLikes(
    eventId: string,
    sessionId: string
  ): Promise<string[]> {
    try {
      const db = this.getFirestore();
      
      const likesRef = collection(db, 'likes');
      const likesQuery = query(
        likesRef,
        where('eventId', '==', eventId),
        where('likerSessionId', '==', sessionId)
      );
      
      const likesSnapshot = await getDocs(likesQuery);
      
      return likesSnapshot.docs.map(doc => {
        const data = doc.data() as LikeRecord;
        return data.likedSessionId;
      });

    } catch (error) {
      console.error('Error getting user likes:', error);
      return [];
    }
  }

  /**
   * Get user's skipped profiles
   */
  static async getUserSkips(
    eventId: string,
    sessionId: string
  ): Promise<string[]> {
    try {
      const db = this.getFirestore();
      
      const skipsRef = collection(db, 'skips');
      const skipsQuery = query(
        skipsRef,
        where('eventId', '==', eventId),
        where('skipperSessionId', '==', sessionId)
      );
      
      const skipsSnapshot = await getDocs(skipsQuery);
      
      return skipsSnapshot.docs.map(doc => {
        const data = doc.data() as SkipRecord;
        return data.skippedSessionId;
      });

    } catch (error) {
      console.error('Error getting user skips:', error);
      return [];
    }
  }

  /**
   * Listen to matches for real-time updates
   */
  static listenToMatches(
    eventId: string,
    sessionId: string,
    callback: (matches: MatchRecord[]) => void
  ): Unsubscribe {
    try {
      const db = this.getFirestore();
      
      const matchesRef = collection(db, 'matches');
      const matchesQuery = query(
        matchesRef,
        where('eventId', '==', eventId),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );
      
      return onSnapshot(matchesQuery, (snapshot) => {
        const allMatches = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as MatchRecord[];

        // Filter matches that include the current user
        const userMatches = allMatches.filter(match => 
          match.sessionId1 === sessionId || match.sessionId2 === sessionId
        );

        callback(userMatches);
      });

    } catch (error) {
      console.error('Error setting up matches listener:', error);
      return () => {}; // Return empty unsubscribe function
    }
  }

  /**
   * Update user visibility in event
   */
  static async updateUserVisibility(
    eventId: string,
    sessionId: string,
    isVisible: boolean
  ): Promise<void> {
    try {
      const db = this.getFirestore();
      const profileId = `${eventId}_${sessionId}`;
      const profileRef = doc(db, 'event_profiles', profileId);

      await updateDoc(profileRef, {
        isVisible,
        lastSeen: Date.now(),
      });

    } catch (error) {
      console.error('Error updating user visibility:', error);
      throw error;
    }
  }

  /**
   * Update user's last seen timestamp
   */
  static async updateLastSeen(
    eventId: string,
    sessionId: string
  ): Promise<void> {
    try {
      const db = this.getFirestore();
      const profileId = `${eventId}_${sessionId}`;
      const profileRef = doc(db, 'event_profiles', profileId);

      await updateDoc(profileRef, {
        lastSeen: Date.now(),
      });

    } catch (error) {
      console.error('Error updating last seen:', error);
      // Don't throw error for this non-critical operation
    }
  }
}