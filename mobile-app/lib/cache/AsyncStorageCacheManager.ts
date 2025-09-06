/**
 * AsyncStorageCacheManager - Persistent storage layer for Hooked app
 * Implements multi-layer storage with intelligent eviction and priority management
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { GlobalDataCache } from './GlobalDataCache';

interface StorageEntry<T> {
  key: string;
  data: T;
  timestamp: number;
  lastAccessed: number;
  accessCount: number;
  size: number;
  type: DataType;
  priority: Priority;
  ttl?: number;
}

type DataType = 'profiles' | 'images' | 'messages' | 'events' | 'app_state';
type Priority = 'critical' | 'high' | 'medium' | 'low';

interface StoragePolicy {
  maxSize: number;
  ttl: number;
  priority: Priority;
  evictionOrder: number;
}

class AsyncStorageCacheManagerClass {
  private readonly MAX_STORAGE_SIZE = 100 * 1024 * 1024; // 100MB limit for React Native
  private readonly CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutes
  private readonly PREFIX = 'hooked_cache_';
  
  private policies: Record<DataType, StoragePolicy> = {
    profiles: { maxSize: 40 * 1024 * 1024, ttl: 60 * 60 * 1000, priority: 'high', evictionOrder: 2 },      // 40MB, 1 hour
    images: { maxSize: 50 * 1024 * 1024, ttl: 24 * 60 * 60 * 1000, priority: 'medium', evictionOrder: 4 },  // 50MB, 24 hours
    messages: { maxSize: 5 * 1024 * 1024, ttl: 30 * 60 * 1000, priority: 'high', evictionOrder: 1 },        // 5MB, 30 min
    events: { maxSize: 3 * 1024 * 1024, ttl: 2 * 60 * 60 * 1000, priority: 'low', evictionOrder: 3 },       // 3MB, 2 hours
    app_state: { maxSize: 2 * 1024 * 1024, ttl: 7 * 24 * 60 * 60 * 1000, priority: 'critical', evictionOrder: 0 } // 2MB, 7 days
  };

  private cleanupTimer?: NodeJS.Timeout;

  constructor() {
    this.startCleanupTimer();
  }

  /**
   * Store data with intelligent priority and eviction management
   */
  async store<T>(
    key: string, 
    data: T, 
    type: DataType, 
    customTtl?: number
  ): Promise<boolean> {
    try {
      const policy = this.policies[type];
      const size = this.calculateSize(data);
      const now = Date.now();

      // Check if this would exceed type-specific limit
      if (size > policy.maxSize) {
        console.warn(`AsyncStorageCacheManager: Data too large for ${type} (${size} > ${policy.maxSize})`);
        return false;
      }

      const entry: StorageEntry<T> = {
        key,
        data,
        timestamp: now,
        lastAccessed: now,
        accessCount: 1,
        size,
        type,
        priority: policy.priority,
        ttl: customTtl || policy.ttl
      };

      const storageKey = this.getStorageKey(key);
      
      // Check if we need to free space
      await this.ensureSpace(size, type);

      // Store in AsyncStorage
      await AsyncStorage.setItem(storageKey, JSON.stringify(entry));

      // Also cache in memory for immediate access
      GlobalDataCache.set(key, data, entry.ttl);

      console.log(`AsyncStorageCacheManager: Stored ${type} - ${key} (${this.formatSize(size)})`);
      return true;

    } catch (error) {
      console.error(`AsyncStorageCacheManager: Failed to store ${key}:`, error);
      return false;
    }
  }

  /**
   * Retrieve data with access tracking
   */
  async retrieve<T>(key: string, type?: DataType): Promise<T | null> {
    try {
      const storageKey = this.getStorageKey(key);
      const stored = await AsyncStorage.getItem(storageKey);
      
      if (!stored) {
        return null;
      }

      const entry: StorageEntry<T> = JSON.parse(stored);
      
      // Check expiration
      if (this.isExpired(entry)) {
        await this.remove(key);
        return null;
      }

      // Update access statistics
      entry.lastAccessed = Date.now();
      entry.accessCount++;
      
      // Update storage with new stats (async, don't wait)
      AsyncStorage.setItem(storageKey, JSON.stringify(entry)).catch(error => 
        console.warn('AsyncStorageCacheManager: Failed to update access stats:', error)
      );

      // Cache in memory for faster subsequent access
      GlobalDataCache.set(key, entry.data, entry.ttl);

      console.log(`AsyncStorageCacheManager: Retrieved ${entry.type} - ${key} (access: ${entry.accessCount})`);
      return entry.data;

    } catch (error) {
      console.error(`AsyncStorageCacheManager: Failed to retrieve ${key}:`, error);
      return null;
    }
  }

  /**
   * Check if data exists and is valid
   */
  async has(key: string): Promise<boolean> {
    try {
      const storageKey = this.getStorageKey(key);
      const stored = await AsyncStorage.getItem(storageKey);
      
      if (!stored) return false;

      const entry: StorageEntry<any> = JSON.parse(stored);
      return !this.isExpired(entry);
    } catch (error) {
      console.warn(`AsyncStorageCacheManager: Error checking existence of ${key}:`, error);
      return false;
    }
  }

  /**
   * Remove specific entry
   */
  async remove(key: string): Promise<void> {
    try {
      const storageKey = this.getStorageKey(key);
      await AsyncStorage.removeItem(storageKey);
      GlobalDataCache.clear(key);
      
      console.log(`AsyncStorageCacheManager: Removed ${key}`);
    } catch (error) {
      console.error(`AsyncStorageCacheManager: Failed to remove ${key}:`, error);
    }
  }

  /**
   * Ensure sufficient space by intelligent eviction
   */
  private async ensureSpace(requiredSize: number, type: DataType): Promise<void> {
    const currentSize = await this.calculateTotalSize();
    
    if (currentSize + requiredSize <= this.MAX_STORAGE_SIZE) {
      return; // Sufficient space available
    }

    console.log(`AsyncStorageCacheManager: Need to free space (current: ${this.formatSize(currentSize)}, required: ${this.formatSize(requiredSize)})`);
    
    const targetFreeSize = Math.max(requiredSize * 2, this.MAX_STORAGE_SIZE * 0.2); // Free at least 20% or 2x required
    await this.intelligentEviction(targetFreeSize);
  }

  /**
   * Intelligent eviction based on priority, age, and access patterns
   */
  private async intelligentEviction(targetFreeSize: number): Promise<void> {
    try {
      const allEntries = await this.getAllEntries();
      
      // Sort by eviction score (lower score = evict first)
      allEntries.sort((a, b) => this.calculateEvictionScore(a) - this.calculateEvictionScore(b));

      let freedSize = 0;
      const toRemove: string[] = [];

      for (const entry of allEntries) {
        if (freedSize >= targetFreeSize) break;
        
        // Never evict critical priority items
        if (entry.priority === 'critical') continue;
        
        toRemove.push(entry.key);
        freedSize += entry.size;
      }

      // Remove selected entries
      for (const key of toRemove) {
        await this.remove(key);
      }

      console.log(`AsyncStorageCacheManager: Evicted ${toRemove.length} items, freed ${this.formatSize(freedSize)}`);
    } catch (error) {
      console.error('AsyncStorageCacheManager: Eviction failed:', error);
    }
  }

  /**
   * Calculate eviction score (lower = more likely to evict)
   */
  private calculateEvictionScore(entry: StorageEntry<any>): number {
    const now = Date.now();
    const age = now - entry.timestamp;
    const lastAccessAge = now - entry.lastAccessed;
    
    // Priority weights
    const priorityWeights = { critical: 1000, high: 100, medium: 10, low: 1 };
    const priorityWeight = priorityWeights[entry.priority];
    
    // Access pattern score
    const accessScore = entry.accessCount * 100 / (lastAccessAge / 1000 + 1); // Recent + frequent = higher score
    
    // Size penalty (larger items more likely to be evicted)
    const sizePenalty = entry.size / (1024 * 1024); // MB
    
    // Age penalty
    const agePenalty = age / (60 * 60 * 1000); // Hours
    
    // Combined score (higher = keep longer)
    return (priorityWeight + accessScore) / (sizePenalty + agePenalty + 1);
  }

  /**
   * Get all cached entries with metadata
   */
  private async getAllEntries(): Promise<StorageEntry<any>[]> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith(this.PREFIX));
      
      const entries: StorageEntry<any>[] = [];
      
      for (const key of cacheKeys) {
        try {
          const stored = await AsyncStorage.getItem(key);
          if (stored) {
            const entry: StorageEntry<any> = JSON.parse(stored);
            entries.push(entry);
          }
        } catch (error) {
          console.warn(`AsyncStorageCacheManager: Failed to parse entry ${key}:`, error);
        }
      }
      
      return entries;
    } catch (error) {
      console.error('AsyncStorageCacheManager: Failed to get all entries:', error);
      return [];
    }
  }

  /**
   * Calculate total storage size
   */
  private async calculateTotalSize(): Promise<number> {
    const entries = await this.getAllEntries();
    return entries.reduce((total, entry) => total + entry.size, 0);
  }

  /**
   * Cleanup expired entries
   */
  async cleanup(): Promise<void> {
    try {
      console.log('AsyncStorageCacheManager: Starting cleanup...');
      
      const entries = await this.getAllEntries();
      const expired = entries.filter(entry => this.isExpired(entry));
      
      for (const entry of expired) {
        await this.remove(entry.key);
      }
      
      console.log(`AsyncStorageCacheManager: Cleanup complete - removed ${expired.length} expired entries`);
    } catch (error) {
      console.error('AsyncStorageCacheManager: Cleanup failed:', error);
    }
  }

  /**
   * Smart preload based on usage patterns
   */
  async preloadCriticalData(eventId: string, sessionId: string): Promise<void> {
    const criticalKeys = [
      `user_profile_${sessionId}`,
      `discovery_profiles_${eventId}`,
      `matches_list_${eventId}_${sessionId}`
    ];

    for (const key of criticalKeys) {
      try {
        const data = await this.retrieve(key);
        if (data) {
          // Data is now in memory cache for instant access
          console.log(`AsyncStorageCacheManager: Preloaded ${key}`);
        }
      } catch (error) {
        console.warn(`AsyncStorageCacheManager: Failed to preload ${key}:`, error);
      }
    }
  }

  /**
   * Clear all data for specific event
   */
  async clearEventData(eventId: string): Promise<void> {
    try {
      const entries = await this.getAllEntries();
      const eventEntries = entries.filter(entry => 
        entry.key.includes(eventId) || 
        (entry.type === 'profiles' && entry.key.includes('discovery')) ||
        (entry.type === 'events' && entry.key.includes(eventId))
      );

      for (const entry of eventEntries) {
        await this.remove(entry.key);
      }

      console.log(`AsyncStorageCacheManager: Cleared ${eventEntries.length} entries for event ${eventId}`);
    } catch (error) {
      console.error(`AsyncStorageCacheManager: Failed to clear event data:`, error);
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalSize: number;
    totalEntries: number;
    typeBreakdown: Record<DataType, { count: number; size: number }>;
    priorityBreakdown: Record<Priority, { count: number; size: number }>;
    utilizationPercent: number;
  }> {
    try {
      const entries = await this.getAllEntries();
      const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
      
      const typeBreakdown: Record<DataType, { count: number; size: number }> = {
        profiles: { count: 0, size: 0 },
        images: { count: 0, size: 0 },
        messages: { count: 0, size: 0 },
        events: { count: 0, size: 0 },
        app_state: { count: 0, size: 0 }
      };

      const priorityBreakdown: Record<Priority, { count: number; size: number }> = {
        critical: { count: 0, size: 0 },
        high: { count: 0, size: 0 },
        medium: { count: 0, size: 0 },
        low: { count: 0, size: 0 }
      };

      entries.forEach(entry => {
        typeBreakdown[entry.type].count++;
        typeBreakdown[entry.type].size += entry.size;
        
        priorityBreakdown[entry.priority].count++;
        priorityBreakdown[entry.priority].size += entry.size;
      });

      return {
        totalSize,
        totalEntries: entries.length,
        typeBreakdown,
        priorityBreakdown,
        utilizationPercent: (totalSize / this.MAX_STORAGE_SIZE) * 100
      };
    } catch (error) {
      console.error('AsyncStorageCacheManager: Failed to get stats:', error);
      return {
        totalSize: 0,
        totalEntries: 0,
        typeBreakdown: {} as any,
        priorityBreakdown: {} as any,
        utilizationPercent: 0
      };
    }
  }

  /**
   * Helper methods
   */
  private getStorageKey(key: string): string {
    return `${this.PREFIX}${key}`;
  }

  private calculateSize(data: any): number {
    return JSON.stringify(data).length * 2; // Approximate UTF-16 byte size
  }

  private isExpired(entry: StorageEntry<any>): boolean {
    return Date.now() - entry.timestamp > (entry.ttl || this.policies[entry.type].ttl);
  }

  private formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup().catch(error => 
        console.warn('AsyncStorageCacheManager: Scheduled cleanup failed:', error)
      );
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }
}

export const AsyncStorageCacheManager = new AsyncStorageCacheManagerClass();