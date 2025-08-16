// Legacy sendMessageNotification removed - now handled by server-side Firebase Functions
import Toast from 'react-native-toast-message';
import { router } from 'expo-router';
import { AsyncStorageUtils } from './asyncStorageUtils';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Track recent notifications to prevent duplicates
const recentNotifications = new Map<string, number>();
const NOTIFICATION_COOLDOWN = 3000; // 3 seconds cooldown

/**
 * Check if sender is muted by the current user
 */
export async function checkIfSenderIsMuted(senderSessionId: string): Promise<boolean> {
  try {
    const currentSessionId = await AsyncStorageUtils.getItem<string>('currentSessionId');
    const currentEventId = await AsyncStorageUtils.getItem<string>('currentEventId');
    
    if (!currentSessionId || !currentEventId) {
      return false; // Can't check mute status without session/event
    }
    
    // Import MutedMatchAPI dynamically to avoid circular imports
    const { MutedMatchAPI } = await import('./firebaseApi');
    
    const mutedRecords = await MutedMatchAPI.filter({
      event_id: currentEventId,
      muter_session_id: currentSessionId,
      muted_session_id: senderSessionId
    });
    
    return mutedRecords.length > 0;
  } catch {
    return false; // If error checking mute status, don't block notifications
  }
}

/**
 * Check if recipient has muted a specific sender
 */
async function checkIfRecipientMutedSender(recipientSessionId: string, senderSessionId: string): Promise<boolean> {
  try {
    const currentEventId = await AsyncStorageUtils.getItem<string>('currentEventId');
    
    if (!currentEventId) {
      return false; // Can't check mute status without event
    }
    
    // Import MutedMatchAPI dynamically to avoid circular imports
    const { MutedMatchAPI } = await import('./firebaseApi');
    
    const mutedRecords = await MutedMatchAPI.filter({
      event_id: currentEventId,
      muter_session_id: recipientSessionId,
      muted_session_id: senderSessionId
    });
    
    return mutedRecords.length > 0;
  } catch {
    return false; // If error checking mute status, don't block notifications
  }
}



// Show in-app message toast with navigation
export async function showInAppMessageToast(senderName: string, senderSessionId: string): Promise<void> {
  try {
    // Check if sender is muted
    const isMuted = await checkIfSenderIsMuted(senderSessionId);
    if (isMuted) {
      return; // Don't show toast if muted
    }
    // Check for recent notification to prevent duplicates
    const notificationKey = `message_${senderName}_${senderSessionId}`;
    const now = Date.now();
    const lastNotification = recentNotifications.get(notificationKey);
    
    if (lastNotification && (now - lastNotification) < NOTIFICATION_COOLDOWN) {
      return; // Skip if too recent
    }
    
    // Update recent notifications
    recentNotifications.set(notificationKey, now);
    
    // Clean up old entries (older than 10 seconds)
    for (const [key, timestamp] of recentNotifications.entries()) {
      if (now - timestamp > 10000) {
        recentNotifications.delete(key);
      }
    }
    
    // Platform-specific configurations
    const config = Platform.OS === 'ios' ? {
      delay: 200,
      topOffset: 60,
      visibilityTime: 5000,
    } : {
      delay: 0,
      topOffset: 40,
      visibilityTime: 4000,
    };
    
    // Use a shorter delay for Android to ensure toast shows immediately
    const delay = Platform.OS === 'android' ? 100 : config.delay;
    
    setTimeout(() => {
      Toast.show({
        type: 'info',
        text1: `New message from ${senderName}`,
        text2: 'Tap to open chat',
        position: 'top',
        visibilityTime: config.visibilityTime,
        autoHide: true,
        topOffset: config.topOffset,
        onPress: () => {
          Toast.hide();
          if (senderSessionId) {
            // Navigate to chat with the specific match
            router.push(`/chat?matchId=${senderSessionId}&matchName=${senderName}`);
          } else {
            router.push('/matches');
          }
        }
      });
    }, delay);
  } catch {
    // Error showing message toast - try to show a basic toast as fallback
    try {
      Toast.show({
        type: 'info',
        text1: 'New message received',
        text2: 'Tap to view',
        position: 'top',
        visibilityTime: 4000,
        autoHide: true,
        topOffset: Platform.OS === 'ios' ? 60 : 40,
        onPress: () => {
          Toast.hide();
          router.push('/matches');
        }
      });
    } catch {
      // If even the fallback fails, just log the error
    }
  }
}

