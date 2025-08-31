import { AsyncStorageUtils } from '../asyncStorageUtils';
import * as Sentry from '@sentry/react-native';

// Data management interfaces
export interface DailyEventAnalytics {
  eventId: string;
  venueId: string;
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  weekOfYear: number; // 1-53
  month: number; // 1-12
  year: number;
  
  // Session metrics
  sessionDuration: number; // Total event duration in seconds
  totalParticipants: number; // Unique participants
  peakParticipants: number;
  peakTime: string; // HH:mm when peak occurred
  averageDwell: number; // Average time per participant (seconds)
  
  // Engagement patterns
  joinsByHour: { [hour: string]: number }; // "19": 5, "20": 12
  dropoffsByHour: { [hour: string]: number };
  stateTransitions: {
    activeToPaused: number;
    pausedToActive: number;
    manualLeaves: number;
  };
  
  // Location insights (anonymized)
  locationAccuracy: {
    averageAccuracy: number; // meters
    lowAccuracyPings: number; // accuracy > 150m
    gpsFailures: number;
  };
  
  // Metadata
  createdAt: Date;
  dataVersion: string; // For schema evolution
}

export interface EventSession {
  eventId: string;
  venueId: string;
  date: string; // YYYY-MM-DD
  status: 'scheduled' | 'active' | 'ended';
  startTime: Date;
  endTime: Date;
  generatedFrom: 'recurring_schedule';
  
  // Live participants (cleared daily)
  participants: {
    [userId: string]: {
      joinedAt: Date;
      currentState: 'active' | 'paused';
      lastPingAt: Date;
      totalDuration: number; // seconds
      profileVisible: boolean;
    };
  };
  
  // Real-time metrics (cleared daily)
  liveMetrics: {
    currentActiveParticipants: number;
    currentPausedParticipants: number;
    peakActiveParticipants: number;
    peakTime: Date;
    totalJoins: number;
    totalPauses: number;
    totalDropoffs: number;
  };
}

export interface DataRetentionPolicy {
  personalDataRetentionDays: number; // 1 day per spec
  analyticsRetentionMonths: number; // 13 months
  sessionDataRetentionHours: number; // Event end + grace period
  locationDataRetentionHours: number; // 24 hours max
}

// Storage keys
const ANALYTICS_PREFIX = 'venue_analytics_';
const SESSION_PREFIX = 'venue_session_';
const RETENTION_POLICY_KEY = 'data_retention_policy';
const LAST_CLEANUP_KEY = 'last_data_cleanup';

export class DataManagementService {
  private static instance: DataManagementService;
  private retentionPolicy: DataRetentionPolicy;
  private isCleanupRunning = false;

  constructor() {
    this.retentionPolicy = {
      personalDataRetentionDays: 1, // 24 hours as per specification
      analyticsRetentionMonths: 13, // Keep analytics longer
      sessionDataRetentionHours: 3, // Event end + 3 hour grace period
      locationDataRetentionHours: 24 // Maximum location data retention
    };
  }

  static getInstance(): DataManagementService {
    if (!DataManagementService.instance) {
      DataManagementService.instance = new DataManagementService();
    }
    return DataManagementService.instance;
  }

  /**
   * Archive daily event session data to analytics
   * Called 15 minutes after event ends (as per specification)
   */
  async archiveDailySession(eventId: string, venueId: string, date: string): Promise<void> {
    try {
      console.log(`Archiving daily session for event ${eventId} on ${date}`);
      
      // Get current session data
      const sessionKey = `${SESSION_PREFIX}${eventId}_${date}`;
      const sessionData = await AsyncStorageUtils.getItem<EventSession>(sessionKey);
      
      if (!sessionData) {
        console.warn(`No session data found for ${eventId} on ${date}`);
        return;
      }

      // Generate anonymized analytics
      const analytics = await this.generateDailyAnalytics(sessionData);
      
      // Store analytics with timestamped key
      const analyticsKey = `${ANALYTICS_PREFIX}${venueId}_${date}`;
      await AsyncStorageUtils.setItem(analyticsKey, analytics);
      
      // Clear session data (personal data cleanup)
      await AsyncStorageUtils.removeItem(sessionKey);
      
      // Update aggregated metrics
      await this.updateAggregatedMetrics(venueId, analytics);
      
      console.log(`Daily session archived successfully for ${eventId}`);
      
      Sentry.addBreadcrumb({
        message: 'Daily session archived',
        data: {
          eventId,
          venueId,
          date,
          totalParticipants: analytics.totalParticipants,
          sessionDuration: analytics.sessionDuration
        },
        level: 'info'
      });

    } catch (error) {
      console.error('Error archiving daily session:', error);
      Sentry.captureException(error);
      throw error;
    }
  }

