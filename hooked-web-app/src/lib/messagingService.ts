'use client';

import { 
  doc, 
  setDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  startAfter,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  addDoc,
  updateDoc,
  Unsubscribe
} from 'firebase/firestore';
import { getFirestore } from './firebase';
import { NotificationHelpers } from './notificationHelpers';
import type { UserProfile } from './sessionManager';
import type { MatchRecord } from './matchingService';

export interface ChatMessage {
  id: string;
  content: string;
  fromProfileId: string;
  toProfileId: string;
  fromSessionId: string;
  toSessionId: string;
  eventId: string;
  createdAt: Timestamp | number;
  senderProfile?: UserProfile;
  isRead: boolean;
}

export interface ChatSession {
  id: string;
  participants: string[]; // session IDs
  eventId: string;
  lastMessageAt?: Timestamp | number;
  lastMessage?: string;
  lastMessageSender?: string;
  isActive: boolean;
  createdAt: Timestamp | number;
}

export interface TypingIndicator {
  sessionId: string;
  userProfile: UserProfile;
  isTyping: boolean;
  lastTypingAt: number;
}

export class MessagingService {
  private static getFirestore() {
    const db = getFirestore();
    if (!db) {
      throw new Error('Firebase not initialized');
    }
    return db;
  }

  /**
   * Create or get existing chat session between two users
   */
  static async getOrCreateChatSession(
    eventId: string,
    sessionId1: string,
    sessionId2: string
  ): Promise<string> {
    try {
      const db = this.getFirestore();
      
      // Create deterministic chat session ID
      const participants = [sessionId1, sessionId2].sort();
      const chatSessionId = `${eventId}_${participants.join('_')}`;
      
      const chatSessionRef = doc(db, 'chat_sessions', chatSessionId);
      
      // Create session if it doesn't exist
      const chatSession: ChatSession = {
        id: chatSessionId,
        participants,
        eventId,
        isActive: true,
        createdAt: Date.now(),
      };

      await setDoc(chatSessionRef, chatSession, { merge: true });
      
      return chatSessionId;

    } catch (error) {
      console.error('Error creating chat session:', error);
      throw error;
    }
  }

  /**
   * Send a message
   */
  static async sendMessage(
    eventId: string,
    fromSessionId: string,
    toSessionId: string,
    fromProfile: UserProfile,
    content: string
  ): Promise<ChatMessage> {
    try {
      const db = this.getFirestore();
      
      if (!content.trim()) {
        throw new Error('Message content cannot be empty');
      }

      // Get or create chat session
      const chatSessionId = await this.getOrCreateChatSession(
        eventId,
        fromSessionId,
        toSessionId
      );

      // Create message
      const messagesRef = collection(db, 'messages');
      const messageData = {
        content: content.trim(),
        fromProfileId: fromProfile.id,
        toProfileId: `${eventId}_${toSessionId}`, // Will need to resolve this properly
        fromSessionId,
        toSessionId,
        eventId,
        chatSessionId,
        createdAt: serverTimestamp(),
        isRead: false,
        senderProfile: fromProfile,
      };

      const docRef = await addDoc(messagesRef, messageData);
      
      // Update chat session with last message info
      const chatSessionRef = doc(db, 'chat_sessions', chatSessionId);
      await updateDoc(chatSessionRef, {
        lastMessageAt: serverTimestamp(),
        lastMessage: content.trim(),
        lastMessageSender: fromSessionId,
      });

      // Send notification to recipient about new message
      try {
        const matchId = chatSessionId.split('_').slice(2).sort().join('_');
        await NotificationHelpers.notifyNewMessage(
          toSessionId,
          matchId,
          fromProfile,
          content.trim()
        );
      } catch (notificationError) {
        console.warn('Failed to send message notification:', notificationError);
        // Don't throw error - message sending should succeed even if notification fails
      }

      return {
        id: docRef.id,
        ...messageData,
        createdAt: Date.now(),
        senderProfile: fromProfile,
      } as ChatMessage;

    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Get messages for a chat session
   */
  static async getMessages(
    chatSessionId: string,
    limitCount: number = 50,
    lastDoc?: any
  ): Promise<ChatMessage[]> {
    try {
      const db = this.getFirestore();
      
      let messagesQuery = query(
        collection(db, 'messages'),
        where('chatSessionId', '==', chatSessionId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      if (lastDoc) {
        messagesQuery = query(
          collection(db, 'messages'),
          where('chatSessionId', '==', chatSessionId),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(limitCount)
        );
      }

      const snapshot = await getDocs(messagesQuery);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).reverse() as ChatMessage[]; // Reverse to show oldest first

    } catch (error) {
      console.error('Error getting messages:', error);
      throw error;
    }
  }

  /**
   * Listen to real-time messages
   */
  static listenToMessages(
    chatSessionId: string,
    callback: (messages: ChatMessage[]) => void,
    limitCount: number = 50
  ): Unsubscribe {
    try {
      const db = this.getFirestore();
      
      const messagesQuery = query(
        collection(db, 'messages'),
        where('chatSessionId', '==', chatSessionId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      return onSnapshot(messagesQuery, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).reverse() as ChatMessage[]; // Reverse to show oldest first

        callback(messages);
      });

    } catch (error) {
      console.error('Error setting up message listener:', error);
      return () => {}; // Return empty unsubscribe function
    }
  }

  /**
   * Get user's chat sessions (matches they can message)
   */
  static async getUserChatSessions(
    eventId: string,
    sessionId: string
  ): Promise<{ session: ChatSession; otherUserProfile?: UserProfile }[]> {
    try {
      const db = this.getFirestore();
      
      const chatSessionsQuery = query(
        collection(db, 'chat_sessions'),
        where('eventId', '==', eventId),
        where('participants', 'array-contains', sessionId),
        where('isActive', '==', true),
        orderBy('lastMessageAt', 'desc')
      );

      const snapshot = await getDocs(chatSessionsQuery);
      
      const sessions = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const sessionData = doc.data() as ChatSession;
          
          // Get the other participant's profile
          const otherSessionId = sessionData.participants.find(p => p !== sessionId);
          let otherUserProfile: UserProfile | undefined;
          
          if (otherSessionId) {
            try {
              // Get the other user's event profile
              const eventProfileRef = doc(db, 'event_profiles', `${eventId}_${otherSessionId}`);
              const eventProfileDoc = await getDocs(
                query(collection(db, 'event_profiles'), where('id', '==', `${eventId}_${otherSessionId}`))
              );
              
              if (!eventProfileDoc.empty) {
                const eventProfileData = eventProfileDoc.docs[0].data();
                otherUserProfile = eventProfileData.profile;
              }
            } catch (error) {
              console.warn('Could not load other user profile:', error);
            }
          }
          
          return {
            session: { id: doc.id, ...sessionData },
            otherUserProfile
          };
        })
      );

      return sessions;

    } catch (error) {
      console.error('Error getting user chat sessions:', error);
      return [];
    }
  }

