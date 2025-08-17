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

function dedupeKey(ev: AnyEvent) {
  if (ev.type === 'match') {
    // For matches, create a consistent key based on both users, regardless of who's creator
    // This ensures only one notification per match pair
    const sessions = [ev.otherSessionId, getCurrentSessionId()].sort();
    return `${ev.type}:${sessions[0]}:${sessions[1]}`;
  }
  return `${ev.type}:${ev.id}`;
}

// Helper to get current session (will be set by _layout.tsx)
let currentSessionIdForDedup: string | null = null;
function getCurrentSessionId(): string {
  return currentSessionIdForDedup || 'unknown';
}

export function setCurrentSessionIdForDedup(sessionId: string) {
  currentSessionIdForDedup = sessionId;
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

export const NotificationRouter = {
  init(args: InitArgs) {
    getFg = args.getIsForeground;
    gotoMatches = args.navigateToMatches;
  },

  async handleIncoming(ev: AnyEvent) {
    // Add console logging for debugging
    console.log('NotificationRouter.handleIncoming called:', {
      type: ev.type,
      id: ev.id,
      isCreator: ev.type === 'match' ? ev.isCreator : undefined,
      senderName: ev.type === 'message' ? ev.senderName : undefined
    });

    Sentry.addBreadcrumb({
      message: 'NotificationRouter.handleIncoming called',
      level: 'info',
      category: 'notification',
      data: { 
        eventType: ev.type,
        eventId: ev.id,
        isCreator: ev.type === 'match' ? ev.isCreator : undefined,
        senderName: ev.type === 'message' ? ev.senderName : undefined
      }
    });
    
    if (!getFg) {
      Sentry.addBreadcrumb({
        message: 'NotificationRouter: getFg not initialized',
        level: 'warning',
        category: 'notification'
      });
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
      
      // Use persistent storage to prevent duplicates across app reloads
      try {
        const sessions = [ev.otherSessionId, getCurrentSessionId()].sort();
        const persistentKey = `match_notification_${sessions[0]}_${sessions[1]}`;
        const lastShown = await AsyncStorage.getItem(persistentKey);
        
        if (lastShown) {
          const lastShownTime = parseInt(lastShown, 10);
          // Only allow one notification per match per 24 hours
          if (now - lastShownTime < 24 * 60 * 60 * 1000) {
            console.log(`Match notification already shown for this pair, skipping (last shown: ${new Date(lastShownTime).toISOString()})`);
            return;
          }
        }
        
        // Mark this match as notified BEFORE showing the notification
        await AsyncStorage.setItem(persistentKey, now.toString());
        console.log(`Marked match notification as shown for sessions ${sessions[0]} and ${sessions[1]}`);
      } catch (error) {
        console.warn('Failed to check/save match notification state:', error);
        // Don't return here - if storage fails, still allow the notification but use memory-only deduplication
      }
      
      // Also use memory-based deduplication as backup - use a single key for the entire match
      const singleMatchKey = `match_${matchKey}`;
      const lastShown = seen.get(singleMatchKey);
      
      if (lastShown && now - lastShown < 30000) { // 30 seconds memory cooldown
        console.log(`Already processed this match recently in memory, skipping`);
        return;
      }
      
      seen.set(singleMatchKey, now);

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
          'See matches or continue browsing',
          [
            { text: 'Dismiss', style: 'cancel' },
            { text: 'See Match', onPress: () => gotoMatches?.() },
          ],
          { cancelable: true }
        );
        return;
      } else {
        // First liker (recipient) - check if in foreground for client-side notification
        const isForeground = getFg();
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

      const isForeground = getFg();
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
              // Navigate to specific chat
              try {
                const { router } = require('expo-router');
                router.push({
                  pathname: '/chat',
                  params: {
                    matchId: ev.senderSessionId,
                    matchName: name
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
      } else {
        console.log('Message recipient not in foreground - server will handle push notification');
      }
      return;
    }
  },
};
