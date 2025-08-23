import { firebasePerformance } from './firebasePerformance';
import { usePerformanceMonitoring } from './hooks/usePerformanceMonitoring';
import * as Sentry from '@sentry/react-native';

/**
 * Map Performance Monitoring Types
 */
export interface MapLoadMetric {
  type: 'map_load';
  timestamp: number;
  eventId: string;
  sessionId: string;
  loadTimeMs: number;
  mapProvider: 'mapbox' | 'google' | 'apple';
  tileLoadCount: number;
  initialZoom: number;
  initialCenter: { lat: number; lng: number };
  success: boolean;
  errorDetails?: {
    code: string;
    message: string;
    stack?: string;
  };
  networkCondition: 'fast' | 'slow' | 'offline';
  devicePerformance: {
    memoryUsage: number; // in MB
    batteryLevel?: number;
    deviceModel?: string;
    osVersion?: string;
  };
}

export interface MapRenderMetric {
  type: 'map_render' | 'marker_render' | 'tile_render';
  timestamp: number;
  eventId: string;
  sessionId: string;
  renderTimeMs: number;
  itemCount: number; // number of markers, tiles, etc.
  frameRate?: number;
  memoryDelta: number; // memory change in MB
  success: boolean;
  optimizationUsed: string[]; // clustering, virtualization, etc.
}

export interface MapInteractionPerformance {
  type: 'interaction_performance';
  timestamp: number;
  eventId: string;
  sessionId: string;
  interactionType: 'zoom' | 'pan' | 'tap' | 'gesture';
  responseTimeMs: number;
  inputLagMs?: number;
  animationFrameDrops?: number;
  smooth: boolean; // whether interaction felt smooth to user
  gestureComplexity: 'simple' | 'complex'; // single vs multi-touch
}

export interface MapAPIPerformance {
  type: 'api_performance';
  timestamp: number;
  eventId: string;
  sessionId: string;
  apiCall: 'venue_search' | 'tile_fetch' | 'geocoding' | 'directions';
  url: string;
  method: string;
  requestSize?: number;
  responseSize?: number;
  latencyMs: number;
  dnsLookupMs?: number;
  connectionTimeMs?: number;
  success: boolean;
  httpStatus?: number;
  retryCount: number;
  cacheHit: boolean;
  rateLimitHit?: boolean;
}

export interface MapResourceMetric {
  type: 'resource_usage';
  timestamp: number;
  eventId: string;
  sessionId: string;
  resourceType: 'memory' | 'cpu' | 'gpu' | 'network' | 'battery';
  usage: number;
  limit?: number;
  peak: number;
  average: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  warnings: string[];
}

export type MapPerformanceEvent = 
  | MapLoadMetric 
  | MapRenderMetric 
  | MapInteractionPerformance 
  | MapAPIPerformance 
  | MapResourceMetric;

/**
 * Map Performance Monitor
 */
class MapPerformanceMonitor {
  private performanceObserver: PerformanceObserver | null = null;
  private renderMetrics: Map<string, number> = new Map();
  private apiMetrics: Map<string, { start: number; url: string; method: string }> = new Map();
  private resourceMonitorInterval: NodeJS.Timeout | null = null;
  private frameRateMonitor: { frames: number; lastTime: number } = { frames: 0, lastTime: 0 };
  
  private currentEventId: string | null = null;
  private currentSessionId: string | null = null;

  /**
   * Initialize performance monitoring for map
   */
  initializeMonitoring(eventId: string, sessionId: string): void {
    this.currentEventId = eventId;
    this.currentSessionId = sessionId;

    this.startResourceMonitoring();
    this.setupPerformanceObserver();
    this.startFrameRateMonitoring();

    Sentry.addBreadcrumb({
      message: 'Map performance monitoring initialized',
      level: 'info',
      category: 'map_performance',
      data: { eventId, sessionId }
    });
  }

  /**
   * Track map loading performance
   */
  async trackMapLoad(
    provider: 'mapbox' | 'google' | 'apple',
    initialZoom: number,
    initialCenter: { lat: number; lng: number },
    loadStartTime: number,
    success: boolean,
    errorDetails?: MapLoadMetric['errorDetails']
  ): Promise<void> {
    if (!this.currentEventId || !this.currentSessionId) return;

    const loadTimeMs = Date.now() - loadStartTime;
    const networkCondition = await this.detectNetworkCondition();
    const devicePerformance = await this.getDevicePerformance();

    const loadMetric: MapLoadMetric = {
      type: 'map_load',
      timestamp: Date.now(),
      eventId: this.currentEventId,
      sessionId: this.currentSessionId,
      loadTimeMs,
      mapProvider: provider,
      tileLoadCount: 0, // Would be provided by map implementation
      initialZoom,
      initialCenter,
      success,
      errorDetails,
      networkCondition,
      devicePerformance
    };

    await this.trackPerformanceEvent(loadMetric);

    // Set performance alert if load time is too high
    if (loadTimeMs > 5000) {
      Sentry.addBreadcrumb({
        message: 'Slow map load detected',
        level: 'warning',
        category: 'map_performance',
        data: { loadTimeMs, provider }
      });
    }
  }

