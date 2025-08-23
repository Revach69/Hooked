import { firebasePerformance } from './firebasePerformance';
import * as Sentry from '@sentry/react-native';

/**
 * Location Heatmap Data Types
 */
export interface HeatmapDataPoint {
  lat: number;
  lng: number;
  weight: number; // intensity value (0-1)
  timestamp: number;
  eventId: string;
  dataType: 'user_location' | 'venue_view' | 'venue_interaction' | 'user_dwell';
  metadata?: {
    userId?: string;
    sessionId?: string;
    venueId?: string;
    duration?: number;
    interactionType?: string;
  };
}

export interface HeatmapGrid {
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  gridSize: number; // meters per grid cell
  cells: HeatmapCell[][];
  aggregationPeriod: 'hourly' | 'daily' | 'weekly';
  lastUpdated: number;
}

export interface HeatmapCell {
  lat: number;
  lng: number;
  intensity: number; // aggregated weight
  count: number; // number of data points
  activities: {
    userViews: number;
    venueInteractions: number;
    dwellTime: number; // total dwell time in minutes
    uniqueUsers: Set<string>;
    uniqueVenues: Set<string>;
  };
  trends: {
    hourlyPattern: number[]; // 24 hour intensity pattern
    weeklyPattern: number[]; // 7 day intensity pattern
    peakHours: number[];
    growthRate: number; // week-over-week change
  };
}

export interface PopularZone {
  id: string;
  name: string;
  center: { lat: number; lng: number };
  radius: number; // meters
  averageIntensity: number;
  peakIntensity: number;
  totalInteractions: number;
  uniqueUsers: number;
  topVenues: Array<{
    venueId: string;
    venueName: string;
    interactionCount: number;
  }>;
  characteristics: {
    primaryActivity: 'viewing' | 'interacting' | 'dwelling';
    timePattern: 'morning' | 'afternoon' | 'evening' | 'night' | 'all_day';
    userDemographic: 'mixed' | 'young' | 'mature';
    businessPotential: 'high' | 'medium' | 'low';
  };
}

/**
 * Location Heatmap Analytics Service
 */
class LocationHeatmapService {
  private heatmapData: Map<string, HeatmapDataPoint[]> = new Map();
  private gridCache: Map<string, HeatmapGrid> = new Map();
  private popularZones: PopularZone[] = [];
  private dataBuffer: HeatmapDataPoint[] = [];
  private aggregationTimer: NodeJS.Timeout | null = null;
  
  private readonly GRID_SIZE_METERS = 50; // 50m x 50m grid cells
  private readonly BUFFER_SIZE = 100; // Process in batches of 100 points
  private readonly AGGREGATION_INTERVAL = 60000; // 1 minute

  constructor() {
    this.startAggregationTimer();
  }

  /**
   * Add location data point for heatmap
   */
  addDataPoint(
    lat: number,
    lng: number,
    weight: number,
    dataType: HeatmapDataPoint['dataType'],
    eventId: string,
    metadata?: HeatmapDataPoint['metadata']
  ): void {
    const dataPoint: HeatmapDataPoint = {
      lat,
      lng,
      weight: Math.max(0, Math.min(1, weight)), // Ensure 0-1 range
      timestamp: Date.now(),
      eventId,
      dataType,
      metadata
    };

    this.dataBuffer.push(dataPoint);

    // Process buffer if full
    if (this.dataBuffer.length >= this.BUFFER_SIZE) {
      this.processDataBuffer();
    }
  }

  /**
   * Track user location for heatmap
   */
  async trackUserLocation(
    lat: number,
    lng: number,
    sessionId: string,
    eventId: string,
    userId?: string,
    dwellTimeMs?: number
  ): Promise<void> {
    const weight = dwellTimeMs ? Math.min(1, dwellTimeMs / 300000) : 0.1; // Max weight at 5 minutes

    this.addDataPoint(lat, lng, weight, 'user_location', eventId, {
      userId,
      sessionId,
      duration: dwellTimeMs
    });

    // Track user dwell time if significant
    if (dwellTimeMs && dwellTimeMs > 60000) { // More than 1 minute
      this.addDataPoint(lat, lng, weight * 2, 'user_dwell', eventId, {
        userId,
        sessionId,
        duration: dwellTimeMs
      });
    }
  }

