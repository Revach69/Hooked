/**
 * NavigationCacheManager - Smooth navigation transitions for Hooked app
 * Handles prefetching and cache management during route changes
 */

import { PrefetchManager } from './PrefetchManager';
import { ViewStateManager } from './ViewStateManager';
import { ProgressiveImageLoader } from '../services/ProgressiveImageLoader';
import { GlobalDataCache } from './GlobalDataCache';

interface RouteRequirement {
  cacheKey: string;
  required: boolean;
  prefetch?: boolean;
}

interface NavigationContext {
  eventId: string;
  sessionId: string;
  currentRoute: string;
  targetRoute: string;
  params?: any;
}

interface PreparedViewData {
  type: 'ready' | 'partial' | 'skeleton';
  data?: any;
  cacheInfo?: any;
}

class NavigationCacheManagerClass {
  private routeRequirements: Record<string, RouteRequirement[]> = {
    '/discovery': [
      { cacheKey: 'discovery_profiles', required: true, prefetch: true },
      { cacheKey: 'discovery_event', required: false, prefetch: true },
      { cacheKey: 'user_profile', required: false }
    ],
    '/matches': [
      { cacheKey: 'matches_list', required: true, prefetch: true },
      { cacheKey: 'user_profile', required: true },
      { cacheKey: 'unread_messages', required: false, prefetch: true }
    ],
    '/profile': [
      { cacheKey: 'user_profile', required: true },
      { cacheKey: 'profile_event', required: false }
    ],
    '/chat': [
      { cacheKey: 'chat_messages', required: false, prefetch: true },
      { cacheKey: 'chat_profile', required: true }
    ]
  };

  /**
   * Navigate with intelligent prefetching and cache preparation
   */
  async navigateWithPrefetch(context: NavigationContext): Promise<PreparedViewData> {
    try {
      console.log(`NavigationCacheManager: Navigating from ${context.currentRoute} to ${context.targetRoute}`);

      // Step 1: Start prefetching immediately
      const prefetchPromise = this.startPrefetching(context);

      // Step 2: Prepare view with available cache
      const preparedView = await this.prepareView(context);

      // Step 3: Continue prefetching in background
      prefetchPromise.catch(error => 
        console.warn('NavigationCacheManager: Prefetch error:', error)
      );

      return preparedView;
    } catch (error) {
      console.error('NavigationCacheManager: Navigation error:', error);
      return { type: 'skeleton' };
    }
  }

  /**
   * Start prefetching for target route
   */
  private async startPrefetching(context: NavigationContext): Promise<void> {
    const { targetRoute, eventId, sessionId } = context;

    // 1. Start route-specific prefetching
    await PrefetchManager.prefetchForRoute(targetRoute, eventId, sessionId);

    // 2. Smart prefetching based on current route
    await this.contextualPrefetch(context);

    // 3. Image prefetching based on route
    await this.prefetchRouteImages(context);
  }

  /**
   * Contextual prefetching based on navigation pattern
   */
  private async contextualPrefetch(context: NavigationContext): Promise<void> {
    const { currentRoute, targetRoute, eventId, sessionId } = context;

    // Smart prefetching rules based on user behavior patterns
    const prefetchRules: Record<string, string[]> = {
      '/discovery->/matches': ['matches_list', 'unread_messages'],
      '/discovery->/profile': ['profile_event'],
      '/matches->/chat': ['recent_messages'],
      '/profile->/discovery': ['discovery_profiles_refresh'],
      '/chat->/matches': ['matches_list_refresh'],
      '/matches->/discovery': ['discovery_profiles_next']
    };

    const ruleKey = `${currentRoute}->${targetRoute}`;
    const toPrefetch = prefetchRules[ruleKey] || [];

    for (const item of toPrefetch) {
      try {
        await this.prefetchSpecificData(item, eventId, sessionId);
      } catch (error) {
        console.warn(`NavigationCacheManager: Failed to prefetch ${item}:`, error);
      }
    }
  }

