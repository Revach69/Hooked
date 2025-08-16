import { Alert } from 'react-native';
import Toast from 'react-native-toast-message';
import { AnyEvent } from './types';
import * as Sentry from '@sentry/react-native';

type InitArgs = {
  getIsForeground: () => boolean;
  navigateToMatches: () => void; // router.push('/matches')
};

const seen = new Map<string, number>();

function dedupeKey(ev: AnyEvent) {
  return `${ev.type}:${ev.id}`;
}

function isCooling(ev: AnyEvent) {
  const now = Date.now();
  const key = dedupeKey(ev);
  const last = seen.get(key);
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
    
    if (isCooling(ev)) {
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
              type: 'success', 
              text1: `You got Hooked with ${otherName}!`, 
              text2: 'Tap to view matches',
              position: 'top',
              visibilityTime: 5000,
              autoHide: true,
              topOffset: 60,
              onPress: () => gotoMatches?.()
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
