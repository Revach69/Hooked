import { getFunctions, httpsCallable } from 'firebase/functions';
import * as Battery from 'expo-battery';
import { AppState, AppStateStatus } from 'react-native';
import { VenueLocationService, LocationCoordinates } from './VenueLocationService';
import { BackgroundLocationProcessor } from './BackgroundLocationProcessor';
import { AsyncStorageUtils } from '../asyncStorageUtils';
import * as Sentry from '@sentry/react-native';

// Types for venue ping system
export interface VenueEventSession {
  eventId: string;
  venueId: string;
  qrCodeId: string;
  eventName: string;
  venueName: string;
  joinedAt: string;
  sessionNonce?: string;
  isActive: boolean;
}

export interface VenuePingResult {
  venueId: string;
  success: boolean;
  currentState: 'active' | 'paused' | 'inactive';
  stateChanged: boolean;
  profileVisible: boolean;
  nextPingInterval: number;
  userMessage?: string;
  distance?: number;
  accuracy?: number;
}

export interface PingContext {
  batteryLevel: number;
  isMoving: boolean;
  appState: AppStateStatus;
  lastLocation: LocationCoordinates | null;
  movementSpeed: number; // km/h
  averageAccuracy: number;
}

// Storage keys
const ACTIVE_VENUES_KEY = 'active_venue_sessions';
const LAST_PING_KEY = 'last_venue_ping';
const PING_STATS_KEY = 'venue_ping_stats';

export class VenuePingService {
  private static instance: VenuePingService;
  private pingInterval: NodeJS.Timeout | null = null;
  private activeVenues: Map<string, VenueEventSession> = new Map();
  private venueLocationService: VenueLocationService;
  private backgroundProcessor: BackgroundLocationProcessor;
  private lastPingTime: number = 0;
  private pingStats: {
    totalPings: number;
    successfulPings: number;
    averagePingInterval: number;
    lastResetTime: number;
  };

  private constructor() {
    this.venueLocationService = VenueLocationService.getInstance();
    this.backgroundProcessor = BackgroundLocationProcessor.getInstance();
    this.pingStats = {
      totalPings: 0,
      successfulPings: 0,
      averagePingInterval: 60,
      lastResetTime: Date.now()
    };
    this.loadActiveVenues();
    this.loadPingStats();
  }

  static getInstance(): VenuePingService {
    if (!VenuePingService.instance) {
      VenuePingService.instance = new VenuePingService();
    }
    return VenuePingService.instance;
  }

  /**
   * Add a venue event session to active monitoring
   */
  async addVenueSession(session: VenueEventSession): Promise<void> {
    try {
      this.activeVenues.set(session.venueId, session);
      await this.saveActiveVenues();
      
      console.log(`Added venue session: ${session.venueName} (${session.venueId})`);
      
      // Start pinging if this is the first active venue
      if (this.activeVenues.size === 1) {
        await this.startVenuePing();
        
        // Start background location monitoring
        const activeVenuesList = Array.from(this.activeVenues.values());
        await this.backgroundProcessor.startBackgroundLocationMonitoring(activeVenuesList);
      } else {
        // Update background monitoring with new venue list
        const activeVenuesList = Array.from(this.activeVenues.values());
        await this.backgroundProcessor.stopBackgroundLocationMonitoring();
        await this.backgroundProcessor.startBackgroundLocationMonitoring(activeVenuesList);
      }

      Sentry.addBreadcrumb({
        message: 'Venue session added',
        data: {
          venueId: session.venueId,
          eventName: session.eventName,
          totalActiveVenues: this.activeVenues.size
        },
        level: 'info'
      });

    } catch (error) {
      console.error('Error adding venue session:', error);
      Sentry.captureException(error);
      throw error;
    }
  }

  /**
   * Remove a venue event session from active monitoring
   */
  async removeVenueSession(venueId: string): Promise<void> {
    try {
      const session = this.activeVenues.get(venueId);
      if (session) {
        this.activeVenues.delete(venueId);
        await this.saveActiveVenues();
        
        console.log(`Removed venue session: ${venueId}`);
        
        // Update monitoring for remaining venues
        if (this.activeVenues.size === 0) {
          await this.stopVenuePing();
          await this.venueLocationService.stopVenueLocationMonitoring();
          await this.backgroundProcessor.stopBackgroundLocationMonitoring();
        } else {
          // Update background monitoring with remaining venues
          const activeVenuesList = Array.from(this.activeVenues.values());
          await this.backgroundProcessor.stopBackgroundLocationMonitoring();
          await this.backgroundProcessor.startBackgroundLocationMonitoring(activeVenuesList);
        }

        Sentry.addBreadcrumb({
          message: 'Venue session removed',
          data: {
            venueId,
            remainingActiveVenues: this.activeVenues.size
          },
          level: 'info'
        });
      }
    } catch (error) {
      console.error('Error removing venue session:', error);
      Sentry.captureException(error);
    }
  }