  /**
   * Mark messages as read
   */
  static async markMessagesAsRead(
    chatSessionId: string,
    toSessionId: string
  ): Promise<void> {
    try {
      const db = this.getFirestore();
      
      const unreadMessagesQuery = query(
        collection(db, 'messages'),
        where('chatSessionId', '==', chatSessionId),
        where('toSessionId', '==', toSessionId),
        where('isRead', '==', false)
      );

      const snapshot = await getDocs(unreadMessagesQuery);
      
      const updatePromises = snapshot.docs.map(doc => 
        updateDoc(doc.ref, { isRead: true })
      );

      await Promise.all(updatePromises);

    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }

  /**
   * Set typing indicator
   */
  static async setTypingIndicator(
    chatSessionId: string,
    sessionId: string,
    userProfile: UserProfile,
    isTyping: boolean
  ): Promise<void> {
    try {
      const db = this.getFirestore();
      
      const typingRef = doc(db, 'typing_indicators', `${chatSessionId}_${sessionId}`);
      
      if (isTyping) {
        await setDoc(typingRef, {
          chatSessionId,
          sessionId,
          userProfile,
          isTyping: true,
          lastTypingAt: serverTimestamp(),
        });
      } else {
        await setDoc(typingRef, {
          chatSessionId,
          sessionId,
          userProfile,
          isTyping: false,
          lastTypingAt: serverTimestamp(),
        });
      }

    } catch (error) {
      console.error('Error setting typing indicator:', error);
      // Don't throw error for typing indicators
    }
  }

  /**
   * Listen to typing indicators
   */
  static listenToTypingIndicators(
    chatSessionId: string,
    currentSessionId: string,
    callback: (typingUsers: TypingIndicator[]) => void
  ): Unsubscribe {
    try {
      const db = this.getFirestore();
      
      const typingQuery = query(
        collection(db, 'typing_indicators'),
        where('chatSessionId', '==', chatSessionId)
      );

      return onSnapshot(typingQuery, (snapshot) => {
        const now = Date.now();
        const typingUsers = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as TypingIndicator))
          .filter(indicator => 
            indicator.sessionId !== currentSessionId && 
            indicator.isTyping &&
            now - indicator.lastTypingAt < 5000 // 5 seconds timeout
          );

        callback(typingUsers);
      });

    } catch (error) {
      console.error('Error setting up typing listener:', error);
      return () => {}; // Return empty unsubscribe function
    }
  }

  /**
   * Get unread message count for a user
   */
  static async getUnreadMessageCount(
    eventId: string,
    sessionId: string
  ): Promise<number> {
    try {
      const db = this.getFirestore();
      
      const unreadQuery = query(
        collection(db, 'messages'),
        where('eventId', '==', eventId),
        where('toSessionId', '==', sessionId),
        where('isRead', '==', false)
      );

      const snapshot = await getDocs(unreadQuery);
      return snapshot.size;

    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Block/Report user (creates a muted_matches record)
   */
  static async muteUser(
    eventId: string,
    muterSessionId: string,
    mutedSessionId: string,
    reason?: string
  ): Promise<void> {
    try {
      const db = this.getFirestore();
      
      const muteId = `${eventId}_${muterSessionId}_${mutedSessionId}`;
      const muteRef = doc(db, 'muted_matches', muteId);
      
      await setDoc(muteRef, {
        id: muteId,
        eventId,
        muterSessionId,
        mutedSessionId,
        reason: reason || 'User muted',
        createdAt: serverTimestamp(),
      });

      // Deactivate chat session
      const participants = [muterSessionId, mutedSessionId].sort();
      const chatSessionId = `${eventId}_${participants.join('_')}`;
      const chatSessionRef = doc(db, 'chat_sessions', chatSessionId);
      
      await updateDoc(chatSessionRef, {
        isActive: false,
      });

    } catch (error) {
      console.error('Error muting user:', error);
      throw error;
    }
  }

  /**
   * Check if a user is muted
   */
  static async isUserMuted(
    eventId: string,
    muterSessionId: string,
    mutedSessionId: string
  ): Promise<boolean> {
    try {
      const db = this.getFirestore();
      
      const muteQuery = query(
        collection(db, 'muted_matches'),
        where('eventId', '==', eventId),
        where('muterSessionId', '==', muterSessionId),
        where('mutedSessionId', '==', mutedSessionId)
      );

      const snapshot = await getDocs(muteQuery);
      return !snapshot.empty;

    } catch (error) {
      console.error('Error checking mute status:', error);
      return false;
    }
  }
}