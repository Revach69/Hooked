// Web-compatible notification service
// Note: This is a simplified version for web browsers

export class NotificationService {
  static async requestPermission() {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      console.log('Notification permission denied');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  static async sendNotification(title, body, options = {}) {
    if (!('Notification' in window)) {
      console.log('Notifications not supported');
      return false;
    }

    if (Notification.permission !== 'granted') {
      console.log('Notification permission not granted');
      return false;
    }

    try {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'hooked-notification',
        requireInteraction: false,
        ...options
      });

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  }

  static async sendMatchNotification(matchedUserName) {
    return this.sendNotification(
      'You got Hooked! 💕',
      `You matched with ${matchedUserName}!`,
      {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'match-notification'
      }
    );
  }

  static async sendLikeNotification(likerName) {
    try {
      // Check if user has been away for more than 10 minutes
      const lastActivityKey = `lastActivity_${window.currentSessionId || 'unknown'}`;
      const lastActivity = localStorage.getItem(lastActivityKey);
      
      if (lastActivity) {
        const lastActivityTime = new Date(lastActivity).getTime();
        const now = Date.now();
        const tenMinutes = 10 * 60 * 1000; // 10 minutes in milliseconds
        
        // If user was active less than 10 minutes ago, don't send notification
        if ((now - lastActivityTime) < tenMinutes) {
          return false;
        }
      }
      
      return this.sendNotification(
        'Someone liked you! ❤️',
        '', // Empty body to not reveal the name
        {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'like-notification'
        }
      );
    } catch (error) {
      console.error('Error sending like notification:', error);
      return false;
    }
  }

  static async sendMessageNotification(senderName, messagePreview) {
    return this.sendNotification(
      `Message from ${senderName}`,
      messagePreview.length > 50 ? messagePreview.substring(0, 50) + '...' : messagePreview,
      {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'message-notification'
      }
    );
  }

  static async sendGenericNotification(title, body, data = {}) {
    return this.sendNotification(title, body, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'generic-notification',
      data
    });
  }
}

// Legacy function exports for compatibility
export async function sendMatchNotification(userId, matchedUserName) {
  return NotificationService.sendMatchNotification(matchedUserName);
}

export async function sendLikeNotification(userId, likerName) {
  return NotificationService.sendLikeNotification(likerName);
}

export async function sendMessageNotification(userId, senderName, messagePreview, isDeviceLocked = false) {
  return NotificationService.sendMessageNotification(senderName, messagePreview);
}

export async function sendGenericNotification(userId, title, body, data = {}) {
  return NotificationService.sendGenericNotification(title, body, data);
}

export async function sendPushNotificationToUser(userId, notification) {
  return NotificationService.sendGenericNotification(
    notification.title,
    notification.body,
    notification.data
  );
} 