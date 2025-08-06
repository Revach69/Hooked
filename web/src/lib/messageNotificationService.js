import { toast } from 'sonner';

/**
 * Send notification when a new message is created
 * This function handles both in-app toasts and push notifications
 */
export async function handleNewMessageNotification(
  eventId,
  fromProfileId,
  toProfileId,
  messageContent,
  senderName
) {
  try {
    console.log('🔔 handleNewMessageNotification called:', { eventId, fromProfileId, toProfileId, senderName });
    
    // Get the recipient's session ID
    const { EventProfile } = await import('./firebaseApi.js');
    const recipientProfiles = await EventProfile.filter({ 
      id: toProfileId, 
      event_id: eventId 
    });
    
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
async function checkIfUserIsInApp(sessionId) {
  try {
    // Get current user's session ID
    const currentSessionId = localStorage.getItem('currentSessionId');
    console.log('📱 Current session ID:', currentSessionId, 'Checking against:', sessionId);
    
    // If it's the same session ID, user is in app
    if (currentSessionId === sessionId) {
      console.log('📱 User is in app - session ID match');
      return true;
    }
    
    // Additional check: look for recent activity timestamp
    const lastActivityKey = `lastActivity_${sessionId}`;
    const lastActivity = localStorage.getItem(lastActivityKey);
    
    if (lastActivity) {
      const lastActivityTime = new Date(lastActivity).getTime();
      const now = new Date().getTime();
      const twoMinutesAgo = now - (2 * 60 * 1000); // 2 minutes instead of 5
      
      const isRecentlyActive = lastActivityTime > twoMinutesAgo;
      console.log('📱 Last activity check:', { lastActivityTime, now, twoMinutesAgo, isRecentlyActive });
      
      // If user was active in the last 2 minutes, consider them "in app"
      return isRecentlyActive;
    }
    
    console.log('📱 No recent activity found for session:', sessionId);
    return false;
  } catch (error) {
    console.error('Error checking if user is in app:', error);
    return false;
  }
}

/**
 * Show in-app toast notification for new message
 */
function showInAppMessageToast(senderName) {
  toast.success(`${senderName} sent you a message!`, {
    description: 'Tap to view your messages',
    action: {
      label: 'View',
      onClick: () => {
        // Navigate to matches page
        window.location.href = '/matches';
      }
    }
  });
}

/**
 * Send push notification for message when user is not in app
 */
async function sendPushNotificationForMessage(recipientSessionId, senderName) {
  try {
    // Check if user has push notification permissions
    if ('Notification' in window && Notification.permission === 'granted') {
      // Create and show push notification
      const notification = new Notification('New Message! 💬', {
        body: `${senderName} sent you a message!`,
        icon: '/icon.png', // App icon
        badge: '/icon.png',
        tag: 'message-notification',
        requireInteraction: false,
        silent: false
      });
      
      // Handle notification click
      notification.onclick = function() {
        window.focus();
        window.location.href = '/matches';
        notification.close();
      };
      
      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);
    }
  } catch (error) {
    console.error('Error sending push notification for message:', error);
  }
}

/**
 * Store pending message notification for when user returns to app
 */
async function storePendingMessageNotification(recipientSessionId, senderName) {
  try {
    const pendingNotificationsKey = `pendingMessageNotifications_${recipientSessionId}`;
    const existingNotifications = localStorage.getItem(pendingNotificationsKey);
    
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
    
    localStorage.setItem(pendingNotificationsKey, JSON.stringify(notifications));
  } catch (error) {
    console.error('Error storing pending message notification:', error);
  }
}

/**
 * Check and show pending message notifications when user returns to app
 */
export async function checkPendingMessageNotifications() {
  try {
    const currentSessionId = localStorage.getItem('currentSessionId');
    
    if (!currentSessionId) {
      return;
    }
    
    const pendingNotificationsKey = `pendingMessageNotifications_${currentSessionId}`;
    const pendingNotifications = localStorage.getItem(pendingNotificationsKey);
    
    if (pendingNotifications) {
      const notifications = JSON.parse(pendingNotifications);
      
      if (notifications.length > 0) {
        // Show the most recent notification
        const latestNotification = notifications[notifications.length - 1];
        
        if (latestNotification.type === 'message') {
          showInAppMessageToast(latestNotification.senderName);
        }
        
        // Clear the pending notifications
        localStorage.removeItem(pendingNotificationsKey);
      }
    }
  } catch (error) {
    console.error('Error checking pending message notifications:', error);
  }
}

/**
 * Update user's last activity timestamp
 */
export async function updateUserActivity(sessionId) {
  try {
    const lastActivityKey = `lastActivity_${sessionId}`;
    localStorage.setItem(lastActivityKey, new Date().toISOString());
  } catch (error) {
    console.error('Error updating user activity:', error);
  }
}

/**
 * Mark messages as read when entering a chat
 */
export async function markMessagesAsRead(eventId, fromSessionId, toSessionId) {
  try {
    console.log('📖 Marking messages as read:', { eventId, fromSessionId, toSessionId });
    
    // Get the current user's profile ID
    const { EventProfile } = await import('./firebaseApi.js');
    const currentUserProfiles = await EventProfile.filter({
      session_id: toSessionId,
      event_id: eventId
    });
    
    if (currentUserProfiles.length === 0) {
      console.error('Current user profile not found');
      return;
    }
    
    const currentUserProfileId = currentUserProfiles[0].id;
    
    // Get the sender's profile ID
    const senderProfiles = await EventProfile.filter({
      session_id: fromSessionId,
      event_id: eventId
    });
    
    if (senderProfiles.length === 0) {
      console.error('Sender profile not found');
      return;
    }
    
    const senderProfileId = senderProfiles[0].id;
    
    // Mark messages as read by updating them in Firestore
    const { Message } = await import('./firebaseApi.js');
    const unreadMessages = await Message.filter({
      event_id: eventId,
      from_profile_id: senderProfileId,
      to_profile_id: currentUserProfileId
    });
    
    console.log('📖 Found unread messages:', unreadMessages.length);
    
    // Update each message to mark as read
    for (const message of unreadMessages) {
      try {
        await Message.update(message.id, { is_read: true });
        console.log('📖 Marked message as read:', message.id);
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    }
    
    // Clear the unread status for this specific chat
    const unreadChatsKey = `unreadChats_${toSessionId}`;
    const unreadChats = localStorage.getItem(unreadChatsKey);
    
    if (unreadChats) {
      const unreadChatsSet = new Set(JSON.parse(unreadChats));
      unreadChatsSet.delete(fromSessionId);
      localStorage.setItem(unreadChatsKey, JSON.stringify(Array.from(unreadChatsSet)));
      console.log('📖 Updated unread chats for session:', toSessionId);
    }
    
  } catch (error) {
    console.error('Error marking messages as read:', error);
  }
}

/**
 * Check if user has unseen messages
 */
export async function hasUnseenMessages(eventId, sessionId) {
  try {
    const { EventProfile, Message } = await import('./firebaseApi.js');
    
    // Get current user's profile ID
    const currentUserProfiles = await EventProfile.filter({
      session_id: sessionId,
      event_id: eventId
    });
    
    if (currentUserProfiles.length === 0) {
      return false;
    }
    
    const currentUserProfileId = currentUserProfiles[0].id;
    
    // Check for unseen messages (messages sent TO the current user that are not marked as seen)
    const allMessages = await Message.filter({
      event_id: eventId,
      to_profile_id: currentUserProfileId
    });
    
    // Filter for messages that are not marked as seen
    const unseenMessages = allMessages.filter(message => !message.seen);
    
    console.log('👁️ Unseen messages check:', { 
      totalMessages: allMessages.length, 
      unseenMessages: unseenMessages.length,
      sessionId,
      eventId 
    });
    
    return unseenMessages.length > 0;
  } catch (error) {
    console.error('Error checking unseen messages:', error);
    return false;
  }
}

/**
 * Mark messages as seen when entering a chat
 */
export async function markMessagesAsSeen(eventId, fromSessionId, toSessionId) {
  try {
    console.log('👁️ Marking messages as seen:', { eventId, fromSessionId, toSessionId });
    
    // Get the current user's profile ID
    const { EventProfile } = await import('./firebaseApi.js');
    const currentUserProfiles = await EventProfile.filter({
      session_id: toSessionId,
      event_id: eventId
    });
    
    if (currentUserProfiles.length === 0) {
      console.error('Current user profile not found');
      return;
    }
    
    const currentUserProfileId = currentUserProfiles[0].id;
    
    // Get the sender's profile ID
    const senderProfiles = await EventProfile.filter({
      session_id: fromSessionId,
      event_id: eventId
    });
    
    if (senderProfiles.length === 0) {
      console.error('Sender profile not found');
      return;
    }
    
    const senderProfileId = senderProfiles[0].id;
    
    // Mark messages as seen by updating them in Firestore
    const { Message } = await import('./firebaseApi.js');
    const allMessages = await Message.filter({
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
        await Message.update(message.id, { 
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
 * Request push notification permissions
 */
export async function requestNotificationPermission() {
  try {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
} 