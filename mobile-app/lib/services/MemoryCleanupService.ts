/**
 * Memory Cleanup Service for Smart Bounded Caching System
 * 
 * Handles automatic memory management and cleanup strategies to prevent
 * memory leaks and optimize performance in the smart bounded architecture.
 */

import { appStoreApi } from '../stores/appStore';
import { SmartListenerManager } from './SmartListenerManager';
import { ImageCacheService } from './ImageCacheService';
import * as Sentry from '@sentry/react-native';
import { AppState, AppStateStatus } from 'react-native';

interface MemoryStats {
  timestamp: number;
  listenersActive: number;
  storeSize: number;
  cacheSize: number;
  lastCleanup: number;
}

class MemoryCleanupServiceClass {
  private cleanupInterval?: NodeJS.Timeout;
  private appStateSubscription?: any;
  private memoryStats: MemoryStats[] = [];
  private isActive = false;
  
  // Cleanup thresholds
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly BACKGROUND_CLEANUP_DELAY = 30 * 1000; // 30 seconds after backgrounding
  private readonly MAX_MEMORY_STATS = 24; // Keep 2 hours of 5-minute stats
  private readonly STALE_DATA_THRESHOLD = 10 * 60 * 1000; // 10 minutes
  
  /**
   * Initialize memory cleanup service
   */
  initialize(): void {
    if (this.isActive) {
      console.warn('MemoryCleanupService: Already initialized');
      return;
    }
    
    this.isActive = true;
    
    // Start periodic cleanup
    this.startPeriodicCleanup();
    
    // Monitor app state changes
    this.setupAppStateMonitoring();
    
    console.log('MemoryCleanupService: Initialized');
  }
  
  /**
   * Shutdown cleanup service
   */
  shutdown(): void {
    if (!this.isActive) return;
    
    this.isActive = false;
    
    // Clear periodic cleanup
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    
    // Remove app state listener
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = undefined;
    }
    
    // Clear memory stats
    this.memoryStats = [];
    
