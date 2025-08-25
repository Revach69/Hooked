'use client';

import { NotificationService, NotificationType, type HookedNotification } from './notificationService';
import type { MatchRecord } from './matchingService';
import type { UserProfile } from './sessionManager';

/**
 * Notification helpers for triggering push notifications across the app
 */
export class NotificationHelpers {
  
  /**
   * Send a new match notification
   */
  static async notifyNewMatch(
    recipientSessionId: string,
    match: MatchRecord,
    senderProfile: UserProfile
  ): Promise<void> {
    try {
      const notification: HookedNotification = {
        type: NotificationType.NEW_MATCH,
        title: 'New Match! 🎉',
        body: `You and ${senderProfile.name} liked each other!`,
        data: {
          matchId: match.id,
          sessionId: recipientSessionId,
          senderSessionId: match.sessionId1 === recipientSessionId ? match.sessionId2 : match.sessionId1,
          senderName: senderProfile.name,
          type: NotificationType.NEW_MATCH
        },
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: `match_${match.id}`,
        requireInteraction: true,
      };

      // Show local notification (for testing/development)
      NotificationService.showLocalNotification(notification.title, {
        body: notification.body,
        icon: notification.icon,
        badge: notification.badge,
        data: notification.data,
        tag: notification.tag,
        requireInteraction: notification.requireInteraction,
      });

      console.log('New match notification sent:', notification);
    } catch (error) {
      console.error('Error sending match notification:', error);
    }
  }

  /**
   * Send a new message notification
   */
  static async notifyNewMessage(
    recipientSessionId: string,
    matchId: string,
    senderProfile: UserProfile,
    messageText: string
  ): Promise<void> {
    try {
      // Truncate long messages
      const truncatedMessage = messageText.length > 50 
        ? messageText.substring(0, 50) + '...'
        : messageText;

      const notification: HookedNotification = {
        type: NotificationType.NEW_MESSAGE,
        title: `Message from ${senderProfile.name}`,
        body: truncatedMessage,
        data: {
          matchId: matchId,
          sessionId: recipientSessionId,
          senderSessionId: senderProfile.sessionId,
          senderName: senderProfile.name,
          type: NotificationType.NEW_MESSAGE
        },
        icon: senderProfile.photos[0] || '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: `message_${matchId}`,
        requireInteraction: false,
      };

      // Show local notification
      NotificationService.showLocalNotification(notification.title, {
        body: notification.body,
        icon: notification.icon,
        badge: notification.badge,
        data: notification.data,
        tag: notification.tag,
        requireInteraction: notification.requireInteraction,
      });

      console.log('New message notification sent:', notification);
    } catch (error) {
      console.error('Error sending message notification:', error);
    }
  }

  /**
   * Send an event update notification
   */
  static async notifyEventUpdate(
    recipientSessionId: string,
    eventId: string,
    eventName: string,
    updateMessage: string
  ): Promise<void> {
    try {
      const notification: HookedNotification = {
        type: NotificationType.EVENT_UPDATE,
        title: `${eventName} Update`,
        body: updateMessage,
        data: {
          eventId: eventId,
          sessionId: recipientSessionId,
          type: NotificationType.EVENT_UPDATE
        },
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: `event_${eventId}`,
        requireInteraction: false,
      };

      // Show local notification
      NotificationService.showLocalNotification(notification.title, {
        body: notification.body,
        icon: notification.icon,
        badge: notification.badge,
        data: notification.data,
        tag: notification.tag,
        requireInteraction: notification.requireInteraction,
      });

      console.log('Event update notification sent:', notification);
    } catch (error) {
      console.error('Error sending event update notification:', error);
    }
  }

  /**
   * Send a profile view notification
   */
  static async notifyProfileView(
    recipientSessionId: string,
    viewerProfile: UserProfile
  ): Promise<void> {
    try {
      const notification: HookedNotification = {
        type: NotificationType.PROFILE_VIEW,
        title: 'Someone viewed your profile',
        body: `${viewerProfile.name} checked out your profile`,
        data: {
          sessionId: recipientSessionId,
          viewerSessionId: viewerProfile.sessionId,
          viewerName: viewerProfile.name,
          type: NotificationType.PROFILE_VIEW
        },
        icon: viewerProfile.photos[0] || '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: `profile_view_${viewerProfile.sessionId}`,
        requireInteraction: false,
      };

      // Show local notification
      NotificationService.showLocalNotification(notification.title, {
        body: notification.body,
        icon: notification.icon,
        badge: notification.badge,
        data: notification.data,
        tag: notification.tag,
        requireInteraction: notification.requireInteraction,
      });

      console.log('Profile view notification sent:', notification);
    } catch (error) {
      console.error('Error sending profile view notification:', error);
    }
  }

  /**
   * Check if user has notifications enabled
   */
  static isNotificationEnabled(sessionId: string): boolean {
    if (typeof window === 'undefined') return false;
    
    return NotificationService.getPermissionStatus() === 'granted' && 
           NotificationService.getStoredToken(sessionId) !== null;
  }

  /**
   * Batch send notifications to multiple users
   */
  static async batchNotify(
    notifications: Array<{
      recipientSessionId: string;
      notification: HookedNotification;
    }>
  ): Promise<void> {
    try {
      const promises = notifications.map(({ recipientSessionId, notification }) => {
        if (this.isNotificationEnabled(recipientSessionId)) {
          return NotificationService.showLocalNotification(notification.title, {
            body: notification.body,
            icon: notification.icon,
            badge: notification.badge,
            data: notification.data,
            tag: notification.tag,
            requireInteraction: notification.requireInteraction,
          });
        }
        return Promise.resolve();
      });

      await Promise.all(promises);
      console.log(`Batch sent ${notifications.length} notifications`);
    } catch (error) {
      console.error('Error batch sending notifications:', error);
    }
  }

  /**
   * Schedule a delayed notification
   */
  static scheduleNotification(
    delayMs: number,
    callback: () => void
  ): NodeJS.Timeout {
    return setTimeout(callback, delayMs);
  }

  /**
   * Clear all notifications with a specific tag
   */
  static async clearNotifications(tag: string): Promise<void> {
    try {
      if ('serviceWorker' in navigator && 'getRegistrations' in navigator.serviceWorker) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        
        for (const registration of registrations) {
          if ('getNotifications' in registration) {
            const notifications = await registration.getNotifications({ tag });
            
            for (const notification of notifications) {
              notification.close();
            }
          }
        }
      }
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }
}