  /**
   * Generate anonymized daily analytics from session data
   */
  private async generateDailyAnalytics(session: EventSession): Promise<DailyEventAnalytics> {
    const date = new Date(session.date);
    const participants = Object.values(session.participants);
    
    // Calculate session duration
    const sessionDuration = session.endTime.getTime() - session.startTime.getTime();
    
    // Calculate average dwell time
    const totalDwellTime = participants.reduce((sum, p) => sum + p.totalDuration, 0);
    const averageDwell = participants.length > 0 ? totalDwellTime / participants.length : 0;
    
    // Generate hourly patterns (anonymized)
    const joinsByHour = this.generateHourlyPattern(participants, 'joinedAt');
    const dropoffsByHour = this.calculateDropoffsByHour(participants);
    
    // Calculate state transitions
    const stateTransitions = {
      activeToPaused: 0, // Would be calculated from state change logs
      pausedToActive: 0, // Would be calculated from state change logs  
      manualLeaves: 0    // Would be calculated from leave events
    };

    const analytics: DailyEventAnalytics = {
      eventId: session.eventId,
      venueId: session.venueId,
      date: session.date,
      dayOfWeek: date.getDay(),
      weekOfYear: this.getWeekOfYear(date),
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      
      sessionDuration: sessionDuration / 1000, // Convert to seconds
      totalParticipants: participants.length,
      peakParticipants: session.liveMetrics.peakActiveParticipants,
      peakTime: session.liveMetrics.peakTime.toTimeString().slice(0, 5), // HH:MM
      averageDwell,
      
      joinsByHour,
      dropoffsByHour,
      stateTransitions,
      
      locationAccuracy: {
        averageAccuracy: 50, // Mock - would be calculated from ping data
        lowAccuracyPings: 5,  // Mock - count of pings > 150m accuracy
        gpsFailures: 2        // Mock - count of failed location attempts
      },
      
      createdAt: new Date(),
      dataVersion: '1.0'
    };

    return analytics;
  }

  /**
   * Update aggregated metrics for venue
   */
  private async updateAggregatedMetrics(venueId: string, analytics: DailyEventAnalytics): Promise<void> {
    try {
      const aggregatedKey = `${ANALYTICS_PREFIX}${venueId}_aggregated`;
      
      // Get existing aggregated data
      let aggregated = await AsyncStorageUtils.getItem<{
        totalSessions: number;
        totalParticipants: number;
        averageSessionLength: number;
        bestPerformingDay: string;
        lastUpdated: Date;
      }>(aggregatedKey);

      if (!aggregated) {
        aggregated = {
          totalSessions: 0,
          totalParticipants: 0,
          averageSessionLength: 0,
          bestPerformingDay: this.getDayName(analytics.dayOfWeek),
          lastUpdated: new Date()
        };
      }

      // Update aggregated metrics
      aggregated.totalSessions += 1;
      aggregated.totalParticipants += analytics.totalParticipants;
      aggregated.averageSessionLength = 
        (aggregated.averageSessionLength * (aggregated.totalSessions - 1) + analytics.sessionDuration) / 
        aggregated.totalSessions;
      
      // Update best performing day if this day had more participants
      // This is simplified - in production, you'd track per-day averages
      aggregated.lastUpdated = new Date();

      // Save updated aggregated metrics
      await AsyncStorageUtils.setItem(aggregatedKey, aggregated);
      
    } catch (error) {
      console.error('Error updating aggregated metrics:', error);
      // Don't throw - this is not critical for archival process
    }
  }

