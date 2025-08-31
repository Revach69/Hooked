import { AsyncStorageUtils } from '../asyncStorageUtils';
import * as Sentry from '@sentry/react-native';
import * as Crypto from 'expo-crypto';

// Anonymous data aggregation interfaces
export interface AnonymousVenueMetrics {
  venueIdHash: string; // SHA-256 hash of venue ID for privacy
  businessTypeCategory: string; // General category (restaurant, bar, etc.)
  locationRadius: number;
  kFactor: number;
  
  // Aggregated metrics (no personal data)
  sessionMetrics: {
    totalSessions: number;
    averageSessionDuration: number; // minutes
    averageParticipants: number;
    peakParticipantsEver: number;
    mostPopularDayOfWeek: number; // 0-6
    mostPopularHour: number; // 0-23
  };
  
  // Location accuracy insights
  locationPerformance: {
    averageJoinAttempts: number; // attempts before successful join
    averageLocationAccuracy: number; // meters
    joinSuccessRate: number; // percentage
    commonFailureReasons: { [reason: string]: number };
  };
  
  // Technical performance
  systemPerformance: {
    averagePingResponseTime: number; // milliseconds
    averageStateTransitions: number; // active->paused->active per session
    batteryImpactScore: number; // 1-10, higher = more battery usage
    backgroundTaskSuccess: number; // percentage
  };
  
  // Geographic clustering (privacy-safe)
  regionCluster: {
    countryCode: string;
    stateProvinceCode?: string;
    citySize: 'small' | 'medium' | 'large' | 'metropolitan'; // Population-based
    urbanRural: 'urban' | 'suburban' | 'rural';
  };
  
  // Temporal patterns
  temporalPatterns: {
    weekdayVsWeekend: { weekday: number; weekend: number }; // average participants
    seasonalTrends: { [quarter: string]: number }; // Q1, Q2, Q3, Q4
    monthlyDistribution: { [month: string]: number }; // 1-12
  };
  
  // Data collection metadata
  dataCollection: {
    firstDataPoint: Date;
    lastDataPoint: Date;
    totalDataPoints: number;
    dataQuality: 'high' | 'medium' | 'low'; // Based on completeness and accuracy
    sampleSize: number; // Number of unique user sessions
  };
}

export interface AnonymousSystemInsights {
  // Cross-venue patterns
  globalMetrics: {
    totalVenues: number;
    totalSessions: number;
    averageVenuePerformance: number; // 0-100 score
    mostSuccessfulBusinessType: string;
    mostCommonLocationRadius: number;
  };
  
  // Technical insights
  technicalInsights: {
    mostAccurateLocationConditions: {
      businessType: string;
      radius: number;
      urbanRural: string;
      averageAccuracy: number;
    };
    batteryOptimizationOpportunities: {
      highBatteryVenues: string[]; // hashed venue IDs
      suggestedOptimizations: string[];
    };
    commonTechnicalIssues: {
      issue: string;
      frequency: number;
      suggestedSolution: string;
    }[];
  };
  
  // User behavior insights (fully anonymized)
  behaviorPatterns: {
    averageSessionLengthByBusinessType: { [type: string]: number };
    peakHoursByBusinessType: { [type: string]: number };
    locationAccuracyByRegion: { [region: string]: number };
    joinSuccessRateByConditions: {
      condition: string;
      successRate: number;
    }[];
  };
  
  // Predictive analytics
  predictions: {
    optimalRadiusByBusinessType: { [type: string]: number };
    recommendedKFactorByRegion: { [region: string]: number };
    expectedBatteryImpactByConfiguration: {
      configuration: string;
      batteryScore: number;
    }[];
  };
}

// Storage keys
const ANONYMOUS_METRICS_PREFIX = 'anonymous_venue_';
const SYSTEM_INSIGHTS_KEY = 'anonymous_system_insights';
const AGGREGATION_METADATA_KEY = 'aggregation_metadata';
const LAST_AGGREGATION_KEY = 'last_aggregation_timestamp';

export class AnonymousDataAggregationService {
  private static instance: AnonymousDataAggregationService;
  private isAggregationRunning = false;

  static getInstance(): AnonymousDataAggregationService {
    if (!AnonymousDataAggregationService.instance) {
      AnonymousDataAggregationService.instance = new AnonymousDataAggregationService();
    }
    return AnonymousDataAggregationService.instance;
  }