  /**
   * Prefetch route-specific images
   */
  private async prefetchRouteImages(context: NavigationContext): Promise<void> {
    const { targetRoute, eventId } = context;

    try {
      switch (targetRoute) {
        case '/discovery':
          // Prefetch profile images from cache or next batch
          const cachedProfiles = GlobalDataCache.get<any[]>('discovery_profiles');
          if (cachedProfiles && cachedProfiles.length > 0) {
            const imageUrls = cachedProfiles
              .slice(0, 6) // First 6 profiles
              .map(p => p.profile_photo_url)
              .filter(Boolean);
            
            await ProgressiveImageLoader.preloadImages(imageUrls, eventId, 'high');
          }
          break;

        case '/matches':
          // Prefetch match profile images
          const cachedMatches = GlobalDataCache.get<any[]>('matches_list');
          if (cachedMatches && cachedMatches.length > 0) {
            const imageUrls = cachedMatches
              .slice(0, 5) // First 5 matches
              .map(m => m.profile_photo_url)
              .filter(Boolean);
            
            await ProgressiveImageLoader.preloadImages(imageUrls, eventId, 'high');
          }
          break;

        case '/chat':
          // Prefetch chat partner's profile image
          if (context.params?.matchId) {
            const chatProfile = GlobalDataCache.get(`chat_profile_${context.params.matchId}`);
            if (chatProfile?.profile_photo_url) {
              await ProgressiveImageLoader.preloadImages([chatProfile.profile_photo_url], eventId, 'high');
            }
          }
          break;
      }
    } catch (error) {
      console.warn('NavigationCacheManager: Image prefetch failed:', error);
    }
  }

  /**
   * Prefetch specific data item
   */
  private async prefetchSpecificData(item: string, eventId: string, sessionId: string): Promise<void> {
    switch (item) {
      case 'matches_list':
        // Would implement matches prefetching
        console.log('NavigationCacheManager: Prefetching matches list');
        break;
      
      case 'discovery_profiles_refresh':
        // Refresh discovery profiles in background
        console.log('NavigationCacheManager: Refreshing discovery profiles');
        break;
      
      case 'recent_messages':
        // Prefetch recent messages
        console.log('NavigationCacheManager: Prefetching recent messages');
        break;
      
      default:
        console.log(`NavigationCacheManager: Unknown prefetch item: ${item}`);
    }
  }

  /**
   * Prepare view with available cached data
   */
  private async prepareView(context: NavigationContext): Promise<PreparedViewData> {
    const { targetRoute, eventId, sessionId } = context;
    
    const requirements = this.routeRequirements[targetRoute] || [];
    const cacheChecks: Record<string, any> = {};
    
    let hasAllRequired = true;
    let hasAnyData = false;

    // Check cache for all requirements
    for (const req of requirements) {
      const cacheKey = this.buildCacheKey(req.cacheKey, eventId, sessionId, context.params);
      const cached = GlobalDataCache.get(cacheKey);
      
      cacheChecks[req.cacheKey] = {
        available: !!cached,
        data: cached,
        required: req.required
      };

      if (req.required && !cached) {
        hasAllRequired = false;
      }
      
      if (cached) {
        hasAnyData = true;
      }
    }

    // Determine view preparation result
    if (hasAllRequired) {
      return {
        type: 'ready',
        data: this.extractRequiredData(cacheChecks, requirements),
        cacheInfo: cacheChecks
      };
    } else if (hasAnyData) {
      return {
        type: 'partial',
        data: this.extractAvailableData(cacheChecks),
        cacheInfo: cacheChecks
      };
    } else {
      return {
        type: 'skeleton',
        cacheInfo: cacheChecks
      };
    }
  }

  /**
   * Extract required data from cache checks
   */
  private extractRequiredData(cacheChecks: Record<string, any>, requirements: RouteRequirement[]): any {
    const data: Record<string, any> = {};
    
    for (const req of requirements) {
      const check = cacheChecks[req.cacheKey];
      if (check?.available) {
        data[req.cacheKey] = check.data;
      }
    }
    
    return data;
  }