  /**
   * Automated daily cleanup of expired data
   */
  async performDailyCleanup(): Promise<void> {
    if (this.isCleanupRunning) {
      console.log('Data cleanup already in progress');
      return;
    }

    try {
      this.isCleanupRunning = true;
      console.log('Starting automated daily data cleanup');

      const now = new Date();
      const cleanupResults = {
        expiredSessions: 0,
        expiredAnalytics: 0,
        locationDataCleared: 0,
        totalItems: 0
      };

      // Get all stored keys
      const allKeys = await AsyncStorageUtils.getAllKeys();
      
      for (const key of allKeys) {
        try {
          // Clean expired session data (personal data)
          if (key.startsWith(SESSION_PREFIX)) {
            if (await this.isSessionDataExpired(key, now)) {
              await AsyncStorageUtils.removeItem(key);
              cleanupResults.expiredSessions++;
            }
          }
          
          // Clean expired analytics data
          else if (key.startsWith(ANALYTICS_PREFIX)) {
            if (await this.isAnalyticsDataExpired(key, now)) {
              await AsyncStorageUtils.removeItem(key);
              cleanupResults.expiredAnalytics++;
            }
          }
          
          // Clean location-related data
          else if (this.isLocationDataKey(key)) {
            if (await this.isLocationDataExpired(key, now)) {
              await AsyncStorageUtils.removeItem(key);
              cleanupResults.locationDataCleared++;
            }
          }
          
          cleanupResults.totalItems++;
          
        } catch (itemError) {
          console.warn(`Error cleaning item ${key}:`, itemError);
          // Continue with next item
        }
      }

      // Update last cleanup timestamp
      await AsyncStorageUtils.setItem(LAST_CLEANUP_KEY, now.toISOString());
      
      console.log('Daily data cleanup completed:', cleanupResults);
      
      Sentry.addBreadcrumb({
        message: 'Automated data cleanup completed',
        data: cleanupResults,
        level: 'info'
      });

    } catch (error) {
      console.error('Error during daily cleanup:', error);
      Sentry.captureException(error);
    } finally {
      this.isCleanupRunning = false;
    }
  }

  /**
   * Schedule automatic cleanup (should be called on app start)
   */
  async scheduleAutomaticCleanup(): Promise<void> {
    try {
      const lastCleanup = await AsyncStorageUtils.getItem<string>(LAST_CLEANUP_KEY);
      const now = new Date();
      
      // Check if cleanup is needed (once per day)
      let needsCleanup = false;
      
      if (!lastCleanup) {
        needsCleanup = true;
      } else {
        const lastCleanupDate = new Date(lastCleanup);
        const hoursSinceCleanup = (now.getTime() - lastCleanupDate.getTime()) / (1000 * 60 * 60);
        needsCleanup = hoursSinceCleanup >= 24;
      }
      
      if (needsCleanup) {
        console.log('Scheduling automatic data cleanup');
        // Run cleanup asynchronously
        setTimeout(() => {
          this.performDailyCleanup();
        }, 5000); // Delay 5 seconds to not impact app startup
      }
      
    } catch (error) {
      console.error('Error scheduling automatic cleanup:', error);
    }
  }

  // Helper methods

  private async isSessionDataExpired(key: string, now: Date): Promise<boolean> {
    try {
      const session = await AsyncStorageUtils.getItem<EventSession>(key);
      if (!session || !session.endTime) return false;
      
      const hoursAfterEnd = (now.getTime() - new Date(session.endTime).getTime()) / (1000 * 60 * 60);
      return hoursAfterEnd > this.retentionPolicy.sessionDataRetentionHours;
      
    } catch {
      return true; // If we can't read it, consider it expired
    }
  }

