/**
 * Performance Monitoring and Cost Tracking Service
 * 
 * Monitors the smart bounded caching system's performance metrics,
 * tracks Firestore costs, and provides optimization recommendations.
 */

import { appStoreApi } from '../stores/appStore';
import { SmartListenerManager } from './SmartListenerManager';
import { MemoryCleanupService } from './MemoryCleanupService';
import * as Sentry from '@sentry/react-native';

interface PerformanceMetrics {
  timestamp: number;
  firestoreReads: number;
  firestoreWrites: number;
  cacheHits: number;
  cacheMisses: number;
  listenersActive: number;
  memoryUsage: number;
  navigationTime: number;
  coldStartTime?: number;
}

interface CostEstimation {
  dailyReads: number;
  dailyWrites: number;
  estimatedDailyCost: number;
  monthlyProjection: number;
  recommendations: string[];
}

class PerformanceMonitoringServiceClass {
  private metrics: PerformanceMetrics[] = [];
  private sessionStartTime = Date.now();
  private navigationStartTimes = new Map<string, number>();
  private coldStartTime?: number;
  private isMonitoring = false;
  
  // Cost constants (Firebase pricing as of 2024)
  private readonly FIRESTORE_READ_COST = 0.00000036; // $0.36 per 1M reads
  private readonly FIRESTORE_WRITE_COST = 0.00000108; // $1.08 per 1M writes
  private readonly MAX_METRICS_HISTORY = 288; // 24 hours of 5-minute intervals
  
  /**
   * Initialize performance monitoring
   */
  initialize(): void {
    if (this.isMonitoring) {
      console.warn('PerformanceMonitoringService: Already initialized');
      return;
    }
    
    this.isMonitoring = true;
    this.sessionStartTime = Date.now();
    
    // Record cold start time if this is app launch
    this.recordColdStart();
    
    // Start periodic metrics collection
    this.startMetricsCollection();
    
    console.log('PerformanceMonitoringService: Initialized');
  }
  
  /**
   * Shutdown monitoring service
   */
  shutdown(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    // Export final metrics to Sentry
    this.exportMetricsToSentry();
    
    console.log('PerformanceMonitoringService: Shutdown complete');
  }
  
  /**
   * Record cold start performance
   */
  private recordColdStart(): void {
    // This would typically be called from app initialization
    this.coldStartTime = Date.now() - this.sessionStartTime;
    
    if (this.coldStartTime > 3000) {
      console.warn('PerformanceMonitoringService: Slow cold start detected', {
        coldStartTime: this.coldStartTime
      });
    }
  }
  
  /**
   * Start navigation timing
   */
  startNavigation(tab: string): void {
    this.navigationStartTimes.set(tab, Date.now());
  }
  
  /**
   * End navigation timing
   */
  endNavigation(tab: string): void {
    const startTime = this.navigationStartTimes.get(tab);
    if (startTime) {
      const navigationTime = Date.now() - startTime;
      this.navigationStartTimes.delete(tab);
      
      // Log slow navigations
      if (navigationTime > 1000) {
        console.warn('PerformanceMonitoringService: Slow navigation detected', {
          tab,
          navigationTime
        });
        
        Sentry.addBreadcrumb({
          message: 'Slow navigation detected',
          level: 'warning',
          category: 'performance',
          data: { tab, navigationTime }
        });
      }
      
      // Record in metrics
      this.recordNavigationMetric(navigationTime);
    }
  }
  
  /**
   * Start periodic metrics collection
   */
  private startMetricsCollection(): void {
    // Collect metrics every 5 minutes
    setInterval(() => {
      if (this.isMonitoring) {
        this.collectMetrics();
      }
    }, 5 * 60 * 1000);
    
    // Also collect initial metrics immediately
    setTimeout(() => this.collectMetrics(), 1000);
  }
  
  /**
   * Collect current performance metrics
   */
  private collectMetrics(): void {
    try {
      const store = appStoreApi.getState();
      const listenerStats = SmartListenerManager.getStats();
      const memoryStats = MemoryCleanupService.getMemoryStats();
      
      const metric: PerformanceMetrics = {
        timestamp: Date.now(),
        firestoreReads: store.metrics.totalReads,
        firestoreWrites: 0, // Track writes separately if needed
        cacheHits: store.metrics.cacheHits,
        cacheMisses: store.metrics.cacheMisses,
        listenersActive: listenerStats.listenersActive.total,
        memoryUsage: memoryStats.current.storeSize,
        navigationTime: this.getAverageNavigationTime(),
        coldStartTime: this.coldStartTime
      };
      
      this.metrics.push(metric);
      
      // Trim metrics history
      if (this.metrics.length > this.MAX_METRICS_HISTORY) {
        this.metrics = this.metrics.slice(-this.MAX_METRICS_HISTORY);
      }
      
      // Check for performance issues
      this.analyzePerformance(metric);
      
    } catch (error) {
      console.error('PerformanceMonitoringService: Failed to collect metrics', error);
    }
  }
  
