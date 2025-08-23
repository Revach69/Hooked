import { firebasePerformance } from './firebasePerformance';
import * as Sentry from '@sentry/react-native';

/**
 * Map Analytics Event Types
 */
export interface MapViewEvent {
  type: 'map_view';
  timestamp: number;
  eventId: string;
  userId?: string;
  sessionId: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  zoomLevel: number;
  viewBounds: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
  loadTime?: number;
}

export interface MapInteractionEvent {
  type: 'map_zoom' | 'map_pan' | 'map_tap';
  timestamp: number;
  eventId: string;
  userId?: string;
  sessionId: string;
  startCoordinates: {
    latitude: number;
    longitude: number;
  };
  endCoordinates?: {
    latitude: number;
    longitude: number;
  };
  startZoom?: number;
  endZoom?: number;
  duration?: number;
  gestureType?: 'pinch' | 'double_tap' | 'drag';
}

export interface VenueMarkerEvent {
  type: 'marker_tap' | 'marker_view' | 'marker_callout';
  timestamp: number;
  eventId: string;
  userId?: string;
  sessionId: string;
  venueId: string;
  venueName: string;
  venueCoordinates: {
    latitude: number;
    longitude: number;
  };
  userCoordinates: {
    latitude: number;
    longitude: number;
  };
  distanceFromUser: number; // in meters
  zoomLevel: number;
  markerVisible: boolean;
}

export interface NavigationEvent {
  type: 'navigation_started' | 'navigation_directions' | 'navigation_cancelled';
  timestamp: number;
  eventId: string;
  userId?: string;
  sessionId: string;
  venueId: string;
  venueName: string;
  startCoordinates: {
    latitude: number;
    longitude: longitude;
  };
  destinationCoordinates: {
    latitude: number;
    longitude: number;
  };
  distanceKm: number;
  estimatedTravelTimeMinutes?: number;
  transportMode: 'walking' | 'driving' | 'transit';
}

export interface MapPerformanceEvent {
  type: 'map_load' | 'marker_load' | 'tile_load' | 'api_call';
  timestamp: number;
  eventId: string;
  sessionId: string;
  loadTimeMs: number;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  resourceSize?: number; // in bytes
  cacheHit?: boolean;
  networkLatency?: number; // in ms
}

export type MapAnalyticsEvent = 
  | MapViewEvent 
  | MapInteractionEvent 
  | VenueMarkerEvent 
  | NavigationEvent 
  | MapPerformanceEvent;

/**
 * Map Analytics Service
 * Handles tracking and processing of map-related user interactions
 */
