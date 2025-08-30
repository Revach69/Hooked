import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import { Platform } from 'react-native';
import { VenuePingService, VenueEventSession } from './VenuePingService';
import { VenueLocationService, LocationCoordinates } from './VenueLocationService';
import { AsyncStorageUtils } from '../asyncStorageUtils';
import * as Sentry from '@sentry/react-native';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Task names
export const VENUE_BACKGROUND_LOCATION_TASK = 'venue-background-location';
export const VENUE_BACKGROUND_PING_TASK = 'venue-background-ping';

// Background processing configuration
interface BackgroundProcessorConfig {
  maxBatchSize: number;
  maxPingInterval: number; // Maximum time between pings in seconds
  minAccuracy: number; // Minimum accuracy for location processing
  batteryOptimization: boolean;
}

const DEFAULT_CONFIG: BackgroundProcessorConfig = {
  maxBatchSize: 10,
  maxPingInterval: 300, // 5 minutes
  minAccuracy: 200, // 200 meters
  batteryOptimization: true
};

// Storage keys for background task persistence
const BACKGROUND_STATE_KEY = 'venue_background_state';
const LAST_BACKGROUND_PING_KEY = 'last_background_ping';

export class BackgroundLocationProcessor {
  private static instance: BackgroundLocationProcessor;
  private config: BackgroundProcessorConfig;
  private isProcessing: boolean = false;

  private constructor() {
    this.config = DEFAULT_CONFIG;
    this.initializeBackgroundTasks();
  }

  static getInstance(): BackgroundLocationProcessor {
    if (!BackgroundLocationProcessor.instance) {
      BackgroundLocationProcessor.instance = new BackgroundLocationProcessor();
    }
    return BackgroundLocationProcessor.instance;
  }

  /**
   * Initialize background tasks for venue location monitoring
   */
  private initializeBackgroundTasks(): void {
    // Define background location processing task
    if (!TaskManager.isTaskDefined(VENUE_BACKGROUND_LOCATION_TASK)) {
      TaskManager.defineTask(VENUE_BACKGROUND_LOCATION_TASK, this.handleBackgroundLocationUpdate.bind(this));
    }

    // Define background ping task (for periodic server communication)
    if (!TaskManager.isTaskDefined(VENUE_BACKGROUND_PING_TASK)) {
      TaskManager.defineTask(VENUE_BACKGROUND_PING_TASK, this.handleBackgroundPing.bind(this));
    }

    console.log('Background location processor tasks initialized');
  }

  /**
   * Start background location monitoring for venue events
   */
  async startBackgroundLocationMonitoring(activeVenues: VenueEventSession[]): Promise<boolean> {
    try {
      if (activeVenues.length === 0) {
        console.log('No active venues, skipping background location monitoring');
        return false;
      }

      // Check location permissions
      const locationService = VenueLocationService.getInstance();
      const permissions = await locationService.getLocationPermissionStatus();
      
      if (permissions.background !== 'granted') {
        console.log('Background location permission not granted');
        return false;
      }

      // Store active venues for background processing
      await this.storeBackgroundState({
        activeVenues,
        startedAt: new Date().toISOString(),
        batteryLevel: await this.getBatteryLevel(),
        platform: Platform.OS
      });

      // Start background location tracking
      const locationOptions: Location.LocationTaskOptions = {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: await this.calculateLocationUpdateInterval(),
        distanceInterval: 25, // 25 meters for venue-level precision
        deferredUpdatesInterval: this.config.maxPingInterval * 1000, // Convert to ms
        showsBackgroundLocationIndicator: Platform.OS === 'ios',
        foregroundService: Platform.OS === 'android' ? {
          notificationTitle: `Active at ${activeVenues.length} venue${activeVenues.length > 1 ? 's' : ''}`,
          notificationBody: 'Hooked is monitoring your venue presence for dating events',
          notificationColor: '#6366f1',
          notificationIcon: undefined // Use default app icon
        } : undefined
      };

      // Start the background location task
      await Location.startLocationUpdatesAsync(VENUE_BACKGROUND_LOCATION_TASK, locationOptions);

      console.log(`Started background location monitoring for ${activeVenues.length} venues`);
      
      Sentry.addBreadcrumb({
        message: 'Background location monitoring started',
        data: {
          venueCount: activeVenues.length,
          platform: Platform.OS,
          batteryOptimized: this.config.batteryOptimization
        },
        level: 'info'
      });

      return true;

    } catch (error) {
      console.error('Failed to start background location monitoring:', error);
      Sentry.captureException(error);
      return false;
    }
  }

