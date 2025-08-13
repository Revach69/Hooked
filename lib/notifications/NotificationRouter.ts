import { Alert } from 'react-native';
import Toast from 'react-native-toast-message';
import { AnyEvent } from './types';

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
    
    if (!getFg) {
      return;
    }
    
    if (isCooling(ev)) {
      return;
    }

    // Handle match events - Creator logic is special
    if (ev.type === 'match') {
      if (ev.isCreator) {
        // Creator is always in-app (must be to create match), always show Alert
        Alert.alert(
          "It's a match!",
          'See matches or continue browsing',
          [
            { text: 'Continue', style: 'cancel' },
            { text: 'See matches', onPress: () => gotoMatches?.() },
          ],
          { cancelable: true }
        );
        return; // Creator logic complete - no background handling needed
      } else {
        // First liker (recipient) - check app state
        const isForeground = getFg();
        
        if (isForeground) {
          Toast.show({ type: 'info', text1: 'You got a match!', position: 'top' });
        } else {
          // Server handles background push for first liker
        }
        return;
      }
    }

    // Handle message events - Always check app state for recipient
    if (ev.type === 'message') {
      const isForeground = getFg();
      
      if (isForeground) {
        const name = ev.senderName ?? 'Someone';
        Toast.show({
          type: 'info',
          text1: `New message from ${name}`,
          text2: ev.preview,
          position: 'top',
        });
      } else {
        // Server handles background push for messages
      }
      return;
    }

    // All background push notifications are now handled exclusively by server triggers
  },
};