  /**
   * Track rendering performance
   */
  async trackRenderPerformance(
    renderType: MapRenderMetric['type'],
    itemCount: number,
    renderStartTime: number,
    optimizationUsed: string[] = [],
    success: boolean = true
  ): Promise<void> {
    if (!this.currentEventId || !this.currentSessionId) return;

    const renderTimeMs = Date.now() - renderStartTime;
    const memoryUsage = await this.getMemoryUsage();
    const previousMemory = this.renderMetrics.get('lastMemory') || memoryUsage;
    const memoryDelta = memoryUsage - previousMemory;

    this.renderMetrics.set('lastMemory', memoryUsage);

    const renderMetric: MapRenderMetric = {
      type: renderType,
      timestamp: Date.now(),
      eventId: this.currentEventId,
      sessionId: this.currentSessionId,
      renderTimeMs,
      itemCount,
      frameRate: this.calculateCurrentFrameRate(),
      memoryDelta,
      success,
      optimizationUsed
    };

    await this.trackPerformanceEvent(renderMetric);

    // Performance trace for render operations
    await firebasePerformance.trace(`map_render_${renderType}`, async () => {
      console.log(`${renderType} completed: ${itemCount} items in ${renderTimeMs}ms`);
    });
  }

  /**
   * Track map interaction performance
   */
  async trackInteractionPerformance(
    interactionType: MapInteractionPerformance['interactionType'],
    interactionStartTime: number,
    gestureComplexity: 'simple' | 'complex' = 'simple'
  ): Promise<void> {
    if (!this.currentEventId || !this.currentSessionId) return;

    const responseTimeMs = Date.now() - interactionStartTime;
    const smooth = responseTimeMs < 16; // 60fps threshold

    const interactionMetric: MapInteractionPerformance = {
      type: 'interaction_performance',
      timestamp: Date.now(),
      eventId: this.currentEventId,
      sessionId: this.currentSessionId,
      interactionType,
      responseTimeMs,
      smooth,
      gestureComplexity
    };

    await this.trackPerformanceEvent(interactionMetric);

    // Track poor interaction performance
    if (!smooth) {
      Sentry.addBreadcrumb({
        message: 'Poor interaction performance detected',
        level: 'warning',
        category: 'map_interaction',
        data: { interactionType, responseTimeMs }
      });
    }
  }

  /**
   * Track API call performance
   */
  async trackAPIPerformance(
    apiCall: MapAPIPerformance['apiCall'],
    url: string,
    method: string,
    success: boolean,
    httpStatus?: number,
    requestSize?: number,
    responseSize?: number,
    cacheHit: boolean = false,
    retryCount: number = 0
  ): Promise<void> {
    const callKey = `${apiCall}_${Date.now()}`;
    const callData = this.apiMetrics.get(callKey);
    
    if (!callData || !this.currentEventId || !this.currentSessionId) return;

    const latencyMs = Date.now() - callData.start;

    const apiMetric: MapAPIPerformance = {
      type: 'api_performance',
      timestamp: Date.now(),
      eventId: this.currentEventId,
      sessionId: this.currentSessionId,
      apiCall,
      url,
      method,
      requestSize,
      responseSize,
      latencyMs,
      success,
      httpStatus,
      retryCount,
      cacheHit
    };

    await this.trackPerformanceEvent(apiMetric);

    // Clean up tracking data
    this.apiMetrics.delete(callKey);

    // Performance trace for API calls
    await firebasePerformance.monitorNetworkRequest(url, method, async () => {
      console.log(`API call ${apiCall} completed in ${latencyMs}ms`);
    });
  }

  /**
   * Start API call tracking
   */
  startAPICall(apiCall: MapAPIPerformance['apiCall'], url: string, method: string): string {
    const callKey = `${apiCall}_${Date.now()}`;
    this.apiMetrics.set(callKey, {
      start: Date.now(),
      url,
      method
    });
    return callKey;
  }