  /**
   * Get all active venue sessions
   */
  getActiveVenues(): VenueEventSession[] {
    return Array.from(this.activeVenues.values());
  }

  /**
   * Check if any venues are currently active
   */
  hasActiveVenues(): boolean {
    return this.activeVenues.size > 0;
  }

  /**
   * Start the venue ping service
   */
  async startVenuePing(): Promise<void> {
    try {
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
      }

      if (this.activeVenues.size === 0) {
        console.log('No active venues to ping');
        return;
      }

      console.log(`Starting venue ping service for ${this.activeVenues.size} venues`);
      
      // Perform initial ping
      await this.performVenuePing();
      
      // Set up interval for regular pings
      this.pingInterval = setInterval(async () => {
        await this.performVenuePing();
      }, 30000); // Initial 30-second interval, will be adjusted dynamically

      Sentry.addBreadcrumb({
        message: 'Venue ping service started',
        data: {
          activeVenues: this.activeVenues.size
        },
        level: 'info'
      });

    } catch (error) {
      console.error('Error starting venue ping service:', error);
      Sentry.captureException(error);
      throw error;
    }
  }

  /**
   * Stop the venue ping service
   */
  async stopVenuePing(): Promise<void> {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
      
      console.log('Venue ping service stopped');
      
      Sentry.addBreadcrumb({
        message: 'Venue ping service stopped',
        level: 'info'
      });
    }
  }

  /**
   * Perform venue ping for all active venues
   */
  async performVenuePing(): Promise<VenuePingResult[]> {
    if (this.activeVenues.size === 0) {
      return [];
    }

    try {
      // Get current ping context
      const context = await this.getPingContext();
      
      // Skip ping if conditions are not suitable
      if (!this.shouldPerformPing(context)) {
        console.log('Skipping ping due to context conditions');
        return [];
      }

      // Get current location
      const currentLocation = await this.venueLocationService.getCurrentLocation(false);
      if (!currentLocation) {
        console.warn('Unable to get location for venue ping');
        return [];
      }

      // Prepare venue data for batch ping
      const venueData = Array.from(this.activeVenues.values()).map(session => ({
        venueId: session.venueId,
        location: {
          lat: currentLocation.lat,
          lng: currentLocation.lng,
          accuracy: currentLocation.accuracy
        }
      }));

      // Call Firebase Function for batch venue ping
      const functions = getFunctions();
      const venueLocationPing = httpsCallable(functions, 'venueLocationPing');
      
      const result = await venueLocationPing({
        venues: venueData,
        batteryLevel: context.batteryLevel,
        movementSpeed: context.movementSpeed,
        sessionId: await this.getSessionId()
      });

      const pingResults = result.data as { success: boolean; results: VenuePingResult[] };
      
      if (pingResults.success && pingResults.results) {
        // Process ping results
        await this.processPingResults(pingResults.results, context);
        
        // Update ping statistics
        this.updatePingStats(true, context);
        
        // Calculate next ping interval
        const nextInterval = this.calculateNextPingInterval(pingResults.results, context);
        this.adjustPingInterval(nextInterval);
        
        console.log(`Venue ping completed: ${pingResults.results.length} venues`);
        return pingResults.results;
      } else {
        throw new Error('Venue ping failed');
      }

    } catch (error) {
      console.error('Error performing venue ping:', error);
      this.updatePingStats(false);
      
      // Use fallback ping interval on error
      this.adjustPingInterval(120); // 2 minutes fallback
      
      Sentry.captureException(error);
      return [];
    }
  }

  /**
   * Get current ping context (battery, movement, etc.)
   */
  private async getPingContext(): Promise<PingContext> {
    try {
      // Get battery level
      const batteryLevel = await Battery.getBatteryLevelAsync() * 100;
      
      // Get app state
      const appState = AppState.currentState;
      
      // Calculate movement based on recent locations (simplified)
      const lastLocation = await this.getLastKnownLocation();
      const movementSpeed = await this.calculateMovementSpeed(lastLocation);
      
      // Estimate if user is moving based on location history
      const isMoving = movementSpeed > 1; // > 1 km/h
      
      // Get average location accuracy from recent pings
      const averageAccuracy = await this.getAverageLocationAccuracy();

      return {
        batteryLevel,
        isMoving,
        appState,
        lastLocation,
        movementSpeed,
        averageAccuracy
      };

    } catch (error) {
      console.warn('Error getting ping context, using defaults:', error);
      
      // Return default context
      return {
        batteryLevel: 50,
        isMoving: false,
        appState: 'active',
        lastLocation: null,
        movementSpeed: 0,
        averageAccuracy: 50
      };
    }
  }

  /**
   * Determine if ping should be performed based on context
   */
  private shouldPerformPing(context: PingContext): boolean {
    // Skip if battery is critically low
    if (context.batteryLevel < 10) {
      return false;
    }
    
    // Skip if app is in background and user is stationary
    if (context.appState === 'background' && !context.isMoving) {
      // Only ping every few minutes when in background and stationary
      const timeSinceLastPing = Date.now() - this.lastPingTime;
      return timeSinceLastPing > 300000; // 5 minutes
    }
    
    // Skip if location accuracy is very poor
    if (context.averageAccuracy > 200) {
      return false;
    }
    
    return true;
  }

  /**
   * Process ping results and handle state changes
   */
  private async processPingResults(results: VenuePingResult[], context: PingContext): Promise<void> {
    for (const result of results) {
      const session = this.activeVenues.get(result.venueId);
      if (!session) continue;

      // Handle state changes
      if (result.stateChanged) {
        await this.handleVenueStateChange(session, result);
      }
      
      // Update session data
      session.isActive = result.profileVisible;
      this.activeVenues.set(result.venueId, session);
    }
    
    // Save updated sessions
    await this.saveActiveVenues();
    
    // Store last ping time
    this.lastPingTime = Date.now();
    await AsyncStorageUtils.setItem(LAST_PING_KEY, this.lastPingTime.toString());
  }

  /**
   * Handle venue state changes (active/paused/inactive)
   */
  private async handleVenueStateChange(session: VenueEventSession, result: VenuePingResult): Promise<void> {
    console.log(`Venue state changed: ${session.venueName} -> ${result.currentState}`);
    
    // Show user notification about state change
    if (result.userMessage) {
      // This would integrate with notification system
      console.log(`User message: ${result.userMessage}`);
    }
    
    // Handle specific state transitions
    switch (result.currentState) {
      case 'paused':
        // User stepped away from venue
        break;
      case 'inactive':
        // User left venue - consider removing session
        if (!result.profileVisible) {
          setTimeout(() => {
            this.removeVenueSession(session.venueId);
          }, 30000); // Grace period before removing
        }
        break;
      case 'active':
        // User is at venue
        break;
    }

    Sentry.addBreadcrumb({
      message: 'Venue state changed',
      data: {
        venueId: session.venueId,
        venueName: session.venueName,
        newState: result.currentState,
        profileVisible: result.profileVisible,
        distance: result.distance
      },
      level: 'info'
    });
  }

  /**
   * Calculate next ping interval based on results and context
   */
  private calculateNextPingInterval(results: VenuePingResult[], context: PingContext): number {
    // Start with base interval
    let baseInterval = 60; // 1 minute default
    
    // Adjust based on battery level
    if (context.batteryLevel < 20) {
      baseInterval *= 2.5; // Much less frequent when battery low
    } else if (context.batteryLevel < 50) {
      baseInterval *= 1.5;
    }
    
    // Adjust based on movement
    if (context.isMoving) {
      baseInterval *= 0.7; // More frequent when moving
    } else {
      baseInterval *= 1.3; // Less frequent when stationary
    }
    
    // Adjust based on app state
    if (context.appState === 'background') {
      baseInterval *= 1.8; // Less frequent in background
    }
    
    // Adjust based on venue proximity (use closest venue)
    const minDistance = Math.min(...results.filter(r => r.distance).map(r => r.distance!));
    if (minDistance && minDistance > 200) {
      baseInterval *= 1.4; // Less frequent when far from venues
    }
    
    // Adjust based on location accuracy
    if (context.averageAccuracy > 100) {
      baseInterval *= 1.2; // Less frequent with poor GPS
    }
    
    // Cap interval between 20 seconds and 10 minutes
    return Math.max(20, Math.min(600, Math.round(baseInterval)));
  }

  /**
   * Adjust the ping interval dynamically
   */
  private adjustPingInterval(newInterval: number): void {
    if (this.pingInterval && newInterval !== this.pingStats.averagePingInterval) {
      clearInterval(this.pingInterval);
      
      this.pingInterval = setInterval(async () => {
        await this.performVenuePing();
      }, newInterval * 1000);
      
      this.pingStats.averagePingInterval = newInterval;
      console.log(`Adjusted ping interval to ${newInterval} seconds`);
    }
  }

  /**
   * Update ping statistics
   */
  private updatePingStats(success: boolean, context?: PingContext): void {
    this.pingStats.totalPings++;
    if (success) {
      this.pingStats.successfulPings++;
    }
    
    // Reset stats weekly to prevent unbounded growth
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - this.pingStats.lastResetTime > oneWeek) {
      this.pingStats = {
        totalPings: 1,
        successfulPings: success ? 1 : 0,
        averagePingInterval: this.pingStats.averagePingInterval,
        lastResetTime: Date.now()
      };
    }
    
    this.savePingStats();
  }

  /**
   * Get ping statistics for debugging
   */
  getPingStats(): typeof VenuePingService.prototype.pingStats & { successRate: number } {
    const successRate = this.pingStats.totalPings > 0 
      ? (this.pingStats.successfulPings / this.pingStats.totalPings) * 100 
      : 0;
    
    return {
      ...this.pingStats,
      successRate: Math.round(successRate)
    };
  }

  /**
   * Get comprehensive monitoring status including background processing
   */
  async getComprehensiveMonitoringStatus(): Promise<{
    foreground: {
      hasActiveVenues: boolean;
      activeVenues: VenueEventSession[];
      pingStats: ReturnType<typeof this.getPingStats>;
    };
    background: {
      isActive: boolean;
      activeVenues: number;
      lastPing: string | null;
      batteryLevel: number;
    };
  }> {
    const backgroundStatus = await this.backgroundProcessor.getBackgroundMonitoringStatus();
    
    return {
      foreground: {
        hasActiveVenues: this.hasActiveVenues(),
        activeVenues: this.getActiveVenues(),
        pingStats: this.getPingStats()
      },
      background: backgroundStatus
    };
  }

  // Helper methods for data persistence and calculation
  
  private async saveActiveVenues(): Promise<void> {
    try {
      const venueArray = Array.from(this.activeVenues.values());
      await AsyncStorageUtils.setItem(ACTIVE_VENUES_KEY, JSON.stringify(venueArray));
    } catch (error) {
      console.error('Error saving active venues:', error);
    }
  }

  private async loadActiveVenues(): Promise<void> {
    try {
      const stored = await AsyncStorageUtils.getItem(ACTIVE_VENUES_KEY);
      if (stored) {
        const venueArray = JSON.parse(stored) as VenueEventSession[];
        this.activeVenues.clear();
        venueArray.forEach(venue => {
          this.activeVenues.set(venue.venueId, venue);
        });
        console.log(`Loaded ${this.activeVenues.size} active venues`);
      }
    } catch (error) {
      console.error('Error loading active venues:', error);
    }
  }

  private async savePingStats(): Promise<void> {
    try {
      await AsyncStorageUtils.setItem(PING_STATS_KEY, JSON.stringify(this.pingStats));
    } catch (error) {
      console.error('Error saving ping stats:', error);
    }
  }

  private async loadPingStats(): Promise<void> {
    try {
      const stored = await AsyncStorageUtils.getItem(PING_STATS_KEY);
      if (stored) {
        this.pingStats = { ...this.pingStats, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading ping stats:', error);
    }
  }

  private async getSessionId(): Promise<string> {
    // Generate or retrieve session ID for venue pings
    let sessionId = await AsyncStorageUtils.getItem('venue_ping_session_id');
    if (!sessionId) {
      sessionId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      await AsyncStorageUtils.setItem('venue_ping_session_id', sessionId);
    }
    return sessionId;
  }

  private async getLastKnownLocation(): Promise<LocationCoordinates | null> {
    try {
      const stored = await AsyncStorageUtils.getItem('last_known_location');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private async calculateMovementSpeed(lastLocation: LocationCoordinates | null): Promise<number> {
    if (!lastLocation) return 0;
    
    const currentLocation = await this.venueLocationService.getCurrentLocation(false);
    if (!currentLocation) return 0;
    
    // Calculate distance and time difference
    const distance = this.calculateDistance(
      lastLocation.lat, lastLocation.lng,
      currentLocation.lat, currentLocation.lng
    );
    
    const timeDiff = (currentLocation.timestamp.getTime() - lastLocation.timestamp.getTime()) / 1000; // seconds
    
    if (timeDiff < 60) return 0; // Less than 1 minute, not reliable
    
    // Speed in km/h
    const speedKmH = (distance / 1000) / (timeDiff / 3600);
    return Math.max(0, speedKmH);
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private async getAverageLocationAccuracy(): Promise<number> {
    // This would track recent location accuracies
    // For now, return a reasonable default
    return 50;
  }

  /**
   * Clean up resources and stop all monitoring
   */
  async cleanup(): Promise<void> {
    await this.stopVenuePing();
    await this.backgroundProcessor.cleanup();
    this.activeVenues.clear();
    await this.saveActiveVenues();
    
    console.log('VenuePingService cleaned up');
  }
}