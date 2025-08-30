import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { VenueEventStore } from '../stores/VenueEventStore';
import { getVenueActiveStatus, formatTimeUntilChange, getNextHookedHoursChange } from '../utils/venueHoursUtils';
import type { Venue } from '../utils/venueHoursUtils';

export interface VenueEventNotification {
  id: string;
  type: 'venue_opening' | 'venue_closing' | 'venue_status_change' | 'proximity_alert';
  venueId: string;
  venueName: string;
  title: string;
  body: string;
  scheduledTime?: Date;
  isScheduled: boolean;
}

/**
 * Service for managing venue event notifications and real-time updates
 */
class VenueEventNotificationServiceClass {
  private scheduledNotifications: Map<string, string> = new Map(); // venueId -> notificationId
  private isInitialized = false;
  private proximityNotifications: Set<string> = new Set(); // Track sent proximity notifications

  /**
   * Initialize the notification service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Configure notification behavior
      await Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
          const isVenueEvent = notification.request.content.data?.type?.startsWith('venue_');
          
          return {
            shouldShowAlert: isVenueEvent,
            shouldPlaySound: isVenueEvent,
            shouldSetBadge: false,
          };
        },
      });

      // Request notification permissions
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: false,
        },
      });

      if (status !== 'granted') {
        console.warn('Notification permissions not granted');
        return;
      }

      // Set up notification categories for venue events
      if (Platform.OS === 'ios') {
        await Notifications.setNotificationCategoryAsync('venue_event', [
          {
            identifier: 'view_venue',
            buttonTitle: 'View Venue',
            options: { opensAppToForeground: true },
          },
          {
            identifier: 'dismiss',
            buttonTitle: 'Dismiss',
            options: { isDestructive: false },
          },
        ]);
      }

      this.isInitialized = true;
      console.log('VenueEventNotificationService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize VenueEventNotificationService:', error);
    }
  }

  /**
   * Schedule notifications for venue Hooked Hours transitions
   */
  async scheduleVenueTransitionNotifications(venues: Venue[]): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Clear existing scheduled notifications
    await this.clearAllScheduledNotifications();

    for (const venue of venues) {
      if (!venue.hookedHours) continue;

      const nextChange = getNextHookedHoursChange(venue);
      if (!nextChange.nextChangeTime) continue;

      const notificationId = await this.scheduleVenueTransitionNotification(venue, nextChange);
      if (notificationId) {
        this.scheduledNotifications.set(venue.id, notificationId);
      }
    }

