import { sendMessageNotification } from './notificationService';
import Toast from 'react-native-toast-message';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Test toast function for debugging
 */
export function testToast(): void {
  console.log('🧪 Testing toast on platform:', Platform.OS);
  
  try {
    Toast.show({
      type: 'success',
      text1: 'Test Toast! 🧪',
      text2: 'This is a test toast message',
      position: 'top' as const,
      visibilityTime: 3000,
      autoHide: true,
      topOffset: Platform.OS === 'ios' ? 60 : 50,
    });
    
    console.log('🧪 Test toast called successfully');
  } catch (error: any) {
    console.error('🧪 Error in test toast:', error);
  }
}

/**
 * Show in-app toast notification for new message
 */
export function showInAppMessageToast(senderName: string, senderSessionId?: string): void {
  console.log('📱 showInAppMessageToast called for:', senderName, 'session:', senderSessionId);
  console.log('📱 Platform:', Platform.OS);
  console.log('📱 Expo Go:', __DEV__ ? 'Development mode' : 'Production mode');
  
  try {
    // Check if Toast is available
    if (!Toast || typeof Toast.show !== 'function') {
      console.error('📱 Toast is not available or Toast.show is not a function');
      return;
    }
    
    Toast.show({
      type: 'success',
      text1: 'New Message! 💬',
      text2: `${senderName} sent you a message!`,
      position: 'top' as const,
      visibilityTime: 4000,
      autoHide: true,
      topOffset: Platform.OS === 'ios' ? 60 : 50, // Adjust for iOS status bar
      onPress: () => {
        console.log('📱 Toast pressed, navigating to chat with session:', senderSessionId);
        Toast.hide();
        if (senderSessionId) {
          // Navigate to specific chat
          const chatUrl = `/chat?matchId=${senderSessionId}&matchName=${encodeURIComponent(senderName)}`;
          console.log('📱 Navigating to:', chatUrl);
          try {
            router.push(chatUrl);
            console.log('📱 Router.push called successfully');
          } catch (error) {
            console.error('📱 Error navigating to chat:', error);
            // Fallback to matches page
            router.push('/matches');
          }
        } else {
          // Fallback to matches page
          console.log('📱 No session ID, navigating to matches');
          router.push('/matches');
        }
      }
    });
    
    console.log('📱 Toast.show called successfully');
  } catch (error: any) {
    console.error('📱 Error showing toast:', error);
    console.error('📱 Error details:', {
      message: error?.message,
      stack: error?.stack,
      platform: Platform.OS
    });
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
      // Send push notification
      await sendMessageNotification(
        recipientSessionId,
        senderName,
        `${senderName} sent you a message!`,
        false
      );
    }
  } catch (error) {
    console.error('Error sending push notification for message:', error);
  }
}

/**
 * Store pending message notification for when user returns to app
 */
async function storePendingMessageNotification(recipientSessionId: string, senderName: string): Promise<void> {
  try {
    const pendingNotificationsKey = `pendingMessageNotifications_${recipientSessionId}`;
    const existingNotifications = await AsyncStorage.getItem(pendingNotificationsKey);
    
    const newNotification = {
      id: Date.now().toString(),
      senderName,
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
    console.error('Error storing pending message notification:', error);
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
          showInAppMessageToast(latestNotification.senderName);
        }
        
        // Clear the pending notifications
        await AsyncStorage.removeItem(pendingNotificationsKey);
      }
    }
  } catch (error) {
    console.error('Error checking pending message notifications:', error);
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
    console.error('Error updating user activity:', error);
  }
}

/**
 * Mark messages as read when entering a chat
 */
