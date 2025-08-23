import { firebasePerformance } from './firebasePerformance';
import * as Sentry from '@sentry/react-native';

/**
 * Venue Performance Metrics Types
 */
export interface VenueViewMetric {
  type: 'venue_view';
  timestamp: number;
  eventId: string;
  venueId: string;
  venueName: string;
  venueCategory: string;
  sessionId: string;
  userId?: string;
  viewDurationMs: number;
  viewSource: 'map_marker' | 'list_view' | 'search_result' | 'recommendation';
  zoomLevel?: number;
  distanceFromUser?: number; // meters
  visibility: {
    fullyVisible: boolean;
    visibilityPercentage: number;
    viewportPosition: 'center' | 'edge' | 'corner';
  };
}

export interface VenueInteractionMetric {
  type: 'venue_tap' | 'venue_callout' | 'venue_detail_view' | 'venue_navigation';
  timestamp: number;
  eventId: string;
  venueId: string;
  venueName: string;
  venueCategory: string;
  sessionId: string;
  userId?: string;
  interactionSource: 'map' | 'list' | 'search' | 'recommendation';
  interactionDurationMs?: number;
  followUpAction?: 'navigation' | 'profile_view' | 'share' | 'save' | 'dismiss';
  userContext: {
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    dayOfWeek: string;
    isWeekend: boolean;
  };
}

export interface VenueDiscoveryMetric {
  type: 'venue_discovery';
  timestamp: number;
  eventId: string;
  venueId: string;
  venueName: string;
  venueCategory: string;
  sessionId: string;
  userId?: string;
  discoveryMethod: 'map_browse' | 'search' | 'filter' | 'recommendation' | 'category_browse';
  discoveryRank?: number; // position in search results or list
  queryUsed?: string;
  filtersActive: string[];
  competitorVenues: string[]; // other venues visible at same time
  conversionPath: {
    viewToInteraction: boolean;
    interactionToNavigation: boolean;
    timeToFirstInteraction: number;
  };
}

export interface VenuePopularityMetric {
  type: 'venue_popularity';
  timestamp: number;
  eventId: string;
  venueId: string;
  venueName: string;
  venueCategory: string;
  aggregationPeriod: 'hourly' | 'daily' | 'weekly';
  metrics: {
    totalViews: number;
    uniqueUsers: number;
    averageViewDuration: number;
    interactionRate: number; // interactions / views
    navigationRate: number; // navigations / interactions
    peakViewingHours: number[];
    demographicBreakdown: {
      ageGroups: Record<string, number>;
      genderDistribution: Record<string, number>;
    };
    geographicReach: {
      averageUserDistance: number;
      maxUserDistance: number;
      primaryUserZones: string[];
    };
  };
}

export interface VenueCompetitiveMetric {
  type: 'venue_competitive';
  timestamp: number;
  eventId: string;
  venueId: string;
  venueName: string;
  venueCategory: string;
  competitorAnalysis: {
    nearbyVenues: {
      venueId: string;
      distance: number;
      category: string;
      relativePerformance: number; // performance ratio compared to this venue
    }[];
    marketShare: {
      categoryViews: number;
      venueViews: number;
      sharePercentage: number;
    };
    competitiveAdvantages: string[];
    improvementOpportunities: string[];
  };
}

export type VenuePerformanceEvent = 
  | VenueViewMetric 
  | VenueInteractionMetric 
  | VenueDiscoveryMetric 
  | VenuePopularityMetric 
  | VenueCompetitiveMetric;

/**
 * Venue Performance Tracking Service
 */
class VenuePerformanceService {
  private venueViewStartTimes: Map<string, number> = new Map();
  private venueInteractionCounts: Map<string, number> = new Map();
  private venueDiscoveryContext: Map<string, any> = new Map();
  private sessionVenueViews: Set<string> = new Set();