  /**
   * Monitor resource usage
   */
  private startResourceMonitoring(): void {
    if (this.resourceMonitorInterval) {
      clearInterval(this.resourceMonitorInterval);
    }

    this.resourceMonitorInterval = setInterval(async () => {
      await this.trackResourceUsage();
    }, 10000); // Every 10 seconds
  }

  /**
   * Track current resource usage
   */
  private async trackResourceUsage(): Promise<void> {
    if (!this.currentEventId || !this.currentSessionId) return;

    const memoryUsage = await this.getMemoryUsage();
    const cpuUsage = await this.getCPUUsage();

    // Track memory usage
    const memoryMetric: MapResourceMetric = {
      type: 'resource_usage',
      timestamp: Date.now(),
      eventId: this.currentEventId,
      sessionId: this.currentSessionId,
      resourceType: 'memory',
      usage: memoryUsage,
      peak: Math.max(memoryUsage, this.renderMetrics.get('peakMemory') || 0),
      average: memoryUsage, // Would be calculated from historical data
      trend: 'stable', // Would be determined from recent measurements
      warnings: memoryUsage > 500 ? ['High memory usage detected'] : []
    };

    this.renderMetrics.set('peakMemory', memoryMetric.peak);
    await this.trackPerformanceEvent(memoryMetric);

    // Track CPU usage if available
    if (cpuUsage !== null) {
      const cpuMetric: MapResourceMetric = {
        type: 'resource_usage',
        timestamp: Date.now(),
        eventId: this.currentEventId,
        sessionId: this.currentSessionId,
        resourceType: 'cpu',
        usage: cpuUsage,
        peak: Math.max(cpuUsage, this.renderMetrics.get('peakCPU') || 0),
        average: cpuUsage,
        trend: 'stable',
        warnings: cpuUsage > 80 ? ['High CPU usage detected'] : []
      };

      this.renderMetrics.set('peakCPU', cpuMetric.peak);
      await this.trackPerformanceEvent(cpuMetric);
    }
  }

  /**
   * Setup performance observer for detailed metrics
   */
  private setupPerformanceObserver(): void {
    if (typeof PerformanceObserver === 'undefined') return;

    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'measure' && entry.name.includes('map')) {
            console.log(`Performance measure: ${entry.name} took ${entry.duration}ms`);
          }
        });
      });

      this.performanceObserver.observe({ entryTypes: ['measure', 'navigation'] });
    } catch (error) {
      console.warn('Performance Observer not available:', error);
    }
  }

  /**
   * Monitor frame rate
   */
  private startFrameRateMonitoring(): void {
    const updateFrameRate = () => {
      this.frameRateMonitor.frames++;
      const now = Date.now();
      
      if (now - this.frameRateMonitor.lastTime >= 1000) {
        const fps = this.frameRateMonitor.frames;
        this.frameRateMonitor.frames = 0;
        this.frameRateMonitor.lastTime = now;
        
        this.renderMetrics.set('currentFPS', fps);
      }
      
      requestAnimationFrame(updateFrameRate);
    };
    
    requestAnimationFrame(updateFrameRate);
  }

  /**
   * Calculate current frame rate
   */
  private calculateCurrentFrameRate(): number {
    return this.renderMetrics.get('currentFPS') || 60;
  }

  /**
   * Detect network condition
   */
  private async detectNetworkCondition(): Promise<'fast' | 'slow' | 'offline'> {
    // This would use navigator.connection if available
    // For now, return a default value
    return 'fast';
  }

  /**
   * Get device performance info
   */
  private async getDevicePerformance(): Promise<MapLoadMetric['devicePerformance']> {
    return {
      memoryUsage: await this.getMemoryUsage(),
      deviceModel: 'Unknown', // Would get from device info
      osVersion: 'Unknown' // Would get from device info
    };
  }

  /**
   * Get memory usage in MB
   */
  private async getMemoryUsage(): Promise<number> {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / (1024 * 1024);
    }
    return 0;
  }

  /**
   * Get CPU usage percentage
   */
  private async getCPUUsage(): Promise<number | null> {
    // CPU usage would need native implementation
    // For now, return null indicating not available
    return null;
  }

  /**
   * Track performance event
   */
  private async trackPerformanceEvent(event: MapPerformanceEvent): Promise<void> {
    try {
      // Add Sentry breadcrumb for performance issues
      if (event.type === 'map_load' && (event as MapLoadMetric).loadTimeMs > 3000) {
        Sentry.addBreadcrumb({
          message: 'Slow map performance detected',
          level: 'warning',
          category: 'map_performance',
          data: {
            type: event.type,
            eventId: event.eventId
          }
        });
      }

      // Here would integrate with backend analytics API
      console.log('Map performance event tracked:', {
        type: event.type,
        timestamp: event.timestamp,
        eventId: event.eventId,
        sessionId: event.sessionId
      });

    } catch (error) {
      console.error('Failed to track map performance event:', error);
      Sentry.captureException(error, {
        tags: {
          operation: 'track_map_performance_event',
          eventType: event.type
        }
      });
    }
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    averageLoadTime: number;
    averageRenderTime: number;
    currentFPS: number;
    memoryUsage: number;
    peakMemory: number;
    apiCallsPerformed: number;
    performanceIssues: string[];
  } {
    const performanceIssues: string[] = [];
    const currentMemory = this.renderMetrics.get('lastMemory') || 0;
    const peakMemory = this.renderMetrics.get('peakMemory') || 0;
    
    if (currentMemory > 500) {
      performanceIssues.push('High memory usage');
    }
    
    if (this.calculateCurrentFrameRate() < 30) {
      performanceIssues.push('Low frame rate');
    }

    return {
      averageLoadTime: 0, // Would be calculated from historical data
      averageRenderTime: 0, // Would be calculated from historical data
      currentFPS: this.calculateCurrentFrameRate(),
      memoryUsage: currentMemory,
      peakMemory,
      apiCallsPerformed: this.apiMetrics.size,
      performanceIssues
    };
  }

  /**
   * Stop monitoring and cleanup
   */
  stopMonitoring(): void {
    if (this.resourceMonitorInterval) {
      clearInterval(this.resourceMonitorInterval);
      this.resourceMonitorInterval = null;
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }

    this.renderMetrics.clear();
    this.apiMetrics.clear();
    
    this.currentEventId = null;
    this.currentSessionId = null;

    Sentry.addBreadcrumb({
      message: 'Map performance monitoring stopped',
      level: 'info',
      category: 'map_performance'
    });
  }
}

