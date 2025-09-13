/**
 * Local Notification Fallback System
 * 
 * Handles local notifications as fallback when push notifications fail
 * or when no push token is available.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { AndroidChannels } from './AndroidChannels';
import { AnyEvent } from './types';

import AsyncStorage from '@react-native-async-storage/async-storage';

interface ScheduledNotification {
  id: string;
  eventId: string;
  scheduledAt: number;
  type: 'match' | 'message';
}

class LocalNotificationFallbackService {
  private scheduledNotifications = new Map<string, ScheduledNotification>();
  private readonly NOTIFICATION_DELAY = 2000; // 2 seconds delay to allow push to arrive first
  
  /**
   * Schedule a local notification as fallback
   * Only triggers if push notification doesn't arrive within the delay window
   */
  async scheduleLocalFallback(event: AnyEvent): Promise<string | null> {
    try {
      // Generate unique notification ID
      const notificationId = `local_fallback_${event.type}_${event.id}_${Date.now()}`;
      
      // Check permissions first
      const permissions = await Notifications.getPermissionsAsync();
      if (!permissions.granted) {
        console.log('LocalNotificationFallback: No permission for local notifications');
        return null;
      }
      
      // Prepare notification content based on event type
      let title: string;
      let body: string;
      let channelId: string;
      
      if (event.type === 'match') {
        title = "You got Hooked!"; // NO emoji for client fallback identification
        body = `Start chatting with ${event.otherName || 'your match'}!`;
        channelId = AndroidChannels.getChannelId('match');
      } else if (event.type === 'message') {
        title = `Message from ${event.senderName || 'Someone'}`;
        body = event.preview || 'New message';
        channelId = AndroidChannels.getChannelId('message');
      } else {
        console.warn('LocalNotificationFallback: Unknown event type:', (event as any).type);
        return null;
      }
      
      // Schedule the notification with delay
      const triggerTime = Date.now() + this.NOTIFICATION_DELAY;
      
      await Notifications.scheduleNotificationAsync({
        identifier: notificationId,
        content: {
          title,
          body,
          data: {
            eventId: event.id,
            source: 'local_fallback',
            ...event,
            type: event.type // Override to ensure type is preserved
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          ...(Platform.OS === 'android' && { channelId })
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: Math.ceil(this.NOTIFICATION_DELAY / 1000)
        }
      });
      
      // Track the scheduled notification
      this.scheduledNotifications.set(notificationId, {
        id: notificationId,
        eventId: event.id,
        scheduledAt: triggerTime,
        type: event.type as 'match' | 'message'
      });
      
      console.log(`LocalNotificationFallback: Scheduled fallback notification ${notificationId} for ${event.type}`);
      
      console.log({
        message: 'Local notification fallback scheduled',
        level: 'info',
        category: 'notification_fallback',
        data: { 
          notificationId, 
          eventType: event.type, 
          eventId: event.id,
          delayMs: this.NOTIFICATION_DELAY 
        }
      });
      
      return notificationId;
      
    } catch (error) {
      console.error('LocalNotificationFallback: Failed to schedule notification:', error);
      console.error(error, {
        tags: {
          operation: 'local_notification_fallback',
          source: 'scheduleLocalFallback'
        },
        extra: {
          eventType: event.type,
          eventId: event.id
        }
      });
      return null;
    }
  }
  
  /**
   * Cancel a scheduled local notification (call when push arrives)
   */
  async cancelLocalFallback(eventId: string, eventType?: string): Promise<void> {
    try {
      // Find notifications for this event
      const notificationsToCancel = Array.from(this.scheduledNotifications.values())
        .filter(notification => 
          notification.eventId === eventId && 
          (!eventType || notification.type === eventType)
        );
      
      if (notificationsToCancel.length === 0) {
        return;
      }
      
      // Cancel each notification
      for (const notification of notificationsToCancel) {
        await Notifications.cancelScheduledNotificationAsync(notification.id);
        this.scheduledNotifications.delete(notification.id);
        
        console.log(`LocalNotificationFallback: Cancelled fallback notification ${notification.id} (push arrived)`);
        
        console.log({
          message: 'Local notification fallback cancelled - push arrived',
          level: 'info',
          category: 'notification_fallback',
          data: { 
            notificationId: notification.id,
            eventType: notification.type,
            eventId: notification.eventId
          }
        });
      }
      
    } catch (error) {
      console.error('LocalNotificationFallback: Failed to cancel notifications:', error);
      console.error(error, {
        tags: {
          operation: 'cancel_local_fallback',
          source: 'cancelLocalFallback'
        }
      });
    }
  }
  
  /**
   * Cleanup expired scheduled notifications
   */
  async cleanupExpiredNotifications(): Promise<void> {
    try {
      const now = Date.now();
      const expiredThreshold = 5 * 60 * 1000; // 5 minutes
      
      const expiredNotifications = Array.from(this.scheduledNotifications.values())
        .filter(notification => now - notification.scheduledAt > expiredThreshold);
      
      if (expiredNotifications.length === 0) {
        return;
      }
      
      // Cancel and remove expired notifications
      for (const notification of expiredNotifications) {
        try {
          await Notifications.cancelScheduledNotificationAsync(notification.id);
        } catch {
          // Notification might have already been delivered or cancelled
        }
        this.scheduledNotifications.delete(notification.id);
      }
      
      console.log(`LocalNotificationFallback: Cleaned up ${expiredNotifications.length} expired notifications`);
      
    } catch (error) {
      console.warn('LocalNotificationFallback: Cleanup failed:', error);
    }
  }
  
  /**
   * Get statistics about scheduled notifications
   */
  getStats(): {
    totalScheduled: number;
    byType: Record<string, number>;
    oldestScheduledAt: number | null;
  } {
    const notifications = Array.from(this.scheduledNotifications.values());
    const byType: Record<string, number> = {};
    
    for (const notification of notifications) {
      byType[notification.type] = (byType[notification.type] || 0) + 1;
    }
    
    const oldestScheduledAt = notifications.length > 0 
      ? Math.min(...notifications.map(n => n.scheduledAt))
      : null;
    
    return {
      totalScheduled: notifications.length,
      byType,
      oldestScheduledAt
    };
  }
  
  /**
   * Android-specific aggressive fallback for push notification failures
   * Uses immediate local notifications when push seems to be failing
   */
  async enableAndroidAggressiveFallback(event: AnyEvent): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      console.log('LocalNotificationFallback: Android aggressive fallback triggered for:', event.type);
      
      // Check if push notifications have been consistently failing
      const failureHistory = await this.getAndroidPushFailureHistory();
      const shouldUseAggressive = failureHistory.recentFailures > 2;
      
      if (shouldUseAggressive) {
        console.log('LocalNotificationFallback: Using immediate Android notification (push failing consistently)');
        
        // Schedule immediate notification (no delay)
        await this.scheduleImmediateAndroidNotification(event);
        
        // Track this as aggressive fallback usage
        await this.recordAndroidAggressiveFallbackUsage();
        
        console.log({
          message: 'Android aggressive fallback used - push notifications failing',
          level: 'warning',
          category: 'android_notification_fallback',
          data: { 
            eventType: event.type,
            failureHistory,
            eventId: event.id
          }
        });
      } else {
        // Use normal fallback with delay
        await this.scheduleLocalFallback(event);
      }
      
    } catch (error) {
      console.error('LocalNotificationFallback: Android aggressive fallback failed:', error);
      console.error(error, {
        tags: {
          operation: 'android_aggressive_fallback',
          platform: 'android'
        }
      });
    }
  }
  
  /**
   * Schedule immediate Android notification with proper channels
   */
  private async scheduleImmediateAndroidNotification(event: AnyEvent): Promise<void> {
    let title: string;
    let body: string;
    let channelId: string;
    
    if (event.type === 'match') {
      title = "🎯 Android Fallback: You got Hooked!"; // Mark as Android fallback
      body = `Start chatting with ${event.otherName || 'your match'}!`;
      channelId = AndroidChannels.getChannelId('match');
    } else if (event.type === 'message') {
      title = `📱 Android Fallback: ${event.senderName || 'Someone'}`;
      body = event.preview || 'New message';
      channelId = AndroidChannels.getChannelId('message');
    } else {
      return;
    }

    await Notifications.scheduleNotificationAsync({
      identifier: `android_immediate_${event.id}_${Date.now()}`,
      content: {
        title,
        body,
        data: {
          eventId: event.id,
          source: 'android_aggressive_fallback',
          ...event,
          type: event.type
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX, // Maximum priority for Android
        ...(Platform.OS === 'android' && { channelId }),
        sticky: false,
        autoDismiss: true
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 0.1 // Almost immediate
      }
    });
  }
  
  /**
   * Get Android push failure history
   */
  private async getAndroidPushFailureHistory(): Promise<{recentFailures: number, lastSuccess?: number}> {
    try {
      const history = await AsyncStorage.getItem('android_push_failure_history');
      if (!history) {
        return { recentFailures: 0 };
      }
      return JSON.parse(history);
    } catch {
      return { recentFailures: 0 };
    }
  }
  
  /**
   * Record Android aggressive fallback usage
   */
  private async recordAndroidAggressiveFallbackUsage(): Promise<void> {
    try {
      const usage = await AsyncStorage.getItem('android_aggressive_fallback_usage');
      const currentUsage = usage ? JSON.parse(usage) : { count: 0, lastUsed: 0 };
      
      currentUsage.count += 1;
      currentUsage.lastUsed = Date.now();
      
      await AsyncStorage.setItem('android_aggressive_fallback_usage', JSON.stringify(currentUsage));
    } catch (error) {
      console.warn('Failed to record Android aggressive fallback usage:', error);
    }
  }

  /**
   * Initialize service (call once)
   */
  initialize(): void {
    // Set up periodic cleanup
    setInterval(() => {
      this.cleanupExpiredNotifications();
    }, 2 * 60 * 1000); // Every 2 minutes
    
    // Android-specific: Clean up failure history periodically
    if (Platform.OS === 'android') {
      setInterval(async () => {
        try {
          // Reset failure history every hour to give push notifications a chance
          await AsyncStorage.removeItem('android_push_failure_history');
        } catch {
          // Ignore cleanup errors
        }
      }, 60 * 60 * 1000); // Every hour
    }
    
    console.log('LocalNotificationFallback: Service initialized with periodic cleanup');
  }
}

export const LocalNotificationFallback = new LocalNotificationFallbackService();
export default LocalNotificationFallback;