// Show match notification toast
export function showMatchToast(matchName: string): void {
  try {
    // Check for recent notification to prevent duplicates
    const notificationKey = `match_${matchName}`;
    const now = Date.now();
    const lastNotification = recentNotifications.get(notificationKey);
    
    if (lastNotification && (now - lastNotification) < NOTIFICATION_COOLDOWN) {
      return; // Skip if too recent
    }
    
    // Update recent notifications
    recentNotifications.set(notificationKey, now);
    
    // Platform-specific configurations
    const config = Platform.OS === 'ios' ? {
      delay: 200,
      topOffset: 60,
      visibilityTime: 5000,
    } : {
      delay: 0,
      topOffset: 40,
      visibilityTime: 4000,
    };
    
    setTimeout(() => {
      Toast.show({
        type: 'success',
        text1: `You got Hooked with ${matchName}!`,
        text2: 'Tap to view matches',
        position: 'top',
        visibilityTime: config.visibilityTime,
        autoHide: true,
        topOffset: config.topOffset,
        onPress: () => {
          router.push('/matches');
        }
      });
    }, config.delay);
  } catch {
    // Error showing match toast
  }
}

/**
 * Send push notification for message when user is not in app
 */
async function sendPushNotificationForMessage(recipientSessionId: string, senderName: string, senderSessionId?: string): Promise<void> {
  try {
    // Check if sender is muted by recipient
    if (senderSessionId) {
      const isMuted = await checkIfRecipientMutedSender(recipientSessionId, senderSessionId);
      if (isMuted) {
        return; // Don't send push notification if muted
      }
    }
    // Check if user has push notification permissions
    const { status } = await Notifications.getPermissionsAsync();
    
    if (status === 'granted') {
      // Server-side Firebase Functions will handle push notifications
      console.log('Push notification permissions available - server will handle notification');
    } else {
      // If permissions not granted, store notification for later
      await storePendingMessageNotification(recipientSessionId, senderName);
    }
  } catch {
    // Error sending push notification for message - store for later
    // Error sending push notification for message
    await storePendingMessageNotification(recipientSessionId, senderName);
  }
}

/**
 * Store pending message notification for when user returns to app
 */
async function storePendingMessageNotification(recipientSessionId: string, senderName: string, senderSessionId?: string): Promise<void> {
  try {
    const pendingNotificationsKey = `pendingMessageNotifications_${recipientSessionId}`;
    const existingNotifications = await AsyncStorageUtils.getItem<any[]>(pendingNotificationsKey);
    
    const newNotification = {
      id: Date.now().toString(),
      senderName,
      senderSessionId,
      timestamp: new Date().toISOString(),
      type: 'message'
    };
    
    const notifications = existingNotifications || [];
    
    notifications.push(newNotification);
    
    // Keep only the last 10 notifications
    if (notifications.length > 10) {
      notifications.splice(0, notifications.length - 10);
    }
    
    await AsyncStorageUtils.setItem(pendingNotificationsKey, notifications);
  } catch {
    // Error storing pending message notification
  }
}

/**
 * Check and show pending message notifications when user returns to app
 */
export async function checkPendingMessageNotifications(): Promise<void> {
  try {
    const currentSessionId = await AsyncStorageUtils.getItem<string>('currentSessionId');
    
    if (!currentSessionId) {
      return;
    }
    
    const pendingNotificationsKey = `pendingMessageNotifications_${currentSessionId}`;
    const pendingNotifications = await AsyncStorageUtils.getItem<any[]>(pendingNotificationsKey);
    
    if (pendingNotifications && pendingNotifications.length > 0) {
      const notifications = pendingNotifications;
      
      if (notifications.length > 0) {
        // Show the most recent notification
        const latestNotification = notifications[notifications.length - 1];
        
        if (latestNotification.type === 'message') {
          // Use stored session ID if available for navigation
          showInAppMessageToast(latestNotification.senderName, latestNotification.senderSessionId);
        }
        
        // Clear the pending notifications
        await AsyncStorageUtils.removeItem(pendingNotificationsKey);
      }
    }
  } catch {
    // Error checking pending message notifications
  }
}

