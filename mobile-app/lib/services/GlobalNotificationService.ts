import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { AsyncStorageUtils } from '../asyncStorageUtils';
import { NotificationRouter } from '../notifications/NotificationRouter';
import * as Sentry from '@sentry/react-native';

interface GlobalNotificationListeners {
  matches?: () => void;
  messages?: () => void;
}

class GlobalNotificationServiceClass {
  private listeners: GlobalNotificationListeners = {};
  private isInitialized = false;
  private currentSessionId: string | null = null;
  private currentEventId: string | null = null;

  /**
   * Initialize global notification listeners that work across all screens (with retry)
   */
  async initialize(maxRetries: number = 10): Promise<void> {
    try {
      console.log('GlobalNotificationService: Starting initialization with retry mechanism');
      
      // Try to get session with retry
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        // Get current session and event IDs
        this.currentSessionId = await AsyncStorageUtils.getItem<string>('currentSessionId');
        this.currentEventId = await AsyncStorageUtils.getItem<string>('currentEventId');
        
        if (this.currentSessionId && this.currentEventId) {
          console.log(`GlobalNotificationService: Session found on attempt ${attempt}`);
          break;
        }
        
        if (attempt === maxRetries) {
          console.log('GlobalNotificationService: No session after all retries, will wait for session');
          return; // Don't throw, just return - will be retried when session is available
        }
        
        // Wait with exponential backoff (100ms, 200ms, 400ms, etc., max 3 seconds)
        const delay = Math.min(Math.pow(2, attempt - 1) * 100, 3000);
        console.log(`GlobalNotificationService: No session on attempt ${attempt}, retrying in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      if (!this.currentSessionId || !this.currentEventId) {
        console.log('GlobalNotificationService: Missing session/event ID after retries');
        return;
      }
      
      console.log('GlobalNotificationService: Setting up listeners for:', {
        sessionId: this.currentSessionId,
        eventId: this.currentEventId
      });
      
      // Set up global listeners
      await this.setupMatchListener();
      await this.setupMessageListener();
      
      this.isInitialized = true;
      console.log('GlobalNotificationService: Initialization complete');
      
      Sentry.addBreadcrumb({
        message: 'GlobalNotificationService initialized successfully',
        level: 'info',
        category: 'notification_service',
        data: { sessionId: this.currentSessionId, eventId: this.currentEventId }
      });
      
    } catch (error) {
      console.error('GlobalNotificationService: Initialization failed:', error);
      Sentry.captureException(error, {
        tags: {
          operation: 'global_notification_service_init',
          source: 'GlobalNotificationService'
        }
      });
      // Don't throw - allow app to continue
      this.isInitialized = false;
    }
  }

  /**
   * Set up global match listener for real-time match notifications
   */
  private async setupMatchListener(): Promise<void> {
    try {
      if (!this.currentSessionId || !this.currentEventId) return;
      
      console.log('GlobalNotificationService: Setting up match listener');
      
      // Set up TWO queries to match _layout.tsx logic:
      // 1. Matches where I liked someone (I'm the creator)
      const matchQueryILiked = query(
        collection(db, 'likes'),
        where('event_id', '==', this.currentEventId),
        where('is_mutual', '==', true),
        where('liker_session_id', '==', this.currentSessionId)
      );
      
      // 2. Matches where someone liked me (I'm the recipient)  
      const matchQueryIWasLiked = query(
        collection(db, 'likes'),
        where('event_id', '==', this.currentEventId),
        where('is_mutual', '==', true),
        where('liked_session_id', '==', this.currentSessionId)
      );
      
      // Handler function for both queries
      const handleMatchSnapshot = async (snapshot: any) => {
        try {
          // Process new matches
          for (const change of snapshot.docChanges()) {
            if (change.type === 'added') {
              const matchData = change.doc.data();
              
              // Apply the same time filtering as _layout.tsx to prevent old match notifications
              const matchTime = matchData.created_at?.toDate?.() || new Date(matchData.created_at?.seconds * 1000 || Date.now());
              const now = new Date();
              const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);
              
              if (matchTime < thirtySecondsAgo) {
                console.log('GlobalNotificationService: Skipping old match for notification:', {
                  matchId: change.doc.id,
                  matchTime: matchTime.toISOString(),
                  threshold: thirtySecondsAgo.toISOString()
                });
                return; // Skip old matches
              }
              
              console.log('GlobalNotificationService: New match detected:', {
                docId: change.doc.id,
                likerSessionId: matchData.liker_session_id,
                likedSessionId: matchData.liked_session_id
              });
              
              // Determine if I'm the creator or recipient
              const isCreator = matchData.liker_session_id === this.currentSessionId;
              const otherSessionId = isCreator ? matchData.liked_session_id : matchData.liker_session_id;
              
              // Get the other user's profile for their name
              let otherName = 'Someone';
              try {
                const { EventProfileAPI } = await import('../firebaseApi');
                const otherProfiles = await EventProfileAPI.filter({
                  session_id: otherSessionId,
                  event_id: this.currentEventId || undefined
                });
                if (otherProfiles.length > 0) {
                  otherName = otherProfiles[0].first_name || 'Someone';
                }
              } catch (profileError) {
                console.warn('Failed to get other user profile for match notification:', profileError);
              }
              
              // Trigger match notification
              await NotificationRouter.handleIncoming({
                type: 'match',
                id: change.doc.id,
                createdAt: matchTime.getTime(),
                isCreator: isCreator,
                otherSessionId: otherSessionId,
                otherName: otherName
              });
            }
          }
        } catch (error) {
          console.error('GlobalNotificationService: Error processing match snapshot:', error);
          Sentry.captureException(error, {
            tags: {
              operation: 'match_listener_processing',
              source: 'GlobalNotificationService'
            }
          });
        }
      };

      const errorHandler = (error: any) => {
        console.error('GlobalNotificationService: Match listener error:', error);
        if (error.code === 'permission-denied') {
          console.log('Permission denied for match listener - auth may not be ready');
        } else if (error.code === 'unavailable') {
          console.log('Firestore temporarily unavailable for match listener');
        }
        
        Sentry.captureException(error, {
          tags: {
            operation: 'match_listener_error',
            source: 'GlobalNotificationService'
          }
        });
      };
      
      // Set up listeners for both queries
      const unsubscribe1 = onSnapshot(matchQueryILiked, handleMatchSnapshot, errorHandler);
      const unsubscribe2 = onSnapshot(matchQueryIWasLiked, handleMatchSnapshot, errorHandler);
      
      // Store combined unsubscribe function
      this.listeners.matches = () => { unsubscribe1(); unsubscribe2(); };
      console.log('GlobalNotificationService: Match listener established');
      
    } catch (error) {
      console.error('GlobalNotificationService: Failed to setup match listener:', error);
      throw error;
    }
  }

  /**
   * Set up global message listener for real-time message notifications
   */
  private async setupMessageListener(): Promise<void> {
    try {
      if (!this.currentSessionId || !this.currentEventId) return;
      
      console.log('GlobalNotificationService: Setting up message listener');
      
      // Get current user's profile ID first
      const { EventProfileAPI } = await import('../firebaseApi');
      const userProfiles = await EventProfileAPI.filter({
        session_id: this.currentSessionId,
        event_id: this.currentEventId || undefined
      });
      
      if (userProfiles.length === 0) {
        console.log('GlobalNotificationService: No user profile found for message listener');
        return;
      }
      
      const userProfileId = userProfiles[0].id;
      
      // Track when listener starts to differentiate between initial load and real-time updates  
      const listenerStartTime = Date.now();
      
      // Query for new messages TO this user (removed seen filter to match _layout.tsx)
      const messageQuery = query(
        collection(db, 'messages'),
        where('event_id', '==', this.currentEventId),
        where('to_profile_id', '==', userProfileId),
        orderBy('created_at', 'desc')
      );
      
      const unsubscribe = onSnapshot(messageQuery, async (snapshot) => {
        try {
          // Process new messages
          for (const change of snapshot.docChanges()) {
            if (change.type === 'added') {
              const messageData = change.doc.data();
              
              // Apply same time filtering as _layout.tsx
              const messageTime = messageData.created_at?.toDate?.() || new Date(messageData.created_at);
              const messageTimestamp = messageTime.getTime();
              
              // Allow messages that:
              // 1. Were created after the listener started (real-time), OR
              // 2. Were created within 30 seconds before listener start (tolerance for app initialization)
              const thirtySecondsBeforeListener = listenerStartTime - 30 * 1000;
              
              if (messageTimestamp < thirtySecondsBeforeListener) {
                console.log('GlobalNotificationService: Skipping old message for notification:', {
                  messageId: change.doc.id,
                  messageTime: messageTime.toISOString(),
                  listenerStartTime: new Date(listenerStartTime).toISOString(),
                  threshold: new Date(thirtySecondsBeforeListener).toISOString()
                });
                return; // Skip old messages
              }
              
              console.log('GlobalNotificationService: New message detected:', {
                docId: change.doc.id,
                fromProfileId: messageData.from_profile_id,
                content: messageData.content?.substring(0, 20),
                messageTime: messageTime.toISOString(),
                listenerStartTime: new Date(listenerStartTime).toISOString(),
                isRealTime: messageTimestamp >= listenerStartTime
              });
              
              // Get sender's profile for their name and session ID
              let senderName = 'Someone';
              let senderSessionId = '';
              try {
                const senderProfile = await EventProfileAPI.get(messageData.from_profile_id);
                if (senderProfile) {
                  senderName = senderProfile.first_name || 'Someone';
                  senderSessionId = senderProfile.session_id || '';
                }
              } catch (profileError) {
                console.warn('Failed to get sender profile for message notification:', profileError);
              }
              
              // Trigger message notification
              await NotificationRouter.handleIncoming({
                type: 'message',
                id: change.doc.id,
                createdAt: messageTime.getTime(),
                senderProfileId: messageData.from_profile_id,
                senderName: senderName,
                senderSessionId: senderSessionId,
                preview: messageData.content || 'New message'
              });
            }
          }
        } catch (error) {
          console.error('GlobalNotificationService: Error processing message snapshot:', error);
          Sentry.captureException(error, {
            tags: {
              operation: 'message_listener_processing',
              source: 'GlobalNotificationService'
            }
          });
        }
      }, (error) => {
        console.error('GlobalNotificationService: Message listener error:', error);
        if (error.code === 'permission-denied') {
          console.log('Permission denied for message listener - auth may not be ready');
        } else if (error.code === 'unavailable') {
          console.log('Firestore temporarily unavailable for message listener');
        }
        
        Sentry.captureException(error, {
          tags: {
            operation: 'message_listener_error',
            source: 'GlobalNotificationService'
          }
        });
      });
      
      this.listeners.messages = unsubscribe;
      console.log('GlobalNotificationService: Message listener established');
      
    } catch (error) {
      console.error('GlobalNotificationService: Failed to setup message listener:', error);
      throw error;
    }
  }

  /**
   * Cleanup all listeners
   */
  cleanup(): void {
    console.log('GlobalNotificationService: Cleaning up listeners');
    
    if (this.listeners.matches) {
      this.listeners.matches();
      this.listeners.matches = undefined;
    }
    
    if (this.listeners.messages) {
      this.listeners.messages();
      this.listeners.messages = undefined;
    }
    
    this.isInitialized = false;
    console.log('GlobalNotificationService: Cleanup complete');
  }

  /**
   * Reinitialize listeners (useful when session/event changes)
   */
  async reinitialize(): Promise<void> {
    console.log('GlobalNotificationService: Reinitializing');
    this.cleanup();
    await this.initialize();
  }

  /**
   * Check if service is properly initialized
   */
  getStatus(): { initialized: boolean; sessionId: string | null; eventId: string | null; hasListeners: boolean } {
    return {
      initialized: this.isInitialized,
      sessionId: this.currentSessionId,
      eventId: this.currentEventId,
      hasListeners: !!(this.listeners.matches && this.listeners.messages)
    };
  }

  /**
   * Force refresh session/event IDs and reinitialize if needed
   */
  async refreshSession(): Promise<void> {
    const newSessionId = await AsyncStorageUtils.getItem<string>('currentSessionId');
    const newEventId = await AsyncStorageUtils.getItem<string>('currentEventId');
    
    if (newSessionId !== this.currentSessionId || newEventId !== this.currentEventId) {
      console.log('GlobalNotificationService: Session/Event changed, reinitializing', {
        oldSession: this.currentSessionId,
        newSession: newSessionId,
        oldEvent: this.currentEventId,
        newEvent: newEventId
      });
      
      this.currentSessionId = newSessionId;
      this.currentEventId = newEventId;
      
      if (newSessionId && newEventId) {
        await this.reinitialize();
      } else {
        this.cleanup();
      }
    }
  }
}

export const GlobalNotificationService = new GlobalNotificationServiceClass();
export default GlobalNotificationService;