  /**
   * Aggregate venue data into anonymous metrics
   * Called periodically to maintain privacy while gathering insights
   */
  async aggregateVenueData(
    venueId: string,
    businessType: string,
    locationSettings: {
      radius: number;
      kFactor: number;
      coordinates: { lat: number; lng: number };
    },
    sessionData: {
      totalSessions: number;
      sessionDurations: number[]; // minutes
      participantCounts: number[];
      joinAttempts: number[];
      locationAccuracies: number[];
      joinSuccessRates: number[];
      stateTransitions: number[];
      batteryUsage: number[]; // 1-10 scale
    },
    temporalData: {
      sessionsByDay: { [day: string]: number };
      sessionsByHour: { [hour: string]: number };
      sessionsByMonth: { [month: string]: number };
    }
  ): Promise<void> {
    try {
      // Hash venue ID for privacy
      const venueIdHash = await this.hashVenueId(venueId);
      
      // Determine geographic clustering (privacy-safe)
      const regionCluster = await this.determineRegionCluster(locationSettings.coordinates);
      
      // Calculate aggregated metrics
      const sessionMetrics = {
        totalSessions: sessionData.totalSessions,
        averageSessionDuration: this.calculateMean(sessionData.sessionDurations),
        averageParticipants: this.calculateMean(sessionData.participantCounts),
        peakParticipantsEver: Math.max(...sessionData.participantCounts),
        mostPopularDayOfWeek: this.findMostPopularDay(temporalData.sessionsByDay),
        mostPopularHour: this.findMostPopularHour(temporalData.sessionsByHour)
      };

      const locationPerformance = {
        averageJoinAttempts: this.calculateMean(sessionData.joinAttempts),
        averageLocationAccuracy: this.calculateMean(sessionData.locationAccuracies),
        joinSuccessRate: this.calculateMean(sessionData.joinSuccessRates) * 100,
        commonFailureReasons: this.aggregateFailureReasons(sessionData)
      };

      const systemPerformance = {
        averagePingResponseTime: 150, // Mock - would be calculated from actual ping data
        averageStateTransitions: this.calculateMean(sessionData.stateTransitions),
        batteryImpactScore: this.calculateMean(sessionData.batteryUsage),
        backgroundTaskSuccess: 92.5 // Mock - would be calculated from task success rates
      };

      const temporalPatterns = {
        weekdayVsWeekend: this.calculateWeekdayWeekendSplit(temporalData.sessionsByDay),
        seasonalTrends: this.calculateSeasonalTrends(temporalData.sessionsByMonth),
        monthlyDistribution: this.normalizeMonthlyData(temporalData.sessionsByMonth)
      };

      // Create anonymous venue metrics
      const anonymousMetrics: AnonymousVenueMetrics = {
        venueIdHash,
        businessTypeCategory: this.categorizeBusinessType(businessType),
        locationRadius: locationSettings.radius,
        kFactor: locationSettings.kFactor,
        sessionMetrics,
        locationPerformance,
        systemPerformance,
        regionCluster,
        temporalPatterns,
        dataCollection: {
          firstDataPoint: new Date(), // Would track actual first data point
          lastDataPoint: new Date(),
          totalDataPoints: sessionData.totalSessions,
          dataQuality: this.assessDataQuality(sessionData),
          sampleSize: sessionData.totalSessions
        }
      };

      // Store anonymous metrics
      const storageKey = `${ANONYMOUS_METRICS_PREFIX}${venueIdHash}`;
      await AsyncStorageUtils.setItem(storageKey, anonymousMetrics);
      
      console.log(`Anonymous data aggregated for venue ${venueIdHash}`);
      
      Sentry.addBreadcrumb({
        message: 'Anonymous venue data aggregated',
        data: {
          venueHash: venueIdHash.substring(0, 8) + '...', // Only log partial hash
          businessType: anonymousMetrics.businessTypeCategory,
          totalSessions: sessionMetrics.totalSessions,
          dataQuality: anonymousMetrics.dataCollection.dataQuality
        },
        level: 'info'
      });

    } catch (error) {
      console.error('Error aggregating anonymous venue data:', error);
      Sentry.captureException(error);
    }
  }