  /**
   * Start tracking venue view
   */
  startVenueView(
    venueId: string,
    venueName: string,
    venueCategory: string,
    sessionId: string,
    viewSource: VenueViewMetric['viewSource'],
    context: Partial<VenueViewMetric> = {}
  ): void {
    const viewKey = `${venueId}_${sessionId}`;
    this.venueViewStartTimes.set(viewKey, Date.now());
    
    // Track unique venue views per session
    this.sessionVenueViews.add(venueId);

    // Store context for later use
    this.venueDiscoveryContext.set(viewKey, {
      venueName,
      venueCategory,
      viewSource,
      ...context
    });
  }

  /**
   * End venue view and record metrics
   */
  async endVenueView(
    venueId: string,
    sessionId: string,
    visibility: VenueViewMetric['visibility'],
    eventId: string,
    userId?: string
  ): Promise<void> {
    const viewKey = `${venueId}_${sessionId}`;
    const startTime = this.venueViewStartTimes.get(viewKey);
    
    if (!startTime) {
      console.warn(`No start time found for venue view: ${viewKey}`);
      return;
    }

    const viewDurationMs = Date.now() - startTime;
    const context = this.venueDiscoveryContext.get(viewKey) || {};

    const viewMetric: VenueViewMetric = {
      type: 'venue_view',
      timestamp: Date.now(),
      eventId,
      venueId,
      venueName: context.venueName || 'Unknown',
      venueCategory: context.venueCategory || 'Unknown',
      sessionId,
      userId,
      viewDurationMs,
      viewSource: context.viewSource || 'map_marker',
      zoomLevel: context.zoomLevel,
      distanceFromUser: context.distanceFromUser,
      visibility
    };

    await this.trackVenuePerformanceEvent(viewMetric);

    // Clean up
    this.venueViewStartTimes.delete(viewKey);
    this.venueDiscoveryContext.delete(viewKey);
  }

  /**
   * Track venue interaction
   */
  async trackVenueInteraction(
    interactionType: VenueInteractionMetric['type'],
    venueId: string,
    venueName: string,
    venueCategory: string,
    sessionId: string,
    eventId: string,
    interactionSource: VenueInteractionMetric['interactionSource'],
    followUpAction?: VenueInteractionMetric['followUpAction'],
    userId?: string
  ): Promise<void> {
    const now = Date.now();
    const interactionKey = `${venueId}_${sessionId}`;
    
    // Track interaction count for this venue in this session
    const currentCount = this.venueInteractionCounts.get(interactionKey) || 0;
    this.venueInteractionCounts.set(interactionKey, currentCount + 1);

    // Determine user context
    const currentHour = new Date().getHours();
    const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const isWeekend = [0, 6].includes(new Date().getDay());

    let timeOfDay: VenueInteractionMetric['userContext']['timeOfDay'] = 'morning';
    if (currentHour >= 12 && currentHour < 17) timeOfDay = 'afternoon';
    else if (currentHour >= 17 && currentHour < 21) timeOfDay = 'evening';
    else if (currentHour >= 21 || currentHour < 6) timeOfDay = 'night';

    const interactionMetric: VenueInteractionMetric = {
      type: interactionType,
      timestamp: now,
      eventId,
      venueId,
      venueName,
      venueCategory,
      sessionId,
      userId,
      interactionSource,
      followUpAction,
      userContext: {
        timeOfDay,
        dayOfWeek,
        isWeekend
      }
    };

    await this.trackVenuePerformanceEvent(interactionMetric);

    // Track performance of interaction processing
    await firebasePerformance.trace('venue_interaction_processing', async () => {
      console.log(`Tracked ${interactionType} for venue ${venueId}`);
    });
  }

