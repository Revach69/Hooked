/**
 * ViewStateManager - 5-state model for smooth loading transitions
 * Adapted for React Native and Hooked app architecture
 */

import { GlobalDataCache } from './GlobalDataCache';
import { PrefetchManager } from './PrefetchManager';

export enum ViewStates {
  CACHED = 'cached',        // Data available instantly
  LOADING = 'loading',      // Fetching fresh data
  EMPTY = 'empty',         // Confirmed no data
  ERROR = 'error',         // Failed to load
  STALE = 'stale'          // Showing old data while refreshing
}

interface ViewData<T> {
  data: T;
  timestamp: number;
  source: 'cache' | 'network';
}

interface ViewStateConfig {
  cacheKey: string;
  staleTtl: number; // Time after which data is considered stale
  maxTtl: number;   // Time after which data is considered expired
}

class ViewStateManagerClass {
  private currentState: ViewStates = ViewStates.LOADING;
  private stateListeners: Map<string, (state: ViewStates, data?: any) => void> = new Map();

  /**
   * Load view with 5-state smart loading
   */
  async loadView<T>(
    viewId: string,
    config: ViewStateConfig,
    fetchFunction: () => Promise<T>,
    onStateChange?: (state: ViewStates, data?: T) => void
  ): Promise<ViewData<T> | null> {
    const listenerId = `${viewId}_${Date.now()}`;
    
    if (onStateChange) {
      this.stateListeners.set(listenerId, onStateChange);
    }

    try {
      // Step 1: Check cache first
      const cached = GlobalDataCache.get<ViewData<T>>(config.cacheKey);
      
      if (cached && !this.isExpired(cached, config.maxTtl)) {
        if (!this.isStale(cached, config.staleTtl)) {
          // Fresh cached data - instant display
          this.setState(ViewStates.CACHED, cached.data, viewId);
          return cached;
        } else {
          // Stale data - show immediately but refresh in background
          this.setState(ViewStates.STALE, cached.data, viewId);
          
          // Refresh in background
          this.refreshInBackground(viewId, config, fetchFunction);
          return cached;
        }
      }

      // Step 2: No usable cache - show loading and fetch
      this.setState(ViewStates.LOADING, undefined, viewId);

      const fresh = await fetchFunction();
      
      if (!fresh || (Array.isArray(fresh) && fresh.length === 0)) {
        this.setState(ViewStates.EMPTY, undefined, viewId);
        return null;
      }

      // Step 3: Cache and display fresh data
      const viewData: ViewData<T> = {
        data: fresh,
        timestamp: Date.now(),
        source: 'network'
      };

      GlobalDataCache.set(config.cacheKey, viewData);
      this.setState(ViewStates.CACHED, fresh, viewId);
      
      return viewData;

    } catch (error) {
      console.error(`ViewStateManager: Error loading view ${viewId}:`, error);
      this.setState(ViewStates.ERROR, undefined, viewId);
      return null;
    } finally {
      // Clean up listener
      if (onStateChange) {
        this.stateListeners.delete(listenerId);
      }
    }
  }

  /**
   * Refresh data in background without changing UI state
   */
  private async refreshInBackground<T>(
    viewId: string,
    config: ViewStateConfig,
    fetchFunction: () => Promise<T>
  ): Promise<void> {
    try {
      console.log(`ViewStateManager: Refreshing ${viewId} in background`);
      
      const fresh = await fetchFunction();
      
      if (fresh) {
        const viewData: ViewData<T> = {
          data: fresh,
          timestamp: Date.now(),
          source: 'network'
        };

        GlobalDataCache.set(config.cacheKey, viewData);
        
        // Optionally notify that fresh data is available
        // but don't change the UI state abruptly
        console.log(`ViewStateManager: Background refresh complete for ${viewId}`);
      }
    } catch (error) {
      console.warn(`ViewStateManager: Background refresh failed for ${viewId}:`, error);
    }
  }

  /**
   * Set state and notify listeners
   */
  private setState(state: ViewStates, data?: any, viewId?: string): void {
    this.currentState = state;
    
    console.log(`ViewStateManager: State changed to ${state}${viewId ? ` for ${viewId}` : ''}`);

    // Notify all listeners
    this.stateListeners.forEach((listener) => {
      listener(state, data);
    });
  }

  /**
   * Check if data is stale (should refresh in background)
   */
  private isStale<T>(viewData: ViewData<T>, staleTtl: number): boolean {
    return Date.now() - viewData.timestamp > staleTtl;
  }