  /**
   * Generate system-wide insights from anonymous data
   */
  async generateSystemInsights(): Promise<AnonymousSystemInsights> {
    try {
      console.log('Generating anonymous system insights');
      
      // Get all anonymous venue metrics
      const venueMetrics = await this.getAllAnonymousVenueMetrics();
      
      if (venueMetrics.length === 0) {
        throw new Error('No anonymous venue data available for insights');
      }

      // Calculate global metrics
      const globalMetrics = {
        totalVenues: venueMetrics.length,
        totalSessions: venueMetrics.reduce((sum, v) => sum + v.sessionMetrics.totalSessions, 0),
        averageVenuePerformance: this.calculateAverageVenuePerformance(venueMetrics),
        mostSuccessfulBusinessType: this.findMostSuccessfulBusinessType(venueMetrics),
        mostCommonLocationRadius: this.findMostCommonValue(
          venueMetrics.map(v => v.locationRadius)
        )
      };

      // Technical insights
      const technicalInsights = {
        mostAccurateLocationConditions: this.findMostAccurateConditions(venueMetrics),
        batteryOptimizationOpportunities: this.identifyBatteryOptimizations(venueMetrics),
        commonTechnicalIssues: this.identifyCommonIssues(venueMetrics)
      };

      // Behavior patterns
      const behaviorPatterns = {
        averageSessionLengthByBusinessType: this.calculateSessionLengthsByType(venueMetrics),
        peakHoursByBusinessType: this.calculatePeakHoursByType(venueMetrics),
        locationAccuracyByRegion: this.calculateAccuracyByRegion(venueMetrics),
        joinSuccessRateByConditions: this.calculateSuccessRatesByConditions(venueMetrics)
      };

      // Predictive analytics
      const predictions = {
        optimalRadiusByBusinessType: this.predictOptimalRadius(venueMetrics),
        recommendedKFactorByRegion: this.predictOptimalKFactor(venueMetrics),
        expectedBatteryImpactByConfiguration: this.predictBatteryImpact(venueMetrics)
      };

      const systemInsights: AnonymousSystemInsights = {
        globalMetrics,
        technicalInsights,
        behaviorPatterns,
        predictions
      };

      // Store system insights
      await AsyncStorageUtils.setItem(SYSTEM_INSIGHTS_KEY, systemInsights);
      await AsyncStorageUtils.setItem(LAST_AGGREGATION_KEY, new Date().toISOString());
      
      console.log('System insights generated and stored');
      return systemInsights;

    } catch (error) {
      console.error('Error generating system insights:', error);
      Sentry.captureException(error);
      throw error;
    }
  }

  /**
   * Get stored system insights
   */
  async getSystemInsights(): Promise<AnonymousSystemInsights | null> {
    try {
      return await AsyncStorageUtils.getItem<AnonymousSystemInsights>(SYSTEM_INSIGHTS_KEY);
    } catch (error) {
      console.error('Error getting system insights:', error);
      return null;
    }
  }

  /**
   * Schedule periodic aggregation (privacy-compliant)
   */
  async schedulePeriodicAggregation(): Promise<void> {
    if (this.isAggregationRunning) return;

    try {
      const lastAggregation = await AsyncStorageUtils.getItem<string>(LAST_AGGREGATION_KEY);
      const now = new Date();
      
      // Run aggregation once per week
      let needsAggregation = false;
      if (!lastAggregation) {
        needsAggregation = true;
      } else {
        const lastAggregationDate = new Date(lastAggregation);
        const daysSinceAggregation = (now.getTime() - lastAggregationDate.getTime()) / (1000 * 60 * 60 * 24);
        needsAggregation = daysSinceAggregation >= 7;
      }

      if (needsAggregation) {
        console.log('Scheduling anonymous data aggregation');
        setTimeout(async () => {
          await this.generateSystemInsights();
        }, 10000); // Delay 10 seconds
      }

    } catch (error) {
      console.error('Error scheduling periodic aggregation:', error);
    }
  }

  // Private helper methods