  /**
   * Track venue discovery events
   */
  async trackVenueDiscovery(
    venueId: string,
    venueName: string,
    venueCategory: string,
    sessionId: string,
    eventId: string,
    discoveryMethod: VenueDiscoveryMetric['discoveryMethod'],
    discoveryContext: {
      rank?: number;
      query?: string;
      filters: string[];
      competitorVenues: string[];
      timeToFirstInteraction: number;
    },
    conversionEvents: {
      viewToInteraction: boolean;
      interactionToNavigation: boolean;
    },
    userId?: string
  ): Promise<void> {
    const discoveryMetric: VenueDiscoveryMetric = {
      type: 'venue_discovery',
      timestamp: Date.now(),
      eventId,
      venueId,
      venueName,
      venueCategory,
      sessionId,
      userId,
      discoveryMethod,
      discoveryRank: discoveryContext.rank,
      queryUsed: discoveryContext.query,
      filtersActive: discoveryContext.filters,
      competitorVenues: discoveryContext.competitorVenues,
      conversionPath: {
        viewToInteraction: conversionEvents.viewToInteraction,
        interactionToNavigation: conversionEvents.interactionToNavigation,
        timeToFirstInteraction: discoveryContext.timeToFirstInteraction
      }
    };

    await this.trackVenuePerformanceEvent(discoveryMetric);
  }

  /**
   * Generate venue popularity metrics (typically called periodically)
   */
  async generateVenuePopularityMetrics(
    venueId: string,
    venueName: string,
    venueCategory: string,
    eventId: string,
    aggregationPeriod: VenuePopularityMetric['aggregationPeriod'],
    metricsData: VenuePopularityMetric['metrics']
  ): Promise<void> {
    const popularityMetric: VenuePopularityMetric = {
      type: 'venue_popularity',
      timestamp: Date.now(),
      eventId,
      venueId,
      venueName,
      venueCategory,
      aggregationPeriod,
      metrics: metricsData
    };

    await this.trackVenuePerformanceEvent(popularityMetric);

    // Log insights for debugging
    console.log(`Venue ${venueName} popularity metrics:`, {
      totalViews: metricsData.totalViews,
      interactionRate: (metricsData.interactionRate * 100).toFixed(1) + '%',
      navigationRate: (metricsData.navigationRate * 100).toFixed(1) + '%'
    });
  }

  /**
   * Analyze venue performance against competitors
   */
  async analyzeVenueCompetitivePerformance(
    venueId: string,
    venueName: string,
    venueCategory: string,
    eventId: string,
    nearbyVenues: Array<{
      venueId: string;
      distance: number;
      category: string;
      performanceScore: number;
    }>,
    marketData: {
      categoryViews: number;
      venueViews: number;
    }
  ): Promise<void> {
    const thisVenuePerformance = 1.0; // Baseline performance
    
    const competitiveAnalysis = {
      nearbyVenues: nearbyVenues.map(venue => ({
        ...venue,
        relativePerformance: venue.performanceScore / thisVenuePerformance
      })),
      marketShare: {
        categoryViews: marketData.categoryViews,
        venueViews: marketData.venueViews,
        sharePercentage: (marketData.venueViews / marketData.categoryViews) * 100
      },
      competitiveAdvantages: this.identifyCompetitiveAdvantages(nearbyVenues, thisVenuePerformance),
      improvementOpportunities: this.identifyImprovementOpportunities(nearbyVenues, thisVenuePerformance)
    };

    const competitiveMetric: VenueCompetitiveMetric = {
      type: 'venue_competitive',
      timestamp: Date.now(),
      eventId,
      venueId,
      venueName,
      venueCategory,
      competitorAnalysis: competitiveAnalysis
    };

    await this.trackVenuePerformanceEvent(competitiveMetric);
  }

  /**
   * Get venue performance summary for a session
   */
  getSessionVenuePerformance(sessionId: string): {
    uniqueVenuesViewed: number;
    totalInteractions: number;
    topVenuesByInteraction: { venueId: string; interactions: number }[];
    averageViewDuration: number;
  } {
    const sessionVenues = Array.from(this.sessionVenueViews);
    
    const interactionCounts = Array.from(this.venueInteractionCounts.entries())
      .filter(([key]) => key.includes(sessionId))
      .map(([key, count]) => ({
        venueId: key.split('_')[0],
        interactions: count
      }))
      .sort((a, b) => b.interactions - a.interactions);

    return {
      uniqueVenuesViewed: sessionVenues.length,
      totalInteractions: interactionCounts.reduce((sum, venue) => sum + venue.interactions, 0),
      topVenuesByInteraction: interactionCounts.slice(0, 5),
      averageViewDuration: 0 // Would be calculated from actual view durations
    };
  }