class MapAnalyticsService {
  private sessionId: string;
  private currentEventId: string | null = null;
  private eventBuffer: MapAnalyticsEvent[] = [];
  private bufferSize: number = 50;
  private flushInterval: number = 30000; // 30 seconds
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startBufferFlush();
  }

  /**
   * Initialize map analytics for a specific event
   */
  initializeForEvent(eventId: string): void {
    this.currentEventId = eventId;
    this.sessionId = this.generateSessionId();
    
    Sentry.addBreadcrumb({
      message: 'Map analytics initialized',
      level: 'info',
      category: 'map_analytics',
      data: { eventId, sessionId: this.sessionId }
    });
  }

  /**
   * Track map view event
   */
  async trackMapView(data: Omit<MapViewEvent, 'type' | 'timestamp' | 'eventId' | 'sessionId'>): Promise<void> {
    if (!this.currentEventId) return;

    const startTime = Date.now();
    
    const event: MapViewEvent = {
      type: 'map_view',
      timestamp: startTime,
      eventId: this.currentEventId,
      sessionId: this.sessionId,
      ...data
    };

    await this.addEvent(event);

    // Track performance for map view
    await firebasePerformance.trace('map_view_track', async () => {
      await this.processEvent(event);
    });
  }

  /**
   * Track map interaction events (zoom, pan, tap)
   */
  async trackMapInteraction(data: Omit<MapInteractionEvent, 'timestamp' | 'eventId' | 'sessionId'>): Promise<void> {
    if (!this.currentEventId) return;

    const event: MapInteractionEvent = {
      timestamp: Date.now(),
      eventId: this.currentEventId,
      sessionId: this.sessionId,
      ...data
    };

    await this.addEvent(event);

    // Track interaction performance
    const traceName = `map_interaction_${data.type}`;
    await firebasePerformance.trace(traceName, async () => {
      await this.processEvent(event);
    });
  }

  /**
   * Track venue marker interactions
   */
  async trackVenueMarker(data: Omit<VenueMarkerEvent, 'timestamp' | 'eventId' | 'sessionId'>): Promise<void> {
    if (!this.currentEventId) return;

    const event: VenueMarkerEvent = {
      timestamp: Date.now(),
      eventId: this.currentEventId,
      sessionId: this.sessionId,
      ...data
    };

    await this.addEvent(event);

    // Track venue interaction
    await firebasePerformance.trace('venue_marker_interaction', async () => {
      await this.processEvent(event);
    });
  }

  /**
   * Track navigation events
   */
  async trackNavigation(data: Omit<NavigationEvent, 'timestamp' | 'eventId' | 'sessionId'>): Promise<void> {
    if (!this.currentEventId) return;

    const event: NavigationEvent = {
      timestamp: Date.now(),
      eventId: this.currentEventId,
      sessionId: this.sessionId,
      ...data
    };

    await this.addEvent(event);

    // Track navigation performance
    await firebasePerformance.trace('navigation_tracking', async () => {
      await this.processEvent(event);
    });
  }

  /**
   * Track map performance metrics
   */
  async trackMapPerformance(data: Omit<MapPerformanceEvent, 'timestamp' | 'eventId' | 'sessionId'>): Promise<void> {
    if (!this.currentEventId) return;

    const event: MapPerformanceEvent = {
      timestamp: Date.now(),
      eventId: this.currentEventId,
      sessionId: this.sessionId,
      ...data
    };

    await this.addEvent(event);
    
    // Immediately process performance events
    await this.processEvent(event);
  }

  /**
   * Process individual analytics event
   */
  private async processEvent(event: MapAnalyticsEvent): Promise<void> {
    try {
      // Add Sentry breadcrumb for debugging
      Sentry.addBreadcrumb({
        message: `Map analytics: ${event.type}`,
        level: 'debug',
        category: 'map_analytics',
        data: {
          eventId: event.eventId,
          sessionId: event.sessionId,
          type: event.type
        }
      });

      // Performance tracking for specific event types
      if (event.type === 'map_load' || event.type === 'marker_load') {
        const performanceEvent = event as MapPerformanceEvent;
        if (!performanceEvent.success) {
          // Log performance issues
          Sentry.addBreadcrumb({
            message: 'Map performance issue detected',
            level: 'warning',
            category: 'map_performance',
            data: {
              loadTimeMs: performanceEvent.loadTimeMs,
              errorCode: performanceEvent.errorCode,
              errorMessage: performanceEvent.errorMessage
            }
          });
        }
      }

    } catch (error) {
      console.error('Failed to process map analytics event:', error);
      Sentry.captureException(error, {
        tags: {
          operation: 'process_map_analytics_event',
          eventType: event.type
        }
      });
    }
  }

  /**
   * Add event to buffer
   */
  private async addEvent(event: MapAnalyticsEvent): Promise<void> {
    this.eventBuffer.push(event);

    // Flush buffer if it's full
    if (this.eventBuffer.length >= this.bufferSize) {
      await this.flushEvents();
    }
  }

  /**
   * Flush events to storage/backend
   */
  private async flushEvents(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      // Process events in batches for performance
      await firebasePerformance.trace('map_analytics_flush', async () => {
        // Here would integrate with backend API or local storage
        // For now, just log the aggregated data
        console.log(`Flushing ${events.length} map analytics events`);
        
        // Group events by type for efficient processing
        const eventsByType = events.reduce((acc, event) => {
          if (!acc[event.type]) acc[event.type] = [];
          acc[event.type].push(event);
          return acc;
        }, {} as Record<string, MapAnalyticsEvent[]>);

        // Log summary for each event type
        Object.entries(eventsByType).forEach(([type, typeEvents]) => {
          console.log(`${type}: ${typeEvents.length} events`);
        });
      });

    } catch (error) {
      console.error('Failed to flush map analytics events:', error);
      Sentry.captureException(error, {
        tags: {
          operation: 'flush_map_analytics_events'
        }
      });
      
      // Re-add events to buffer for retry
      this.eventBuffer = [...events, ...this.eventBuffer];
    }
  }

  /**
   * Start automatic buffer flushing
   */
  private startBufferFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(async () => {
      await this.flushEvents();
    }, this.flushInterval);
  }

  /**
   * Stop analytics tracking and flush remaining events
   */
  async stopTracking(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Flush any remaining events
    await this.flushEvents();

    Sentry.addBreadcrumb({
      message: 'Map analytics stopped',
      level: 'info',
      category: 'map_analytics',
      data: { sessionId: this.sessionId }
    });
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `map_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current session analytics summary
   */
  getSessionSummary(): {
    sessionId: string;
    eventId: string | null;
    bufferedEvents: number;
    eventTypes: Record<string, number>;
  } {
    const eventTypes = this.eventBuffer.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      sessionId: this.sessionId,
      eventId: this.currentEventId,
      bufferedEvents: this.eventBuffer.length,
      eventTypes
    };
  }
}

// Export singleton instance
export const mapAnalyticsService = new MapAnalyticsService();

// Export convenience functions
export const trackMapView = (data: Omit<MapViewEvent, 'type' | 'timestamp' | 'eventId' | 'sessionId'>) =>
  mapAnalyticsService.trackMapView(data);

export const trackMapInteraction = (data: Omit<MapInteractionEvent, 'timestamp' | 'eventId' | 'sessionId'>) =>
  mapAnalyticsService.trackMapInteraction(data);

export const trackVenueMarker = (data: Omit<VenueMarkerEvent, 'timestamp' | 'eventId' | 'sessionId'>) =>
  mapAnalyticsService.trackVenueMarker(data);

export const trackNavigation = (data: Omit<NavigationEvent, 'timestamp' | 'eventId' | 'sessionId'>) =>
  mapAnalyticsService.trackNavigation(data);

export const trackMapPerformance = (data: Omit<MapPerformanceEvent, 'timestamp' | 'eventId' | 'sessionId'>) =>
  mapAnalyticsService.trackMapPerformance(data);

export default mapAnalyticsService;