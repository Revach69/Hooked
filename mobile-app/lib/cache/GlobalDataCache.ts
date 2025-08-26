/**
 * Simple global data cache to prevent pages from re-loading data when navigating
 * This provides Instagram-like smooth transitions by keeping data in memory
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl?: number; // Time to live in milliseconds
}

class GlobalDataCacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get data from cache if it exists and hasn't expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    const ttl = entry.ttl || this.DEFAULT_TTL;
    
    if (now - entry.timestamp > ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set data in cache with optional TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Check if key exists and hasn't expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Clear specific key
   */
  clear(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * Clear expired entries
   */
  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      const ttl = entry.ttl || this.DEFAULT_TTL;
      if (now - entry.timestamp > ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache stats
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const GlobalDataCache = new GlobalDataCacheService();

// Cache keys for different data types
export const CacheKeys = {
  // Discovery page data
  DISCOVERY_PROFILES: 'discovery_profiles',
  DISCOVERY_CURRENT_USER: 'discovery_current_user',
  DISCOVERY_EVENT: 'discovery_event',
  DISCOVERY_BLOCKED: 'discovery_blocked',
  DISCOVERY_SKIPPED: 'discovery_skipped',
  
  // Matches page data
  MATCHES_LIST: 'matches_list',
  MATCHES_EVENT: 'matches_event',
  MATCHES_CURRENT_USER: 'matches_current_user',
  
  // Profile page data  
  PROFILE_DATA: 'profile_data',
  PROFILE_EVENT: 'profile_event',
  
  // Chat data
  CHAT_MESSAGES: (matchId: string) => `chat_messages_${matchId}`,
  CHAT_PROFILE: (matchId: string) => `chat_profile_${matchId}`,
} as const;