  /**
   * Get average navigation time from recent navigations
   */
  private getAverageNavigationTime(): number {
    // This would track recent navigation times
    return 0; // Placeholder
  }
  
  /**
   * Record navigation timing metric
   */
  private recordNavigationMetric(time: number): void {
    // Store recent navigation times for averaging
    // Implementation depends on specific tracking needs
  }
  
  /**
   * Analyze performance metrics for issues
   */
  private analyzePerformance(metric: PerformanceMetrics): void {
    const issues: string[] = [];
    
    // Check cache hit ratio
    const totalCacheOps = metric.cacheHits + metric.cacheMisses;
    if (totalCacheOps > 0) {
      const hitRatio = metric.cacheHits / totalCacheOps;
      if (hitRatio < 0.7) {
        issues.push(`Low cache hit ratio: ${Math.round(hitRatio * 100)}%`);
      }
    }
    
    // Check listener count
    if (metric.listenersActive > 20) {
      issues.push(`High listener count: ${metric.listenersActive}`);
    }
    
    // Check memory usage growth
    if (this.metrics.length > 2) {
      const previousMetric = this.metrics[this.metrics.length - 2];
      const memoryGrowth = metric.memoryUsage - previousMetric.memoryUsage;
      if (memoryGrowth > 50) {
        issues.push(`High memory growth: +${memoryGrowth} objects`);
      }
    }
    
    // Check Firestore read rate
    if (this.metrics.length > 1) {
      const previousMetric = this.metrics[this.metrics.length - 2];
      const readRate = (metric.firestoreReads - previousMetric.firestoreReads) / 5; // per minute
      if (readRate > 20) {
        issues.push(`High Firestore read rate: ${readRate}/min`);
      }
    }
    
    // Report issues
    if (issues.length > 0) {
      console.warn('PerformanceMonitoringService: Performance issues detected', issues);
      
      Sentry.addBreadcrumb({
        message: 'Performance issues detected',
        level: 'warning',
        category: 'performance',
        data: { issues, metric }
      });
    }
  }
  
  /**
   * Calculate cost estimation
   */
  getCostEstimation(): CostEstimation {
    if (this.metrics.length < 2) {
      return {
        dailyReads: 0,
        dailyWrites: 0,
        estimatedDailyCost: 0,
        monthlyProjection: 0,
        recommendations: ['Not enough data for cost estimation']
      };
    }
    
    const latestMetric = this.metrics[this.metrics.length - 1];
    const oldestMetric = this.metrics[0];
    const timeSpanHours = (latestMetric.timestamp - oldestMetric.timestamp) / (1000 * 60 * 60);
    
    // Calculate daily rates
    const readsInPeriod = latestMetric.firestoreReads - oldestMetric.firestoreReads;
    const dailyReads = (readsInPeriod / timeSpanHours) * 24;
    const dailyWrites = (latestMetric.firestoreWrites - oldestMetric.firestoreWrites / timeSpanHours) * 24;
    
    // Calculate costs
    const dailyReadCost = dailyReads * this.FIRESTORE_READ_COST;
    const dailyWriteCost = dailyWrites * this.FIRESTORE_WRITE_COST;
    const estimatedDailyCost = dailyReadCost + dailyWriteCost;
    const monthlyProjection = estimatedDailyCost * 30;
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (dailyReads > 100000) {
      recommendations.push('Consider implementing more aggressive caching to reduce Firestore reads');
    }
    
    if (monthlyProjection > 10) {
      recommendations.push('Monthly cost projection exceeds $10 - review listener optimization');
    }
    
    const cacheHitRate = latestMetric.cacheHits / (latestMetric.cacheHits + latestMetric.cacheMisses);
    if (cacheHitRate < 0.8) {
      recommendations.push('Improve cache hit rate by pre-loading frequently accessed data');
    }
    
    if (latestMetric.listenersActive > 15) {
      recommendations.push('Reduce active listeners using smart bounded approach');
    }
    
    return {
      dailyReads,
      dailyWrites,
      estimatedDailyCost,
      monthlyProjection,
      recommendations
    };
  }
  
  /**
   * Get performance dashboard data
   */
  getPerformanceDashboard(): {
    currentMetrics: PerformanceMetrics;
    trends: {
      firestoreReadsPerHour: number;
      cacheHitRate: number;
      averageNavigationTime: number;
      memoryGrowthRate: number;
    };
    costEstimation: CostEstimation;
    systemHealth: 'excellent' | 'good' | 'warning' | 'critical';
  } {
    if (this.metrics.length === 0) {
      throw new Error('No metrics available');
    }
    
    const currentMetrics = this.metrics[this.metrics.length - 1];
    const costEstimation = this.getCostEstimation();
    
    // Calculate trends
    const trends = this.calculateTrends();
    
    // Assess system health
    const systemHealth = this.assessSystemHealth(currentMetrics, trends);
    
    return {
      currentMetrics,
      trends,
      costEstimation,
      systemHealth
    };
  }
  