    console.log(`Scheduled ${this.scheduledNotifications.size} venue transition notifications`);
  }

  /**
   * Schedule a single venue transition notification
   */
  private async scheduleVenueTransitionNotification(
    venue: Venue,
    nextChange: { nextChangeTime: Date; willBeActive: boolean; description: string }
  ): Promise<string | null> {
    try {
      const notificationTime = new Date(nextChange.nextChangeTime);
      // Schedule 5 minutes before the transition
      notificationTime.setMinutes(notificationTime.getMinutes() - 5);

      // Don't schedule if the time is in the past
      if (notificationTime <= new Date()) {
        return null;
      }

      const title = nextChange.willBeActive 
        ? `🔥 ${venue.name} - Hooked Hours Starting Soon!`
        : `⏰ ${venue.name} - Hooked Hours Ending Soon`;

      const body = nextChange.willBeActive
        ? `Hooked Hours start in 5 minutes. Get ready to connect!`
        : `Hooked Hours end in 5 minutes. Last chance to make connections!`;

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            type: nextChange.willBeActive ? 'venue_opening' : 'venue_closing',
            venueId: venue.id,
            venueName: venue.name,
            transitionTime: nextChange.nextChangeTime.toISOString(),
          },
          categoryIdentifier: 'venue_event',
          sound: 'default',
        },
        trigger: {
          date: notificationTime,
        },
      });

      return notificationId;
    } catch (error) {
      console.error('Failed to schedule venue transition notification:', error);
      return null;
    }
  }

  /**
   * Send immediate notification for venue status change
   */
  async sendVenueStatusNotification(venue: Venue, oldStatus: boolean, newStatus: boolean): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const title = newStatus 
        ? `🔥 ${venue.name} - Hooked Hours Now Active!`
        : `⏰ ${venue.name} - Hooked Hours Ended`;

      const body = newStatus
        ? `Start connecting with people at ${venue.name}!`
        : `Thanks for participating in Hooked Hours at ${venue.name}`;

      await Notifications.presentNotificationAsync({
        title,
        body,
        data: {
          type: 'venue_status_change',
          venueId: venue.id,
          venueName: venue.name,
          isActive: newStatus,
        },
        categoryIdentifier: 'venue_event',
        sound: 'default',
      });

      console.log(`Sent venue status notification for ${venue.name}: ${newStatus ? 'active' : 'inactive'}`);
    } catch (error) {
      console.error('Failed to send venue status notification:', error);
    }
  }

  /**
   * Send proximity alert when user approaches venue with active Hooked Hours
   */
  async sendProximityAlert(venue: Venue, distanceMeters: number): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Prevent spam notifications - only send once per venue per session
    if (this.proximityNotifications.has(venue.id)) {
      return;
    }

    const venueStatus = getVenueActiveStatus(venue);
    if (!venueStatus.shouldGlow) {
      return; // Only alert for active Hooked Hours
    }

    try {
      const distanceText = distanceMeters < 1000 
        ? `${Math.round(distanceMeters)}m`
        : `${(distanceMeters / 1000).toFixed(1)}km`;

      const title = `🎯 You're Near ${venue.name}!`;
      const body = `Hooked Hours are active! You're ${distanceText} away. Perfect time to connect!`;

      await Notifications.presentNotificationAsync({
        title,
        body,
        data: {
          type: 'proximity_alert',
          venueId: venue.id,
          venueName: venue.name,
          distance: distanceMeters,
        },
        categoryIdentifier: 'venue_event',
        sound: 'default',
      });

      // Mark as sent to prevent spam
      this.proximityNotifications.add(venue.id);

      console.log(`Sent proximity alert for ${venue.name} at ${distanceText}`);
    } catch (error) {
      console.error('Failed to send proximity alert:', error);
    }
  }

  /**
   * Process venue event notification actions
   */
  async handleNotificationAction(
    actionIdentifier: string,
    notification: Notifications.Notification
  ): Promise<void> {
    const data = notification.request.content.data;
    
    switch (actionIdentifier) {
      case 'view_venue':
        if (data?.venueId) {
          // Navigate to venue details or map
          // This would be handled by the app's navigation system
          VenueEventStore.getState().setSelectedVenueId(data.venueId as string);
        }
        break;
        
      case 'dismiss':
        // Just dismiss - no action needed
        break;
        
      default:
        console.log('Unknown notification action:', actionIdentifier);
    }
  }

  /**
   * Update venue monitoring based on user location and venue status
   */
  async updateVenueMonitoring(userLocation: { latitude: number; longitude: number }): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    const store = VenueEventStore.getState();
    const monitoredVenues = store.getMonitoredVenues();

    for (const venue of monitoredVenues) {
      const [venueLng, venueLat] = venue.coordinates;
      const distance = this.calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        venueLat,
        venueLng
      );

      // Send proximity alert if within 200m and venue has active Hooked Hours
      if (distance <= 200) {
        await this.sendProximityAlert(venue, distance);
      }
    }
  }

  /**
   * Clear proximity notification flags (call when app becomes active)
   */
  clearProximityFlags(): void {
    this.proximityNotifications.clear();
  }

  /**
   * Clear all scheduled venue notifications
   */
  private async clearAllScheduledNotifications(): Promise<void> {
    try {
      const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      for (const notification of allNotifications) {
        const data = notification.content.data;
        if (data?.type?.startsWith('venue_')) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }

      this.scheduledNotifications.clear();
      console.log('Cleared all venue event notifications');
    } catch (error) {
      console.error('Failed to clear scheduled notifications:', error);
    }
  }

  /**
   * Calculate distance between two coordinates in meters
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Get statistics about scheduled notifications
   */
  async getNotificationStats(): Promise<{
    scheduled: number;
    proximityAlerts: number;
    isInitialized: boolean;
  }> {
    return {
      scheduled: this.scheduledNotifications.size,
      proximityAlerts: this.proximityNotifications.size,
      isInitialized: this.isInitialized,
    };
  }
}

export const VenueEventNotificationService = new VenueEventNotificationServiceClass();