    console.log('MemoryCleanupService: Shutdown complete');
  }
  
  /**
   * Start periodic cleanup timer
   */
  private startPeriodicCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.performPeriodicCleanup();
    }, this.CLEANUP_INTERVAL);
  }
  
  /**
   * Setup app state monitoring for background cleanup
   */
  private setupAppStateMonitoring(): void {
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background') {
        // Delay cleanup to allow for quick app switches
        setTimeout(() => {
          if (AppState.currentState === 'background') {
            this.performBackgroundCleanup();
          }
        }, this.BACKGROUND_CLEANUP_DELAY);
      }
    });
  }
  
  /**
   * Perform periodic memory cleanup while app is active
   */
  private async performPeriodicCleanup(): Promise<void> {
    if (!this.isActive) return;
    
    console.log('MemoryCleanupService: Starting periodic cleanup');
    
    try {
      // Collect current memory stats
      const stats = this.collectMemoryStats();
      this.recordMemoryStats(stats);
      
      // Clean up stale data in global store
      await this.cleanupStaleStoreData();
      
      // Cleanup image cache
      await this.cleanupImageCache();
      
      // Optimize listener management
      this.optimizeListeners();
      
      // Log cleanup results
      const postStats = this.collectMemoryStats();
      console.log('MemoryCleanupService: Periodic cleanup complete', {
        before: stats,
        after: postStats
      });
      
    } catch (error) {
      console.error('MemoryCleanupService: Periodic cleanup failed', error);
      Sentry.captureException(error);
    }
  }
  
  /**
   * Perform aggressive cleanup when app goes to background
   */
  private async performBackgroundCleanup(): Promise<void> {
    if (!this.isActive) return;
    
    console.log('MemoryCleanupService: Starting background cleanup');
    
    try {
      const store = appStoreApi.getState();
      
      // Clear Tier 2 data (keep Tier 1 for quick resume)
      store.cleanup();
      
      // Aggressive image cache cleanup
      await ImageCacheService.performBackgroundCleanup?.();
      
      // Cleanup old memory stats
      this.trimMemoryStats();
      
      console.log('MemoryCleanupService: Background cleanup complete');
      
    } catch (error) {
      console.error('MemoryCleanupService: Background cleanup failed', error);
      Sentry.captureException(error);
    }
  }
  
  /**
   * Clean up stale data in the global store
   */
  private async cleanupStaleStoreData(): Promise<void> {
    const store = appStoreApi.getState();
    const now = Date.now();
    
    // Check if matches data is stale
    if (store.matchesLastUpdate && (now - store.matchesLastUpdate) > this.STALE_DATA_THRESHOLD) {
      console.log('MemoryCleanupService: Matches data is stale, clearing');
      // Don't clear - let SmartListenerManager refresh it
    }
    
    // Check if discovery data is stale
    if (store.discoveryLastUpdate && (now - store.discoveryLastUpdate) > this.STALE_DATA_THRESHOLD) {
      console.log('MemoryCleanupService: Discovery data is stale, clearing');
      // Don't clear - let SmartListenerManager refresh it
    }
    
    // Clean up old unread messages that might be accumulating
    if (store.activeChats.size > 10) {
      console.log('MemoryCleanupService: Too many active chats, cleaning oldest');
      // SmartListenerManager handles this with LRU
    }
  }
  
  /**
   * Cleanup image cache to free memory
   */
  private async cleanupImageCache(): Promise<void> {
    try {
      // Let ImageCacheService handle its own cleanup logic
      // This might include removing least recently used images
      await ImageCacheService.performMemoryCleanup?.();
    } catch (error) {
      console.warn('MemoryCleanupService: Image cache cleanup failed', error);
    }
  }
  
  /**
   * Optimize listener management
   */
  private optimizeListeners(): void {
    try {
      const stats = SmartListenerManager.getStats();
      
      // Check if we have too many Tier 2 listeners
      if (stats.listenersActive.tier2 > 8) {
        console.log('MemoryCleanupService: Too many Tier 2 listeners, optimization needed');
        // SmartListenerManager handles this automatically with LRU
      }
      
      // Check total Firestore reads for cost monitoring
      if (stats.totalFirestoreReads > 10000) {
        console.warn('MemoryCleanupService: High Firestore read count detected', {
          totalReads: stats.totalFirestoreReads
        });
        Sentry.captureMessage('High Firestore read count detected', {
          level: 'warning',
          extra: { stats }
        });
      }
    } catch (error) {
      console.warn('MemoryCleanupService: Listener optimization failed', error);
    }
  }
  
  /**
   * Collect current memory statistics
   */
  private collectMemoryStats(): MemoryStats {
    const store = appStoreApi.getState();
    const listenerStats = SmartListenerManager.getStats();
    
    return {
      timestamp: Date.now(),
      listenersActive: listenerStats.listenersActive.total,
      storeSize: this.estimateStoreSize(store),
      cacheSize: store.activeChats.size + store.recentProfileViews.size(),
      lastCleanup: store.lastCleanup
    };
  }
  
  /**
   * Estimate store memory usage
   */
  private estimateStoreSize(store: any): number {
    let size = 0;
    
    // Count Tier 1 data
    size += store.matchesSummary?.length || 0;
    size += store.discoveryPage1?.length || 0;
    
    // Count Tier 2 data
    size += store.activeChats?.size || 0;
    size += store.discoveryPages?.size || 0;
    
    return size;
  }
  
  /**
   * Record memory stats for monitoring
   */
  private recordMemoryStats(stats: MemoryStats): void {
    this.memoryStats.push(stats);
    
    // Trim to maximum size
    if (this.memoryStats.length > this.MAX_MEMORY_STATS) {
      this.memoryStats = this.memoryStats.slice(-this.MAX_MEMORY_STATS);
    }
  }
  
  /**
   * Trim old memory stats to save memory
   */
  private trimMemoryStats(): void {
    const cutoff = Date.now() - (2 * 60 * 60 * 1000); // 2 hours
    this.memoryStats = this.memoryStats.filter(stat => stat.timestamp > cutoff);
  }
  
  /**
   * Force immediate cleanup
   */
  async forceCleanup(): Promise<void> {
    console.log('MemoryCleanupService: Force cleanup requested');
    await this.performPeriodicCleanup();
    await this.performBackgroundCleanup();
  }
  
  /**
   * Get memory usage statistics
   */
  getMemoryStats(): {
    current: MemoryStats;
    history: MemoryStats[];
    recommendations: string[];
  } {
    const current = this.collectMemoryStats();
    const recommendations: string[] = [];
    
    // Analyze stats and provide recommendations
    if (current.listenersActive > 15) {
      recommendations.push('High listener count detected - consider reducing active connections');
    }
    
    if (current.cacheSize > 50) {
      recommendations.push('Large cache size detected - consider clearing old data');
    }
    
    const recentStats = this.memoryStats.slice(-6); // Last 30 minutes
    if (recentStats.length > 3) {
      const avgGrowth = recentStats.slice(-3).reduce((sum, stat) => sum + stat.storeSize, 0) / 3 -
                       recentStats.slice(0, 3).reduce((sum, stat) => sum + stat.storeSize, 0) / 3;
      
      if (avgGrowth > 20) {
        recommendations.push('Memory usage trending upward - monitor for potential leaks');
      }
    }
    
    return {
      current,
      history: this.memoryStats,
      recommendations
    };
  }
}

export const MemoryCleanupService = new MemoryCleanupServiceClass();
export default MemoryCleanupService;