/**
 * Update user's last activity timestamp
 */
export async function updateUserActivity(sessionId: string): Promise<void> {
  try {
    const lastActivityKey = `lastActivity_${sessionId}`;
    await AsyncStorageUtils.setItem(lastActivityKey, new Date().toISOString());
  } catch {
    // Error updating user activity
  }
}

/**
 * Mark messages as read when entering a chat
 */
export async function markMessagesAsRead(eventId: string, fromSessionId: string, toSessionId: string): Promise<void> {
  try {
    // Get the current user's profile ID
    const { EventProfileAPI } = await import('./firebaseApi');
    const currentUserProfiles = await EventProfileAPI.filter({
      session_id: toSessionId,
      event_id: eventId
    });
    
    if (currentUserProfiles.length === 0) {
      return;
    }
    
    const currentUserProfileId = currentUserProfiles[0].id;
    
    // Get the sender's profile ID
    const senderProfiles = await EventProfileAPI.filter({
      session_id: fromSessionId,
      event_id: eventId
    });
    
    if (senderProfiles.length === 0) {
      return;
    }
    
    const senderProfileId = senderProfiles[0].id;
    
    // Mark messages as read by updating them in Firestore
    const { MessageAPI } = await import('./firebaseApi');
    const allMessages = await MessageAPI.filter({
      event_id: eventId,
      from_profile_id: senderProfileId,
      to_profile_id: currentUserProfileId
    });
    
    // Filter for unread messages only
    const unreadMessages = allMessages.filter(message => !message.is_read);
    
    // Update each unread message to mark as read
    for (const message of unreadMessages) {
      try {
        await MessageAPI.update(message.id, { is_read: true });
      } catch {
        // Error marking message as read
      }
    }
    
    // Clear the unread status for this specific chat
    const unreadChatsKey = `unreadChats_${toSessionId}`;
    const unreadChats = await AsyncStorageUtils.getItem<string[]>(unreadChatsKey);
    
    if (unreadChats) {
      const unreadChatsSet = new Set(unreadChats);
      unreadChatsSet.delete(fromSessionId);
      await AsyncStorageUtils.setItem(unreadChatsKey, Array.from(unreadChatsSet));
    }
    
  } catch {
    // Error marking messages as read
  }
}

/**
 * Mark messages as seen when entering a chat
 */
export async function markMessagesAsSeen(eventId: string, fromSessionId: string, toSessionId: string): Promise<void> {
  try {
    // Get the current user's profile ID
    const { EventProfileAPI } = await import('./firebaseApi');
    const currentUserProfiles = await EventProfileAPI.filter({
      session_id: toSessionId,
      event_id: eventId
    });
    
    if (currentUserProfiles.length === 0) {
      return;
    }
    
    const currentUserProfileId = currentUserProfiles[0].id;
    
    // Get the sender's profile ID
    const senderProfiles = await EventProfileAPI.filter({
      session_id: fromSessionId,
      event_id: eventId
    });
    
    if (senderProfiles.length === 0) {
      return;
    }
    
    const senderProfileId = senderProfiles[0].id;
    
    // Mark messages as seen by updating them in Firestore
    const { MessageAPI } = await import('./firebaseApi');
    const allMessages = await MessageAPI.filter({
      event_id: eventId,
      from_profile_id: senderProfileId,
      to_profile_id: currentUserProfileId
    });
    
    // Filter for unseen messages only
    const unseenMessages = allMessages.filter(message => !message.seen);
    
    // Update each unseen message to mark as seen
    for (const message of unseenMessages) {
      try {
        await MessageAPI.update(message.id, { 
          seen: true, 
          seen_at: new Date().toISOString() 
        });
      } catch {
        // Error marking message as seen
      }
    }
    
  } catch {
    // Error marking messages as seen
  }
}

/**
 * Check if user has unread messages
 */