  private async hashVenueId(venueId: string): Promise<string> {
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      venueId
    );
  }

  private async determineRegionCluster(coordinates: { lat: number; lng: number }): Promise<{
    countryCode: string;
    stateProvinceCode?: string;
    citySize: 'small' | 'medium' | 'large' | 'metropolitan';
    urbanRural: 'urban' | 'suburban' | 'rural';
  }> {
    // Simplified region clustering - in production, use reverse geocoding service
    return {
      countryCode: 'US', // Mock
      stateProvinceCode: 'CA', // Mock
      citySize: 'large',
      urbanRural: 'urban'
    };
  }

  private categorizeBusinessType(businessType: string): string {
    const categories = {
      restaurant: 'food_service',
      bar: 'entertainment',
      cafe: 'food_service',
      club: 'entertainment',
      hotel: 'hospitality',
      retail: 'retail',
      gym: 'fitness',
      other: 'other'
    };

    return categories[businessType as keyof typeof categories] || 'other';
  }

  private calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private findMostPopularDay(sessionsByDay: { [day: string]: number }): number {
    let maxSessions = 0;
    let mostPopularDay = 1; // Default to Monday

    Object.entries(sessionsByDay).forEach(([day, sessions]) => {
      if (sessions > maxSessions) {
        maxSessions = sessions;
        const dayNumber = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(day.toLowerCase());
        mostPopularDay = dayNumber >= 0 ? dayNumber : 1;
      }
    });

    return mostPopularDay;
  }

  private findMostPopularHour(sessionsByHour: { [hour: string]: number }): number {
    let maxSessions = 0;
    let mostPopularHour = 19; // Default to 7 PM

    Object.entries(sessionsByHour).forEach(([hour, sessions]) => {
      if (sessions > maxSessions) {
        maxSessions = sessions;
        mostPopularHour = parseInt(hour, 10) || 19;
      }
    });

    return mostPopularHour;
  }

  private aggregateFailureReasons(sessionData: any): { [reason: string]: number } {
    // Mock failure reasons - would be calculated from actual data
    return {
      'location_accuracy_poor': Math.floor(sessionData.totalSessions * 0.15),
      'outside_radius': Math.floor(sessionData.totalSessions * 0.08),
      'gps_unavailable': Math.floor(sessionData.totalSessions * 0.05),
      'venue_closed': Math.floor(sessionData.totalSessions * 0.03)
    };
  }

  private assessDataQuality(sessionData: any): 'high' | 'medium' | 'low' {
    const completenessScore = sessionData.totalSessions >= 10 ? 1 : 0.5;
    const accuracyScore = this.calculateMean(sessionData.locationAccuracies) < 100 ? 1 : 0.5;
    const consistencyScore = sessionData.joinSuccessRates.length > 0 ? 1 : 0;

    const overallScore = (completenessScore + accuracyScore + consistencyScore) / 3;

    if (overallScore >= 0.8) return 'high';
    if (overallScore >= 0.5) return 'medium';
    return 'low';
  }

  private calculateWeekdayWeekendSplit(sessionsByDay: { [day: string]: number }): { weekday: number; weekend: number } {
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const weekends = ['saturday', 'sunday'];

    const weekdayTotal = weekdays.reduce((sum, day) => sum + (sessionsByDay[day] || 0), 0);
    const weekendTotal = weekends.reduce((sum, day) => sum + (sessionsByDay[day] || 0), 0);

    return {
      weekday: weekdayTotal / weekdays.length,
      weekend: weekendTotal / weekends.length
    };
  }

  private calculateSeasonalTrends(sessionsByMonth: { [month: string]: number }): { [quarter: string]: number } {
    const quarters = {
      Q1: [1, 2, 3],
      Q2: [4, 5, 6],
      Q3: [7, 8, 9],
      Q4: [10, 11, 12]
    };

    const seasonalData: { [quarter: string]: number } = {};

    Object.entries(quarters).forEach(([quarter, months]) => {
      const quarterSessions = months.reduce((sum, month) => {
        return sum + (sessionsByMonth[month.toString()] || 0);
      }, 0);
      seasonalData[quarter] = quarterSessions / months.length;
    });

    return seasonalData;
  }

  private normalizeMonthlyData(sessionsByMonth: { [month: string]: number }): { [month: string]: number } {
    const total = Object.values(sessionsByMonth).reduce((sum, val) => sum + val, 0);
    if (total === 0) return sessionsByMonth;

    const normalized: { [month: string]: number } = {};
    Object.entries(sessionsByMonth).forEach(([month, sessions]) => {
      normalized[month] = (sessions / total) * 100; // Percentage
    });

    return normalized;
  }

  private async getAllAnonymousVenueMetrics(): Promise<AnonymousVenueMetrics[]> {
    try {
      const allKeys = await AsyncStorageUtils.getAllKeys();
      const venueMetrics: AnonymousVenueMetrics[] = [];

      for (const key of allKeys) {
        if (key.startsWith(ANONYMOUS_METRICS_PREFIX)) {
          const metrics = await AsyncStorageUtils.getItem<AnonymousVenueMetrics>(key);
          if (metrics) {
            venueMetrics.push(metrics);
          }
        }
      }

      return venueMetrics;
    } catch (error) {
      console.error('Error getting anonymous venue metrics:', error);
      return [];
    }
  }

  // Additional helper methods for system insights (simplified implementations)

  private calculateAverageVenuePerformance(metrics: AnonymousVenueMetrics[]): number {
    const scores = metrics.map(m => {
      const joinSuccessWeight = m.locationPerformance.joinSuccessRate * 0.4;
      const accuracyWeight = Math.max(0, 100 - m.locationPerformance.averageLocationAccuracy) * 0.3;
      const batteryWeight = Math.max(0, 10 - m.systemPerformance.batteryImpactScore) * 10 * 0.3;
      return joinSuccessWeight + accuracyWeight + batteryWeight;
    });

    return this.calculateMean(scores);
  }

  private findMostSuccessfulBusinessType(metrics: AnonymousVenueMetrics[]): string {
    const typePerformance: { [type: string]: number[] } = {};

    metrics.forEach(m => {
      if (!typePerformance[m.businessTypeCategory]) {
        typePerformance[m.businessTypeCategory] = [];
      }
      typePerformance[m.businessTypeCategory].push(m.locationPerformance.joinSuccessRate);
    });

    let bestType = 'food_service';
    let bestScore = 0;

    Object.entries(typePerformance).forEach(([type, scores]) => {
      const avgScore = this.calculateMean(scores);
      if (avgScore > bestScore) {
        bestScore = avgScore;
        bestType = type;
      }
    });

    return bestType;
  }

  private findMostCommonValue(values: number[]): number {
    const frequency: { [value: number]: number } = {};
    values.forEach(val => {
      frequency[val] = (frequency[val] || 0) + 1;
    });

    let mostCommon = values[0] || 60;
    let maxFreq = 0;

    Object.entries(frequency).forEach(([val, freq]) => {
      if (freq > maxFreq) {
        maxFreq = freq;
        mostCommon = parseInt(val, 10);
      }
    });

    return mostCommon;
  }

  // Simplified implementations of other analysis methods
  private findMostAccurateConditions(metrics: AnonymousVenueMetrics[]): any {
    // Find configuration with best location accuracy
    let bestConfig = null;
    let bestAccuracy = 999;

    metrics.forEach(m => {
      if (m.locationPerformance.averageLocationAccuracy < bestAccuracy) {
        bestAccuracy = m.locationPerformance.averageLocationAccuracy;
        bestConfig = {
          businessType: m.businessTypeCategory,
          radius: m.locationRadius,
          urbanRural: m.regionCluster.urbanRural,
          averageAccuracy: bestAccuracy
        };
      }
    });

    return bestConfig;
  }

  private identifyBatteryOptimizations(metrics: AnonymousVenueMetrics[]): any {
    const highBatteryVenues = metrics
      .filter(m => m.systemPerformance.batteryImpactScore > 7)
      .map(m => m.venueIdHash);

    return {
      highBatteryVenues,
      suggestedOptimizations: [
        'Increase ping intervals for stationary users',
        'Reduce location accuracy requirements',
        'Implement more aggressive background task throttling'
      ]
    };
  }

  private identifyCommonIssues(metrics: AnonymousVenueMetrics[]): any[] {
    // Simplified common issues identification
    return [
      {
        issue: 'Poor GPS accuracy in indoor venues',
        frequency: metrics.filter(m => 
          m.locationPerformance.averageLocationAccuracy > 100 && 
          m.businessTypeCategory === 'entertainment'
        ).length,
        suggestedSolution: 'Increase k-factor for indoor venues'
      },
      {
        issue: 'High battery usage in urban areas',
        frequency: metrics.filter(m => 
          m.systemPerformance.batteryImpactScore > 6 && 
          m.regionCluster.urbanRural === 'urban'
        ).length,
        suggestedSolution: 'Implement adaptive polling based on venue density'
      }
    ];
  }

  // More simplified helper methods
  private calculateSessionLengthsByType(metrics: AnonymousVenueMetrics[]): { [type: string]: number } {
    const result: { [type: string]: number } = {};
    const typeGroups: { [type: string]: number[] } = {};

    metrics.forEach(m => {
      if (!typeGroups[m.businessTypeCategory]) {
        typeGroups[m.businessTypeCategory] = [];
      }
      typeGroups[m.businessTypeCategory].push(m.sessionMetrics.averageSessionDuration);
    });

    Object.entries(typeGroups).forEach(([type, durations]) => {
      result[type] = this.calculateMean(durations);
    });

    return result;
  }

  private calculatePeakHoursByType(metrics: AnonymousVenueMetrics[]): { [type: string]: number } {
    const result: { [type: string]: number } = {};
    const typeGroups: { [type: string]: number[] } = {};

    metrics.forEach(m => {
      if (!typeGroups[m.businessTypeCategory]) {
        typeGroups[m.businessTypeCategory] = [];
      }
      typeGroups[m.businessTypeCategory].push(m.sessionMetrics.mostPopularHour);
    });

    Object.entries(typeGroups).forEach(([type, hours]) => {
      result[type] = Math.round(this.calculateMean(hours));
    });

    return result;
  }

  private calculateAccuracyByRegion(metrics: AnonymousVenueMetrics[]): { [region: string]: number } {
    const result: { [region: string]: number } = {};
    const regionGroups: { [region: string]: number[] } = {};

    metrics.forEach(m => {
      const region = `${m.regionCluster.countryCode}_${m.regionCluster.urbanRural}`;
      if (!regionGroups[region]) {
        regionGroups[region] = [];
      }
      regionGroups[region].push(m.locationPerformance.averageLocationAccuracy);
    });

    Object.entries(regionGroups).forEach(([region, accuracies]) => {
      result[region] = this.calculateMean(accuracies);
    });

    return result;
  }

  private calculateSuccessRatesByConditions(metrics: AnonymousVenueMetrics[]): any[] {
    return [
      {
        condition: 'Urban + Small Radius (<50m)',
        successRate: this.calculateMean(
          metrics
            .filter(m => m.regionCluster.urbanRural === 'urban' && m.locationRadius < 50)
            .map(m => m.locationPerformance.joinSuccessRate)
        )
      },
      {
        condition: 'Rural + Large Radius (>100m)',
        successRate: this.calculateMean(
          metrics
            .filter(m => m.regionCluster.urbanRural === 'rural' && m.locationRadius > 100)
            .map(m => m.locationPerformance.joinSuccessRate)
        )
      }
    ];
  }

  private predictOptimalRadius(metrics: AnonymousVenueMetrics[]): { [type: string]: number } {
    const result: { [type: string]: number } = {};
    const typeGroups: { [type: string]: { radius: number; success: number }[] } = {};

    metrics.forEach(m => {
      if (!typeGroups[m.businessTypeCategory]) {
        typeGroups[m.businessTypeCategory] = [];
      }
      typeGroups[m.businessTypeCategory].push({
        radius: m.locationRadius,
        success: m.locationPerformance.joinSuccessRate
      });
    });

    Object.entries(typeGroups).forEach(([type, data]) => {
      // Find radius with highest success rate
      let bestRadius = 60;
      let bestSuccess = 0;
      
      data.forEach(({ radius, success }) => {
        if (success > bestSuccess) {
          bestSuccess = success;
          bestRadius = radius;
        }
      });
      
      result[type] = bestRadius;
    });

    return result;
  }

  private predictOptimalKFactor(metrics: AnonymousVenueMetrics[]): { [region: string]: number } {
    const result: { [region: string]: number } = {};
    
    // Simplified k-factor prediction based on regional performance
    metrics.forEach(m => {
      const region = m.regionCluster.urbanRural;
      if (!result[region]) {
        result[region] = m.kFactor;
      }
    });

    return result;
  }

  private predictBatteryImpact(metrics: AnonymousVenueMetrics[]): any[] {
    return [
      {
        configuration: 'High Accuracy + Short Intervals',
        batteryScore: this.calculateMean(
          metrics
            .filter(m => m.locationRadius < 50)
            .map(m => m.systemPerformance.batteryImpactScore)
        )
      },
      {
        configuration: 'Balanced Accuracy + Medium Intervals',
        batteryScore: this.calculateMean(
          metrics
            .filter(m => m.locationRadius >= 50 && m.locationRadius <= 100)
            .map(m => m.systemPerformance.batteryImpactScore)
        )
      }
    ];
  }

  /**
   * Clear all anonymous data (for privacy compliance)
   */
  async clearAllAnonymousData(): Promise<void> {
    try {
      const allKeys = await AsyncStorageUtils.getAllKeys();
      const keysToDelete = allKeys.filter(key => 
        key.startsWith(ANONYMOUS_METRICS_PREFIX) ||
        key === SYSTEM_INSIGHTS_KEY ||
        key === AGGREGATION_METADATA_KEY ||
        key === LAST_AGGREGATION_KEY
      );

      for (const key of keysToDelete) {
        await AsyncStorageUtils.removeItem(key);
      }

      console.log(`Cleared ${keysToDelete.length} anonymous data items`);

    } catch (error) {
      console.error('Error clearing anonymous data:', error);
      throw error;
    }
  }
}