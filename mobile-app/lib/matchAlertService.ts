import { Alert, AppState } from 'react-native';
import { unifiedNavigator } from './navigation/UnifiedNavigator';
import { AsyncStorageUtils } from './asyncStorageUtils';
import Toast from 'react-native-toast-message';

interface MatchAlertOptions {
  matchedUserName: string;
  matchId: string;
  isLiker: boolean;
  currentEventId: string;
  currentSessionId: string;
}

// Track active alerts to prevent duplicates
const activeAlerts = new Set<string>();
const recentMatchNotifications = new Map<string, number>();
const MATCH_NOTIFICATION_COOLDOWN = 5000; // 5 seconds cooldown

/**
 * Check if user is currently in the app
 */
async function isUserInApp(sessionId: string): Promise<boolean> {
  try {
    const currentSessionId = await AsyncStorageUtils.getItem<string>('currentSessionId');
    const isSessionMatch = currentSessionId === sessionId;
    const isAppActive = AppState.currentState === 'active';
    
    return isSessionMatch && isAppActive;
  } catch {
    return false;
  }
}

/**
 * Show a match alert with two options: "Continue Browsing" and "See Match"
 */
export async function showMatchAlert(options: MatchAlertOptions): Promise<void> {
  const { matchedUserName, matchId, currentSessionId } = options;
  
  // Create a unique key for this match alert
  const alertKey = `${matchId}_${currentSessionId}`;
  
  // Prevent duplicate alerts
  if (activeAlerts.has(alertKey)) {
    return;
  }
  
  // Check for recent match notifications to prevent spam
  const notificationKey = `match_${matchedUserName}_${currentSessionId}`;
  const now = Date.now();
  const lastNotification = recentMatchNotifications.get(notificationKey);
  
  if (lastNotification && (now - lastNotification) < MATCH_NOTIFICATION_COOLDOWN) {
    return; // Skip if too recent
  }
  
  // Update recent notifications
  recentMatchNotifications.set(notificationKey, now);
  
  // Clean up old entries (older than 30 seconds)
  for (const [key, timestamp] of recentMatchNotifications.entries()) {
    if (now - timestamp > 30000) {
      recentMatchNotifications.delete(key);
    }
  }
  
  // Add to active alerts
  activeAlerts.add(alertKey);
  
  // Show the alert
  Alert.alert(
    "You got Hooked!", 
    `You and ${matchedUserName} liked each other.`,
    [
      {
        text: "Continue Browsing",
        style: "cancel",
        onPress: () => {
          // Remove from active alerts when dismissed
          activeAlerts.delete(alertKey);
        }
      },
      {
        text: "See Match",
        style: "default",
        onPress: () => {
          // Remove from active alerts
          activeAlerts.delete(alertKey);
          // Navigate to matches page
          unifiedNavigator.navigate('matches');
        }
      }
    ]
  );
}

/**
 * Show a toast notification for matches (used in discovery page)
 */
export async function showMatchToast(matchedUserName: string): Promise<void> {
  // Check for recent match notifications to prevent spam
  const notificationKey = `match_toast_${matchedUserName}`;
  const now = Date.now();
  const lastNotification = recentMatchNotifications.get(notificationKey);
  
  if (lastNotification && (now - lastNotification) < MATCH_NOTIFICATION_COOLDOWN) {
    return; // Skip if too recent
  }
  
  // Update recent notifications
  recentMatchNotifications.set(notificationKey, now);
  
  // Clean up old entries (older than 30 seconds)
  for (const [key, timestamp] of recentMatchNotifications.entries()) {
    if (now - timestamp > 30000) {
      recentMatchNotifications.delete(key);
    }
  }
  
  // Use Toast notification system
  Toast.show({
    type: 'matchSuccess',
    text1: `You got Hooked with ${matchedUserName}!`,
    text2: 'Tap to start chatting',
    position: 'top',
    visibilityTime: 3500,
    autoHide: true,
    topOffset: 0,
    onPress: () => {
      Toast.hide();
      unifiedNavigator.navigate('matches');
    }
  });
}

/**
 * Show the appropriate notification based on platform and scenario
 */
export async function showMatchNotification(options: MatchAlertOptions): Promise<void> {
  const { matchedUserName, isLiker, currentSessionId } = options;
  
  if (isLiker) {
    // First liker - check if they're in the app
    const userInApp = await isUserInApp(currentSessionId);
    
    if (!userInApp) {
      // First liker is not in app, server will handle push notification
      console.log('First liker not in app - server will handle push notification');
      return;
    }
    
    // First liker is in app, show toast
    await showMatchToast(matchedUserName);
  } else {
    // Second liker - they're always in app since they just performed the action
    // Show alert for second liker
    await showMatchAlert(options);
  }
}

/**
 * Clear all active alerts (useful for cleanup)
 */
export function clearActiveAlerts(): void {
  activeAlerts.clear();
}

/**
 * Check if an alert is already active for a specific match
 */
export function isAlertActive(matchId: string, sessionId: string): boolean {
  const alertKey = `${matchId}_${sessionId}`;
  return activeAlerts.has(alertKey);
} 