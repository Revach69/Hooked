import { sendMessageNotification } from './notificationService';
import { EventProfile } from './firebaseApi';

/**
 * Send notification when a new message is created
 */
export async function notifyNewMessage(
  eventId: string,
  fromProfileId: string,
  toProfileId: string,
  messageContent: string
) {
  try {
    // Get sender's profile to get their name
    const senderProfiles = await EventProfile.filter({
      event_id: eventId,
      session_id: fromProfileId
    });
    
    if (senderProfiles.length === 0) {
      console.error('Sender profile not found for notification');
      return;
    }
    
    const senderName = senderProfiles[0].first_name;
    
    // Create message preview (first 50 characters)
    const messagePreview = messageContent.length > 50 
      ? `${messageContent.substring(0, 50)}...` 
      : messageContent;
    
    // Send notification to receiver
    await sendMessageNotification(
      toProfileId,
      senderName,
      messagePreview,
      false // You can detect if device is locked here
    );
    
    console.log('Message notification sent successfully!');
  } catch (error) {
    console.error('Error sending message notification:', error);
  }
} 