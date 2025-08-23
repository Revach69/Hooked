import { mapAnalyticsService } from './mapAnalyticsService';
import { userBehaviorAnalytics } from './userBehaviorAnalytics';
import { venuePerformanceService } from './venuePerformanceMetrics';
import { mapPerformanceMonitor } from './mapPerformanceMonitoring';
import { locationHeatmapService } from './locationHeatmapAnalytics';
import { firebasePerformance } from './firebasePerformance';
import * as Sentry from '@sentry/react-native';

/**
 * Mapbox Analytics Integration
 * Central coordination point for all map-related analytics
 */
class MapboxAnalyticsIntegration {
  private isInitialized = false;
  private currentEventId: string | null = null;
  private currentSessionId: string | null = null;
  private analyticsStartTime = 0;

  /**
   * Initialize all analytics services for a Mapbox session
   */
  async initializeAnalytics(eventId: string, sessionId?: string): Promise<void> {
    this.currentEventId = eventId;
    this.currentSessionId = sessionId || this.generateSessionId();
    this.analyticsStartTime = Date.now();

    try {
      // Initialize all services
      mapAnalyticsService.initializeForEvent(eventId);
      mapPerformanceMonitor.initializeMonitoring(eventId, this.currentSessionId);
      userBehaviorAnalytics.resetSession();
      venuePerformanceService.resetSession();

      this.isInitialized = true;

      // Start user journey tracking
      await userBehaviorAnalytics.trackMapToVenueJourney('start', this.currentSessionId);

      Sentry.addBreadcrumb({
        message: 'Mapbox analytics integration initialized',
        level: 'info',
        category: 'mapbox_analytics',
        data: { eventId, sessionId: this.currentSessionId }
      });

      console.log(`Mapbox analytics initialized for event ${eventId}, session ${this.currentSessionId}`);

    } catch (error) {
      console.error('Failed to initialize Mapbox analytics:', error);
      Sentry.captureException(error, {
        tags: {
          operation: 'initialize_mapbox_analytics',
          eventId
        }
      });
    }
  }

  /**
   * Track map load event with comprehensive metrics
   */
  async trackMapLoad(
    provider: 'mapbox' | 'google' | 'apple',
    initialZoom: number,
    initialCenter: { latitude: number; longitude: number },
    loadStartTime: number,
    success: boolean,
    errorDetails?: any
  ): Promise<void> {
    if (!this.isInitialized) return;

    const loadTime = Date.now() - loadStartTime;

    // Track with map analytics service
    await mapAnalyticsService.trackMapView({
      coordinates: initialCenter,
      zoomLevel: initialZoom,
      viewBounds: {
        northeast: { lat: initialCenter.latitude + 0.01, lng: initialCenter.longitude + 0.01 },
        southwest: { lat: initialCenter.latitude - 0.01, lng: initialCenter.longitude - 0.01 }
      },
      loadTime
    });

    // Track performance
    await mapPerformanceMonitor.trackMapLoad(
      provider,
      initialZoom,
      { lat: initialCenter.latitude, lng: initialCenter.longitude },
      loadStartTime,
      success,
      errorDetails
    );

    // Track user engagement
    await userBehaviorAnalytics.trackSessionEngagement(this.currentSessionId!, 'map_load');

    console.log(`Map load tracked: ${provider}, ${loadTime}ms, success: ${success}`);
  }

