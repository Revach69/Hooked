import { Alert } from 'react-native';
import Toast from 'react-native-toast-message';
import { AnyEvent } from './types';
import * as Sentry from '@sentry/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CustomMatchToast } from '../components/CustomMatchToast';

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
  
  // For matches, temporarily disable persistent storage check for testing
  if (ev.type === 'match' && false) {
    try {
      // Use same key generation as dedupeKey for consistency
      const sessions = [ev.otherSessionId, getCurrentSessionId()].sort();
      const persistentKey = `match_shown_${sessions[0]}_${sessions[1]}`;
      const lastShown = await AsyncStorage.getItem(persistentKey);
      if (lastShown) {
        const lastShownTime = parseInt(lastShown, 10);
        // Consider match "shown" for 1 hour to prevent repeated alerts (reduced for testing)
        if (now - lastShownTime < 60 * 60 * 1000) {
          console.log('Match notification already shown recently, skipping');
          return true;
        }
      }
      // Don't mark as shown here - only mark when actually showing the notification
    } catch (error) {
      // If storage fails, fall back to memory-only deduplication
      console.warn('Failed to check persistent match notification state:', error);
    }
  }
  
  const ttl = ev.type === 'match' ? 5000 : 3000; // 5s / 3s
  if (last && now - last < ttl) return true;
  seen.set(key, now);
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

      // Only show alert for creators, only show toast for recipients
      // This prevents users from getting both notifications
      if (ev.isCreator) {
        // Creator is always in-app (must be to create match), show Alert
        console.log('Showing alert for match creator');
        
        // Mark as shown in persistent storage
        try {
          const sessions = [ev.otherSessionId, getCurrentSessionId()].sort();
          const persistentKey = `match_shown_${sessions[0]}_${sessions[1]}`;
          await AsyncStorage.setItem(persistentKey, Date.now().toString());
        } catch (error) {
          console.warn('Failed to save match notification state:', error);
        }
        
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
          
          // Mark as shown in persistent storage
          try {
            const sessions = [ev.otherSessionId, getCurrentSessionId()].sort();
            const persistentKey = `match_shown_${sessions[0]}_${sessions[1]}`;
            await AsyncStorage.setItem(persistentKey, Date.now().toString());
          } catch (error) {
            console.warn('Failed to save match notification state:', error);
          }
          
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
              visibilityTime: 6000,
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
      // Check if sender is muted before showing any notifications
      if (ev.senderSessionId) {
        try {
          const { checkIfSenderIsMuted } = await import('../messageNotificationHelper');
          const isMuted = await checkIfSenderIsMuted(ev.senderSessionId);
          if (isMuted) {
            Sentry.addBreadcrumb({
              message: 'NotificationRouter: sender is muted, skipping notification',
              level: 'info',
              category: 'notification',
              data: { senderSessionId: ev.senderSessionId }
            });
            return; // Don't show any notifications if sender is muted
          }
        } catch (error) {
          // If error checking mute status, continue with notification (fail safe)
          Sentry.addBreadcrumb({
            message: 'NotificationRouter: error checking mute status, continuing with notification',
            level: 'warning',
            category: 'notification',
            data: { error: error }
          });
          // Don't return here - continue with notification
        }
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
          
          Sentry.addBreadcrumb({
            message: 'NotificationRouter: showing toast for message',
            level: 'info',
            category: 'notification',
            data: { senderName: name }
          });
          try {
            Toast.show({
              type: 'info',
              text1: `New message from ${name}`,
              text2: ev.preview,
              position: 'top',
              visibilityTime: 4000,
              autoHide: true,
              topOffset: 60,
              onPress: () => {
                // Navigate to chat
                try {
                  const { router } = require('expo-router');
                  router.push('/chat');
                } catch (navError) {
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
