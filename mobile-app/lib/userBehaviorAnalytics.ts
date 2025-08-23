import { mapAnalyticsService, MapAnalyticsEvent } from './mapAnalyticsService';
import { firebasePerformance } from './firebasePerformance';
import * as Sentry from '@sentry/react-native';

/**
 * User Behavior Analytics Types
 */
export interface UserJourneyEvent {
  type: 'journey_start' | 'journey_step' | 'journey_complete' | 'journey_abandon';
  timestamp: number;
  eventId: string;
  userId?: string;
  sessionId: string;
  journeyType: 'map_to_venue' | 'venue_to_match' | 'match_to_message';
  currentStep: string;
  previousStep?: string;
  stepDurationMs?: number;
  journeyDurationMs?: number;
  metadata?: Record<string, any>;
}

export interface DiscoveryPatternEvent {
  type: 'discovery_search' | 'discovery_browse' | 'discovery_filter';
  timestamp: number;
  eventId: string;
  userId?: string;
  sessionId: string;
  searchQuery?: string;
  filtersApplied: string[];
  resultsCount: number;
  interactionCount: number;
  discoveryDurationMs: number;
  venuesViewed: string[];
  venuesInteracted: string[];
}

export interface EngagementMetricEvent {
  type: 'session_duration' | 'feature_usage' | 'retention_metric';
  timestamp: number;
  eventId: string;
  userId?: string;
  sessionId: string;
  durationMs: number;
  featureName?: string;
  engagementLevel: 'low' | 'medium' | 'high';
  returnVisit?: boolean;
  sessionDepth: number; // number of interactions in session
}

export interface ConversionFunnelEvent {
  type: 'funnel_enter' | 'funnel_progress' | 'funnel_convert' | 'funnel_exit';
  timestamp: number;
  eventId: string;
  userId?: string;
  sessionId: string;
  funnelName: 'map_discovery' | 'venue_engagement' | 'match_conversion';
  funnelStep: number;
  totalSteps: number;
  conversionRate?: number;
  dropoffReason?: string;
  stepCompletionTime?: number;
}

export type UserBehaviorEvent = 
  | UserJourneyEvent 
  | DiscoveryPatternEvent 
  | EngagementMetricEvent 
  | ConversionFunnelEvent;

/**
 * User Journey Tracking
 */
class UserJourneyTracker {
  private currentJourneys: Map<string, {
    journeyId: string;
    journeyType: string;
    startTime: number;
    currentStep: string;
    steps: { step: string; timestamp: number; duration?: number }[];
  }> = new Map();