  /**
   * Track map interaction with full context
   */
  async trackMapInteraction(
    interactionType: 'zoom' | 'pan' | 'tap',
    startCoordinates: { latitude: number; longitude: number },
    endCoordinates?: { latitude: number; longitude: number },
    startZoom?: number,
    endZoom?: number,
    gestureType?: 'pinch' | 'double_tap' | 'drag'
  ): Promise<void> {
    if (!this.isInitialized) return;

    const interactionStartTime = Date.now() - 100; // Approximate start time

    // Track with map analytics
    await mapAnalyticsService.trackMapInteraction({
      type: `map_${interactionType}` as any,
      startCoordinates,
      endCoordinates,
      startZoom,
      endZoom,
      gestureType
    });

    // Track performance
    await mapPerformanceMonitor.trackInteractionPerformance(
      interactionType,
      interactionStartTime,
      gestureType === 'pinch' ? 'complex' : 'simple'
    );

    // Track user engagement
    await userBehaviorAnalytics.trackSessionEngagement(this.currentSessionId!, `map_${interactionType}`);

    // Track location data for heatmap
    await locationHeatmapService.trackUserLocation(
      startCoordinates.latitude,
      startCoordinates.longitude,
      this.currentSessionId!,
      this.currentEventId!,
      undefined,
      100 // Small dwell time for interactions
    );
  }

  /**
   * Track venue marker interaction with comprehensive analytics
   */
  async trackVenueMarkerInteraction(
    actionType: 'tap' | 'view' | 'callout',
    venueId: string,
    venueName: string,
    venueCategory: string,
    venueCoordinates: { latitude: number; longitude: number },
    userCoordinates: { latitude: number; longitude: number },
    zoomLevel: number,
    viewDurationMs?: number
  ): Promise<void> {
    if (!this.isInitialized) return;

    const distanceFromUser = this.calculateDistance(
      userCoordinates.latitude,
      userCoordinates.longitude,
      venueCoordinates.latitude,
      venueCoordinates.longitude
    );

    // Track with map analytics
    await mapAnalyticsService.trackVenueMarker({
      type: `marker_${actionType}` as any,
      venueId,
      venueName,
      venueCoordinates,
      userCoordinates,
      distanceFromUser,
      zoomLevel,
      markerVisible: true
    });

    // Track venue performance
    if (actionType === 'view' && viewDurationMs) {
      venuePerformanceService.startVenueView(
        venueId,
        venueName,
        venueCategory,
        this.currentSessionId!,
        'map_marker'
      );

      setTimeout(async () => {
        await venuePerformanceService.endVenueView(
          venueId,
          this.currentSessionId!,
          { fullyVisible: true, visibilityPercentage: 100, viewportPosition: 'center' },
          this.currentEventId!
        );
      }, viewDurationMs);
    } else {
      await venuePerformanceService.trackVenueInteraction(
        `venue_${actionType}` as any,
        venueId,
        venueName,
        venueCategory,
        this.currentSessionId!,
        this.currentEventId!,
        'map'
      );
    }

    // Track user journey progress
    await userBehaviorAnalytics.trackMapToVenueJourney(
      actionType === 'view' ? 'venue_view' : 'venue_select',
      this.currentSessionId!,
      venueId,
      { action: actionType, distance: distanceFromUser }
    );

    // Track conversion funnel
    await userBehaviorAnalytics.trackFunnelProgress(
      'venue_engagement',
      actionType === 'view' ? 1 : 2,
      3,
      this.currentSessionId!,
      actionType === 'view' ? 'progress' : 'convert'
    );

    // Track location heatmap data
    await locationHeatmapService.trackVenueInteraction(
      venueCoordinates.latitude,
      venueCoordinates.longitude,
      venueId,
      actionType,
      this.currentSessionId!,
      this.currentEventId!
    );

    if (viewDurationMs) {
      await locationHeatmapService.trackVenueView(
        venueCoordinates.latitude,
        venueCoordinates.longitude,
        venueId,
        viewDurationMs,
        this.currentSessionId!,
        this.currentEventId!
      );
    }

    console.log(`Venue ${actionType} tracked: ${venueName} (${venueId})`);
  }

