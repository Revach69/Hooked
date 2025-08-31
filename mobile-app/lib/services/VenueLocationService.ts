import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Alert, Platform } from 'react-native';
import { AsyncStorageUtils } from '../asyncStorageUtils';
import * as Sentry from '@sentry/react-native';

// Types for location service
export interface LocationCoordinates {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: Date;
}

export interface VenueLocationVerification {
  withinRadius: boolean;
  distance: number;
  accuracy: number;
  needsRefix: boolean; // if accuracy > 150m
}

export interface LocationPermissionStatus {
  granted: boolean;
  canRequestAgain: boolean;
  showRationale: boolean;
  backgroundGranted?: boolean;
}

const VENUE_LOCATION_TASK = 'venue-location-background';

// Storage keys
const LOCATION_PERMISSION_ASKED_KEY = 'venue_location_permission_asked';
const VENUE_MONITORING_ACTIVE_KEY = 'venue_monitoring_active';

export class VenueLocationService {
  private static instance: VenueLocationService;
  private isMonitoring = false;
  private currentEventId: string | null = null;
  private currentVenueId: string | null = null;
  
  // 20s caching for jitter smoothing
  private lastLocationCache: {
    location: LocationCoordinates;
    timestamp: number;
  } | null = null;
  
  // Track last 3 distance calculations for median filtering
  private recentDistances: { distance: number; timestamp: number }[] = [];

  static getInstance(): VenueLocationService {
    if (!VenueLocationService.instance) {
      VenueLocationService.instance = new VenueLocationService();
    }
    return VenueLocationService.instance;
  }

  /**
   * Request venue-specific location permissions with user education
   */
  async requestVenueLocationPermissions(showEducation: boolean = true): Promise<LocationPermissionStatus> {
    try {
      // Check if we've already asked for permissions
      const hasAskedBefore = await AsyncStorageUtils.getItem(LOCATION_PERMISSION_ASKED_KEY);
      
      // Show educational dialog if first time requesting
      if (!hasAskedBefore && showEducation) {
        await this.showLocationPermissionEducation();
        await AsyncStorageUtils.setItem(LOCATION_PERMISSION_ASKED_KEY, 'true');
      }

      // Request foreground permissions first
      const { status: foregroundStatus, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      
      const result: LocationPermissionStatus = {
        granted: foregroundStatus === 'granted',
        canRequestAgain: canAskAgain,
        showRationale: !canAskAgain && foregroundStatus === 'denied'
      };

      // If foreground granted, optionally request background permissions
      if (result.granted) {
        // Only request background permissions if user wants enhanced experience
        const backgroundResult = await this.requestBackgroundPermissions();
        result.backgroundGranted = backgroundResult;
      }

      // Log permission result for analytics
      Sentry.addBreadcrumb({
        message: 'Venue location permissions requested',
        data: {
          foregroundStatus,
          backgroundGranted: result.backgroundGranted,
          canRequestAgain: canAskAgain
        },
        level: 'info'
      });

      return result;

    } catch (error) {
      Sentry.captureException(error);
      console.error('Error requesting venue location permissions:', error);
      
      return {
        granted: false,
        canRequestAgain: false,
        showRationale: false
      };
    }
  }

  /**
   * Get current location with high accuracy for venue verification
   */
  async getCurrentLocation(highAccuracy: boolean = true): Promise<LocationCoordinates | null> {
    try {
      // Check permissions first
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permissions not granted');
      }

      const locationResult = await Location.getCurrentPositionAsync({
        accuracy: highAccuracy ? Location.Accuracy.High : Location.Accuracy.Balanced,
        maximumAge: 10000, // 10 seconds max age
        timeout: 15000,    // 15 second timeout
      });

      const coords: LocationCoordinates = {
        lat: locationResult.coords.latitude,
        lng: locationResult.coords.longitude,
        accuracy: locationResult.coords.accuracy || 0,
        timestamp: new Date(locationResult.timestamp)
      };

      return coords;

    } catch (error) {
      console.error('Error getting current location:', error);
      Sentry.captureException(error);
      return null;
    }
  }

