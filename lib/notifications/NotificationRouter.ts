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
    Sentry.addBreadcrumb({
      message: 'NotificationRouter.handleIncoming called',
      level: 'info',
      category: 'notification',
      data: { event: ev }
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

    // Handle match events - Creator logic is special
    if (ev.type === 'match') {
      Sentry.addBreadcrumb({
        message: 'NotificationRouter: handling match event',
        level: 'info',
        category: 'notification',
        data: { isCreator: ev.isCreator, eventId: ev.id }
      });
      
      if (ev.isCreator) {
        // Creator is always in-app (must be to create match), always show Alert
        Sentry.addBreadcrumb({
          message: 'NotificationRouter: showing alert for match creator',
          level: 'info',
          category: 'notification'
        });
        Alert.alert(
          "You got Hooked!",
          'See matches or continue browsing',
          [
            { text: 'Continue Browsing', style: 'cancel' },
            { text: 'See Match', onPress: () => gotoMatches?.() },
          ],
          { cancelable: true }
        );
        return; // Creator logic complete - no background handling needed
      } else {
        // First liker (recipient) - check app state
        const isForeground = getFg();
        Sentry.addBreadcrumb({
          message: 'NotificationRouter: match recipient',
          level: 'info',
          category: 'notification',
          data: { isForeground }
        });
        
        if (isForeground) {
          Sentry.addBreadcrumb({
            message: 'NotificationRouter: showing toast for match recipient',
            level: 'info',
            category: 'notification'
          });
          Toast.show({ 
            type: 'success', 
            text1: 'You got Hooked!', 
            text2: 'Tap to view matches',
            position: 'top',
            onPress: () => gotoMatches?.()
          });
        } else {
          Sentry.addBreadcrumb({
            message: 'NotificationRouter: match recipient not in foreground, letting server handle push',
            level: 'info',
            category: 'notification'
          });
          // Server handles background push for first liker
        }
        return;
      }
    }

    // Handle message events - Always check app state and mute status for recipient
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
        }
      }

      const isForeground = getFg();
      Sentry.addBreadcrumb({
        message: 'NotificationRouter: handling message event',
        level: 'info',
        category: 'notification',
        data: { isForeground, senderName: ev.senderName, eventId: ev.id }
      });
      
      if (isForeground) {
        const name = ev.senderName ?? 'Someone';
        Sentry.addBreadcrumb({
          message: 'NotificationRouter: showing toast for message',
          level: 'info',
          category: 'notification',
          data: { senderName: name }
        });
        Toast.show({
          type: 'info',
          text1: `New message from ${name}`,
          text2: ev.preview,
          position: 'top',
        });
      } else {
        Sentry.addBreadcrumb({
          message: 'NotificationRouter: message recipient not in foreground, letting server handle push',
          level: 'info',
          category: 'notification'
        });
        // Server handles background push for messages
      }
      return;
    }

    // All background push notifications are now handled exclusively by server triggers
  },
};
