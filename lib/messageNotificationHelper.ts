import { sendMessageNotification } from './notificationService';

/**
 * Send notification when a new message is created
 */
export async function notifyNewMessage(
  eventId: string,
  fromProfileId: string,
  toProfileId: string,
  messageContent: string,
  senderName?: string
) {
  try {
    // If sender name is not provided, we can't send a proper notification
    if (!senderName) {
      console.error('Sender name is required for notification');
      return;
    }
    
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
  } catch (error) {
    console.error('Error sending message notification:', error);
  }
} 