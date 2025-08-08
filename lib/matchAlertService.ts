import { Alert } from 'react-native';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
 * Show a match alert with two options: "Continue Browsing" and "See Match"
 */
export async function showMatchAlert(options: MatchAlertOptions): Promise<void> {
  const { matchedUserName, matchId, isLiker, currentEventId, currentSessionId } = options;
  
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
          router.push('/matches');
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
  
  Toast.show({
    type: 'success',
    text1: "You got Hooked!",
    text2: `You and ${matchedUserName} liked each other.`,
    position: 'top',
    visibilityTime: 4000,
    autoHide: true,
    topOffset: 50,
    onPress: () => {
      Toast.hide();
      router.push('/matches');
    }
  });
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