  private async isAnalyticsDataExpired(key: string, now: Date): Promise<boolean> {
    try {
      // Don't expire aggregated data
      if (key.includes('_aggregated')) return false;
      
      const analytics = await AsyncStorageUtils.getItem<DailyEventAnalytics>(key);
      if (!analytics || !analytics.createdAt) return false;
      
      const monthsOld = (now.getTime() - new Date(analytics.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30);
      return monthsOld > this.retentionPolicy.analyticsRetentionMonths;
      
    } catch {
      return true;
    }
  }

  private isLocationDataKey(key: string): boolean {
    const locationKeys = [
      'venue_wifi_profiles',
      'recent_location_history',
      'last_known_location',
      'venue_ping_session',
      'location_cache'
    ];
    
    return locationKeys.some(pattern => key.includes(pattern));
  }

  private async isLocationDataExpired(key: string, now: Date): Promise<boolean> {
    try {
      const data = await AsyncStorageUtils.getItem<any>(key);
      if (!data) return true;
      
      // Check if data has timestamp
      let timestamp: number;
      if (data.timestamp) {
        timestamp = typeof data.timestamp === 'string' ? new Date(data.timestamp).getTime() : data.timestamp;
      } else if (data.lastUpdated) {
        timestamp = new Date(data.lastUpdated).getTime();
      } else if (data.createdAt) {
        timestamp = new Date(data.createdAt).getTime();
      } else {
        // If no timestamp, consider expired
        return true;
      }
      
      const hoursOld = (now.getTime() - timestamp) / (1000 * 60 * 60);
      return hoursOld > this.retentionPolicy.locationDataRetentionHours;
      
    } catch {
      return true;
    }
  }

  private generateHourlyPattern(participants: any[], dateField: string): { [hour: string]: number } {
    const hourly: { [hour: string]: number } = {};
    
    participants.forEach(participant => {
      const date = new Date(participant[dateField]);
      const hour = date.getHours().toString();
      hourly[hour] = (hourly[hour] || 0) + 1;
    });
    
    return hourly;
  }

  private calculateDropoffsByHour(participants: any[]): { [hour: string]: number } {
    // Mock implementation - in real app, this would analyze when users became inactive
    const hourly: { [hour: string]: number } = {};
    
    // Simulate some dropoffs
    hourly['22'] = Math.floor(participants.length * 0.3);
    hourly['23'] = Math.floor(participants.length * 0.4);
    hourly['0'] = Math.floor(participants.length * 0.2);
    
    return hourly;
  }

  private getWeekOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 1);
    const diff = date.getTime() - start.getTime();
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    return Math.ceil(diff / oneWeek);
  }

  private getDayName(dayOfWeek: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek] || 'Unknown';
  }

  /**
   * Get analytics for a specific date range
   */
  async getAnalyticsForDateRange(
    venueId: string, 
    startDate: string, 
    endDate: string
  ): Promise<DailyEventAnalytics[]> {
    try {
      const analytics: DailyEventAnalytics[] = [];
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Iterate through date range
      for (let date = start; date <= end; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split('T')[0];
        const key = `${ANALYTICS_PREFIX}${venueId}_${dateStr}`;
        
        const dayAnalytics = await AsyncStorageUtils.getItem<DailyEventAnalytics>(key);
        if (dayAnalytics) {
          analytics.push(dayAnalytics);
        }
      }
      
      return analytics.sort((a, b) => a.date.localeCompare(b.date));
      
    } catch (error) {
      console.error('Error getting analytics for date range:', error);
      return [];
    }
  }

  /**
   * Get aggregated metrics for venue
   */
  async getAggregatedMetrics(venueId: string): Promise<any> {
    try {
      const key = `${ANALYTICS_PREFIX}${venueId}_aggregated`;
      return await AsyncStorageUtils.getItem(key);
    } catch (error) {
      console.error('Error getting aggregated metrics:', error);
      return null;
    }
  }

  /**
   * Clear all data for privacy compliance (GDPR right to erasure)
   */
  async clearAllVenueData(venueId?: string): Promise<void> {
    try {
      const allKeys = await AsyncStorageUtils.getAllKeys();
      const keysToDelete = [];
      
      for (const key of allKeys) {
        if (venueId) {
          // Clear data for specific venue
          if (key.includes(venueId) && (key.startsWith(ANALYTICS_PREFIX) || key.startsWith(SESSION_PREFIX))) {
            keysToDelete.push(key);
          }
        } else {
          // Clear all venue-related data
          if (key.startsWith(ANALYTICS_PREFIX) || 
              key.startsWith(SESSION_PREFIX) ||
              this.isLocationDataKey(key)) {
            keysToDelete.push(key);
          }
        }
      }
      
      // Delete in batches
      for (const key of keysToDelete) {
        await AsyncStorageUtils.removeItem(key);
      }
      
      console.log(`Cleared ${keysToDelete.length} venue data items${venueId ? ` for venue ${venueId}` : ''}`);
      
    } catch (error) {
      console.error('Error clearing venue data:', error);
      throw error;
    }
  }
}