  /**
   * Track navigation to venue
   */
  async trackVenueNavigation(
    venueId: string,
    venueName: string,
    startCoordinates: { latitude: number; longitude: number },
    destinationCoordinates: { latitude: number; longitude: number },
    transportMode: 'walking' | 'driving' | 'transit' = 'walking'
  ): Promise<void> {
    if (!this.isInitialized) return;

    const distanceKm = this.calculateDistance(
      startCoordinates.latitude,
      startCoordinates.longitude,
      destinationCoordinates.latitude,
      destinationCoordinates.longitude
    ) / 1000;

    // Track navigation event
    await mapAnalyticsService.trackNavigation({
      type: 'navigation_started',
      venueId,
      venueName,
      startCoordinates,
      destinationCoordinates,
      distanceKm,
      transportMode
    });

    // Complete user journey
    await userBehaviorAnalytics.trackMapToVenueJourney(
      'complete',
      this.currentSessionId!,
      venueId,
      { action: 'navigation', transportMode, distance: distanceKm }
    );

    // Track as final funnel conversion
    await userBehaviorAnalytics.trackFunnelProgress(
      'venue_engagement',
      3,
      3,
      this.currentSessionId!,
      'convert'
    );

    console.log(`Navigation started to venue ${venueName}: ${distanceKm.toFixed(2)}km via ${transportMode}`);
  }

  /**
   * Track API performance for map-related calls
   */
  async trackMapAPICall(
    apiCall: 'venue_search' | 'tile_fetch' | 'geocoding' | 'directions',
    url: string,
    method: string,
    success: boolean,
    responseTimeMs: number,
    requestSize?: number,
    responseSize?: number,
    cacheHit: boolean = false
  ): Promise<void> {
    if (!this.isInitialized) return;

    await mapPerformanceMonitor.trackAPIPerformance(
      apiCall,
      url,
      method,
      success,
      success ? 200 : 500,
      requestSize,
      responseSize,
      cacheHit,
      0 // retry count
    );

    // Track as performance metric
    await mapAnalyticsService.trackMapPerformance({
      type: 'api_call',
      loadTimeMs: responseTimeMs,
      success,
      errorCode: success ? undefined : 'API_ERROR',
      cacheHit,
      networkLatency: responseTimeMs
    });
  }

  /**
   * Generate comprehensive analytics summary
   */
  async generateAnalyticsSummary(): Promise<{
    session: {
      duration: number;
      interactions: number;
      venuesViewed: number;
      journeyCompleted: boolean;
    };
    performance: {
      averageLoadTime: number;
      frameRate: number;
      memoryUsage: number;
      apiCallsSuccessRate: number;
    };
    insights: string[];
  }> {
    if (!this.isInitialized) return this.getEmptySummary();

    return await firebasePerformance.trace('generate_analytics_summary', async () => {
      const sessionDuration = Date.now() - this.analyticsStartTime;
      
      // Get insights from each service
      const sessionInsights = userBehaviorAnalytics.getSessionInsights();
      const venuePerformance = venuePerformanceService.getSessionVenuePerformance(this.currentSessionId!);
      const performanceSummary = mapPerformanceMonitor.getPerformanceSummary();
      
      // Generate insights
      const insights: string[] = [];
      
      if (venuePerformance.uniqueVenuesViewed > 10) {
        insights.push('High venue exploration - user actively browsing multiple options');
      }
      
      if (sessionInsights.interactionCount > 20) {
        insights.push('Highly engaged user session with many interactions');
      }
      
      if (performanceSummary.currentFPS < 30) {
        insights.push('Performance issue detected - low frame rate impacting user experience');
      }
      
      if (sessionDuration > 300000) { // 5 minutes
        insights.push('Extended session duration indicates strong user engagement');
      }

      return {
        session: {
          duration: sessionDuration,
          interactions: sessionInsights.interactionCount,
          venuesViewed: venuePerformance.uniqueVenuesViewed,
          journeyCompleted: venuePerformance.totalInteractions > 0
        },
        performance: {
          averageLoadTime: performanceSummary.averageLoadTime,
          frameRate: performanceSummary.currentFPS,
          memoryUsage: performanceSummary.memoryUsage,
          apiCallsSuccessRate: 100 // Would be calculated from actual API metrics
        },
        insights
      };
    });
  }