  /**
   * Verify user is within venue radius
   */
  async verifyUserAtVenue(
    userLocation: LocationCoordinates,
    venueCoordinates: { lat: number; lng: number },
    radiusMeters: number,
    kFactor: number = 1.2
  ): Promise<VenueLocationVerification> {
    try {
      // Use cached location if available and recent (within 20 seconds)
      const smoothedLocation = this.getSmoothLocationWithCache(userLocation);
      
      const distance = this.calculateDistance(
        smoothedLocation.lat,
        smoothedLocation.lng,
        venueCoordinates.lat,
        venueCoordinates.lng
      );

      // Add to recent distances and get median-filtered distance
      const medianDistance = this.addDistanceAndGetMedian(distance);
      
      const effectiveRadius = radiusMeters * kFactor;
      const withinRadius = medianDistance <= effectiveRadius;
      const needsRefix = smoothedLocation.accuracy > 150; // Poor accuracy threshold

      const result: VenueLocationVerification = {
        withinRadius: needsRefix ? false : withinRadius, // Don't allow poor accuracy locations
        distance: medianDistance, // Use median-filtered distance
        accuracy: smoothedLocation.accuracy,
        needsRefix
      };

      // Log verification for debugging
      console.log('Venue location verification (smoothed):', {
        rawDistance: Math.round(distance),
        medianDistance: Math.round(medianDistance),
        effectiveRadius: Math.round(effectiveRadius),
        accuracy: Math.round(smoothedLocation.accuracy),
        withinRadius: result.withinRadius,
        needsRefix,
        usedCache: smoothedLocation !== userLocation
      });

      return result;

    } catch (error) {
      console.error('Error verifying venue location:', error);
      Sentry.captureException(error);
      
      return {
        withinRadius: false,
        distance: 0,
        accuracy: 0,
        needsRefix: true
      };
    }
  }

  /**
   * Start background location monitoring for venue events
   */
  async startVenueLocationMonitoring(eventId: string, venueId: string): Promise<boolean> {
    try {
      // Check if background location is available
      const { status } = await Location.getBackgroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Background location not available, using foreground monitoring only');
        return false;
      }

      // Define the background task if not already defined
      if (!TaskManager.isTaskDefined(VENUE_LOCATION_TASK)) {
        TaskManager.defineTask(VENUE_LOCATION_TASK, ({ data, error }) => {
          if (error) {
            console.error('Background location task error:', error);
            Sentry.captureException(error);
            return;
          }
          
          if (data) {
            const { locations } = data as { locations: Location.LocationObject[] };
            this.processBatchedLocations(locations);
          }
        });
      }

      // Start location updates
      await Location.startLocationUpdatesAsync(VENUE_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 60000,        // 1 minute minimum
        distanceInterval: 50,       // 50 meters
        deferredUpdatesInterval: 300000, // 5 minutes maximum batch
        showsBackgroundLocationIndicator: Platform.OS === 'ios',
        foregroundService: Platform.OS === 'android' ? {
          notificationTitle: "Venue Event Active",
          notificationBody: "Hooked is monitoring your venue presence",
          notificationColor: "#6366f1"
        } : undefined
      });

      this.isMonitoring = true;
      this.currentEventId = eventId;
      this.currentVenueId = venueId;
      
      // Store monitoring state
      await AsyncStorageUtils.setItem(VENUE_MONITORING_ACTIVE_KEY, JSON.stringify({
        eventId,
        venueId,
        startedAt: new Date().toISOString()
      }));

