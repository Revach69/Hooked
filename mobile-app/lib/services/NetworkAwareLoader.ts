/**
 * NetworkAwareLoader - Adapts loading strategies based on connection speed
 * Optimizes data and image loading based on network conditions
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
// Services removed from import to fix lint warnings - loaded dynamically when needed

interface NetworkMetrics {
  connectionType: string;
  isConnected: boolean;
  isWifiEnabled?: boolean;
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
  downlink?: number; // Mbps
  rtt?: number; // milliseconds
  saveData?: boolean;
}

interface LoadingStrategy {
  maxConcurrentImages: number;
  imageQuality: 'low' | 'medium' | 'high';
  prefetchEnabled: boolean;
  cacheStrategy: 'aggressive' | 'conservative' | 'minimal';
  compressionLevel: number; // 0.1 to 1.0
  timeoutMultiplier: number;
}

class NetworkAwareLoaderService {
  private networkMetrics: NetworkMetrics | null = null;
  private loadingStrategy: LoadingStrategy = this.getDefaultStrategy();
  private networkListeners: ((strategy: LoadingStrategy) => void)[] = [];
  private isMonitoring = false;
  private connectionHistory: { timestamp: number; metrics: NetworkMetrics }[] = [];
  private readonly HISTORY_LIMIT = 20;

  /**
   * Initialize network monitoring
   */
  async initialize(): Promise<void> {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    
    // Get initial network state
    const initialState = await NetInfo.fetch();
    this.updateNetworkMetrics(initialState);

    // Subscribe to network changes
    NetInfo.addEventListener((state: NetInfoState) => {
      this.updateNetworkMetrics(state);
    });

    console.log('NetworkAwareLoader: Initialized with strategy:', this.loadingStrategy);
  }

  /**
   * Update network metrics and loading strategy
   */
  private updateNetworkMetrics(state: NetInfoState): void {
    const metrics: NetworkMetrics = {
      connectionType: state.type,
      isConnected: state.isConnected ?? false,
      isWifiEnabled: state.isWifiEnabled,
      effectiveType: this.mapEffectiveType(state),
      downlink: this.estimateDownlink(state),
      rtt: this.estimateRtt(state)
    };

    // Update connection history
    this.connectionHistory.push({
      timestamp: Date.now(),
      metrics
    });

    // Keep history manageable
    if (this.connectionHistory.length > this.HISTORY_LIMIT) {
      this.connectionHistory = this.connectionHistory.slice(-this.HISTORY_LIMIT);
    }

    this.networkMetrics = metrics;
    this.loadingStrategy = this.calculateLoadingStrategy(metrics);

    console.log('NetworkAwareLoader: Network changed:', {
      type: metrics.connectionType,
      connected: metrics.isConnected,
      strategy: this.loadingStrategy.cacheStrategy
    });

    // Notify listeners
    this.networkListeners.forEach(listener => listener(this.loadingStrategy));
  }

  /**
   * Map network state to effective connection type
   */
  private mapEffectiveType(state: NetInfoState): 'slow-2g' | '2g' | '3g' | '4g' | 'unknown' {
    if (!state.isConnected) return 'unknown';

    switch (state.type) {
      case 'cellular':
        // Estimate based on cellular generation if available
        if (state.details?.cellularGeneration) {
          switch (state.details.cellularGeneration) {
            case '2g': return '2g';
            case '3g': return '3g';
            case '4g': 
            case '5g': return '4g';
            default: return '3g';
          }
        }
        return '3g'; // Default assumption
        
      case 'wifi':
        return '4g'; // Assume WiFi is fast
        
      case 'ethernet':
        return '4g';
        
      default:
        return 'unknown';
    }
  }

  /**
   * Estimate download speed in Mbps
   */
  private estimateDownlink(state: NetInfoState): number {
    if (!state.isConnected) return 0;

    switch (state.type) {
      case 'wifi':
        return 25; // Conservative WiFi estimate
      case 'cellular':
        if (state.details?.cellularGeneration) {
          switch (state.details.cellularGeneration) {
            case '2g': return 0.1;
            case '3g': return 3;
            case '4g': return 10;
            case '5g': return 50;
            default: return 1;
          }
        }
        return 3; // 3G default
      case 'ethernet':
        return 100;
      default:
        return 1;
    }
  }

  /**
   * Estimate round-trip time in milliseconds
   */
  private estimateRtt(state: NetInfoState): number {
    if (!state.isConnected) return 1000;

    switch (state.type) {
      case 'wifi': return 20;
      case 'cellular':
        if (state.details?.cellularGeneration) {
          switch (state.details.cellularGeneration) {
            case '2g': return 500;
            case '3g': return 100;
            case '4g': return 50;
            case '5g': return 30;
            default: return 150;
          }
        }
        return 100;
      case 'ethernet': return 10;
      default: return 200;
    }
  }

  /**
   * Calculate optimal loading strategy based on network conditions
   */
  private calculateLoadingStrategy(metrics: NetworkMetrics): LoadingStrategy {
    if (!metrics.isConnected) {
      return {
        maxConcurrentImages: 0,
        imageQuality: 'low',
        prefetchEnabled: false,
        cacheStrategy: 'minimal',
        compressionLevel: 0.3,
        timeoutMultiplier: 3
      };
    }

    const downlink = metrics.downlink || 1;
    const rtt = metrics.rtt || 200;
    const isWifi = metrics.connectionType === 'wifi';

    // Calculate network score (0-100)
    const networkScore = Math.min(100, 
      (downlink * 10) + // Speed component
      (200 - rtt) / 2 + // Latency component (inverted)
      (isWifi ? 20 : 0) // WiFi bonus
    );

    if (networkScore >= 70) {
      // Excellent connection
      return {
        maxConcurrentImages: 4,
        imageQuality: 'high',
        prefetchEnabled: true,
        cacheStrategy: 'aggressive',
        compressionLevel: 0.8,
        timeoutMultiplier: 1
      };
    } else if (networkScore >= 40) {
      // Good connection
      return {
        maxConcurrentImages: 2,
        imageQuality: 'medium',
        prefetchEnabled: true,
        cacheStrategy: 'conservative',
        compressionLevel: 0.6,
        timeoutMultiplier: 1.5
      };
    } else if (networkScore >= 20) {
      // Poor connection
      return {
        maxConcurrentImages: 1,
        imageQuality: 'low',
        prefetchEnabled: false,
        cacheStrategy: 'conservative',
        compressionLevel: 0.4,
        timeoutMultiplier: 2
      };
    } else {
      // Very poor connection
      return {
        maxConcurrentImages: 1,
        imageQuality: 'low',
        prefetchEnabled: false,
        cacheStrategy: 'minimal',
        compressionLevel: 0.3,
        timeoutMultiplier: 3
      };
    }
  }

  /**
   * Get default loading strategy
   */
  private getDefaultStrategy(): LoadingStrategy {
    return {
      maxConcurrentImages: 2,
      imageQuality: 'medium',
      prefetchEnabled: true,
      cacheStrategy: 'conservative',
      compressionLevel: 0.6,
      timeoutMultiplier: 1.5
    };
  }

  /**
   * Get current loading strategy
   */
  getCurrentStrategy(): LoadingStrategy {
    return { ...this.loadingStrategy };
  }

  /**
   * Get current network metrics
   */
  getNetworkMetrics(): NetworkMetrics | null {
    return this.networkMetrics ? { ...this.networkMetrics } : null;
  }

  /**
   * Check if network is suitable for given operation
   */
  shouldPrefetch(): boolean {
    return this.loadingStrategy.prefetchEnabled && (this.networkMetrics?.isConnected ?? false);
  }

  /**
   * Check if network supports high quality images
   */
  shouldLoadHighQuality(): boolean {
    return this.loadingStrategy.imageQuality === 'high';
  }

  /**
   * Get appropriate timeout for network requests
   */
  getNetworkTimeout(baseTimeout: number = 10000): number {
    return baseTimeout * this.loadingStrategy.timeoutMultiplier;
  }

  /**
   * Get compression level for images
   */
  getImageCompression(): number {
    return this.loadingStrategy.compressionLevel;
  }

  /**
   * Get maximum concurrent image loads
   */
  getMaxConcurrentImages(): number {
    return this.loadingStrategy.maxConcurrentImages;
  }

  /**
   * Add listener for strategy changes
   */
  addStrategyListener(listener: (strategy: LoadingStrategy) => void): () => void {
    this.networkListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.networkListeners.indexOf(listener);
      if (index > -1) {
        this.networkListeners.splice(index, 1);
      }
    };
  }

  /**
   * Get network stability score (0-1)
   */
  getNetworkStability(): number {
    if (this.connectionHistory.length < 5) return 0.5;

    const recentHistory = this.connectionHistory.slice(-10);
    const connections = recentHistory.filter(h => h.metrics.isConnected).length;
    const stability = connections / recentHistory.length;
    
    return stability;
  }

  /**
   * Predict if network will be stable for next N seconds
   */
  predictNetworkStability(_seconds: number = 30): boolean {
    const stability = this.getNetworkStability();
    const isCurrentlyConnected = this.networkMetrics?.isConnected ?? false;
    
    return isCurrentlyConnected && stability > 0.7;
  }

  /**
   * Adapt ViewStateManager TTL based on network conditions
   */
  getAdaptiveTTL(baseTTL: number): number {
    if (!this.networkMetrics?.isConnected) {
      // Offline - use cache longer
      return baseTTL * 5;
    }

    const strategy = this.loadingStrategy;
    
    switch (strategy.cacheStrategy) {
      case 'aggressive':
        return baseTTL * 0.8; // Refresh more frequently on good connections
      case 'conservative':
        return baseTTL * 1.2; // Standard with slight extension
      case 'minimal':
        return baseTTL * 2; // Keep cache longer on poor connections
      default:
        return baseTTL;
    }
  }

  /**
   * Get network-aware batch size for API requests
   */
  getOptimalBatchSize(defaultSize: number = 20): number {
    if (!this.networkMetrics?.isConnected) return Math.min(5, defaultSize);

    const downlink = this.networkMetrics.downlink || 1;
    
    if (downlink >= 10) return Math.min(50, defaultSize * 2); // High speed
    if (downlink >= 3) return defaultSize; // Medium speed
    if (downlink >= 1) return Math.max(5, Math.floor(defaultSize * 0.5)); // Low speed
    return 5; // Very low speed
  }

  /**
   * Check if should use background refresh
   */
  shouldBackgroundRefresh(): boolean {
    const stability = this.getNetworkStability();
    const hasGoodConnection = this.loadingStrategy.cacheStrategy === 'aggressive';
    
    return hasGoodConnection && stability > 0.8;
  }

  /**
   * Get statistics for monitoring
   */
  getStats() {
    return {
      currentStrategy: this.loadingStrategy,
      networkMetrics: this.networkMetrics,
      connectionHistory: this.connectionHistory.length,
      networkStability: this.getNetworkStability(),
      isMonitoring: this.isMonitoring,
      listeners: this.networkListeners.length
    };
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.isMonitoring = false;
    this.networkListeners = [];
    this.connectionHistory = [];
  }
}