  /**
   * Check if data is expired (should not be used)
   */
  private isExpired<T>(viewData: ViewData<T>, maxTtl: number): boolean {
    return Date.now() - viewData.timestamp > maxTtl;
  }

  /**
   * Get current view state
   */
  getCurrentState(): ViewStates {
    return this.currentState;
  }

  /**
   * Check if view should show skeleton
   */
  shouldShowSkeleton(viewId: string, config: ViewStateConfig): boolean {
    const cached = GlobalDataCache.get<ViewData<any>>(config.cacheKey);
    
    // Don't show skeleton if we have any cached data (even stale)
    if (cached && !this.isExpired(cached, config.maxTtl)) {
      return false;
    }

    // Show skeleton for first-time loads
    return true;
  }

  /**
   * Preload view data for smooth navigation
   */
  async preloadView<T>(
    viewId: string,
    config: ViewStateConfig,
    fetchFunction: () => Promise<T>
  ): Promise<void> {
    try {
      const cached = GlobalDataCache.get<ViewData<T>>(config.cacheKey);
      
      // Only preload if we don't have fresh data
      if (!cached || this.isStale(cached, config.staleTtl)) {
        console.log(`ViewStateManager: Preloading ${viewId}`);
        
        const fresh = await fetchFunction();
        
        if (fresh) {
          const viewData: ViewData<T> = {
            data: fresh,
            timestamp: Date.now(),
            source: 'network'
          };

          GlobalDataCache.set(config.cacheKey, viewData);
        }
      }
    } catch (error) {
      console.warn(`ViewStateManager: Failed to preload ${viewId}:`, error);
    }
  }

  /**
   * Invalidate cache for view
   */
  invalidateView(viewId: string, cacheKey: string): void {
    GlobalDataCache.clear(cacheKey);
    console.log(`ViewStateManager: Invalidated cache for ${viewId}`);
  }

  /**
   * Get view cache info
   */
  getViewCacheInfo(cacheKey: string): {
    hasCache: boolean;
    isStale: boolean;
    isExpired: boolean;
    age?: number;
    source?: string;
  } {
    const cached = GlobalDataCache.get<ViewData<any>>(cacheKey);
    
    if (!cached) {
      return { hasCache: false, isStale: false, isExpired: false };
    }

    const age = Date.now() - cached.timestamp;
    
    return {
      hasCache: true,
      isStale: this.isStale(cached, 5 * 60 * 1000), // Default 5 min stale
      isExpired: this.isExpired(cached, 30 * 60 * 1000), // Default 30 min expired
      age,
      source: cached.source
    };
  }

  /**
   * Clear all listeners (cleanup)
   */
  cleanup(): void {
    this.stateListeners.clear();
  }
}

export const ViewStateManager = new ViewStateManagerClass();

/**
 * React Native Hook for using ViewStateManager
 */
import { useState, useEffect, useCallback } from 'react';

interface UseViewStateConfig extends ViewStateConfig {
  viewId: string;
}

export function useViewState<T>(
  config: UseViewStateConfig,
  fetchFunction: () => Promise<T>,
  deps: any[] = []
) {
  const [state, setState] = useState<ViewStates>(ViewStates.LOADING);
  const [data, setData] = useState<T | undefined>();
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    
    const result = await ViewStateManager.loadView(
      config.viewId,
      config,
      fetchFunction,
      (newState, newData) => {
        setState(newState);
        if (newData) {
          setData(newData);
        }
        if (newState === ViewStates.ERROR) {
          setError('Failed to load data');
        }
      }
    );

    if (result) {
      setData(result.data);
    }
  }, [config.viewId, config.cacheKey, ...deps]);

  const refresh = useCallback(async () => {
    ViewStateManager.invalidateView(config.viewId, config.cacheKey);
    await loadData();
  }, [config.viewId, config.cacheKey, loadData]);

  const preload = useCallback(async () => {
    await ViewStateManager.preloadView(config.viewId, config, fetchFunction);
  }, [config.viewId, config.cacheKey]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    state,
    data,
    error,
    loading: state === ViewStates.LOADING,
    cached: state === ViewStates.CACHED,
    stale: state === ViewStates.STALE,
    empty: state === ViewStates.EMPTY,
    showSkeleton: ViewStateManager.shouldShowSkeleton(config.viewId, config),
    refresh,
    preload,
    cacheInfo: ViewStateManager.getViewCacheInfo(config.cacheKey)
  };
}