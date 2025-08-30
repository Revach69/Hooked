import { AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { VenueEventStore, VenueEventEntry, UserLocation } from '../stores/VenueEventStore';
import { VenueEventNotificationService } from './VenueEventNotificationService';
import { VenuePingService } from './VenuePingService';
import { VenueLocationService } from './VenueLocationService';
import type { Venue } from '../utils/venueHoursUtils';
import { getVenueActiveStatus } from '../utils/venueHoursUtils';

const VENUE_MONITORING_TASK = 'venue-monitoring-task';

/**
 * Central manager for venue event lifecycle and notifications
 */
class VenueEventManagerClass {
  private isInitialized = false;
  private appStateSubscription: any = null;
  private statusUpdateInterval: NodeJS.Timeout | null = null;
  private previousVenueStatuses: Map<string, boolean> = new Map();

  /**
   * Initialize the venue event manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize services
      await VenueEventNotificationService.initialize();
      
      // Set up app state listener
      this.setupAppStateListener();
      
      // Set up notification response handler
      this.setupNotificationHandler();
      
      // Start status monitoring
      this.startStatusMonitoring();
      
      // Define background task
      this.defineBackgroundTask();
      
      this.isInitialized = true;
      console.log('VenueEventManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize VenueEventManager:', error);
    }
  }

  /**
   * Set up app state listener for managing background/foreground transitions
   */
  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const store = VenueEventStore.getState();
      
      if (nextAppState === 'active') {
        // App became foreground
        console.log('App became active - refreshing venue statuses');
        
        // Clear proximity notification flags
        VenueEventNotificationService.clearProximityFlags();
        
        // Refresh venue statuses immediately
        this.updateAllVenueStatuses();
        
        // Update location if tracking is enabled
        if (store.isLocationTracking) {
          this.updateUserLocation();
        }
      } else if (nextAppState === 'background') {
        // App went to background
        console.log('App went to background');
        
        // Schedule background location monitoring if user is in venue
        if (store.isCurrentlyInVenue() && store.isBackgroundLocationEnabled) {
          this.startBackgroundLocationTracking();
        }
      }
    });
  }

  /**
   * Set up notification response handler
   */
  private setupNotificationHandler(): void {
    // Handle notification responses
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const { notification, actionIdentifier } = response;
      VenueEventNotificationService.handleNotificationAction(actionIdentifier, notification);
    });

    // Handle notifications received while app is in foreground
    const foregroundSubscription = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data;
      if (data?.type?.startsWith('venue_')) {
        console.log('Received venue event notification:', data.type);
      }
    });
  }

  /**
   * Start periodic venue status monitoring
   */
  private startStatusMonitoring(): void {
    // Update every minute to catch Hooked Hours transitions
    this.statusUpdateInterval = setInterval(() => {
      this.updateAllVenueStatuses();
    }, 60000);
    
    // Initial update
    this.updateAllVenueStatuses();
  }

  /**
   * Update all monitored venue statuses and trigger notifications
   */
  private async updateAllVenueStatuses(): Promise<void> {
    const store = VenueEventStore.getState();
    const monitoredVenues = store.getMonitoredVenues();

    for (const venue of monitoredVenues) {
      const currentStatus = getVenueActiveStatus(venue);
      const previousStatus = this.previousVenueStatuses.get(venue.id);
      
      // Update store
      store.updateVenueStatus(venue.id, currentStatus.shouldGlow, currentStatus.statusText);
      
      // Check for status change and send notification
      if (previousStatus !== undefined && previousStatus !== currentStatus.shouldGlow) {
        await VenueEventNotificationService.sendVenueStatusNotification(
          venue, 
          previousStatus, 
          currentStatus.shouldGlow
        );
      }
      
      // Remember current status
      this.previousVenueStatuses.set(venue.id, currentStatus.shouldGlow);
    }

    // Schedule upcoming transition notifications
    await VenueEventNotificationService.scheduleVenueTransitionNotifications(monitoredVenues);
  }

  /**
   * Add venue to monitoring list
   */
  async addVenueToMonitoring(venue: Venue): Promise<void> {
    const store = VenueEventStore.getState();
    store.addMonitoredVenue(venue);
    
    // Initialize status tracking
    const status = getVenueActiveStatus(venue);
    this.previousVenueStatuses.set(venue.id, status.shouldGlow);
    
    console.log(`Added venue ${venue.name} to monitoring`);
  }

  /**
   * Remove venue from monitoring list
   */
  async removeVenueFromMonitoring(venueId: string): Promise<void> {
    const store = VenueEventStore.getState();
    store.removeMonitoredVenue(venueId);
    this.previousVenueStatuses.delete(venueId);
    
    console.log(`Removed venue ${venueId} from monitoring`);
  }

  /**
   * Handle venue entry (QR code scan success)
   */
  async handleVenueEntry(entry: VenueEventEntry): Promise<void> {
    const store = VenueEventStore.getState();
    
    // Update store
    store.setCurrentVenueEntry(entry);
    store.setLocationTracking(true);
    
    // Add to monitoring if not already monitored
    const venue = store.getMonitoredVenues().find(v => v.id === entry.venueId);
    if (venue) {
      await this.addVenueToMonitoring(venue);
    }
    
    // Start ping service
    await VenuePingService.startPinging(entry.venueId, entry.sessionId);
    
    // Record in QR scan history
    store.addQrScanResult({
      venueId: entry.venueId,
      result: 'success',
      timestamp: new Date(),
      message: `Successfully joined ${entry.venueName}`,
    });
    
    console.log(`User entered venue: ${entry.venueName}`);
  }

  /**
   * Handle venue exit
   */
  async handleVenueExit(reason: 'manual' | 'expired' | 'location' = 'manual'): Promise<void> {
    const store = VenueEventStore.getState();
    const currentEntry = store.currentVenueEntry;
    
    if (!currentEntry) return;
    
    // Stop ping service
    await VenuePingService.stopPinging();
    
    // Update entry status
    store.updateVenueEntryStatus('left');
    
    // Stop background location tracking
    await this.stopBackgroundLocationTracking();
    
    // Clear current entry after a delay
    setTimeout(() => {
      store.setCurrentVenueEntry(null);
    }, 1000);
    
    console.log(`User exited venue: ${currentEntry.venueName} (${reason})`);
  }

  /**
   * Update user location and check for proximity alerts
   */
  async updateUserLocation(): Promise<void> {
    try {
      const locationResult = await VenueLocationService.getCurrentLocation();
      
      if (locationResult.success && locationResult.location) {
        const userLocation: UserLocation = {
          latitude: locationResult.location.latitude,
          longitude: locationResult.location.longitude,
          accuracy: locationResult.location.accuracy || 10,
          timestamp: new Date(),
        };
        
        // Update store
        const store = VenueEventStore.getState();
        store.setUserLocation(userLocation);
        
        // Check proximity alerts
        await VenueEventNotificationService.updateVenueMonitoring({
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        });
        
        // Update ping service if in venue
        if (store.isCurrentlyInVenue()) {
          store.recordVenuePing();
        }
      }
    } catch (error) {
      console.error('Failed to update user location:', error);
    }
  }

  /**
   * Start background location tracking
   */
  private async startBackgroundLocationTracking(): Promise<void> {
    try {
      const hasPermission = await VenueLocationService.hasBackgroundLocationPermission();
      if (!hasPermission) {
        console.warn('Background location permission not granted');
        return;
      }

      // Start background task (implementation depends on your background location setup)
      const taskName = await TaskManager.startLocationUpdatesAsync(VENUE_MONITORING_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 60000, // 1 minute
        distanceInterval: 50, // 50 meters
        foregroundService: {
          notificationTitle: 'Venue Event Active',
          notificationBody: 'Hooked is tracking your location for venue events.',
        },
      });
      
      const store = VenueEventStore.getState();
      store.setBackgroundTaskId(taskName);
      
      console.log('Started background location tracking');
    } catch (error) {
      console.error('Failed to start background location tracking:', error);
    }
  }

  /**
   * Stop background location tracking
   */
  private async stopBackgroundLocationTracking(): Promise<void> {
    try {
      const store = VenueEventStore.getState();
      const taskId = store.backgroundTaskId;
      
      if (taskId) {
        await TaskManager.stopLocationUpdatesAsync(VENUE_MONITORING_TASK);
        store.setBackgroundTaskId(null);
        console.log('Stopped background location tracking');
      }
    } catch (error) {
      console.error('Failed to stop background location tracking:', error);
    }
  }

  /**
   * Define background task for venue monitoring
   */
  private defineBackgroundTask(): void {
    TaskManager.defineTask(VENUE_MONITORING_TASK, ({ data, error }: any) => {
      if (error) {
        console.error('Background location task error:', error);
        return;
      }

      if (data) {
        const { locations } = data;
        const location = locations[0];
        
        if (location) {
          // Update store with background location
          const store = VenueEventStore.getState();
          const userLocation: UserLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || 10,
            timestamp: new Date(location.timestamp),
          };
          
          store.setUserLocation(userLocation);
          store.recordVenuePing();
          
          // Verify user is still at venue (this would trigger server ping)
          if (store.isCurrentlyInVenue()) {
            VenuePingService.pingServer();
          }
        }
      }
    });
  }

  /**
   * Clean up expired data and optimize performance
   */
  async cleanup(): Promise<void> {
    const store = VenueEventStore.getState();
    store.clearExpiredData();
    
    // Clear old status tracking
    const monitoredVenueIds = new Set(store.getMonitoredVenues().map(v => v.id));
    for (const [venueId] of this.previousVenueStatuses) {
      if (!monitoredVenueIds.has(venueId)) {
        this.previousVenueStatuses.delete(venueId);
      }
    }
    
    console.log('VenueEventManager cleanup completed');
  }

  /**
   * Get current statistics
   */
  getStats(): {
    isInitialized: boolean;
    monitoredVenues: number;
    currentVenueEntry: string | null;
    isLocationTracking: boolean;
    backgroundTaskActive: boolean;
  } {
    const store = VenueEventStore.getState();
    return {
      isInitialized: this.isInitialized,
      monitoredVenues: store.getMonitoredVenues().length,
      currentVenueEntry: store.getCurrentVenueId(),
      isLocationTracking: store.isLocationTracking,
      backgroundTaskActive: !!store.backgroundTaskId,
    };
  }

  /**
   * Shutdown and cleanup
   */
  async shutdown(): Promise<void> {
    // Remove app state listener
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    
    // Clear status monitoring interval
    if (this.statusUpdateInterval) {
      clearInterval(this.statusUpdateInterval);
      this.statusUpdateInterval = null;
    }
    
    // Stop background location tracking
    await this.stopBackgroundLocationTracking();
    
    // Stop ping service
    await VenuePingService.stopPinging();
    
    this.isInitialized = false;
    console.log('VenueEventManager shutdown completed');
  }
}

export const VenueEventManager = new VenueEventManagerClass();