export async function hasUnreadMessages(eventId: string, sessionId: string): Promise<boolean> {
  try {
    const { EventProfileAPI, MessageAPI } = await import('./firebaseApi');
    
    // Get current user's profile ID
    const currentUserProfiles = await EventProfileAPI.filter({
      session_id: sessionId,
      event_id: eventId
    });
    
    if (currentUserProfiles.length === 0) {
      return false;
    }
    
    const currentUserProfileId = currentUserProfiles[0].id;
    
    // Check for unread messages (messages sent TO the current user that are not marked as read)
    const allMessages = await MessageAPI.filter({
      event_id: eventId,
      to_profile_id: currentUserProfileId
    });
    
    // Filter for messages that are not marked as read
    const unreadMessages = allMessages.filter(message => !message.is_read);
    
    return unreadMessages.length > 0;
  } catch {
    // Error checking unread messages
    return false;
  }
}

/**
 * Check if user has unseen messages
 */
export async function hasUnseenMessages(eventId: string, sessionId: string): Promise<boolean> {
  try {
    const { EventProfileAPI, MessageAPI } = await import('./firebaseApi');
    
    // Get current user's profile ID
    const currentUserProfiles = await EventProfileAPI.filter({
      session_id: sessionId,
      event_id: eventId
    });
    
    if (currentUserProfiles.length === 0) {
      return false;
    }
    
    const currentUserProfileId = currentUserProfiles[0].id;
    
    // Check for unseen messages (messages sent TO the current user that are not marked as seen)
    const allMessages = await MessageAPI.filter({
      event_id: eventId,
      to_profile_id: currentUserProfileId
    });
    
    // Filter for messages that are not marked as seen
    const unseenMessages = allMessages.filter(message => !message.seen);
    
    return unseenMessages.length > 0;
  } catch {
    // Error checking unseen messages
    return false;
  }
}

/**
 * Send notification when a new message is created
 * This function handles both in-app toasts and push notifications
 */
export async function handleNewMessageNotification(
  eventId: string,
  fromProfileId: string,
  toProfileId: string,
  messageContent: string,
  senderName: string
): Promise<void> {
  try {
    // Get the recipient's session ID
    const recipientProfile = await import('./firebaseApi').then(api => 
      api.EventProfileAPI.get(toProfileId)
    );
    
    if (!recipientProfile) {
      // Recipient profile not found
      return;
    }
    
    const recipientSessionId = recipientProfile.session_id;
    
    // Check if recipient is currently in the app
    const isRecipientInApp = await checkIfUserIsInApp(recipientSessionId);
    
    if (isRecipientInApp) {
      // User is in app - show toast notification
      // Get sender's session ID for navigation
      const senderProfile = await import('./firebaseApi').then(api => 
        api.EventProfileAPI.get(fromProfileId)
      );
      
      if (senderProfile) {
        showInAppMessageToast(senderName, senderProfile.session_id);
      } else {
        // Fallback without session ID if sender profile not found
        showInAppMessageToast(senderName, '');
      }
    } else {
      // User is not in app - send push notification to the RECEIVER (recipientSessionId)
      try {
        // Get sender's session ID for mute check
        const senderProfile = await import('./firebaseApi').then(api => 
          api.EventProfileAPI.get(fromProfileId)
        );
        await sendPushNotificationForMessage(recipientSessionId, senderName, senderProfile?.session_id);
      } catch {
        // If push notification fails, store for later
        // Push notification failed
      }
    }
    
    // Store notification for when user returns to app (if they don't have push permissions)
    // Get sender's session ID for storing with notification
    const senderProfileForStorage = await import('./firebaseApi').then(api => 
      api.EventProfileAPI.get(fromProfileId)
    );
    await storePendingMessageNotification(recipientSessionId, senderName, senderProfileForStorage?.session_id);
    
  } catch {
    // Error handling new message notification
  }
}

/**
 * Check if a user is currently active in the app
 */
async function checkIfUserIsInApp(sessionId: string): Promise<boolean> {
  try {
    // Get current user's session ID
    const currentSessionId = await AsyncStorageUtils.getItem<string>('currentSessionId');
    
    // If session IDs match, the user is in the same app instance
    // This is the most reliable way to determine if someone is "in the app"
    return currentSessionId === sessionId;
  } catch {
    // Error checking if user is in app
    return false;
  }
} 