      console.log('Started venue location monitoring for:', { eventId, venueId });
      return true;

    } catch (error) {
      console.error('Error starting venue location monitoring:', error);
      Sentry.captureException(error);
      return false;
    }
  }

  /**
   * Stop background location monitoring
   */
  async stopVenueLocationMonitoring(): Promise<void> {
    try {
      if (this.isMonitoring && TaskManager.isTaskDefined(VENUE_LOCATION_TASK)) {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(VENUE_LOCATION_TASK);
        if (isRegistered) {
          await Location.stopLocationUpdatesAsync(VENUE_LOCATION_TASK);
        }
      }

      this.isMonitoring = false;
      this.currentEventId = null;
      this.currentVenueId = null;

      // Clear monitoring state
      await AsyncStorageUtils.removeItem(VENUE_MONITORING_ACTIVE_KEY);

      console.log('Stopped venue location monitoring');

    } catch (error) {
      console.error('Error stopping venue location monitoring:', error);
      Sentry.captureException(error);
    }
  }

  /**
   * Check if location monitoring is currently active
   */
  async isLocationMonitoringActive(): Promise<boolean> {
    try {
      const monitoringState = await AsyncStorageUtils.getItem(VENUE_MONITORING_ACTIVE_KEY);
      return !!monitoringState && this.isMonitoring;
    } catch {
      return false;
    }
  }

  /**
   * Calculate optimal ping interval based on context
   */
  calculateOptimalPingInterval(
    distanceFromVenue: number,
    batteryLevel: number = 100,
    isMoving: boolean = false,
    accuracyLevel: number = 20
  ): number {
    let baseInterval = 60; // seconds

    // Further away = less frequent pings
    if (distanceFromVenue > 200) baseInterval *= 1.5;
    
    // Low battery = reduce frequency
    if (batteryLevel < 20) baseInterval *= 2;
    else if (batteryLevel < 50) baseInterval *= 1.3;
    
    // Stationary users need less frequent checks
    if (!isMoving) baseInterval *= 1.3;
    
    // Poor GPS = reduce frequency to prevent flapping
    if (accuracyLevel > 100) baseInterval *= 1.2;
    
    // Cap between 30s - 5min
    return Math.max(30, Math.min(300, Math.round(baseInterval)));
  }

  /**
   * Request background permissions with user education
   */
  private async requestBackgroundPermissions(): Promise<boolean> {
    try {
      // Show background permission education
      const userConsent = await new Promise<boolean>((resolve) => {
        Alert.alert(
          "Enhanced Venue Experience",
          "Allow background location access for seamless venue event participation? This enables:\n\n• Automatic presence detection\n• Profile visibility management\n• Battery-optimized monitoring\n\nYou can change this anytime in Settings.",
          [
            { text: "Not Now", style: "cancel", onPress: () => resolve(false) },
            { text: "Enable", onPress: () => resolve(true) }
          ]
        );
      });

      if (!userConsent) return false;

      const { status } = await Location.requestBackgroundPermissionsAsync();
      return status === 'granted';

    } catch (error) {
      console.error('Error requesting background permissions:', error);
      return false;
    }
  }

  /**
   * Show educational dialog about location permissions
   */
  private async showLocationPermissionEducation(): Promise<void> {
    return new Promise((resolve) => {
      Alert.alert(
        "Venue Events Need Location",
        "To join venue events, Hooked needs your location to:\n\n• Verify you're at the venue\n• Show you to other attendees\n• Hide your profile when you leave\n\nYour location is only used for venue verification and is never stored permanently.",
        [
          { 
            text: "I Understand", 
            onPress: () => resolve()
          }
        ]
      );
    });
  }

  /**
   * Process batched location updates from background task
   */
  private async processBatchedLocations(locations: Location.LocationObject[]): Promise<void> {
    try {
      if (!this.currentEventId || !this.currentVenueId) return;

      // Process the most recent location
      const latestLocation = locations[locations.length - 1];
      if (!latestLocation) return;

      const locationData: LocationCoordinates = {
        lat: latestLocation.coords.latitude,
        lng: latestLocation.coords.longitude,
        accuracy: latestLocation.coords.accuracy || 0,
        timestamp: new Date(latestLocation.timestamp)
      };

      // This would trigger a venue ping to the server
      // Implementation will be added in VenuePingService
      console.log('Background location update:', {
        eventId: this.currentEventId,
        venueId: this.currentVenueId,
        location: {
          lat: Math.round(locationData.lat * 100000) / 100000,
          lng: Math.round(locationData.lng * 100000) / 100000,
          accuracy: Math.round(locationData.accuracy)
        }
      });

    } catch (error) {
      console.error('Error processing batched locations:', error);
      Sentry.captureException(error);
    }
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get location permission status without requesting
   */
  async getLocationPermissionStatus(): Promise<{
    foreground: Location.PermissionStatus;
    background: Location.PermissionStatus;
  }> {
    try {
      const [foregroundResult, backgroundResult] = await Promise.all([
        Location.getForegroundPermissionsAsync(),
        Location.getBackgroundPermissionsAsync()
      ]);

      return {
        foreground: foregroundResult.status,
        background: backgroundResult.status
      };
    } catch (error) {
      console.error('Error getting location permission status:', error);
      return {
        foreground: Location.PermissionStatus.UNDETERMINED,
        background: Location.PermissionStatus.UNDETERMINED
      };
    }
  }

  /**
   * Get smooth location using 20-second cache to reduce GPS jitter
   */
  private getSmoothLocationWithCache(currentLocation: LocationCoordinates): LocationCoordinates {
    const now = Date.now();
    const CACHE_DURATION_MS = 20 * 1000; // 20 seconds
    
    // Check if we have a recent cached location with similar accuracy
    if (this.lastLocationCache && 
        (now - this.lastLocationCache.timestamp) < CACHE_DURATION_MS &&
        Math.abs(this.lastLocationCache.location.accuracy - currentLocation.accuracy) < 50) {
      
      // Use cached location if it's recent and accuracy is similar
      console.log('Using cached location for jitter smoothing');
      return this.lastLocationCache.location;
    }
    
    // Update cache with current location
    this.lastLocationCache = {
      location: currentLocation,
      timestamp: now
    };
    
    return currentLocation;
  }

  /**
   * Add distance to recent distances and return median of last 3 distances
   */
  private addDistanceAndGetMedian(distance: number): number {
    const now = Date.now();
    const DISTANCE_HISTORY_DURATION_MS = 5 * 60 * 1000; // 5 minutes
    
    // Add new distance to history
    this.recentDistances.push({ distance, timestamp: now });
    
    // Remove old distances (older than 5 minutes)
    this.recentDistances = this.recentDistances.filter(
      entry => (now - entry.timestamp) < DISTANCE_HISTORY_DURATION_MS
    );
    
    // Get last 3 distances for median calculation
    const lastDistances = this.recentDistances
      .slice(-3)
      .map(entry => entry.distance)
      .sort((a, b) => a - b); // Sort for median calculation
    
    // Return median distance
    if (lastDistances.length === 0) {
      return distance;
    } else if (lastDistances.length === 1) {
      return lastDistances[0];
    } else if (lastDistances.length === 2) {
      return (lastDistances[0] + lastDistances[1]) / 2;
    } else {
      // Return middle value for 3 or more distances
      return lastDistances[Math.floor(lastDistances.length / 2)];
    }
  }

  /**
   * Clear location caches (for privacy compliance)
   */
  private clearLocationCaches(): void {
    this.lastLocationCache = null;
    this.recentDistances = [];
  }

  /**
   * Clean up location service resources
   */
  async cleanup(): Promise<void> {
    try {
      await this.stopVenueLocationMonitoring();
      
      // Clear location caches
      this.clearLocationCaches();
      
      // Remove any stored location data
      await AsyncStorageUtils.removeItem(VENUE_MONITORING_ACTIVE_KEY);
      
      console.log('VenueLocationService cleaned up');
    } catch (error) {
      console.error('Error cleaning up VenueLocationService:', error);
    }
  }
}