import { Alert } from 'react-native';
import Toast from 'react-native-toast-message';
import { AnyEvent } from './types';
import * as Sentry from '@sentry/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type InitArgs = {
  getIsForeground: () => boolean;
  navigateToMatches: () => void; // router.push('/matches')
};

const seen = new Map<string, number>();

// Enhanced in-memory fallback cache for when AsyncStorage fails
// This cache persists for the app session and provides redundancy
const memoryFallbackCache = new Map<string, number>();
const MEMORY_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour TTL for memory cache

function dedupeKey(ev: AnyEvent) {
  if (ev.type === 'match') {
    // For matches, create a consistent key based on both users, regardless of who's creator
    // This ensures only one notification per match pair
    const sessions = [ev.otherSessionId, getCurrentSessionId()].sort();
    return `${ev.type}:${sessions[0]}:${sessions[1]}`;
  }
  return `${ev.type}:${ev.id}`;
}

// Cleanup old entries from memory cache periodically
function cleanupMemoryCache() {
  const now = Date.now();
  for (const [key, timestamp] of memoryFallbackCache.entries()) {
    if (now - timestamp > MEMORY_CACHE_TTL_MS) {
      memoryFallbackCache.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupMemoryCache, 5 * 60 * 1000);

// Helper to get current session (will be set by _layout.tsx)
let currentSessionIdForDedup: string | null = null;

function getCurrentSessionId(): string {
  return currentSessionIdForDedup || 'unknown';
}

export function setCurrentSessionIdForDedup(sessionId: string | null) {
  const previousSession = currentSessionIdForDedup;
  currentSessionIdForDedup = sessionId;
  
  console.log('NotificationRouter: Session ID updated:', {
    previous: previousSession,
    new: sessionId
  });
  
  // Clear seen notifications cache when session changes
  if (previousSession !== sessionId) {
    console.log('NotificationRouter: Session changed, clearing notification cache');
    seen.clear();
  }
}

// Function to ensure session ID is available
async function ensureSessionId(): Promise<string | null> {
  if (currentSessionIdForDedup) {
    return currentSessionIdForDedup;
  }
  
  // Try to load from AsyncStorage as fallback
  try {
    const { AsyncStorageUtils } = await import('../asyncStorageUtils');
    const sessionId = await AsyncStorageUtils.getItem<string>('currentSessionId');
    if (sessionId) {
      setCurrentSessionIdForDedup(sessionId);
      return sessionId;
    }
  } catch (error) {
    console.warn('NotificationRouter: Failed to load session ID from storage:', error);
  }
  
  return null;
}

// Function to clear notification cache for re-matches
export async function clearMatchNotificationCache(sessionId1: string, sessionId2: string) {
  const sessions = [sessionId1, sessionId2].sort();
  const persistentKey = `match_notification_${sessions[0]}_${sessions[1]}`;
  const matchKey = `match:${sessions[0]}:${sessions[1]}`;
  const singleMatchKey = `match_${matchKey}`;
  
  // Clear from all caches
  let asyncStorageCleared = false;
  
  try {
    // Try to clear from AsyncStorage
    await AsyncStorage.removeItem(persistentKey);
    asyncStorageCleared = true;
    console.log(`Cleared match notification from AsyncStorage for sessions ${sessions[0]} and ${sessions[1]}`);
  } catch (error) {
    console.warn('Failed to clear from AsyncStorage, will clear from memory caches:', error);
    Sentry.captureException(error, {
      tags: {
        operation: 'notification_cache_clear',
        source: 'NotificationRouter',
        storage: 'AsyncStorage'
      }
    });
  }
  
  // Always clear from memory caches (even if AsyncStorage succeeded, for consistency)
  seen.delete(singleMatchKey);
  memoryFallbackCache.delete(persistentKey);
  
  console.log(`Cleared match notification cache for sessions ${sessions[0]} and ${sessions[1]} (AsyncStorage: ${asyncStorageCleared ? 'success' : 'failed'}, Memory: cleared)`);
  
  Sentry.addBreadcrumb({
    message: 'Cleared match notification cache for re-match',
    level: 'info',
    category: 'notification',
    data: { 
      sessionId1: sessions[0], 
      sessionId2: sessions[1],
      asyncStorageCleared,
      memoryCachesCleared: true
    }
  });
}

async function isCooling(ev: AnyEvent) {
  const now = Date.now();
  const key = dedupeKey(ev);
  const last = seen.get(key);
  
  // For matches, persistent storage check is now handled in the main handler
  // Here we only do basic memory-based deduplication for other event types
  
  const ttl = ev.type === 'match' ? 5000 : 3000; // 5s / 3s
  if (ev.type !== 'match' && last && now - last < ttl) return true;
  
  // For non-match events, use normal deduplication
  if (ev.type !== 'match') {
    seen.set(key, now);
  }
  
  return false;
}

let getFg: (() => boolean) | undefined;
let gotoMatches: (() => void) | undefined;
let isInitialized = false;
let pendingNotifications: AnyEvent[] = [];

export const NotificationRouter = {
  init(args: InitArgs) {
    getFg = args.getIsForeground;
    gotoMatches = args.navigateToMatches;
    isInitialized = true;
    console.log('NotificationRouter initialized');
    
    // Process any pending notifications
    if (pendingNotifications.length > 0) {
      console.log(`Processing ${pendingNotifications.length} pending notifications`);
      const toProcess = [...pendingNotifications];
      pendingNotifications = [];
      
      // Process with small delays to avoid overwhelming the system
      toProcess.forEach((notification, index) => {
        setTimeout(() => {
          this.handleIncoming(notification);
        }, index * 100); // 100ms between each notification
      });
    }
  },

  isReady(): boolean {
    return isInitialized && !!getFg && !!gotoMatches;
  },

  async handleIncoming(ev: AnyEvent) {
    // Ensure we have a session ID
    const sessionId = await ensureSessionId();
    
    // Add console logging for debugging
    console.log('NotificationRouter.handleIncoming called:', {
      type: ev.type,
      id: ev.id,
      isCreator: ev.type === 'match' ? ev.isCreator : undefined,
      senderName: ev.type === 'message' ? ev.senderName : undefined,
      isReady: this.isReady(),
      hasSessionId: !!sessionId,
      currentSessionId: sessionId,
      timestamp: new Date().toISOString()
    });
    
    // Additional safety check: Ensure this event is relevant to current session
    if (ev.type === 'match' && sessionId) {
      const isRelevantMatch = ev.otherSessionId && (
        ev.otherSessionId === sessionId || 
        getCurrentSessionId() === sessionId
      );
      if (!isRelevantMatch) {
        console.log('NotificationRouter: Match event not relevant to current session, skipping:', {
          eventOtherSessionId: ev.otherSessionId,
          currentSessionId: sessionId,
          eventId: ev.id
        });
        return;
      }
    }

    Sentry.addBreadcrumb({
      message: 'NotificationRouter.handleIncoming called',
      level: 'info',
      category: 'notification',
      data: { 
        eventType: ev.type,
        eventId: ev.id,
        isCreator: ev.type === 'match' ? ev.isCreator : undefined,
        senderName: ev.type === 'message' ? ev.senderName : undefined,
        isReady: this.isReady(),
        hasSessionId: !!sessionId
      }
    });
    
    if (!sessionId) {
      console.warn('NotificationRouter: No session ID available, queuing notification for later');
      pendingNotifications.push(ev);
      return;
    }
    
    if (!this.isReady()) {
      console.warn('NotificationRouter: not fully initialized, queueing notification');
      Sentry.addBreadcrumb({
        message: 'NotificationRouter: not fully initialized, queueing notification',
        level: 'info',
        category: 'notification',
        data: { 
          isInitialized, 
          hasForegroundGetter: !!getFg, 
          hasNavigator: !!gotoMatches,
          pendingCount: pendingNotifications.length + 1
        }
      });
      
      // Queue the notification for processing when router is ready
      pendingNotifications.push(ev);
      console.log(`Queued notification, total pending: ${pendingNotifications.length}`);
      return;
    }
    
    if (await isCooling(ev)) {
      console.log('NotificationRouter: event is cooling down, skipping', { 
        eventId: ev.id, 
        eventType: ev.type,
        dedupeKey: dedupeKey(ev)
      });
      Sentry.addBreadcrumb({
        message: 'NotificationRouter: event is cooling down, skipping',
        level: 'debug',
        category: 'notification',
        data: { eventId: ev.id, eventType: ev.type }
      });
      return;
    }

    // Handle match events
    if (ev.type === 'match') {
      console.log('Handling match event:', { isCreator: ev.isCreator, eventId: ev.id });
      
      Sentry.addBreadcrumb({
        message: 'NotificationRouter: handling match event',
        level: 'info',
        category: 'notification',
        data: { isCreator: ev.isCreator, eventId: ev.id }
      });

      // Handle match notifications based on role - ensure only ONE user gets ONE notification
      // Check if we're the creator or recipient and only show the appropriate notification
      const matchKey = dedupeKey(ev);
      const now = Date.now();
      
      // Enhanced deduplication with fallback mechanisms
      const sessions = [ev.otherSessionId, getCurrentSessionId()].sort();
      const persistentKey = `match_notification_${sessions[0]}_${sessions[1]}`;
      let shouldSkipNotification = false;
      let storageWorking = true;
      
      // First, try persistent storage
      try {
        const lastShown = await AsyncStorage.getItem(persistentKey);
        
        if (lastShown) {
          const lastShownTime = parseInt(lastShown, 10);
          // Only allow one notification per match per 1 hour (reduced from 24h for re-matches)
          if (now - lastShownTime < 60 * 60 * 1000) {
            console.log(`Match notification already shown for this pair, skipping (last shown: ${new Date(lastShownTime).toISOString()})`);
            shouldSkipNotification = true;
          }
        }
        
        if (!shouldSkipNotification) {
          // Mark this match as notified BEFORE showing the notification
          await AsyncStorage.setItem(persistentKey, now.toString());
          console.log(`Marked match notification as shown for sessions ${sessions[0]} and ${sessions[1]}`);
          
          // Also update memory fallback cache for redundancy
          memoryFallbackCache.set(persistentKey, now);
        }
      } catch (error) {
        console.warn('AsyncStorage failed, using memory fallback cache:', error);
        storageWorking = false;
        
        // Log to Sentry for monitoring
        Sentry.captureException(error, {
          tags: {
            operation: 'notification_deduplication',
            fallback: 'memory_cache'
          },
          extra: {
            persistentKey,
            sessions
          }
        });
        
        // Fallback to memory cache when AsyncStorage fails
        const memCachedTime = memoryFallbackCache.get(persistentKey);
        if (memCachedTime && (now - memCachedTime < 60 * 60 * 1000)) {
          console.log(`Memory cache: Match notification already shown, skipping`);
          shouldSkipNotification = true;
        } else if (!memCachedTime) {
          // Mark in memory cache if not already present
          memoryFallbackCache.set(persistentKey, now);
          console.log(`Memory cache: Marked match notification as shown`);
        }
      }
      
      if (shouldSkipNotification) {
        return;
      }
      
      // Enhanced memory-based deduplication with better race condition handling
      const singleMatchKey = `match_${matchKey}`;
      const lastShown = seen.get(singleMatchKey);
      
      // Use shorter cooldown for memory deduplication to handle rapid-fire events
      if (lastShown && now - lastShown < 10000) { // 10 seconds memory cooldown
        console.log(`Already processed this match recently in memory, skipping`);
        Sentry.addBreadcrumb({
          message: 'NotificationRouter: Duplicate match notification blocked by memory cache',
          level: 'info',
          category: 'notification_deduplication',
          data: { 
            matchKey: singleMatchKey, 
            timeSinceLastShown: now - lastShown,
            sessions: sessions
          }
        });
        return;
      }
      
      // Set memory marker immediately to prevent race conditions
      seen.set(singleMatchKey, now);
      
      // Additional protection: Add a small random delay to prevent simultaneous processing
      // This helps when multiple listeners trigger at exactly the same time
      const randomDelay = Math.random() * 100; // 0-100ms
      await new Promise(resolve => setTimeout(resolve, randomDelay));

      if (ev.isCreator) {
        // Creator is always in-app (must be to create match), show Alert
        console.log('Showing alert for match creator');
        
        Sentry.addBreadcrumb({
          message: 'NotificationRouter: showing alert for match creator',
          level: 'info',
          category: 'notification'
        });
        Alert.alert(
          "You got Hooked!",
          `Start chatting with ${ev.otherName || 'your match'}!`,
          [
            { text: 'Dismiss', style: 'cancel' },
            { 
              text: 'Start Chat', 
              onPress: () => {
                try {
                  const { router } = require('expo-router');
                  router.push({
                    pathname: '/chat',
                    params: {
                      matchId: ev.otherSessionId,
                      matchName: ev.otherName || 'Someone'
                    }
                  });
                } catch (navError) {
                  console.warn('Failed to navigate to chat from alert, falling back to matches:', navError);
                  gotoMatches?.();
                }
              }
            },
          ],
          { cancelable: true }
        );
        return;
      } else {
        // First liker (recipient) - check if in foreground for client-side notification
        const isForeground = getFg?.() ?? false;
        Sentry.addBreadcrumb({
          message: 'NotificationRouter: match recipient processing',
          level: 'info',
          category: 'notification',
          data: { 
            isForeground,
            otherSessionId: ev.otherSessionId,
            otherName: ev.otherName
          }
        });
        
        if (isForeground) {
          // Show client-side toast for foreground users
          console.log('Showing toast for match recipient (foreground)');
          
          Sentry.addBreadcrumb({
            message: 'NotificationRouter: showing toast for match recipient',
            level: 'info',
            category: 'notification'
          });
          try {
            // Get the other user's name for the toast
            const otherName = ev.otherName || 'Someone';
            Toast.show({ 
              type: 'matchSuccess', 
              text1: `You got Hooked with ${otherName}!`, 
              text2: 'Tap to start chatting',
              position: 'top',
              visibilityTime: 3500,
              autoHide: true,
              topOffset: 0,
              onPress: () => {
                Toast.hide();
                try {
                  const { router } = require('expo-router');
                  router.push({
                    pathname: '/chat',
                    params: {
                      matchId: ev.otherSessionId,
                      matchName: otherName
                    }
                  });
                } catch (navError) {
                  console.warn('Failed to navigate to chat, falling back to matches:', navError);
                  gotoMatches?.();
                }
              }
            });
          } catch (error) {
            Sentry.captureException(error, {
              tags: {
                operation: 'notification_display',
                type: 'match_toast'
              },
              extra: {
                eventId: ev.id,
                otherSessionId: ev.otherSessionId
              }
            });
          }
        } else {
          console.log('Match recipient not in foreground - server will handle push notification');
        }
        return;
      }
    }

    // Handle message events
    if (ev.type === 'message') {
      console.log('NotificationRouter: Processing message event:', {
        id: ev.id,
        senderName: ev.senderName,
        senderSessionId: ev.senderSessionId,
        preview: ev.preview?.substring(0, 20)
      });
      
      // Check if sender is muted before showing any notifications
      if (ev.senderSessionId) {
        console.log('NotificationRouter: checking if sender is muted:', ev.senderSessionId);
        try {
          const { checkIfSenderIsMuted } = await import('../messageNotificationHelper');
          const isMuted = await checkIfSenderIsMuted(ev.senderSessionId);
          console.log('NotificationRouter: mute check result:', { senderSessionId: ev.senderSessionId, isMuted });
          if (isMuted) {
            console.log('NotificationRouter: sender is muted, skipping notification');
            Sentry.addBreadcrumb({
              message: 'NotificationRouter: sender is muted, skipping notification',
              level: 'info',
              category: 'notification',
              data: { senderSessionId: ev.senderSessionId }
            });
            return; // Don't show any notifications if sender is muted
          }
          console.log('NotificationRouter: sender is not muted, proceeding with notification');
        } catch (error) {
          // If error checking mute status, continue with notification (fail safe)
          console.log('NotificationRouter: error checking mute status, continuing with notification:', error);
          Sentry.addBreadcrumb({
            message: 'NotificationRouter: error checking mute status, continuing with notification',
            level: 'warning',
            category: 'notification',
            data: { error: error }
          });
          // Don't return here - continue with notification
        }
      } else {
        console.log('NotificationRouter: no senderSessionId available, cannot check mute status');
      }

      // Content-based message deduplication - only block if exact same message content
      if (ev.senderSessionId && ev.preview) {
        const messageKey = `message_${ev.senderSessionId}_${getCurrentSessionId()}_${ev.preview}`;
        const lastMessageTime = seen.get(messageKey);
        const now = Date.now();
        
        // Only prevent notifications if exact same message content within 30 seconds
        // This handles server-side duplicate processing, not legitimate consecutive messages
        if (lastMessageTime && now - lastMessageTime < 30000) {
          console.log('NotificationRouter: Exact same message content detected, skipping duplicate');
          Sentry.addBreadcrumb({
            message: 'NotificationRouter: Duplicate message content blocked',
            level: 'info',
            category: 'notification_deduplication',
            data: { 
              senderSessionId: ev.senderSessionId,
              messagePreview: ev.preview?.substring(0, 20),
              timeSinceLastMessage: now - lastMessageTime
            }
          });
          return;
        }
        
        seen.set(messageKey, now);
      }

      const isForeground = getFg?.() ?? false;
      Sentry.addBreadcrumb({
        message: 'NotificationRouter: handling message event',
        level: 'info',
        category: 'notification',
        data: { 
          isForeground, 
          senderName: ev.senderName, 
          senderSessionId: ev.senderSessionId,
          eventId: ev.id,
          preview: ev.preview?.substring(0, 20) + (ev.preview && ev.preview.length > 20 ? '...' : '')
        }
      });
      
      if (isForeground) {
        // Show client-side toast for foreground users
        const name = ev.senderName || 'Someone';
        
        console.log('NotificationRouter: showing toast for message to foreground user');
        
        Sentry.addBreadcrumb({
          message: 'NotificationRouter: showing toast for message',
          level: 'info',
          category: 'notification',
          data: { senderName: name }
        });
        
        // Add small delay to prevent toast errors during app state transitions
        // This prevents the error toast when transitioning from background to foreground
        setTimeout(async () => {
          // Double-check that we're still in foreground after delay
          const stillForeground = getFg?.() ?? false;
          if (!stillForeground) {
            console.log('NotificationRouter: App state changed during delay, skipping toast');
            return;
          }
          
          // Check if user is currently in chat with this sender
          try {
            const { AsyncStorageUtils } = await import('../asyncStorageUtils');
            const currentChatSessionId = await AsyncStorageUtils.getItem<string>('currentChatSessionId');
            console.log('NotificationRouter: Current chat check:', {
              currentChatSessionId,
              senderSessionId: ev.senderSessionId,
              isInSameChat: currentChatSessionId === ev.senderSessionId
            });
            
            if (currentChatSessionId === ev.senderSessionId) {
              console.log('NotificationRouter: User is in chat with sender, skipping toast notification');
              return;
            }
          } catch (error) {
            console.log('NotificationRouter: Error checking current chat, showing toast anyway:', error);
          }
          
          try {
            Toast.show({
              type: 'messageSuccess',
              text1: `You got a message from ${name}`,
              text2: ev.preview,
              position: 'top',
              visibilityTime: 3500,
              autoHide: true,
              topOffset: 0,
              onPress: () => {
                Toast.hide();
                // Navigate to specific chat with sender's session ID
                try {
                  const { router } = require('expo-router');
                  // Use the partner parameter format to match push notification routing
                  router.push({
                    pathname: '/chat',
                    params: {
                      matchId: ev.senderSessionId,
                      matchName: ev.senderName || 'Someone'
                    }
                  });
                } catch (navError) {
                  console.warn('Failed to navigate to chat:', navError);
                Sentry.captureException(navError, {
                  tags: {
                    operation: 'navigation',
                    type: 'message_toast'
                  }
                });
              }
            }
          });
          } catch (error) {
            console.error('Error showing message toast:', error);
            Sentry.captureException(error, {
              tags: {
                operation: 'notification_display',
                type: 'message_toast'
              },
              extra: {
                eventId: ev.id,
                senderName: ev.senderName,
                senderSessionId: ev.senderSessionId
              }
            });
          }
        }, 100); // 100ms delay to allow app state to stabilize
      } else {
        console.log('Message recipient not in foreground - server will handle push notification');
      }
      return;
    }
  },
};
