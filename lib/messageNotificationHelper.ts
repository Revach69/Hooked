import { sendMessageNotification } from './notificationService';
import Toast from 'react-native-toast-message';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Track recent notifications to prevent duplicates
const recentNotifications = new Map<string, number>();
const NOTIFICATION_COOLDOWN = 3000; // 3 seconds cooldown

// Platform-specific toast configuration
const getToastConfig = () => {
  if (Platform.OS === 'ios') {
    return {
      position: 'top' as const,
      visibilityTime: 5000,
      autoHide: true,
      topOffset: 60,
    };
  } else {
    return {
      position: 'top' as const,
      visibilityTime: 4000,
      autoHide: true,
      topOffset: 40,
    };
  }
};

// Show in-app message toast with navigation
export function showInAppMessageToast(senderName: string, senderSessionId: string): void {
  try {
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
  } catch (error) {
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
    } catch (fallbackError) {
      // If even the fallback fails, just log the error
      console.error('Failed to show message toast:', error);
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
  } catch (error) {
    // Error showing match toast
  }
}

/**
 * Send push notification for message when user is not in app
 */
async function sendPushNotificationForMessage(recipientSessionId: string, senderName: string): Promise<void> {
  try {
    // Check if user has push notification permissions
    const { status } = await Notifications.getPermissionsAsync();
    
    if (status === 'granted') {
      // Send push notification using session-based system
      const success = await sendMessageNotification(
        recipientSessionId,
        senderName,
        `${senderName} sent you a message!`,
        false
      );
      
      if (!success) {
        // If push notification fails, store for later
        await storePendingMessageNotification(recipientSessionId, senderName);
      }
    } else {
      // If permissions not granted, store notification for later
      await storePendingMessageNotification(recipientSessionId, senderName);
    }
  } catch (error) {
    // Error sending push notification for message - store for later
    console.error('Error sending push notification for message:', error);
    await storePendingMessageNotification(recipientSessionId, senderName);
  }
}

/**
 * Store pending message notification for when user returns to app
 */
async function storePendingMessageNotification(recipientSessionId: string, senderName: string, senderSessionId?: string): Promise<void> {
  try {
    const pendingNotificationsKey = `pendingMessageNotifications_${recipientSessionId}`;
    const existingNotifications = await AsyncStorage.getItem(pendingNotificationsKey);
    
    const newNotification = {
      id: Date.now().toString(),
      senderName,
      senderSessionId,
      timestamp: new Date().toISOString(),
      type: 'message'
    };
    
    const notifications = existingNotifications 
      ? JSON.parse(existingNotifications) 
      : [];
    
    notifications.push(newNotification);
    
    // Keep only the last 10 notifications
    if (notifications.length > 10) {
      notifications.splice(0, notifications.length - 10);
    }
    
    await AsyncStorage.setItem(pendingNotificationsKey, JSON.stringify(notifications));
  } catch (error) {
    // Error storing pending message notification
  }
}

/**
 * Check and show pending message notifications when user returns to app
 */
export async function checkPendingMessageNotifications(): Promise<void> {
  try {
    const currentSessionId = await AsyncStorage.getItem('currentSessionId');
    
    if (!currentSessionId) {
      return;
    }
    
    const pendingNotificationsKey = `pendingMessageNotifications_${currentSessionId}`;
    const pendingNotifications = await AsyncStorage.getItem(pendingNotificationsKey);
    
    if (pendingNotifications) {
      const notifications = JSON.parse(pendingNotifications);
      
      if (notifications.length > 0) {
        // Show the most recent notification
        const latestNotification = notifications[notifications.length - 1];
        
        if (latestNotification.type === 'message') {
          // Use stored session ID if available for navigation
          showInAppMessageToast(latestNotification.senderName, latestNotification.senderSessionId);
        }
        
        // Clear the pending notifications
        await AsyncStorage.removeItem(pendingNotificationsKey);
      }
    }
  } catch (error) {
    // Error checking pending message notifications
  }
}

/**
 * Update user's last activity timestamp
 */
export async function updateUserActivity(sessionId: string): Promise<void> {
  try {
    const lastActivityKey = `lastActivity_${sessionId}`;
    await AsyncStorage.setItem(lastActivityKey, new Date().toISOString());
  } catch (error) {
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
      } catch (error) {
        // Error marking message as read
      }
    }
    
    // Clear the unread status for this specific chat
    const unreadChatsKey = `unreadChats_${toSessionId}`;
    const unreadChats = await AsyncStorage.getItem(unreadChatsKey);
    
    if (unreadChats) {
      const unreadChatsSet = new Set(JSON.parse(unreadChats));
      unreadChatsSet.delete(fromSessionId);
      await AsyncStorage.setItem(unreadChatsKey, JSON.stringify(Array.from(unreadChatsSet)));
    }
    
  } catch (error) {
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
      } catch (error) {
        // Error marking message as seen
      }
    }
    
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
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
        await sendPushNotificationForMessage(recipientSessionId, senderName);
      } catch (pushError) {
        // If push notification fails, store for later
        console.error('Push notification failed:', pushError);
      }
    }
    
    // Store notification for when user returns to app (if they don't have push permissions)
    // Get sender's session ID for storing with notification
    const senderProfileForStorage = await import('./firebaseApi').then(api => 
      api.EventProfileAPI.get(fromProfileId)
    );
    await storePendingMessageNotification(recipientSessionId, senderName, senderProfileForStorage?.session_id);
    
  } catch (error) {
    // Error handling new message notification
    console.error('Error handling new message notification:', error);
  }
}

/**
 * Check if a user is currently active in the app
 */
async function checkIfUserIsInApp(sessionId: string): Promise<boolean> {
  try {
    // Get current user's session ID
    const currentSessionId = await AsyncStorage.getItem('currentSessionId');
    
    // If session IDs match, the user is in the same app instance
    // This is the most reliable way to determine if someone is "in the app"
    return currentSessionId === sessionId;
  } catch (error) {
    // Error checking if user is in app
    return false;
  }
} 