  /**
   * Extract available data (for partial state)
   */
  private extractAvailableData(cacheChecks: Record<string, any>): any {
    const data: Record<string, any> = {};
    
    Object.keys(cacheChecks).forEach(key => {
      const check = cacheChecks[key];
      if (check?.available) {
        data[key] = check.data;
      }
    });
    
    return data;
  }

  /**
   * Build cache key with context
   */
  private buildCacheKey(baseKey: string, eventId: string, sessionId: string, params?: any): string {
    switch (baseKey) {
      case 'discovery_profiles':
        return `discovery_profiles_${eventId}`;
      case 'matches_list':
        return `matches_list_${eventId}_${sessionId}`;
      case 'user_profile':
        return `user_profile_${sessionId}`;
      case 'chat_messages':
        return `chat_messages_${params?.matchId || 'unknown'}`;
      case 'chat_profile':
        return `chat_profile_${params?.matchId || 'unknown'}`;
      default:
        return `${baseKey}_${eventId}_${sessionId}`;
    }
  }

  /**
   * Preload route for instant navigation
   */
  async preloadRoute(targetRoute: string, context: NavigationContext): Promise<void> {
    try {
      console.log(`NavigationCacheManager: Preloading route ${targetRoute}`);
      
      const preparedView = await this.prepareView({ ...context, targetRoute });
      
      if (preparedView.type === 'skeleton') {
        // Start prefetching since we have no cache
        await this.startPrefetching({ ...context, targetRoute });
      }
    } catch (error) {
      console.warn(`NavigationCacheManager: Failed to preload route ${targetRoute}:`, error);
    }
  }

  /**
   * Invalidate route cache
   */
  invalidateRoute(route: string, eventId: string, sessionId: string): void {
    const requirements = this.routeRequirements[route] || [];
    
    requirements.forEach(req => {
      const cacheKey = this.buildCacheKey(req.cacheKey, eventId, sessionId);
      GlobalDataCache.clear(cacheKey);
    });
    
    console.log(`NavigationCacheManager: Invalidated cache for route ${route}`);
  }

  /**
   * Get navigation readiness for route
   */
  getRouteReadiness(route: string, eventId: string, sessionId: string, params?: any): {
    ready: boolean;
    partial: boolean;
    missingRequired: string[];
    availableOptional: string[];
  } {
    const requirements = this.routeRequirements[route] || [];
    const missingRequired: string[] = [];
    const availableOptional: string[] = [];
    
    let ready = true;
    let hasAnyData = false;

    requirements.forEach(req => {
      const cacheKey = this.buildCacheKey(req.cacheKey, eventId, sessionId, params);
      const cached = GlobalDataCache.get(cacheKey);
      
      if (req.required && !cached) {
        ready = false;
        missingRequired.push(req.cacheKey);
      } else if (!req.required && cached) {
        availableOptional.push(req.cacheKey);
        hasAnyData = true;
      }
      
      if (cached) {
        hasAnyData = true;
      }
    });

    return {
      ready,
      partial: hasAnyData && !ready,
      missingRequired,
      availableOptional
    };
  }

  /**
   * Clean up navigation caches
   */
  cleanup(eventId: string): void {
    console.log(`NavigationCacheManager: Cleaning up caches for event ${eventId}`);
    
    // Clear prefetch manager
    PrefetchManager.clearEventCache(eventId);
    
    // Clear view state manager would be called separately
    // ViewStateManager doesn't have event-specific cleanup in current implementation
  }

  /**
   * Get navigation statistics
   */
  getStats() {
    return {
      routeCount: Object.keys(this.routeRequirements).length,
      prefetchStats: PrefetchManager.getStats(),
      imageStats: ProgressiveImageLoader.getStats(),
      cacheStats: GlobalDataCache.getStats()
    };
  }
}

export const NavigationCacheManager = new NavigationCacheManagerClass();