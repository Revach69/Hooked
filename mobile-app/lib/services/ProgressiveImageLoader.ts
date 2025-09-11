/**
 * ProgressiveImageLoader - Advanced image loading with blur hash and progressive enhancement
 * Adapted for React Native and Hooked app
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ImageCacheService } from './ImageCacheService';

interface BlurHashData {
  hash: string;
  width: number;
  height: number;
  timestamp: number;
}

interface ImageLoadProgress {
  stage: 'blur' | 'thumbnail' | 'full';
  loaded: boolean;
  error?: string;
}

class ProgressiveImageLoaderClass {
  private blurHashCache = new Map<string, BlurHashData>();
  private loadingPromises = new Map<string, Promise<string>>();

  /**
   * Load image progressively with blur hash -> thumbnail -> full image
   */
  async loadImageProgressive(
    imageUrl: string,
    eventId: string,
    sessionId: string,
    onProgress?: (progress: ImageLoadProgress) => void
  ): Promise<string> {
    try {
      const cacheKey = `progressive_${imageUrl}_${eventId}_${sessionId}`;
      
      // Check if already loading
      if (this.loadingPromises.has(cacheKey)) {
        return this.loadingPromises.get(cacheKey)!;
      }

      const loadPromise = this.performProgressiveLoad(
        imageUrl, 
        eventId, 
        sessionId, 
        onProgress
      );
      
      this.loadingPromises.set(cacheKey, loadPromise);
      
      const result = await loadPromise;
      
      this.loadingPromises.delete(cacheKey);
      
      return result;
    } catch (error) {
      console.error('ProgressiveImageLoader: Failed to load image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      onProgress?.({ stage: 'full', loaded: false, error: errorMessage });
      throw error;
    }
  }

  /**
   * Perform the actual progressive loading
   */
  private async performProgressiveLoad(
    imageUrl: string,
    eventId: string,
    sessionId: string,
    onProgress?: (progress: ImageLoadProgress) => void
  ): Promise<string> {
    
    // Stage 1: Load blur hash if available
    const blurHash = await this.getBlurHash(imageUrl);
    if (blurHash) {
      onProgress?.({ stage: 'blur', loaded: true });
      
      // Small delay to show blur hash
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Stage 2: Try to get cached full image
    const cachedImage = await ImageCacheService.getCachedImageUri(
      imageUrl,
      eventId,
      sessionId
    );

    if (cachedImage && cachedImage !== imageUrl) {
      // We have a cached version
      onProgress?.({ stage: 'full', loaded: true });
      return cachedImage;
    }

    // Stage 3: Load thumbnail version first (if we can generate one)
    try {
      const thumbnailUrl = this.getThumbnailUrl(imageUrl);
      if (thumbnailUrl && thumbnailUrl !== imageUrl) {
        const cachedThumbnail = await ImageCacheService.getCachedImageUri(
          thumbnailUrl,
          eventId,
          `${sessionId}_thumb`
        );
        
        if (cachedThumbnail) {
          onProgress?.({ stage: 'thumbnail', loaded: true });
          
          // Continue loading full image in background
          this.loadFullImageInBackground(imageUrl, eventId, sessionId, onProgress);
          
          return cachedThumbnail;
        }
      }
    } catch (error) {
      console.warn('ProgressiveImageLoader: Thumbnail loading failed:', error);
    }

    // Stage 4: Load full image
    const fullImage = await ImageCacheService.getCachedImageUri(
      imageUrl,
      eventId,
      sessionId
    );
    
    onProgress?.({ stage: 'full', loaded: true });
    return fullImage;
  }

  /**
   * Load full image in background after showing thumbnail
   */
  private async loadFullImageInBackground(
    imageUrl: string,
    eventId: string,
    sessionId: string,
    onProgress?: (progress: ImageLoadProgress) => void
  ): Promise<void> {
    try {
      // Small delay to let thumbnail display
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await ImageCacheService.getCachedImageUri(imageUrl, eventId, sessionId);
      
      onProgress?.({ stage: 'full', loaded: true });
    } catch (error) {
      console.warn('ProgressiveImageLoader: Background full image load failed:', error);
    }
  }

  /**
   * Generate and cache blur hash for image
   */
  async generateAndCacheBlurHash(imageUrl: string): Promise<string | null> {
    try {
      // In a real implementation, you'd generate the actual blur hash
      // For now, we'll simulate with a placeholder
      const simulatedHash = this.generateSimulatedBlurHash(imageUrl);
      
      const blurHashData: BlurHashData = {
        hash: simulatedHash,
        width: 400,
        height: 400,
        timestamp: Date.now()
      };

      // Cache in memory
      this.blurHashCache.set(imageUrl, blurHashData);

      // Cache in AsyncStorage for persistence
      await AsyncStorage.setItem(
        `blur_hash_${this.hashUrl(imageUrl)}`,
        JSON.stringify(blurHashData)
      );

      return simulatedHash;
    } catch (error) {
      console.warn('ProgressiveImageLoader: Failed to generate blur hash:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  /**
   * Get cached blur hash
   */
  private async getBlurHash(imageUrl: string): Promise<string | null> {
    try {
      // Check memory cache first
      const memoryCached = this.blurHashCache.get(imageUrl);
      if (memoryCached && !this.isBlurHashExpired(memoryCached)) {
        return memoryCached.hash;
      }

      // Check AsyncStorage
      const stored = await AsyncStorage.getItem(`blur_hash_${this.hashUrl(imageUrl)}`);
      if (stored) {
        const blurHashData: BlurHashData = JSON.parse(stored);
        
        if (!this.isBlurHashExpired(blurHashData)) {
          // Cache in memory for next time
          this.blurHashCache.set(imageUrl, blurHashData);
          return blurHashData.hash;
        }
      }

      return null;
    } catch (error) {
      console.warn('ProgressiveImageLoader: Failed to get blur hash:', error);
      return null;
    }
  }

  /**
   * Get thumbnail URL (would need to be adapted based on your image service)
   */
  private getThumbnailUrl(imageUrl: string): string | null {
    try {
      // If using Firebase Storage or similar service that supports transforms
      if (imageUrl.includes('firebase')) {
        // Add thumbnail parameters
        const url = new URL(imageUrl);
        url.searchParams.set('alt', 'media');
        // Note: Firebase doesn't support on-the-fly transforms
        // You'd need a different approach like Cloud Functions
        return imageUrl; // Return original for now
      }

      // If using a service like Cloudinary
      if (imageUrl.includes('cloudinary')) {
        return imageUrl.replace('/upload/', '/upload/w_200,h_200,c_fill/');
      }

      // If using a service like ImageKit
      if (imageUrl.includes('imagekit')) {
        return `${imageUrl}?tr=w-200,h-200,c-maintain_ratio`;
      }

      // Default: return original URL
      return imageUrl;
    } catch (error) {
      console.warn('ProgressiveImageLoader: Failed to get thumbnail URL:', error);
      return null;
    }
  }

  /**
   * Preload images for smooth scrolling
   */
  async preloadImages(
    imageUrls: string[],
    eventId: string,
    priority: 'high' | 'low' = 'low'
  ): Promise<void> {
    const maxConcurrent = priority === 'high' ? 3 : 1;
    
    for (let i = 0; i < imageUrls.length; i += maxConcurrent) {
      const batch = imageUrls.slice(i, i + maxConcurrent);
      
      const preloadPromises = batch.map(async (url) => {
        try {
          // Generate blur hash for future use
          await this.generateAndCacheBlurHash(url);
          
          // Preload thumbnail if supported
          const thumbnailUrl = this.getThumbnailUrl(url);
          if (thumbnailUrl && thumbnailUrl !== url) {
            await ImageCacheService.getCachedImageUri(thumbnailUrl, eventId, 'preload_thumb');
          }
          
          // Preload full image for high priority
          if (priority === 'high') {
            await ImageCacheService.getCachedImageUri(url, eventId, 'preload');
          }
        } catch (error) {
          console.warn('ProgressiveImageLoader: Failed to preload image:', url, error);
        }
      });

      await Promise.all(preloadPromises);
      
      // Small delay between batches to avoid overwhelming
      if (i + maxConcurrent < imageUrls.length) {
        await new Promise(resolve => setTimeout(resolve, priority === 'high' ? 50 : 200));
      }
    }
  }

  /**
   * Prefetch image with Network Information API awareness (React Native doesn't have this, but we can simulate)
   */
  async smartPreload(imageUrl: string, eventId: string, sessionId: string): Promise<void> {
    try {
      // Simulate network condition detection
      const isSlowConnection = await this.detectSlowConnection();
      
      if (isSlowConnection) {
        // Only preload blur hash and thumbnail on slow connections
        await this.generateAndCacheBlurHash(imageUrl);
        
        const thumbnailUrl = this.getThumbnailUrl(imageUrl);
        if (thumbnailUrl && thumbnailUrl !== imageUrl) {
          await ImageCacheService.getCachedImageUri(thumbnailUrl, eventId, `${sessionId}_thumb`);
        }
      } else {
        // Full preload on fast connections
        await this.loadImageProgressive(imageUrl, eventId, sessionId);
      }
    } catch (error) {
      console.warn('ProgressiveImageLoader: Smart preload failed:', error);
    }
  }

  /**
   * Detect slow connection (simplified for React Native)
   */
  private async detectSlowConnection(): Promise<boolean> {
    // In React Native, you might use @react-native-community/netinfo
    // For now, we'll return false (assuming good connection)
    return false;
  }

  /**
   * Generate a simple hash for URL
   */
  private hashUrl(url: string): string {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Generate simulated blur hash (in real app, you'd use actual blur hash algorithm)
   */
  private generateSimulatedBlurHash(url: string): string {
    const hash = this.hashUrl(url);
    // Return a simple base64-like string
    return `blur_${hash}`;
  }

  /**
   * Check if blur hash is expired
   */
  private isBlurHashExpired(blurHashData: BlurHashData): boolean {
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    return Date.now() - blurHashData.timestamp > maxAge;
  }

  /**
   * Clear expired blur hashes
   */
  async cleanupExpiredBlurHashes(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const blurHashKeys = allKeys.filter(key => key.startsWith('blur_hash_'));
      
      for (const key of blurHashKeys) {
        try {
          const stored = await AsyncStorage.getItem(key);
          if (stored) {
            const blurHashData: BlurHashData = JSON.parse(stored);
            if (this.isBlurHashExpired(blurHashData)) {
              await AsyncStorage.removeItem(key);
              
              // Also remove from memory cache
              const originalUrl = Array.from(this.blurHashCache.keys())
                .find(url => this.hashUrl(url) === key.replace('blur_hash_', ''));
              if (originalUrl) {
                this.blurHashCache.delete(originalUrl);
              }
            }
          }
        } catch {
          console.warn('ProgressiveImageLoader: Failed to cleanup blur hash:', key);
        }
      }
    } catch (error) {
      console.error('ProgressiveImageLoader: Failed to cleanup expired blur hashes:', error);
    }
  }

  /**
   * Get loader statistics
   */
  getStats() {
    return {
      blurHashCacheSize: this.blurHashCache.size,
      activeLoads: this.loadingPromises.size,
      memoryUsage: JSON.stringify(Array.from(this.blurHashCache.values())).length
    };
  }

  /**
   * Clear all caches
   */
  async clearAllCaches(): Promise<void> {
    this.blurHashCache.clear();
    this.loadingPromises.clear();
    
    // Clear AsyncStorage blur hashes
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const blurHashKeys = allKeys.filter(key => key.startsWith('blur_hash_'));
      
      if (blurHashKeys.length > 0) {
        await AsyncStorage.multiRemove(blurHashKeys);
      }
    } catch (error) {
      console.error('ProgressiveImageLoader: Failed to clear AsyncStorage caches:', error);
    }
  }
}

export const ProgressiveImageLoader = new ProgressiveImageLoaderClass();