  /**
   * Track venue interaction for heatmap
   */
  async trackVenueInteraction(
    venueLat: number,
    venueLng: number,
    venueId: string,
    interactionType: string,
    sessionId: string,
    eventId: string,
    userId?: string
  ): Promise<void> {
    // Higher weight for venue interactions
    const weight = interactionType === 'navigation' ? 1.0 : 
                   interactionType === 'detail_view' ? 0.8 : 
                   interactionType === 'tap' ? 0.6 : 0.4;

    this.addDataPoint(venueLat, venueLng, weight, 'venue_interaction', eventId, {
      userId,
      sessionId,
      venueId,
      interactionType
    });
  }

  /**
   * Track venue views for heatmap
   */
  async trackVenueView(
    venueLat: number,
    venueLng: number,
    venueId: string,
    viewDurationMs: number,
    sessionId: string,
    eventId: string,
    userId?: string
  ): Promise<void> {
    // Weight based on view duration
    const weight = Math.min(0.8, viewDurationMs / 30000); // Max weight at 30 seconds

    this.addDataPoint(venueLat, venueLng, weight, 'venue_view', eventId, {
      userId,
      sessionId,
      venueId,
      duration: viewDurationMs
    });
  }

  /**
   * Generate heatmap grid for a specific area
   */
  async generateHeatmapGrid(
    bounds: HeatmapGrid['bounds'],
    aggregationPeriod: 'hourly' | 'daily' | 'weekly' = 'daily'
  ): Promise<HeatmapGrid> {
    return await firebasePerformance.trace('generate_heatmap_grid', async () => {
      const cacheKey = `${bounds.north}_${bounds.south}_${bounds.east}_${bounds.west}_${aggregationPeriod}`;
      
      // Check cache first
      const cached = this.gridCache.get(cacheKey);
      if (cached && (Date.now() - cached.lastUpdated) < this.getAggregationCacheTime(aggregationPeriod)) {
        return cached;
      }

      // Calculate grid dimensions
      const latRange = bounds.north - bounds.south;
      const lngRange = bounds.east - bounds.west;
      const gridRows = Math.ceil(latRange * 111000 / this.GRID_SIZE_METERS); // ~111km per degree lat
      const gridCols = Math.ceil(lngRange * 111000 / this.GRID_SIZE_METERS);

      // Initialize grid
      const cells: HeatmapCell[][] = [];
      for (let row = 0; row < gridRows; row++) {
        cells[row] = [];
        for (let col = 0; col < gridCols; col++) {
          const cellLat = bounds.south + (row / gridRows) * latRange;
          const cellLng = bounds.west + (col / gridCols) * lngRange;
          
          cells[row][col] = {
            lat: cellLat,
            lng: cellLng,
            intensity: 0,
            count: 0,
            activities: {
              userViews: 0,
              venueInteractions: 0,
              dwellTime: 0,
              uniqueUsers: new Set(),
              uniqueVenues: new Set()
            },
            trends: {
              hourlyPattern: new Array(24).fill(0),
              weeklyPattern: new Array(7).fill(0),
              peakHours: [],
              growthRate: 0
            }
          };
        }
      }

      // Aggregate data points into grid
      const timeWindow = this.getTimeWindow(aggregationPeriod);
      const relevantData = this.getDataInTimeWindow(timeWindow, bounds);
      
      for (const dataPoint of relevantData) {
        const row = Math.floor(((dataPoint.lat - bounds.south) / latRange) * gridRows);
        const col = Math.floor(((dataPoint.lng - bounds.west) / lngRange) * gridCols);
        
        if (row >= 0 && row < gridRows && col >= 0 && col < gridCols) {
          const cell = cells[row][col];
          cell.intensity += dataPoint.weight;
          cell.count++;

          // Update activities
          if (dataPoint.dataType === 'venue_view') {
            cell.activities.userViews++;
          } else if (dataPoint.dataType === 'venue_interaction') {
            cell.activities.venueInteractions++;
          } else if (dataPoint.dataType === 'user_dwell') {
            cell.activities.dwellTime += dataPoint.metadata?.duration || 0;
          }

          // Track unique users and venues
          if (dataPoint.metadata?.userId) {
            cell.activities.uniqueUsers.add(dataPoint.metadata.userId);
          }
          if (dataPoint.metadata?.venueId) {
            cell.activities.uniqueVenues.add(dataPoint.metadata.venueId);
          }

          // Update hourly pattern
          const hour = new Date(dataPoint.timestamp).getHours();
          cell.trends.hourlyPattern[hour]++;

          // Update weekly pattern
          const dayOfWeek = new Date(dataPoint.timestamp).getDay();
          cell.trends.weeklyPattern[dayOfWeek]++;
        }
      }

      // Normalize intensities and calculate trends
      let maxIntensity = 0;
      for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
          const cell = cells[row][col];
          if (cell.count > 0) {
            cell.intensity = cell.intensity / cell.count; // Average intensity
            maxIntensity = Math.max(maxIntensity, cell.intensity);
          }
        }
      }

      // Normalize all intensities to 0-1 range
      for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
          const cell = cells[row][col];
          if (maxIntensity > 0) {
            cell.intensity = cell.intensity / maxIntensity;
          }

          // Calculate peak hours
          const hourlyMax = Math.max(...cell.trends.hourlyPattern);
          cell.trends.peakHours = cell.trends.hourlyPattern
            .map((value, index) => ({ value, hour: index }))
            .filter(item => item.value >= hourlyMax * 0.8)
            .map(item => item.hour);
        }
      }

      const grid: HeatmapGrid = {
        bounds,
        gridSize: this.GRID_SIZE_METERS,
        cells,
        aggregationPeriod,
        lastUpdated: Date.now()
      };

      // Cache the result
      this.gridCache.set(cacheKey, grid);

      return grid;
    });
  }

  /**
   * Identify popular zones from heatmap data
   */
  async identifyPopularZones(
    bounds: HeatmapGrid['bounds'],
    minIntensityThreshold: number = 0.3
  ): Promise<PopularZone[]> {
    return await firebasePerformance.trace('identify_popular_zones', async () => {
      const grid = await this.generateHeatmapGrid(bounds);
      const hotspots: PopularZone[] = [];
      const processedCells = new Set<string>();

      for (let row = 0; row < grid.cells.length; row++) {
        for (let col = 0; col < grid.cells[row].length; col++) {
          const cell = grid.cells[row][col];
          const cellKey = `${row}_${col}`;
          
          if (cell.intensity >= minIntensityThreshold && !processedCells.has(cellKey)) {
            const zone = await this.createPopularZone(grid, row, col, processedCells);
            if (zone.totalInteractions > 10) { // Minimum threshold for significance
              hotspots.push(zone);
            }
          }
        }
      }

      // Sort by intensity and limit to top zones
      const topZones = hotspots
        .sort((a, b) => b.averageIntensity - a.averageIntensity)
        .slice(0, 20);

      this.popularZones = topZones;
      return topZones;
    });
  }

  /**
   * Get location analytics summary
   */
  async getLocationAnalytics(
    bounds: HeatmapGrid['bounds'],
    timeframe: 'day' | 'week' | 'month' = 'week'
  ): Promise<{
    totalDataPoints: number;
    averageIntensity: number;
    hotspotCount: number;
    topZones: PopularZone[];
    activityPatterns: {
      peakHours: number[];
      peakDays: string[];
      activityDistribution: Record<string, number>;
    };
    insights: string[];
  }> {
    const grid = await this.generateHeatmapGrid(bounds, timeframe === 'day' ? 'hourly' : 'daily');
    const zones = await this.identifyPopularZones(bounds);

    let totalDataPoints = 0;
    let totalIntensity = 0;
    const hourlyActivity = new Array(24).fill(0);
    const weeklyActivity = new Array(7).fill(0);
    const activityTypes = { viewing: 0, interacting: 0, dwelling: 0 };

    // Aggregate statistics
    for (const row of grid.cells) {
      for (const cell of row) {
        if (cell.count > 0) {
          totalDataPoints += cell.count;
          totalIntensity += cell.intensity;
          
          // Aggregate patterns
          for (let i = 0; i < 24; i++) {
            hourlyActivity[i] += cell.trends.hourlyPattern[i];
          }
          for (let i = 0; i < 7; i++) {
            weeklyActivity[i] += cell.trends.weeklyPattern[i];
          }

          // Activity distribution
          activityTypes.viewing += cell.activities.userViews;
          activityTypes.interacting += cell.activities.venueInteractions;
          activityTypes.dwelling += cell.activities.dwellTime > 0 ? 1 : 0;
        }
      }
    }

    const averageIntensity = totalDataPoints > 0 ? totalIntensity / totalDataPoints : 0;

    // Find peak hours and days
    const peakHours = hourlyActivity
      .map((value, index) => ({ value, hour: index }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)
      .map(item => item.hour);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const peakDays = weeklyActivity
      .map((value, index) => ({ value, day: dayNames[index] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 2)
      .map(item => item.day);

    // Generate insights
    const insights: string[] = [];
    if (zones.length > 5) {
      insights.push(`High venue density area with ${zones.length} popular zones`);
    }
    if (peakHours.includes(12) || peakHours.includes(13)) {
      insights.push('Strong lunch hour activity detected');
    }
    if (peakHours.some(hour => hour >= 17 && hour <= 20)) {
      insights.push('Evening activity peak indicates social venue usage');
    }
    if (weeklyActivity[5] > weeklyActivity[1] * 1.5) {
      insights.push('Weekend activity significantly higher than weekdays');
    }

    return {
      totalDataPoints,
      averageIntensity,
      hotspotCount: zones.length,
      topZones: zones.slice(0, 5),
      activityPatterns: {
        peakHours,
        peakDays,
        activityDistribution: {
          viewing: (activityTypes.viewing / totalDataPoints) * 100,
          interacting: (activityTypes.interacting / totalDataPoints) * 100,
          dwelling: (activityTypes.dwelling / totalDataPoints) * 100
        }
      },
      insights
    };
  }

  /**
   * Process data buffer
   */
  private processDataBuffer(): void {
    if (this.dataBuffer.length === 0) return;

    const bufferData = [...this.dataBuffer];
    this.dataBuffer = [];

    // Group by event ID for efficient processing
    for (const dataPoint of bufferData) {
      const eventData = this.heatmapData.get(dataPoint.eventId) || [];
      eventData.push(dataPoint);
      this.heatmapData.set(dataPoint.eventId, eventData);
    }

    console.log(`Processed ${bufferData.length} heatmap data points`);
  }

  /**
   * Create popular zone from hotspot cell
   */
  private async createPopularZone(
    grid: HeatmapGrid,
    startRow: number,
    startCol: number,
    processedCells: Set<string>
  ): Promise<PopularZone> {
    const zoneCells: HeatmapCell[] = [];
    const cellsToProcess = [[startRow, startCol]];
    const threshold = grid.cells[startRow][startCol].intensity * 0.7;

    // Find connected high-intensity cells (flood fill algorithm)
    while (cellsToProcess.length > 0) {
      const [row, col] = cellsToProcess.pop()!;
      const cellKey = `${row}_${col}`;

      if (processedCells.has(cellKey)) continue;
      if (row < 0 || row >= grid.cells.length || col < 0 || col >= grid.cells[row].length) continue;
      
      const cell = grid.cells[row][col];
      if (cell.intensity < threshold) continue;

      processedCells.add(cellKey);
      zoneCells.push(cell);

      // Add adjacent cells
      for (const [dr, dc] of [[-1,0], [1,0], [0,-1], [0,1], [-1,-1], [-1,1], [1,-1], [1,1]]) {
        cellsToProcess.push([row + dr, col + dc]);
      }
    }

    // Calculate zone properties
    const totalIntensity = zoneCells.reduce((sum, cell) => sum + cell.intensity, 0);
    const totalInteractions = zoneCells.reduce((sum, cell) => sum + cell.activities.venueInteractions, 0);
    const allUniqueUsers = new Set<string>();
    const venueInteractions = new Map<string, number>();

    let centerLat = 0;
    let centerLng = 0;
    let maxRadius = 0;

    for (const cell of zoneCells) {
      centerLat += cell.lat;
      centerLng += cell.lng;
      
      // Merge unique users
      cell.activities.uniqueUsers.forEach(user => allUniqueUsers.add(user));
      
      // Track venue interactions
      cell.activities.uniqueVenues.forEach(venue => {
        const currentCount = venueInteractions.get(venue) || 0;
        venueInteractions.set(venue, currentCount + cell.activities.venueInteractions);
      });
    }

    centerLat /= zoneCells.length;
    centerLng /= zoneCells.length;

    // Calculate radius (distance to farthest cell)
    for (const cell of zoneCells) {
      const distance = this.calculateDistance(centerLat, centerLng, cell.lat, cell.lng);
      maxRadius = Math.max(maxRadius, distance);
    }

    // Determine zone characteristics
    const primaryActivity = this.determinePrimaryActivity(zoneCells);
    const timePattern = this.determineTimePattern(zoneCells);

    const zone: PopularZone = {
      id: `zone_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: `Popular Zone ${Math.round(centerLat * 1000) / 1000}, ${Math.round(centerLng * 1000) / 1000}`,
      center: { lat: centerLat, lng: centerLng },
      radius: maxRadius,
      averageIntensity: totalIntensity / zoneCells.length,
      peakIntensity: Math.max(...zoneCells.map(cell => cell.intensity)),
      totalInteractions,
      uniqueUsers: allUniqueUsers.size,
      topVenues: Array.from(venueInteractions.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([venueId, count]) => ({
          venueId,
          venueName: `Venue ${venueId}`, // Would be resolved from venue data
          interactionCount: count
        })),
      characteristics: {
        primaryActivity,
        timePattern,
        userDemographic: 'mixed', // Would be determined from user data
        businessPotential: totalInteractions > 50 ? 'high' : totalInteractions > 20 ? 'medium' : 'low'
      }
    };

    return zone;
  }

  /**
   * Helper methods
   */
  private getAggregationCacheTime(period: 'hourly' | 'daily' | 'weekly'): number {
    return period === 'hourly' ? 3600000 : period === 'daily' ? 86400000 : 604800000; // 1hr, 1day, 1week
  }

  private getTimeWindow(period: 'hourly' | 'daily' | 'weekly'): { start: number; end: number } {
    const now = Date.now();
    const periodMs = period === 'hourly' ? 3600000 : period === 'daily' ? 86400000 : 604800000;
    return { start: now - periodMs, end: now };
  }

  private getDataInTimeWindow(timeWindow: { start: number; end: number }, bounds: HeatmapGrid['bounds']): HeatmapDataPoint[] {
    const result: HeatmapDataPoint[] = [];
    
    for (const eventData of this.heatmapData.values()) {
      for (const dataPoint of eventData) {
        if (dataPoint.timestamp >= timeWindow.start && 
            dataPoint.timestamp <= timeWindow.end &&
            dataPoint.lat >= bounds.south && 
            dataPoint.lat <= bounds.north &&
            dataPoint.lng >= bounds.west && 
            dataPoint.lng <= bounds.east) {
          result.push(dataPoint);
        }
      }
    }
    
    return result;
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

  private determinePrimaryActivity(cells: HeatmapCell[]): 'viewing' | 'interacting' | 'dwelling' {
    let totalViews = 0;
    let totalInteractions = 0;
    let totalDwelling = 0;

    for (const cell of cells) {
      totalViews += cell.activities.userViews;
      totalInteractions += cell.activities.venueInteractions;
      totalDwelling += cell.activities.dwellTime > 0 ? 1 : 0;
    }

    if (totalInteractions > totalViews && totalInteractions > totalDwelling) return 'interacting';
    if (totalDwelling > totalViews && totalDwelling > totalInteractions) return 'dwelling';
    return 'viewing';
  }

  private determineTimePattern(cells: HeatmapCell[]): 'morning' | 'afternoon' | 'evening' | 'night' | 'all_day' {
    const hourlyTotals = new Array(24).fill(0);
    
    for (const cell of cells) {
      for (let i = 0; i < 24; i++) {
        hourlyTotals[i] += cell.trends.hourlyPattern[i];
      }
    }

    const morning = hourlyTotals.slice(6, 12).reduce((sum, val) => sum + val, 0);
    const afternoon = hourlyTotals.slice(12, 17).reduce((sum, val) => sum + val, 0);
    const evening = hourlyTotals.slice(17, 22).reduce((sum, val) => sum + val, 0);
    const night = hourlyTotals.slice(22).concat(hourlyTotals.slice(0, 6)).reduce((sum, val) => sum + val, 0);

    const total = morning + afternoon + evening + night;
    if (total === 0) return 'all_day';

    const maxValue = Math.max(morning, afternoon, evening, night);
    if (maxValue / total < 0.4) return 'all_day'; // No clear peak

    if (maxValue === morning) return 'morning';
    if (maxValue === afternoon) return 'afternoon';
    if (maxValue === evening) return 'evening';
    return 'night';
  }

  private startAggregationTimer(): void {
    this.aggregationTimer = setInterval(() => {
      this.processDataBuffer();
    }, this.AGGREGATION_INTERVAL);
  }

  /**
   * Stop service and cleanup
   */
  stopService(): void {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
      this.aggregationTimer = null;
    }
    
    // Process any remaining data
    this.processDataBuffer();
    
    this.heatmapData.clear();
    this.gridCache.clear();
    this.popularZones = [];
  }
}

// Export singleton instance
export const locationHeatmapService = new LocationHeatmapService();

// Export convenience functions
export const trackUserLocation = (
  lat: number,
  lng: number,
  sessionId: string,
  eventId: string,
  userId?: string,
  dwellTimeMs?: number
) => locationHeatmapService.trackUserLocation(lat, lng, sessionId, eventId, userId, dwellTimeMs);

export const trackVenueInteraction = (
  venueLat: number,
  venueLng: number,
  venueId: string,
  interactionType: string,
  sessionId: string,
  eventId: string,
  userId?: string
) => locationHeatmapService.trackVenueInteraction(venueLat, venueLng, venueId, interactionType, sessionId, eventId, userId);

export const generateHeatmapGrid = (
  bounds: HeatmapGrid['bounds'],
  aggregationPeriod: 'hourly' | 'daily' | 'weekly' = 'daily'
) => locationHeatmapService.generateHeatmapGrid(bounds, aggregationPeriod);

export const getLocationAnalytics = (
  bounds: HeatmapGrid['bounds'],
  timeframe: 'day' | 'week' | 'month' = 'week'
) => locationHeatmapService.getLocationAnalytics(bounds, timeframe);

export default locationHeatmapService;