export async function markMessagesAsRead(eventId: string, fromSessionId: string, toSessionId: string): Promise<void> {
  try {
    console.log('📖 Marking messages as read:', { eventId, fromSessionId, toSessionId });
    
    // Get the current user's profile ID
    const { EventProfileAPI } = await import('./firebaseApi');
    const currentUserProfiles = await EventProfileAPI.filter({
      session_id: toSessionId,
      event_id: eventId
    });
    
    if (currentUserProfiles.length === 0) {
      console.error('Current user profile not found');
      return;
    }
    
    const currentUserProfileId = currentUserProfiles[0].id;
    
    // Get the sender's profile ID
    const senderProfiles = await EventProfileAPI.filter({
      session_id: fromSessionId,
      event_id: eventId
    });
    
    if (senderProfiles.length === 0) {
      console.error('Sender profile not found');
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
    
    console.log('📖 Found messages:', { 
      total: allMessages.length, 
      unread: unreadMessages.length,
      currentUserProfileId,
      senderProfileId
    });
    
    // Update each unread message to mark as read
    for (const message of unreadMessages) {
      try {
        await MessageAPI.update(message.id, { is_read: true });
        console.log('📖 Marked message as read:', message.id);
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    }
    
    // Clear the unread status for this specific chat
    const unreadChatsKey = `unreadChats_${toSessionId}`;
    const unreadChats = await AsyncStorage.getItem(unreadChatsKey);
    
    if (unreadChats) {
      const unreadChatsSet = new Set(JSON.parse(unreadChats));
      unreadChatsSet.delete(fromSessionId);
      await AsyncStorage.setItem(unreadChatsKey, JSON.stringify(Array.from(unreadChatsSet)));
      console.log('📖 Updated unread chats for session:', toSessionId);
    }
    
  } catch (error) {
    console.error('Error marking messages as read:', error);
  }
}

/**
 * Mark messages as seen when entering a chat
 */
export async function markMessagesAsSeen(eventId: string, fromSessionId: string, toSessionId: string): Promise<void> {
  try {
    console.log('👁️ Marking messages as seen:', { eventId, fromSessionId, toSessionId });
    
    // Get the current user's profile ID
    const { EventProfileAPI } = await import('./firebaseApi');
    const currentUserProfiles = await EventProfileAPI.filter({
      session_id: toSessionId,
      event_id: eventId
    });
    
    if (currentUserProfiles.length === 0) {
      console.error('Current user profile not found');
      return;
    }
    
    const currentUserProfileId = currentUserProfiles[0].id;
    
    // Get the sender's profile ID
    const senderProfiles = await EventProfileAPI.filter({
      session_id: fromSessionId,
      event_id: eventId
    });
    
    if (senderProfiles.length === 0) {
      console.error('Sender profile not found');
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
    
    console.log('👁️ Found messages:', { 
      total: allMessages.length, 
      unseen: unseenMessages.length,
      currentUserProfileId,
      senderProfileId
    });
    
    // Update each unseen message to mark as seen
    for (const message of unseenMessages) {
      try {
        await MessageAPI.update(message.id, { 
          seen: true, 
          seen_at: new Date().toISOString() 
        });
        console.log('👁️ Marked message as seen:', message.id);
      } catch (error) {
        console.error('Error marking message as seen:', error);
      }
    }
    
  } catch (error) {
    console.error('Error marking messages as seen:', error);
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
    
    console.log('📱 Unread messages check:', { 
      totalMessages: allMessages.length, 
      unreadMessages: unreadMessages.length,
      sessionId,
      eventId 
    });
    
    return unreadMessages.length > 0;
  } catch (error) {
    console.error('Error checking unread messages:', error);
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
      console.log('👁️ No user profile found for session:', sessionId);
      return false;
    }
    
    const currentUserProfileId = currentUserProfiles[0].id;
    console.log('👁️ Found user profile ID:', currentUserProfileId, 'for session:', sessionId);
    
    // Check for unseen messages (messages sent TO the current user that are not marked as seen)
    const allMessages = await MessageAPI.filter({
      event_id: eventId,
      to_profile_id: currentUserProfileId
    });
    
    // Filter for messages that are not marked as seen
    const unseenMessages = allMessages.filter(message => !message.seen);
    
    // Add detailed logging for debugging
    console.log('👁️ Unseen messages check:', { 
      totalMessages: allMessages.length, 
      unseenMessages: unseenMessages.length,
      sessionId,
      eventId,
      currentUserProfileId
    });
    
    // Log details of unseen messages for debugging
    if (unseenMessages.length > 0) {
      console.log('👁️ Unseen messages details:', unseenMessages.map(m => ({
        id: m.id,
        from: m.from_profile_id,
        to: m.to_profile_id,
        seen: m.seen,
        content: m.content?.substring(0, 30) + '...'
      })));
    } else {
      console.log('👁️ All messages are marked as seen. Sample messages:', allMessages.slice(0, 3).map(m => ({
        id: m.id,
        from: m.from_profile_id,
        to: m.to_profile_id,
        seen: m.seen,
        content: m.content?.substring(0, 30) + '...'
      })));
    }
    
    return unseenMessages.length > 0;
  } catch (error) {
    console.error('Error checking unseen messages:', error);
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
    console.log('🔔 handleNewMessageNotification called:', { eventId, fromProfileId, toProfileId, senderName });
    
    // Get the recipient's session ID
    const recipientProfiles = await import('./firebaseApi').then(api => 
      api.EventProfileAPI.filter({ id: toProfileId, event_id: eventId })
    );
    
    if (recipientProfiles.length === 0) {
      console.error('Recipient profile not found');
      return;
    }
    
    const recipientSessionId = recipientProfiles[0].session_id;
    console.log('📱 Recipient session ID:', recipientSessionId);
    
    // Check if recipient is currently in the app
    const isRecipientInApp = await checkIfUserIsInApp(recipientSessionId);
    console.log('📱 Is recipient in app?', isRecipientInApp);
    
    if (isRecipientInApp) {
      // User is in app - show toast notification
      console.log('📱 Showing in-app toast for:', senderName);
      showInAppMessageToast(senderName);
    } else {
      // User is not in app - send push notification
      console.log('📱 Sending push notification for:', senderName);
      await sendPushNotificationForMessage(recipientSessionId, senderName);
    }
    
    // Store notification for when user returns to app (if they don't have push permissions)
    await storePendingMessageNotification(recipientSessionId, senderName);
    
  } catch (error) {
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
    console.log('📱 Current session ID:', currentSessionId, 'Checking against:', sessionId);
    console.log('📱 Platform:', Platform.OS);
    
    // If it's the same session ID, user is in app
    if (currentSessionId === sessionId) {
      console.log('📱 User is in app - session ID match');
      return true;
    }
    
    // Additional check: look for recent activity timestamp
    const lastActivityKey = `lastActivity_${sessionId}`;
    const lastActivity = await AsyncStorage.getItem(lastActivityKey);
    
    if (lastActivity) {
      const lastActivityTime = new Date(lastActivity).getTime();
      const now = new Date().getTime();
      
      // More lenient timeout for iOS (3 minutes) vs Android (1 minute)
      const timeoutMinutes = Platform.OS === 'ios' ? 3 : 1;
      const timeoutAgo = now - (timeoutMinutes * 60 * 1000);
      
      const isRecentlyActive = lastActivityTime > timeoutAgo;
      console.log('📱 Last activity check:', { 
        lastActivityTime, 
        now, 
        timeoutAgo, 
        isRecentlyActive,
        timeDiff: now - lastActivityTime,
        timeDiffMinutes: (now - lastActivityTime) / (60 * 1000),
        platform: Platform.OS,
        timeoutMinutes
      });
      
      // If user was active recently, consider them "in app"
      return isRecentlyActive;
    }
    
    console.log('📱 No recent activity found for session:', sessionId);
    return false;
  } catch (error) {
    console.error('Error checking if user is in app:', error);
    return false;
  }
} 