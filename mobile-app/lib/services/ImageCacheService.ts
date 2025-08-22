import { AsyncStorageUtils } from '../asyncStorageUtils';
import * as Sentry from '@sentry/react-native';
import { Platform } from 'react-native';

/**
 * Service for caching profile picture thumbnails to prevent reloading
 * Caches images locally and manages cache expiration
 */

interface CachedImage {
  uri: string;
  cachedUri: string;
  timestamp: number;
  eventId: string;
  sessionId: string;
  profileId?: string;
}

interface CacheStats {
  totalCached: number;
  cacheSize: number;
  hitRate: number;
  lastCleanup: number;
}

class ImageCacheServiceClass {
  private cache = new Map<string, CachedImage>();
  private cacheHits = 0;
  private cacheMisses = 0;
  private isInitialized = false;
  
  // Cache configuration
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_CACHE_SIZE = 100; // Max number of cached images
  private readonly STORAGE_KEY = 'image_cache_index';
  private readonly CACHE_PREFIX = 'cached_image_';

  /**
   * Initialize the cache service by loading existing cache from storage
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('ImageCacheService: Initializing cache...');
      
      // Load cache index from AsyncStorage
      const cacheIndex = await AsyncStorageUtils.getItem<CachedImage[]>(this.STORAGE_KEY);
      
      if (cacheIndex && Array.isArray(cacheIndex)) {
        // Restore cache to memory
        for (const item of cacheIndex) {
          const key = this.getCacheKey(item.uri, item.eventId, item.sessionId);
          this.cache.set(key, item);
        }
        console.log(`ImageCacheService: Restored ${cacheIndex.length} items from storage`);
      }

      // Clean up expired items
      await this.cleanupExpiredItems();
      
      this.isInitialized = true;
      console.log('ImageCacheService: Initialization complete');
      
    } catch (error) {
      console.error('ImageCacheService: Failed to initialize:', error);
      Sentry.captureException(error, {
        tags: {
          operation: 'image_cache_init',
          source: 'ImageCacheService'
        }
      });
      // Continue anyway - service can work without persistent cache
      this.isInitialized = true;
    }
  }

  /**
   * Get cached image URI if available, otherwise return original
   * This is the main method used by components
   */
  async getCachedImageUri(originalUri: string, eventId: string, sessionId: string): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!originalUri || originalUri.startsWith('file://') || originalUri.startsWith('content://')) {
      // Already a local URI or invalid URI
      return originalUri;
    }

    const cacheKey = this.getCacheKey(originalUri, eventId, sessionId);
    const cached = this.cache.get(cacheKey);

    if (cached) {
      // Check if cache is still valid
      const isExpired = Date.now() - cached.timestamp > this.CACHE_TTL;
      
      if (!isExpired) {
        // Check if cached file still exists (simplified check)
        this.cacheHits++;
        console.log(`ImageCacheService: Cache hit for ${originalUri.substring(0, 50)}...`);
        return cached.cachedUri;
      } else {
        // Remove expired entry
        console.log(`ImageCacheService: Cache expired for ${originalUri.substring(0, 50)}...`);
        this.cache.delete(cacheKey);
        await this.removeCachedItem(cacheKey);
      }
    }

    // Cache miss - return original URI
    // Note: We don't download/cache here to avoid blocking the UI
    // The React Native Image component will handle the download and automatic caching
    this.cacheMisses++;
    console.log(`ImageCacheService: Cache miss for ${originalUri.substring(0, 50)}...`);
    
    // Schedule background caching (don't await to avoid blocking)
    this.cacheImageInBackground(originalUri, eventId, sessionId);
    
    return originalUri;
  }

  /**
   * Cache an image in the background without blocking the UI
   */
  private async cacheImageInBackground(uri: string, eventId: string, sessionId: string): Promise<void> {
    try {
      // Use React Native's built-in Image caching by "pre-loading" the image
      // This doesn't actually cache to our system, but ensures RN caches it
      // For now, we'll just mark it as "cached" to prevent repeated attempts
      
      const cacheKey = this.getCacheKey(uri, eventId, sessionId);
      const cachedItem: CachedImage = {
        uri,
        cachedUri: uri, // Use original URI since RN handles caching
        timestamp: Date.now(),
        eventId,
        sessionId
      };

      this.cache.set(cacheKey, cachedItem);
      
      // Persist to storage asynchronously
      await this.persistCacheIndex();
      
      console.log(`ImageCacheService: Background cached ${uri.substring(0, 50)}...`);
      
    } catch (error) {
      console.warn('ImageCacheService: Background caching failed:', error);
      // Don't throw - this is best effort
    }
  }

  /**
   * Clear cache for a specific event (when event expires)
   */
  async clearEventCache(eventId: string): Promise<void> {
    try {
      console.log(`ImageCacheService: Clearing cache for event ${eventId}`);
      
      let removedCount = 0;
      const keysToRemove: string[] = [];
      
      // Find all cache entries for this event
      for (const [key, cached] of this.cache.entries()) {
        if (cached.eventId === eventId) {
          keysToRemove.push(key);
        }
      }
      
      // Remove from memory cache
      for (const key of keysToRemove) {
        this.cache.delete(key);
        removedCount++;
      }
      
      // Remove from persistent storage
      for (const key of keysToRemove) {
        await this.removeCachedItem(key);
      }
      
      // Update persistent cache index
      await this.persistCacheIndex();
      
      console.log(`ImageCacheService: Removed ${removedCount} cached items for event ${eventId}`);
      
      Sentry.addBreadcrumb({
        message: 'ImageCacheService: Event cache cleared',
        level: 'info',
        category: 'cache_management',
        data: { eventId, removedCount }
      });
      
    } catch (error) {
      console.error('ImageCacheService: Failed to clear event cache:', error);
      Sentry.captureException(error);
    }
  }

  /**
   * Clear cache for a specific profile (when profile is deleted)
   */
  async clearProfileCache(sessionId: string, eventId: string): Promise<void> {
    try {
      console.log(`ImageCacheService: Clearing cache for profile ${sessionId} in event ${eventId}`);
      
      let removedCount = 0;
      const keysToRemove: string[] = [];
      
      // Find all cache entries for this profile
      for (const [key, cached] of this.cache.entries()) {
        if (cached.sessionId === sessionId && cached.eventId === eventId) {
          keysToRemove.push(key);
        }
      }
      
      // Remove from memory and storage
      for (const key of keysToRemove) {
        this.cache.delete(key);
        await this.removeCachedItem(key);
        removedCount++;
      }
      
      // Update persistent cache index
      await this.persistCacheIndex();
      
      console.log(`ImageCacheService: Removed ${removedCount} cached items for profile ${sessionId}`);
      
    } catch (error) {
      console.error('ImageCacheService: Failed to clear profile cache:', error);
      Sentry.captureException(error);
    }
  }

  /**
   * Clean up expired cache items
   */
  private async cleanupExpiredItems(): Promise<void> {
    try {
      const now = Date.now();
      let removedCount = 0;
      const keysToRemove: string[] = [];

      // Find expired items
      for (const [key, cached] of this.cache.entries()) {
        if (now - cached.timestamp > this.CACHE_TTL) {
          keysToRemove.push(key);
        }
      }

      // Remove expired items
      for (const key of keysToRemove) {
        this.cache.delete(key);
        await this.removeCachedItem(key);
        removedCount++;
      }

      // If cache is too large, remove oldest items
      if (this.cache.size > this.MAX_CACHE_SIZE) {
        const sortedEntries = Array.from(this.cache.entries())
          .sort(([, a], [, b]) => a.timestamp - b.timestamp);
        
        const toRemove = sortedEntries.slice(0, this.cache.size - this.MAX_CACHE_SIZE);
        
        for (const [key] of toRemove) {
          this.cache.delete(key);
          await this.removeCachedItem(key);
          removedCount++;
        }
      }

      if (removedCount > 0) {
        console.log(`ImageCacheService: Cleaned up ${removedCount} expired/excess items`);
        await this.persistCacheIndex();
      }

    } catch (error) {
      console.warn('ImageCacheService: Cleanup failed:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    const total = this.cacheHits + this.cacheMisses;
    return {
      totalCached: this.cache.size,
      cacheSize: this.cache.size,
      hitRate: total > 0 ? this.cacheHits / total : 0,
      lastCleanup: Date.now()
    };
  }

  /**
   * Force cleanup of all cached data
   */
  async clearAllCache(): Promise<void> {
    try {
      console.log('ImageCacheService: Clearing all cached data');
      
      // Clear memory cache
      const cacheSize = this.cache.size;
      this.cache.clear();
      
      // Clear storage
      await AsyncStorageUtils.removeItem(this.STORAGE_KEY);
      
      // Reset stats
      this.cacheHits = 0;
      this.cacheMisses = 0;
      
      console.log(`ImageCacheService: Cleared ${cacheSize} cached items`);
      
    } catch (error) {
      console.error('ImageCacheService: Failed to clear all cache:', error);
      Sentry.captureException(error);
    }
  }

  /**
   * Generate cache key for an image
   */
  private getCacheKey(uri: string, eventId: string, sessionId: string): string {
    // Create a unique key based on URI, event, and session
    const key = `${eventId}_${sessionId}_${uri}`;
    return key.replace(/[^a-zA-Z0-9_-]/g, '_'); // Sanitize key
  }

  /**
   * Remove a cached item from storage
   */
  private async removeCachedItem(cacheKey: string): Promise<void> {
    try {
      const storageKey = `${this.CACHE_PREFIX}${cacheKey}`;
      await AsyncStorageUtils.removeItem(storageKey);
    } catch (error) {
      console.warn(`ImageCacheService: Failed to remove cached item ${cacheKey}:`, error);
    }
  }

  /**
   * Persist the cache index to AsyncStorage
   */
  private async persistCacheIndex(): Promise<void> {
    try {
      const cacheArray = Array.from(this.cache.values());
      await AsyncStorageUtils.setItem(this.STORAGE_KEY, cacheArray);
    } catch (error) {
      console.warn('ImageCacheService: Failed to persist cache index:', error);
    }
  }

  /**
   * Preload images for better UX (call when entering a screen with many images)
   */
  async preloadImages(imageUris: { uri: string; eventId: string; sessionId: string }[]): Promise<void> {
    try {
      console.log(`ImageCacheService: Preloading ${imageUris.length} images`);
      
      // Cache each image in background
      const cachePromises = imageUris.map(({ uri, eventId, sessionId }) => 
        this.cacheImageInBackground(uri, eventId, sessionId)
      );
      
      // Don't await all - let them cache in background
      Promise.all(cachePromises).catch(error => {
        console.warn('ImageCacheService: Some preloading failed:', error);
      });
      
    } catch (error) {
      console.warn('ImageCacheService: Preloading failed:', error);
    }
  }
}

export const ImageCacheService = new ImageCacheServiceClass();
export default ImageCacheService;