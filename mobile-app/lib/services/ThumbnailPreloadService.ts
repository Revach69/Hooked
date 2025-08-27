/**
 * Instagram-Style Thumbnail Preload Service
 * 
 * Aggressively downloads and caches profile thumbnails in background
 * Uses significant disk space but eliminates all loading flashes
 */

import { MMKV } from 'react-native-mmkv';
import * as FileSystem from 'expo-file-system';
import { Image } from 'react-native';
import * as Sentry from '@sentry/react-native';

// Dedicated storage for thumbnail cache metadata
const thumbnailStorage = new MMKV({ 
  id: 'hooked-thumbnail-cache',
  encryptionKey: 'hooked-thumbnails-2024'
});

interface ThumbnailCache {
  profileId: string;
  originalUrl: string;
  localPath: string;
  downloadedAt: number;
  fileSize: number;
}

class ThumbnailPreloadServiceClass {
  private downloadQueue = new Set<string>();
  private downloading = new Set<string>();
  private cacheDir: string;
  private maxCacheSize = 150 * 1024 * 1024; // 150MB thumbnail cache (increased for better performance)
  private thumbnailSize = { width: 300, height: 300 }; // Consistent thumbnail size
  
  // Performance optimization: In-memory validation cache to avoid repeated file system calls
  private validatedPaths = new Map<string, { path: string; validUntil: number }>();
  private validationCacheDuration = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.cacheDir = `${FileSystem.documentDirectory}thumbnails/`;
    // Initialize directory synchronously to prevent download failures
    this.initializeCacheDirectorySync();
  }

  private initializeCacheDirectorySync(): void {
    // Initialize directory synchronously to prevent race conditions
    FileSystem.getInfoAsync(this.cacheDir)
      .then(dirInfo => {
        if (!dirInfo.exists) {
          return FileSystem.makeDirectoryAsync(this.cacheDir, { intermediates: true });
        }
      })
      .then(() => {
        console.log('ThumbnailPreloadService: Cache directory initialized');
      })
      .catch(error => {
        console.error('ThumbnailPreloadService: Failed to create cache directory:', error);
      });
  }

  private async ensureCacheDirectory(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.cacheDir, { intermediates: true });
        console.log('ThumbnailPreloadService: Cache directory created on demand');
      }
    } catch (error) {
      console.error('ThumbnailPreloadService: Failed to create cache directory:', error);
      throw error;
    }
  }

  /**
   * Preload thumbnails for an array of profiles
   * Called when new profiles are loaded into the store
   */
  async preloadProfileThumbnails(profiles: any[]): Promise<void> {
    console.log(`ThumbnailPreloadService: Queuing ${profiles.length} profiles for preload`);
    
    for (const profile of profiles) {
      if (profile.profile_photo_url) {
        this.queueThumbnailDownload(profile.session_id, profile.profile_photo_url);
      }
    }

    // Process queue in background
    this.processDownloadQueue();
  }

  /**
   * Queue a thumbnail for download (non-blocking)
   */
  queueThumbnailDownload(profileId: string, imageUrl: string): void {
    // Skip if already cached or downloading
    if (this.isThumbnailCached(profileId) || this.downloading.has(profileId)) {
      return;
    }

    this.downloadQueue.add(`${profileId}|${imageUrl}`);
  }

  /**
   * Process download queue with concurrency control
   */
  async processDownloadQueue(): Promise<void> {
    const concurrentDownloads = 6; // Increased to 6 for faster preloading (more aggressive caching)
    const queueArray = Array.from(this.downloadQueue);
    
    for (let i = 0; i < queueArray.length; i += concurrentDownloads) {
      const batch = queueArray.slice(i, i + concurrentDownloads);
      
      await Promise.allSettled(
        batch.map(async (queueItem) => {
          const [profileId, imageUrl] = queueItem.split('|');
          this.downloadQueue.delete(queueItem);
          return this.downloadThumbnail(profileId, imageUrl);
        })
      );
    }
  }

  /**
   * Download and cache a single thumbnail
   */
  private async downloadThumbnail(profileId: string, imageUrl: string): Promise<void> {
    if (this.downloading.has(profileId)) return;
    
    this.downloading.add(profileId);
    const localPath = `${this.cacheDir}${profileId}.jpg`;

    try {
      console.log(`ThumbnailPreloadService: Downloading thumbnail for ${profileId}`);
      
      // Ensure directory exists before download
      await this.ensureCacheDirectory();
      
      // Download with file system
      const downloadResult = await FileSystem.downloadAsync(imageUrl, localPath);
      
      if (downloadResult.status === 200) {
        const fileInfo = await FileSystem.getInfoAsync(localPath);
        
        // Store cache metadata
        const cacheEntry: ThumbnailCache = {
          profileId,
          originalUrl: imageUrl,
          localPath,
          downloadedAt: Date.now(),
          fileSize: (fileInfo as any).size || 0
        };

        thumbnailStorage.set(profileId, JSON.stringify(cacheEntry));
        
        // Preload into React Native Image cache
        Image.prefetch(localPath);
        
        console.log(`ThumbnailPreloadService: Cached thumbnail for ${profileId} (${Math.round(((fileInfo as any).size || 0) / 1024)}KB)`);
        
        // Cleanup old cache if needed
        await this.cleanupCacheIfNeeded();
      }
    } catch (error) {
      console.warn(`ThumbnailPreloadService: Failed to download thumbnail for ${profileId}:`, error);
      // Remove failed file
      try {
        await FileSystem.deleteAsync(localPath, { idempotent: true });
      } catch {}
    } finally {
      this.downloading.delete(profileId);
    }
  }

  /**
   * Get cached thumbnail path as file URI (instant)
   */
  getCachedThumbnailPath(profileId: string): string | null {
    try {
      const cacheData = thumbnailStorage.getString(profileId);
      if (cacheData) {
        const cache: ThumbnailCache = JSON.parse(cacheData);
        // FileSystem.documentDirectory already includes file:// prefix in Expo
        // Just return the localPath as-is since it's already a valid file URI
        console.log(`ThumbnailPreloadService: Retrieved cached path: ${cache.localPath}`);
        return cache.localPath;
      }
    } catch (error) {
      console.warn('ThumbnailPreloadService: Failed to get cached path:', error);
    }
    return null;
  }

  /**
   * Get cached thumbnail path with file existence validation
   */
  async getCachedThumbnailPathAsync(profileId: string): Promise<string | null> {
    try {
      const cacheData = thumbnailStorage.getString(profileId);
      if (cacheData) {
        const cache: ThumbnailCache = JSON.parse(cacheData);
        
        // Verify the file actually exists
        const fileInfo = await FileSystem.getInfoAsync(cache.localPath);
        if (fileInfo.exists) {
          console.log(`ThumbnailPreloadService: Retrieved cached path: ${cache.localPath}`);
          return cache.localPath;
        } else {
          // File is missing, remove from cache
          console.warn(`ThumbnailPreloadService: Cached file missing for ${profileId}, removing from cache`);
          thumbnailStorage.delete(profileId);
          return null;
        }
      }
    } catch (error) {
      console.warn('ThumbnailPreloadService: Failed to get cached path:', error);
    }
    return null;
  }

  /**
   * Get cached thumbnail with fallback to redownload if missing
   */
  async getCachedThumbnailPathWithFallback(profileId: string, originalUrl: string): Promise<string | null> {
    try {
      const cachedPath = await this.getCachedThumbnailPathAsync(profileId);
      if (cachedPath) {
        return cachedPath;
      }
      
      // File doesn't exist, trigger redownload in background
      console.log(`ThumbnailPreloadService: File missing for ${profileId}, triggering redownload`);
      this.queueThumbnailDownload(profileId, originalUrl);
      this.processDownloadQueue();
      
      return null;
    } catch (error) {
      console.warn('ThumbnailPreloadService: Failed to get cached path with fallback:', error);
      return null;
    }
  }

  /**
   * PERFORMANCE OPTIMIZED: Get validated cached path instantly (synchronous)
   * Uses in-memory validation cache to avoid file system calls
   */
  getCachedThumbnailPathSync(profileId: string): string | null {
    try {
      // Check in-memory validation cache first
      const validated = this.validatedPaths.get(profileId);
      if (validated && Date.now() < validated.validUntil) {
        console.log(`ThumbnailPreloadService: Using validated cached path: ${validated.path}`);
        return validated.path;
      }

      // Fall back to metadata check (still synchronous)
      const cacheData = thumbnailStorage.getString(profileId);
      if (cacheData) {
        const cache: ThumbnailCache = JSON.parse(cacheData);
        console.log(`ThumbnailPreloadService: Retrieved cached path: ${cache.localPath}`);
        return cache.localPath;
      }
    } catch (error) {
      console.warn('ThumbnailPreloadService: Failed to get cached path sync:', error);
    }
    return null;
  }

  /**
   * PERFORMANCE OPTIMIZED: Batch validate all cached thumbnails for given profile IDs
   */
  async batchValidateCachedThumbnails(profileIds: string[]): Promise<Map<string, string>> {
    const validatedPaths = new Map<string, string>();
    const validationPromises: Promise<void>[] = [];

    // Process validations in parallel instead of sequentially
    for (const profileId of profileIds) {
      validationPromises.push(
        (async () => {
          try {
            // Check in-memory cache first
            const validated = this.validatedPaths.get(profileId);
            if (validated && Date.now() < validated.validUntil) {
              validatedPaths.set(profileId, validated.path);
              return;
            }

            // Validate from file system
            const cacheData = thumbnailStorage.getString(profileId);
            if (cacheData) {
              const cache: ThumbnailCache = JSON.parse(cacheData);
              const fileInfo = await FileSystem.getInfoAsync(cache.localPath);
              
              if (fileInfo.exists) {
                // Cache the validation result in memory
                this.validatedPaths.set(profileId, {
                  path: cache.localPath,
                  validUntil: Date.now() + this.validationCacheDuration
                });
                validatedPaths.set(profileId, cache.localPath);
              } else {
                // Clean up missing files
                thumbnailStorage.delete(profileId);
                this.validatedPaths.delete(profileId);
              }
            }
          } catch (error) {
            console.warn(`ThumbnailPreloadService: Failed to validate ${profileId}:`, error);
          }
        })()
      );
    }

    // Wait for all validations to complete
    await Promise.allSettled(validationPromises);
    
    console.log(`ThumbnailPreloadService: Batch validated ${validatedPaths.size}/${profileIds.length} thumbnails`);
    return validatedPaths;
  }

  /**
   * Check if thumbnail is already cached
   */
  isThumbnailCached(profileId: string): boolean {
    return thumbnailStorage.contains(profileId);
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{ totalFiles: number; totalSize: number; sizeInMB: number }> {
    try {
      const allKeys = thumbnailStorage.getAllKeys();
      let totalSize = 0;
      
      for (const key of allKeys) {
        const cacheData = thumbnailStorage.getString(key);
        if (cacheData) {
          const cache: ThumbnailCache = JSON.parse(cacheData);
          totalSize += cache.fileSize;
        }
      }

      return {
        totalFiles: allKeys.length,
        totalSize,
        sizeInMB: Math.round(totalSize / (1024 * 1024) * 100) / 100
      };
    } catch (error) {
      return { totalFiles: 0, totalSize: 0, sizeInMB: 0 };
    }
  }

  /**
   * Cleanup cache when it exceeds max size
   */
  private async cleanupCacheIfNeeded(): Promise<void> {
    const stats = await this.getCacheStats();
    
    if (stats.totalSize > this.maxCacheSize) {
      console.log(`ThumbnailPreloadService: Cache size (${stats.sizeInMB}MB) exceeds limit, cleaning up`);
      
      // Get all cache entries sorted by age
      const allKeys = thumbnailStorage.getAllKeys();
      const cacheEntries: ThumbnailCache[] = [];
      
      for (const key of allKeys) {
        try {
          const cacheData = thumbnailStorage.getString(key);
          if (cacheData) {
            cacheEntries.push(JSON.parse(cacheData));
          }
        } catch (error) {
          // Remove corrupt entry
          thumbnailStorage.delete(key);
        }
      }
      
      // Sort by download date (oldest first)
      cacheEntries.sort((a, b) => a.downloadedAt - b.downloadedAt);
      
      // Remove oldest 25% of files
      const filesToRemove = Math.floor(cacheEntries.length * 0.25);
      
      for (let i = 0; i < filesToRemove; i++) {
        const entry = cacheEntries[i];
        try {
          await FileSystem.deleteAsync(entry.localPath, { idempotent: true });
          thumbnailStorage.delete(entry.profileId);
        } catch (error) {
          console.warn('ThumbnailPreloadService: Failed to delete cached file:', error);
        }
      }
      
      console.log(`ThumbnailPreloadService: Cleaned up ${filesToRemove} old thumbnails`);
    }
  }

  /**
   * Clear all cached thumbnails
   */
  async clearCache(): Promise<void> {
    try {
      await FileSystem.deleteAsync(this.cacheDir, { idempotent: true });
      thumbnailStorage.clearAll();
      await this.initializeCacheDirectory();
      console.log('ThumbnailPreloadService: Cache cleared');
    } catch (error) {
      console.error('ThumbnailPreloadService: Failed to clear cache:', error);
    }
  }
}

export const ThumbnailPreloadService = new ThumbnailPreloadServiceClass();