export const NetworkAwareLoader = new NetworkAwareLoaderService();

/**
 * React Hook for network-aware components
 */
import { useState, useEffect } from 'react';

export const useNetworkStrategy = () => {
  const [strategy, setStrategy] = useState<LoadingStrategy>(NetworkAwareLoader.getCurrentStrategy());
  const [metrics, setMetrics] = useState<NetworkMetrics | null>(NetworkAwareLoader.getNetworkMetrics());

  useEffect(() => {
    // Initialize if not already done
    NetworkAwareLoader.initialize();

    // Listen for strategy changes
    const unsubscribe = NetworkAwareLoader.addStrategyListener((newStrategy) => {
      setStrategy(newStrategy);
      setMetrics(NetworkAwareLoader.getNetworkMetrics());
    });

    return unsubscribe;
  }, []);

  return {
    strategy,
    metrics,
    shouldPrefetch: NetworkAwareLoader.shouldPrefetch(),
    shouldLoadHighQuality: NetworkAwareLoader.shouldLoadHighQuality(),
    getTimeout: (base: number) => NetworkAwareLoader.getNetworkTimeout(base),
    getCompression: () => NetworkAwareLoader.getImageCompression(),
    getMaxConcurrent: () => NetworkAwareLoader.getMaxConcurrentImages(),
    isStable: NetworkAwareLoader.predictNetworkStability(),
    stats: NetworkAwareLoader.getStats()
  };
};