// React Hook for Map Performance Monitoring
export const useMapPerformanceMonitoring = (eventId: string, sessionId: string) => {
  const performanceMonitor = new MapPerformanceMonitor();
  
  const initializeMonitoring = () => {
    performanceMonitor.initializeMonitoring(eventId, sessionId);
  };

  const trackMapLoad = (
    provider: 'mapbox' | 'google' | 'apple',
    initialZoom: number,
    initialCenter: { lat: number; lng: number },
    loadStartTime: number,
    success: boolean,
    errorDetails?: MapLoadMetric['errorDetails']
  ) => performanceMonitor.trackMapLoad(provider, initialZoom, initialCenter, loadStartTime, success, errorDetails);

  const trackRenderPerformance = (
    renderType: MapRenderMetric['type'],
    itemCount: number,
    renderStartTime: number,
    optimizationUsed: string[] = [],
    success: boolean = true
  ) => performanceMonitor.trackRenderPerformance(renderType, itemCount, renderStartTime, optimizationUsed, success);

  const trackInteractionPerformance = (
    interactionType: MapInteractionPerformance['interactionType'],
    interactionStartTime: number,
    gestureComplexity: 'simple' | 'complex' = 'simple'
  ) => performanceMonitor.trackInteractionPerformance(interactionType, interactionStartTime, gestureComplexity);

  const startAPICall = (
    apiCall: MapAPIPerformance['apiCall'],
    url: string,
    method: string
  ) => performanceMonitor.startAPICall(apiCall, url, method);

  const trackAPIPerformance = (
    apiCall: MapAPIPerformance['apiCall'],
    url: string,
    method: string,
    success: boolean,
    httpStatus?: number,
    requestSize?: number,
    responseSize?: number,
    cacheHit: boolean = false,
    retryCount: number = 0
  ) => performanceMonitor.trackAPIPerformance(
    apiCall, url, method, success, httpStatus, requestSize, responseSize, cacheHit, retryCount
  );

  const getPerformanceSummary = () => performanceMonitor.getPerformanceSummary();
  const stopMonitoring = () => performanceMonitor.stopMonitoring();

  return {
    initializeMonitoring,
    trackMapLoad,
    trackRenderPerformance,
    trackInteractionPerformance,
    startAPICall,
    trackAPIPerformance,
    getPerformanceSummary,
    stopMonitoring
  };
};

// Export singleton instance
export const mapPerformanceMonitor = new MapPerformanceMonitor();

export default mapPerformanceMonitor;