  /**
   * Stop all analytics tracking and cleanup
   */
  async stopAnalytics(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      // Generate final summary
      const summary = await this.generateAnalyticsSummary();

      // Stop all services
      await mapAnalyticsService.stopTracking();
      mapPerformanceMonitor.stopMonitoring();
      venuePerformanceService.resetSession();
      locationHeatmapService.stopService();

      this.isInitialized = false;
      this.currentEventId = null;
      this.currentSessionId = null;

      console.log('Mapbox analytics session completed:', summary);

      Sentry.addBreadcrumb({
        message: 'Mapbox analytics session completed',
        level: 'info',
        category: 'mapbox_analytics',
        data: {
          sessionDuration: summary.session.duration,
          totalInteractions: summary.session.interactions,
          venuesViewed: summary.session.venuesViewed
        }
      });

    } catch (error) {
      console.error('Error stopping Mapbox analytics:', error);
      Sentry.captureException(error, {
        tags: {
          operation: 'stop_mapbox_analytics'
        }
      });
    }
  }

  /**
   * Helper methods
   */
  private generateSessionId(): string {
    return `mapbox_session_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  private getEmptySummary() {
    return {
      session: {
        duration: 0,
        interactions: 0,
        venuesViewed: 0,
        journeyCompleted: false
      },
      performance: {
        averageLoadTime: 0,
        frameRate: 60,
        memoryUsage: 0,
        apiCallsSuccessRate: 100
      },
      insights: ['Analytics not initialized']
    };
  }

  /**
   * Get current analytics state
   */
  getAnalyticsState(): {
    initialized: boolean;
    eventId: string | null;
    sessionId: string | null;
    sessionDuration: number;
  } {
    return {
      initialized: this.isInitialized,
      eventId: this.currentEventId,
      sessionId: this.currentSessionId,
      sessionDuration: this.isInitialized ? Date.now() - this.analyticsStartTime : 0
    };
  }
}

// Export singleton instance
export const mapboxAnalytics = new MapboxAnalyticsIntegration();

// Export convenience methods
export const initializeMapboxAnalytics = (eventId: string, sessionId?: string) =>
  mapboxAnalytics.initializeAnalytics(eventId, sessionId);

export const trackMapLoad = (
  provider: 'mapbox' | 'google' | 'apple',
  initialZoom: number,
  initialCenter: { latitude: number; longitude: number },
  loadStartTime: number,
  success: boolean,
  errorDetails?: any
) => mapboxAnalytics.trackMapLoad(provider, initialZoom, initialCenter, loadStartTime, success, errorDetails);

export const trackMapInteraction = (
  interactionType: 'zoom' | 'pan' | 'tap',
  startCoordinates: { latitude: number; longitude: number },
  endCoordinates?: { latitude: number; longitude: number },
  startZoom?: number,
  endZoom?: number,
  gestureType?: 'pinch' | 'double_tap' | 'drag'
) => mapboxAnalytics.trackMapInteraction(interactionType, startCoordinates, endCoordinates, startZoom, endZoom, gestureType);

export const trackVenueMarkerInteraction = (
  actionType: 'tap' | 'view' | 'callout',
  venueId: string,
  venueName: string,
  venueCategory: string,
  venueCoordinates: { latitude: number; longitude: number },
  userCoordinates: { latitude: number; longitude: number },
  zoomLevel: number,
  viewDurationMs?: number
) => mapboxAnalytics.trackVenueMarkerInteraction(
  actionType, venueId, venueName, venueCategory, venueCoordinates, userCoordinates, zoomLevel, viewDurationMs
);

export const trackVenueNavigation = (
  venueId: string,
  venueName: string,
  startCoordinates: { latitude: number; longitude: number },
  destinationCoordinates: { latitude: number; longitude: number },
  transportMode: 'walking' | 'driving' | 'transit' = 'walking'
) => mapboxAnalytics.trackVenueNavigation(venueId, venueName, startCoordinates, destinationCoordinates, transportMode);

export const stopMapboxAnalytics = () => mapboxAnalytics.stopAnalytics();

export default mapboxAnalytics;