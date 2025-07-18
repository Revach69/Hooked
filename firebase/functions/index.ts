import * as functions from 'firebase-functions';
import { sendMatchNotification, sendMessageNotification, sendGenericNotification } from './sendPushNotification';

// Trigger when a new match is created
export const onNewMatch = functions.firestore
  .document('matches/{matchId}')
  .onCreate(async (snap, context) => {
    try {
      const matchData = snap.data();
      const matchId = context.params.matchId;

      console.log(`New match created: ${matchId}`, matchData);

      // Extract user IDs from the match
      const { user1Id, user2Id } = matchData;
      
      if (!user1Id || !user2Id) {
        console.error('Missing user IDs in match data');
        return;
      }

      // Get user names (you'll need to fetch these from Firestore)
      const user1Name = await getUserName(user1Id);
      const user2Name = await getUserName(user2Id);

      // Send notifications to both users
      await Promise.allSettled([
        sendMatchNotification(user1Id, user2Name),
        sendMatchNotification(user2Id, user1Name),
      ]);

      console.log(`Match notifications sent for match: ${matchId}`);
    } catch (error) {
      console.error('Error handling new match:', error);
    }
  });

// Trigger when a new message is created
export const onNewMessage = functions.firestore
  .document('messages/{messageId}')
  .onCreate(async (snap, context) => {
    try {
      const messageData = snap.data();
      const messageId = context.params.messageId;

      console.log(`New message created: ${messageId}`, messageData);

      // Extract message details
      const { senderId, receiverId, content, timestamp } = messageData;
      
      if (!senderId || !receiverId || !content) {
        console.error('Missing required fields in message data');
        return;
      }

      // Get sender name
      const senderName = await getUserName(senderId);
      
      // Create message preview (first 50 characters)
      const messagePreview = content.length > 50 
        ? `${content.substring(0, 50)}...` 
        : content;

      // Send notification to receiver
      await sendMessageNotification(
        receiverId,
        senderName,
        messagePreview,
        false // You might want to detect if device is locked
      );

      console.log(`Message notification sent for message: ${messageId}`);
    } catch (error) {
      console.error('Error handling new message:', error);
    }
  });

// Helper function to get user name from Firestore
async function getUserName(userId: string): Promise<string> {
  try {
    const userDoc = await functions.firestore
      .document(`users/${userId}`)
      .get();
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      return userData?.displayName || userData?.name || 'Someone';
    }
    
    return 'Someone';
  } catch (error) {
    console.error(`Error getting user name for ${userId}:`, error);
    return 'Someone';
  }
}

// Optional: Function to send test notifications
export const sendTestNotification = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }

  const { userId, title, body } = data;

  if (!userId || !title || !body) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Missing required parameters: userId, title, body'
    );
  }

  try {
    const success = await sendGenericNotification(userId, title, body);
    
    if (success) {
      return { success: true, message: 'Test notification sent successfully' };
    } else {
      throw new functions.https.HttpsError(
        'internal',
        'Failed to send test notification'
      );
    }
  } catch (error) {
    console.error('Error sending test notification:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Error sending test notification'
    );
  }
}); 