  /**
   * Stop background location monitoring
   */
  async stopBackgroundLocationMonitoring(): Promise<void> {
    try {
      // Check if task is registered and stop it
      const isLocationTaskRegistered = await TaskManager.isTaskRegisteredAsync(VENUE_BACKGROUND_LOCATION_TASK);
      if (isLocationTaskRegistered) {
        await Location.stopLocationUpdatesAsync(VENUE_BACKGROUND_LOCATION_TASK);
      }

      // Clean up background state
      await AsyncStorageUtils.removeItem(BACKGROUND_STATE_KEY);
      
      console.log('Background location monitoring stopped');
      
      Sentry.addBreadcrumb({
        message: 'Background location monitoring stopped',
        level: 'info'
      });

    } catch (error) {
      console.error('Error stopping background location monitoring:', error);
      Sentry.captureException(error);
    }
  }

  /**
   * Handle background location updates from TaskManager
   */
  private async handleBackgroundLocationUpdate({ data, error }: TaskManager.TaskManagerTaskBody): Promise<void> {
    if (this.isProcessing) {
      console.log('Already processing location update, skipping');
      return;
    }

    this.isProcessing = true;

    try {
      if (error) {
        console.error('Background location task error:', error);
        Sentry.captureException(new Error(`Background location error: ${error.message}`));
        return;
      }

      if (!data) {
        console.warn('No location data received in background task');
        return;
      }

      const { locations } = data as { locations: Location.LocationObject[] };
      
      if (!locations || locations.length === 0) {
        console.warn('Empty locations array in background task');
        return;
      }

      console.log(`Processing ${locations.length} background location updates`);

      // Process locations in batches
      const batchSize = Math.min(this.config.maxBatchSize, locations.length);
      const recentLocations = locations.slice(-batchSize);

      // Get background state
      const backgroundState = await this.getBackgroundState();
      if (!backgroundState || !backgroundState.activeVenues) {
        console.log('No active venues in background state, stopping location processing');
        await this.stopBackgroundLocationMonitoring();
        return;
      }

      // Process each location update
      for (const locationUpdate of recentLocations) {
        await this.processLocationUpdate(locationUpdate, backgroundState);
      }

      // Update last processing time
      await AsyncStorageUtils.setItem(LAST_BACKGROUND_PING_KEY, Date.now().toString());

    } catch (error) {
      console.error('Error processing background location update:', error);
      Sentry.captureException(error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single location update in background
   */
  private async processLocationUpdate(
    locationUpdate: Location.LocationObject,
    backgroundState: any
  ): Promise<void> {
    try {
      // Filter by accuracy
      if (locationUpdate.coords.accuracy > this.config.minAccuracy) {
        console.log(`Skipping location update with poor accuracy: ${locationUpdate.coords.accuracy}m`);
        return;
      }

      // Convert to our location format
      const location: LocationCoordinates = {
        lat: locationUpdate.coords.latitude,
        lng: locationUpdate.coords.longitude,
        accuracy: locationUpdate.coords.accuracy,
        timestamp: new Date(locationUpdate.timestamp)
      };

      // Check if enough time has passed for a server ping
      const shouldPing = await this.shouldPerformBackgroundPing();
      
      if (shouldPing) {
        await this.performBackgroundVenuePing(location, backgroundState.activeVenues);
      } else {
        // Store location for later processing
        await this.storeLocationForBatch(location);
      }

    } catch (error) {
      console.error('Error processing location update:', error);
      Sentry.captureException(error);
    }
  }

  /**
   * Perform venue ping in background mode
   */
  private async performBackgroundVenuePing(
    location: LocationCoordinates,
    activeVenues: VenueEventSession[]
  ): Promise<void> {
    try {
      // Prepare venue data for ping
      const venueData = activeVenues.map(venue => ({
        venueId: venue.venueId,
        location: {
          lat: location.lat,
          lng: location.lng,
          accuracy: location.accuracy
        }
      }));

      // Get battery level for context
      const batteryLevel = await this.getBatteryLevel();

      // Call Firebase Function
      const functions = getFunctions();
      const venueLocationPing = httpsCallable(functions, 'venueLocationPing');
      
      const result = await venueLocationPing({
        venues: venueData,
        batteryLevel,
        movementSpeed: 0, // Unknown in background
        sessionId: 'background_task'
      });

      const pingResult = result.data as { success: boolean; results: any[] };
      
      if (pingResult.success) {
        console.log(`Background venue ping successful for ${activeVenues.length} venues`);
        
        // Process results for state changes
        await this.handleBackgroundPingResults(pingResult.results, activeVenues);
      } else {
        console.warn('Background venue ping failed');
      }

    } catch (error) {
      console.error('Error performing background venue ping:', error);
      
      // Don't throw - we don't want to crash the background task
      // Just log and continue
      Sentry.captureException(error);
    }
  }

  /**
   * Handle results from background venue ping
   */
  private async handleBackgroundPingResults(results: any[], activeVenues: VenueEventSession[]): Promise<void> {
    try {
      let hasStateChanges = false;

      for (const result of results) {
        if (result.stateChanged) {
          hasStateChanges = true;
          
          // Find the venue session
          const venue = activeVenues.find(v => v.venueId === result.venueId);
          if (venue && result.userMessage) {
            // Schedule a local notification for state changes
            await this.scheduleBackgroundNotification(venue.venueName, result.userMessage);
          }
        }

        // If user is no longer at any venues, consider stopping monitoring
        if (result.currentState === 'inactive') {
          console.log(`Venue ${result.venueId} became inactive in background`);
        }
      }

      if (hasStateChanges) {
        console.log('State changes detected in background ping');
      }

    } catch (error) {
      console.error('Error handling background ping results:', error);
      Sentry.captureException(error);
    }
  }

  /**
   * Handle periodic background ping task
   */
  private async handleBackgroundPing({ data, error }: TaskManager.TaskManagerTaskBody): Promise<void> {
    // This would handle scheduled background pings when location updates are sparse
    console.log('Background ping task triggered');
    
    // Implementation would be similar to handleBackgroundLocationUpdate
    // but triggered by timer rather than location changes
  }

  // Helper methods

  private async shouldPerformBackgroundPing(): Promise<boolean> {
    try {
      const lastPing = await AsyncStorageUtils.getItem(LAST_BACKGROUND_PING_KEY);
      if (!lastPing) return true;

      const timeSinceLastPing = Date.now() - parseInt(lastPing, 10);
      const minInterval = this.config.batteryOptimization ? 120000 : 60000; // 2 min vs 1 min

      return timeSinceLastPing >= minInterval;
    } catch {
      return true;
    }
  }

  private async calculateLocationUpdateInterval(): Promise<number> {
    try {
      const batteryLevel = await this.getBatteryLevel();
      
      // Base interval of 1 minute
      let interval = 60000;
      
      // Adjust for battery level
      if (this.config.batteryOptimization) {
        if (batteryLevel < 20) {
          interval *= 3; // 3 minutes on very low battery
        } else if (batteryLevel < 50) {
          interval *= 1.5; // 1.5 minutes on moderate battery
        }
      }

      return interval;
    } catch {
      return 90000; // Default 1.5 minutes
    }
  }

  private async getBatteryLevel(): Promise<number> {
    try {
      const level = await Battery.getBatteryLevelAsync();
      return Math.round(level * 100);
    } catch {
      return 50; // Default assumption
    }
  }

  private async storeBackgroundState(state: any): Promise<void> {
    try {
      await AsyncStorageUtils.setItem(BACKGROUND_STATE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Error storing background state:', error);
    }
  }

  private async getBackgroundState(): Promise<any | null> {
    try {
      const stored = await AsyncStorageUtils.getItem(BACKGROUND_STATE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error getting background state:', error);
      return null;
    }
  }

  private async storeLocationForBatch(location: LocationCoordinates): Promise<void> {
    // Store location updates that haven't been pinged yet for batch processing
    try {
      const key = 'batched_locations';
      const stored = await AsyncStorageUtils.getItem(key);
      const locations = stored ? JSON.parse(stored) : [];
      
      locations.push(location);
      
      // Keep only recent locations (max 20)
      const recentLocations = locations.slice(-20);
      
      await AsyncStorageUtils.setItem(key, JSON.stringify(recentLocations));
    } catch (error) {
      console.error('Error storing batched location:', error);
    }
  }

  private async scheduleBackgroundNotification(venueName: string, message: string): Promise<void> {
    try {
      // This would integrate with the existing notification system
      // For now, just log the notification
      console.log(`Background notification: ${venueName} - ${message}`);
      
      // In a full implementation, this would use expo-notifications
      // to schedule a local notification about venue state changes
    } catch (error) {
      console.error('Error scheduling background notification:', error);
    }
  }

  /**
   * Get background monitoring status
   */
  async getBackgroundMonitoringStatus(): Promise<{
    isActive: boolean;
    activeVenues: number;
    lastPing: string | null;
    batteryLevel: number;
  }> {
    try {
      const backgroundState = await this.getBackgroundState();
      const lastPing = await AsyncStorageUtils.getItem(LAST_BACKGROUND_PING_KEY);
      const batteryLevel = await this.getBatteryLevel();
      
      return {
        isActive: !!backgroundState && backgroundState.activeVenues?.length > 0,
        activeVenues: backgroundState?.activeVenues?.length || 0,
        lastPing: lastPing ? new Date(parseInt(lastPing, 10)).toISOString() : null,
        batteryLevel
      };
    } catch (error) {
      console.error('Error getting background monitoring status:', error);
      return {
        isActive: false,
        activeVenues: 0,
        lastPing: null,
        batteryLevel: 50
      };
    }
  }

  /**
   * Clean up background processing resources
   */
  async cleanup(): Promise<void> {
    await this.stopBackgroundLocationMonitoring();
    await AsyncStorageUtils.removeItem(BACKGROUND_STATE_KEY);
    await AsyncStorageUtils.removeItem(LAST_BACKGROUND_PING_KEY);
    await AsyncStorageUtils.removeItem('batched_locations');
    
    console.log('Background location processor cleaned up');
  }
}