  startJourney(journeyType: string, startStep: string, sessionId: string): string {
    const journeyId = `journey_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    this.currentJourneys.set(journeyId, {
      journeyId,
      journeyType,
      startTime: Date.now(),
      currentStep: startStep,
      steps: [{ step: startStep, timestamp: Date.now() }]
    });

    return journeyId;
  }

  progressJourney(journeyId: string, nextStep: string): void {
    const journey = this.currentJourneys.get(journeyId);
    if (!journey) return;

    const now = Date.now();
    const previousStep = journey.steps[journey.steps.length - 1];
    if (previousStep) {
      previousStep.duration = now - previousStep.timestamp;
    }

    journey.currentStep = nextStep;
    journey.steps.push({ step: nextStep, timestamp: now });
  }

  completeJourney(journeyId: string): UserJourneyEvent | null {
    const journey = this.currentJourneys.get(journeyId);
    if (!journey) return null;

    const now = Date.now();
    const lastStep = journey.steps[journey.steps.length - 1];
    if (lastStep) {
      lastStep.duration = now - lastStep.timestamp;
    }

    const journeyEvent: UserJourneyEvent = {
      type: 'journey_complete',
      timestamp: now,
      eventId: '', // Will be set by analytics service
      sessionId: journeyId.split('_')[2] || '',
      journeyType: journey.journeyType as any,
      currentStep: journey.currentStep,
      journeyDurationMs: now - journey.startTime,
      metadata: {
        totalSteps: journey.steps.length,
        steps: journey.steps
      }
    };

    this.currentJourneys.delete(journeyId);
    return journeyEvent;
  }

  abandonJourney(journeyId: string, reason?: string): UserJourneyEvent | null {
    const journey = this.currentJourneys.get(journeyId);
    if (!journey) return null;

    const now = Date.now();
    
    const journeyEvent: UserJourneyEvent = {
      type: 'journey_abandon',
      timestamp: now,
      eventId: '',
      sessionId: journeyId.split('_')[2] || '',
      journeyType: journey.journeyType as any,
      currentStep: journey.currentStep,
      journeyDurationMs: now - journey.startTime,
      metadata: {
        abandonReason: reason,
        completedSteps: journey.steps.length,
        steps: journey.steps
      }
    };

    this.currentJourneys.delete(journeyId);
    return journeyEvent;
  }
}

/**
 * User Behavior Analytics Service
 */
class UserBehaviorAnalyticsService {
  private journeyTracker = new UserJourneyTracker();
  private sessionStartTime = Date.now();
  private sessionInteractionCount = 0;
  private featureUsageMap: Map<string, number> = new Map();
  private discoverySessionId: string | null = null;
  private currentFunnels: Map<string, { step: number; startTime: number }> = new Map();

  /**
   * Track user journey from map discovery to venue interaction
   */
  async trackMapToVenueJourney(
    phase: 'start' | 'venue_view' | 'venue_select' | 'complete' | 'abandon',
    sessionId: string,
    venueId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const journeyType = 'map_to_venue';
    
    try {
      if (phase === 'start') {
        const journeyId = this.journeyTracker.startJourney(journeyType, 'map_open', sessionId);
        
        await this.trackUserBehaviorEvent({
          type: 'journey_start',
          eventId: '',
          sessionId,
          journeyType,
          currentStep: 'map_open',
          metadata: { journeyId, ...metadata }
        });

      } else if (phase === 'venue_view' || phase === 'venue_select') {
        // Progress journey logic would need journey ID tracking
        await this.trackUserBehaviorEvent({
          type: 'journey_step',
          eventId: '',
          sessionId,
          journeyType,
          currentStep: phase,
          metadata: { venueId, ...metadata }
        });

      } else if (phase === 'complete') {
        await this.trackUserBehaviorEvent({
          type: 'journey_complete',
          eventId: '',
          sessionId,
          journeyType,
          currentStep: 'venue_engaged',
          metadata: { venueId, ...metadata }
        });

      } else if (phase === 'abandon') {
        await this.trackUserBehaviorEvent({
          type: 'journey_abandon',
          eventId: '',
          sessionId,
          journeyType,
          currentStep: 'abandoned',
          metadata: { venueId, abandonReason: metadata?.reason, ...metadata }
        });
      }

    } catch (error) {
      console.error('Failed to track map to venue journey:', error);
      Sentry.captureException(error, {
        tags: {
          operation: 'track_map_to_venue_journey',
          phase,
          sessionId
        }
      });
    }
  }

  /**
   * Track venue discovery patterns
   */
  async trackDiscoveryPattern(
    searchQuery: string | null,
    filtersApplied: string[],
    resultsCount: number,
    venuesViewed: string[],
    venuesInteracted: string[],
    sessionId: string
  ): Promise<void> {
    const discoveryStartTime = this.sessionStartTime;
    const discoveryDurationMs = Date.now() - discoveryStartTime;

    const discoveryEvent: DiscoveryPatternEvent = {
      type: searchQuery ? 'discovery_search' : 'discovery_browse',
      timestamp: Date.now(),
      eventId: '',
      sessionId,
      searchQuery: searchQuery || undefined,
      filtersApplied,
      resultsCount,
      interactionCount: venuesInteracted.length,
      discoveryDurationMs,
      venuesViewed,
      venuesInteracted
    };

    await this.trackUserBehaviorEvent(discoveryEvent);

    // Track discovery effectiveness
    const effectiveness = venuesInteracted.length / Math.max(venuesViewed.length, 1);
    await firebasePerformance.trace('discovery_effectiveness_analysis', async () => {
      console.log(`Discovery effectiveness: ${(effectiveness * 100).toFixed(1)}%`);
    });
  }

  /**
   * Track session engagement metrics
   */
  async trackSessionEngagement(sessionId: string, featureName?: string): Promise<void> {
    this.sessionInteractionCount++;
    
    if (featureName) {
      const currentUsage = this.featureUsageMap.get(featureName) || 0;
      this.featureUsageMap.set(featureName, currentUsage + 1);
    }

    const sessionDurationMs = Date.now() - this.sessionStartTime;
    
    // Determine engagement level based on interaction count and duration
    let engagementLevel: 'low' | 'medium' | 'high' = 'low';
    if (this.sessionInteractionCount > 10 && sessionDurationMs > 120000) { // 2 minutes
      engagementLevel = 'high';
    } else if (this.sessionInteractionCount > 5 && sessionDurationMs > 60000) { // 1 minute
      engagementLevel = 'medium';
    }

    const engagementEvent: EngagementMetricEvent = {
      type: 'session_duration',
      timestamp: Date.now(),
      eventId: '',
      sessionId,
      durationMs: sessionDurationMs,
      featureName,
      engagementLevel,
      sessionDepth: this.sessionInteractionCount
    };

    await this.trackUserBehaviorEvent(engagementEvent);
  }

  /**
   * Track conversion funnel progress
   */
  async trackFunnelProgress(
    funnelName: 'map_discovery' | 'venue_engagement' | 'match_conversion',
    step: number,
    totalSteps: number,
    sessionId: string,
    action: 'enter' | 'progress' | 'convert' | 'exit' = 'progress'
  ): Promise<void> {
    const funnelKey = `${funnelName}_${sessionId}`;
    const now = Date.now();

    if (action === 'enter') {
      this.currentFunnels.set(funnelKey, { step, startTime: now });
    }

    const funnelData = this.currentFunnels.get(funnelKey);
    const stepCompletionTime = funnelData ? now - funnelData.startTime : undefined;

    const funnelEvent: ConversionFunnelEvent = {
      type: action === 'enter' ? 'funnel_enter' :
            action === 'convert' ? 'funnel_convert' :
            action === 'exit' ? 'funnel_exit' : 'funnel_progress',
      timestamp: now,
      eventId: '',
      sessionId,
      funnelName,
      funnelStep: step,
      totalSteps,
      stepCompletionTime,
      conversionRate: step / totalSteps
    };

    await this.trackUserBehaviorEvent(funnelEvent);

    if (action === 'convert' || action === 'exit') {
      this.currentFunnels.delete(funnelKey);
    } else if (funnelData) {
      funnelData.step = step;
      funnelData.startTime = now;
    }
  }

  /**
   * Analyze user behavior patterns
   */
  async analyzeUserPatterns(sessionId: string): Promise<{
    sessionSummary: {
      duration: number;
      interactions: number;
      engagementLevel: string;
      topFeatures: string[];
    };
    discoveryInsights: {
      averageVenuesViewed: number;
      interactionRate: number;
      preferredDiscoveryMethod: string;
    };
    journeyInsights: {
      completedJourneys: number;
      averageJourneyTime: number;
      commonDropoffPoints: string[];
    };
  }> {
    return await firebasePerformance.trace('user_behavior_analysis', async () => {
      const sessionDuration = Date.now() - this.sessionStartTime;
      
      // Feature usage analysis
      const sortedFeatures = Array.from(this.featureUsageMap.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([feature]) => feature);

      // Engagement level calculation
      const engagementLevel = this.sessionInteractionCount > 15 ? 'high' :
                             this.sessionInteractionCount > 8 ? 'medium' : 'low';

      return {
        sessionSummary: {
          duration: sessionDuration,
          interactions: this.sessionInteractionCount,
          engagementLevel,
          topFeatures: sortedFeatures
        },
        discoveryInsights: {
          averageVenuesViewed: 0, // Would be calculated from actual data
          interactionRate: 0, // Would be calculated from discovery events
          preferredDiscoveryMethod: 'browse' // Would be determined from event patterns
        },
        journeyInsights: {
          completedJourneys: 0, // Would be calculated from journey events
          averageJourneyTime: 0, // Would be calculated from journey events
          commonDropoffPoints: [] // Would be determined from abandon events
        }
      };
    });
  }

  /**
   * Track behavior event through the analytics system
   */
  private async trackUserBehaviorEvent(event: Omit<UserBehaviorEvent, 'eventId' | 'userId'>): Promise<void> {
    try {
      // Add to Sentry breadcrumb for debugging
      Sentry.addBreadcrumb({
        message: `User behavior: ${event.type}`,
        level: 'debug',
        category: 'user_behavior',
        data: {
          sessionId: event.sessionId,
          type: event.type
        }
      });

      // Here we would typically send to backend or integrate with existing analytics
      console.log('User behavior event tracked:', {
        type: event.type,
        sessionId: event.sessionId,
        timestamp: event.timestamp
      });

    } catch (error) {
      console.error('Failed to track user behavior event:', error);
      Sentry.captureException(error, {
        tags: {
          operation: 'track_user_behavior_event',
          eventType: event.type
        }
      });
    }
  }

  /**
   * Reset session tracking
   */
  resetSession(): void {
    this.sessionStartTime = Date.now();
    this.sessionInteractionCount = 0;
    this.featureUsageMap.clear();
    this.currentFunnels.clear();
    this.discoverySessionId = null;
  }

  /**
   * Get current session insights
   */
  getSessionInsights(): {
    sessionDuration: number;
    interactionCount: number;
    activeJourneys: number;
    activeFunnels: number;
    topFeatures: string[];
  } {
    const topFeatures = Array.from(this.featureUsageMap.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([feature]) => feature);

    return {
      sessionDuration: Date.now() - this.sessionStartTime,
      interactionCount: this.sessionInteractionCount,
      activeJourneys: 0, // Would be calculated from journey tracker
      activeFunnels: this.currentFunnels.size,
      topFeatures
    };
  }
}

// Export singleton instance
export const userBehaviorAnalytics = new UserBehaviorAnalyticsService();

// Export convenience functions
export const trackMapToVenueJourney = (
  phase: 'start' | 'venue_view' | 'venue_select' | 'complete' | 'abandon',
  sessionId: string,
  venueId?: string,
  metadata?: Record<string, any>
) => userBehaviorAnalytics.trackMapToVenueJourney(phase, sessionId, venueId, metadata);

export const trackDiscoveryPattern = (
  searchQuery: string | null,
  filtersApplied: string[],
  resultsCount: number,
  venuesViewed: string[],
  venuesInteracted: string[],
  sessionId: string
) => userBehaviorAnalytics.trackDiscoveryPattern(
  searchQuery, filtersApplied, resultsCount, venuesViewed, venuesInteracted, sessionId
);

export const trackSessionEngagement = (sessionId: string, featureName?: string) =>
  userBehaviorAnalytics.trackSessionEngagement(sessionId, featureName);

export const trackFunnelProgress = (
  funnelName: 'map_discovery' | 'venue_engagement' | 'match_conversion',
  step: number,
  totalSteps: number,
  sessionId: string,
  action: 'enter' | 'progress' | 'convert' | 'exit' = 'progress'
) => userBehaviorAnalytics.trackFunnelProgress(funnelName, step, totalSteps, sessionId, action);

export default userBehaviorAnalytics;