  /**
   * Track performance event
   */
  private async trackVenuePerformanceEvent(event: VenuePerformanceEvent): Promise<void> {
    try {
      // Add Sentry breadcrumb for debugging
      Sentry.addBreadcrumb({
        message: `Venue performance: ${event.type}`,
        level: 'debug',
        category: 'venue_performance',
        data: {
          venueId: event.venueId,
          venueName: event.venueName,
          type: event.type
        }
      });

      // Here would integrate with backend API or analytics service
      console.log('Venue performance event tracked:', {
        type: event.type,
        venueId: event.venueId,
        venueName: event.venueName,
        timestamp: event.timestamp
      });

    } catch (error) {
      console.error('Failed to track venue performance event:', error);
      Sentry.captureException(error, {
        tags: {
          operation: 'track_venue_performance_event',
          eventType: event.type,
          venueId: event.venueId
        }
      });
    }
  }

  /**
   * Identify competitive advantages
   */
  private identifyCompetitiveAdvantages(
    nearbyVenues: Array<{ performanceScore: number }>,
    thisVenuePerformance: number
  ): string[] {
    const advantages: string[] = [];
    
    const averageCompetitorPerformance = nearbyVenues.length > 0 
      ? nearbyVenues.reduce((sum, venue) => sum + venue.performanceScore, 0) / nearbyVenues.length
      : 0;

    if (thisVenuePerformance > averageCompetitorPerformance * 1.2) {
      advantages.push('Higher engagement rate than competitors');
    }
    
    if (thisVenuePerformance > averageCompetitorPerformance * 1.5) {
      advantages.push('Significantly outperforming local market');
    }

    return advantages;
  }

  /**
   * Identify improvement opportunities
   */
  private identifyImprovementOpportunities(
    nearbyVenues: Array<{ performanceScore: number }>,
    thisVenuePerformance: number
  ): string[] {
    const opportunities: string[] = [];
    
    const maxCompetitorPerformance = nearbyVenues.length > 0 
      ? Math.max(...nearbyVenues.map(v => v.performanceScore))
      : thisVenuePerformance;

    if (maxCompetitorPerformance > thisVenuePerformance * 1.2) {
      opportunities.push('Opportunity to improve engagement compared to top performer');
    }
    
    if (nearbyVenues.some(v => v.performanceScore > thisVenuePerformance * 1.5)) {
      opportunities.push('Significant performance gap exists with best-in-category venue');
    }

    return opportunities;
  }

  /**
   * Reset session tracking
   */
  resetSession(): void {
    this.venueViewStartTimes.clear();
    this.venueInteractionCounts.clear();
    this.venueDiscoveryContext.clear();
    this.sessionVenueViews.clear();
  }
}

// Export singleton instance
export const venuePerformanceService = new VenuePerformanceService();

// Export convenience functions
export const startVenueView = (
  venueId: string,
  venueName: string,
  venueCategory: string,
  sessionId: string,
  viewSource: VenueViewMetric['viewSource'],
  context?: Partial<VenueViewMetric>
) => venuePerformanceService.startVenueView(venueId, venueName, venueCategory, sessionId, viewSource, context);

export const endVenueView = (
  venueId: string,
  sessionId: string,
  visibility: VenueViewMetric['visibility'],
  eventId: string,
  userId?: string
) => venuePerformanceService.endVenueView(venueId, sessionId, visibility, eventId, userId);

export const trackVenueInteraction = (
  interactionType: VenueInteractionMetric['type'],
  venueId: string,
  venueName: string,
  venueCategory: string,
  sessionId: string,
  eventId: string,
  interactionSource: VenueInteractionMetric['interactionSource'],
  followUpAction?: VenueInteractionMetric['followUpAction'],
  userId?: string
) => venuePerformanceService.trackVenueInteraction(
  interactionType, venueId, venueName, venueCategory, sessionId, eventId, interactionSource, followUpAction, userId
);

export default venuePerformanceService;