  /**
   * Calculate performance trends
   */
  private calculateTrends(): any {
    if (this.metrics.length < 2) {
      return {
        firestoreReadsPerHour: 0,
        cacheHitRate: 0,
        averageNavigationTime: 0,
        memoryGrowthRate: 0
      };
    }
    
    const recent = this.metrics.slice(-12); // Last hour
    const latest = recent[recent.length - 1];
    const oldest = recent[0];
    
    const timeSpanHours = (latest.timestamp - oldest.timestamp) / (1000 * 60 * 60);
    const firestoreReadsPerHour = (latest.firestoreReads - oldest.firestoreReads) / timeSpanHours;
    
    const totalOps = latest.cacheHits + latest.cacheMisses;
    const cacheHitRate = totalOps > 0 ? latest.cacheHits / totalOps : 0;
    
    const memoryGrowthRate = (latest.memoryUsage - oldest.memoryUsage) / timeSpanHours;
    
    return {
      firestoreReadsPerHour,
      cacheHitRate,
      averageNavigationTime: latest.navigationTime,
      memoryGrowthRate
    };
  }
  
  /**
   * Assess overall system health
   */
  private assessSystemHealth(metrics: PerformanceMetrics, trends: any): 'excellent' | 'good' | 'warning' | 'critical' {
    let score = 100;
    
    // Deduct points for issues
    if (trends.cacheHitRate < 0.5) score -= 30;
    else if (trends.cacheHitRate < 0.7) score -= 15;
    
    if (metrics.listenersActive > 25) score -= 25;
    else if (metrics.listenersActive > 15) score -= 10;
    
    if (trends.firestoreReadsPerHour > 1000) score -= 20;
    else if (trends.firestoreReadsPerHour > 500) score -= 10;
    
    if (trends.memoryGrowthRate > 100) score -= 15;
    
    if (metrics.navigationTime > 2000) score -= 20;
    else if (metrics.navigationTime > 1000) score -= 10;
    
    // Determine health level
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'warning';
    return 'critical';
  }
  
  /**
   * Export metrics to Sentry for monitoring
   */
  private exportMetricsToSentry(): void {
    try {
      const dashboard = this.getPerformanceDashboard();
      
      Sentry.addBreadcrumb({
        message: 'Performance session summary',
        level: 'info',
        category: 'performance',
        data: {
          systemHealth: dashboard.systemHealth,
          sessionDuration: Date.now() - this.sessionStartTime,
          totalFirestoreReads: dashboard.currentMetrics.firestoreReads,
          cacheHitRate: dashboard.trends.cacheHitRate,
          estimatedDailyCost: dashboard.costEstimation.estimatedDailyCost
        }
      });
      
      // Send warning if system health is poor
      if (dashboard.systemHealth === 'critical') {
        Sentry.captureMessage('Critical performance issues detected', {
          level: 'error',
          extra: dashboard
        });
      } else if (dashboard.systemHealth === 'warning') {
        Sentry.captureMessage('Performance warnings detected', {
          level: 'warning',
          extra: dashboard
        });
      }
      
    } catch (error) {
      console.error('PerformanceMonitoringService: Failed to export metrics', error);
    }
  }
  
  /**
   * Generate performance report
   */
  generateReport(): string {
    try {
      const dashboard = this.getPerformanceDashboard();
      
      return `
# Smart Bounded Caching Performance Report

## System Health: ${dashboard.systemHealth.toUpperCase()}

## Current Metrics
- Active Listeners: ${dashboard.currentMetrics.listenersActive}
- Firestore Reads: ${dashboard.currentMetrics.firestoreReads}
- Cache Hit Rate: ${Math.round(dashboard.trends.cacheHitRate * 100)}%
- Memory Usage: ${dashboard.currentMetrics.memoryUsage} objects
- Navigation Time: ${dashboard.currentMetrics.navigationTime}ms

## Cost Estimation
- Daily Reads: ${Math.round(dashboard.costEstimation.dailyReads)}
- Estimated Daily Cost: $${dashboard.costEstimation.estimatedDailyCost.toFixed(4)}
- Monthly Projection: $${dashboard.costEstimation.monthlyProjection.toFixed(2)}

## Trends
- Firestore Reads/Hour: ${Math.round(dashboard.trends.firestoreReadsPerHour)}
- Memory Growth Rate: ${Math.round(dashboard.trends.memoryGrowthRate)} objects/hour

## Recommendations
${dashboard.costEstimation.recommendations.map(r => `- ${r}`).join('\n')}

## Session Info
- Session Duration: ${Math.round((Date.now() - this.sessionStartTime) / 60000)} minutes
- Cold Start Time: ${this.coldStartTime || 'N/A'}ms
- Metrics Collected: ${this.metrics.length}
      `.trim();
      
    } catch (error) {
      return `Performance report generation failed: ${error}`;
    }
  }
}

export const PerformanceMonitoringService = new PerformanceMonitoringServiceClass();
export default PerformanceMonitoringService;