/**
 * PrefetchManager - Predictive loading for Hooked mobile app
 * Adapted for React Native with Firebase backend
 */

import { EventProfileAPI, EventAPI, MessageAPI } from '../firebaseApi';
import { GlobalDataCache } from './GlobalDataCache';
import { ImageCacheService } from '../services/ImageCacheService';

interface PrefetchItem {
  key: string;
  type: 'profiles' | 'events' | 'messages' | 'images';
  priority: 'high' | 'medium' | 'low';
  timestamp: number;
  data?: any;
}

class PrefetchManagerClass {
  private prefetchQueue: PrefetchItem[] = [];
  private processing = false;
  private maxConcurrent = 2;
  private activeRequests = 0;

  /**
   * Prefetch based on navigation patterns for Hooked app
   */
  async prefetchForRoute(currentRoute: string, eventId: string, sessionId: string): Promise<void> {
    console.log(`PrefetchManager: Prefetching for route ${currentRoute}`);

    const prefetchRules = {
      '/discovery': [
        { key: `discovery_profiles_${eventId}`, type: 'profiles' as const, priority: 'high' as const },
        { key: `event_data_${eventId}`, type: 'events' as const, priority: 'medium' as const }
      ],
      '/matches': [
        { key: `matches_list_${eventId}_${sessionId}`, type: 'profiles' as const, priority: 'high' as const },
        { key: `recent_messages_${sessionId}`, type: 'messages' as const, priority: 'medium' as const }
      ],
      '/profile': [
        { key: `discovery_profiles_${eventId}`, type: 'profiles' as const, priority: 'medium' as const },
        { key: `user_profile_${sessionId}`, type: 'profiles' as const, priority: 'high' as const }
      ],
      '/chat': [
        { key: `matches_list_${eventId}_${sessionId}`, type: 'profiles' as const, priority: 'medium' as const }
      ]
    };

    const toPrefetch = prefetchRules[currentRoute as keyof typeof prefetchRules] || [];

    for (const item of toPrefetch) {
      await this.queuePrefetch({
        ...item,
        timestamp: Date.now()
      });
    }

    this.processPrefetchQueue();
  }

  /**
   * Prefetch profiles when user scrolls through discovery
   */
  async prefetchDiscoveryProfiles(
    currentIndex: number, 
    totalProfiles: any[], 
    eventId: string, 
    sessionId: string
  ): Promise<void> {
    // Prefetch next 10 profiles when user reaches 70% of current batch
    const prefetchThreshold = Math.floor(totalProfiles.length * 0.7);
    
    if (currentIndex >= prefetchThreshold) {
      console.log(`PrefetchManager: Prefetching next batch at index ${currentIndex}`);
      
      try {
        const nextProfiles = await EventProfileAPI.filter({
          event_id: eventId,
          is_visible: true
        });

        const unseen = nextProfiles.filter(p => 
          p.session_id !== sessionId && 
          !totalProfiles.some(existing => existing.session_id === p.session_id)
        );

        if (unseen.length > 0) {
          GlobalDataCache.set(`discovery_profiles_next_${eventId}`, unseen, 10 * 60 * 1000);
          
          // Prefetch images for these profiles
          this.prefetchProfileImages(unseen.slice(0, 5), eventId);
        }
      } catch (error) {
        console.warn('PrefetchManager: Failed to prefetch discovery profiles:', error);
      }
    }
  }

  /**
   * Prefetch profile images based on visibility
   */
  async prefetchProfileImages(profiles: any[], eventId: string): Promise<void> {
    const imagePromises = profiles
      .filter(profile => profile.profile_photo_url)
      .slice(0, 3) // Limit to first 3 to avoid overwhelming
      .map(profile => 
        this.queuePrefetch({
          key: `image_${profile.id}`,
          type: 'images',
          priority: 'low',
          timestamp: Date.now(),
          data: {
            url: profile.profile_photo_url,
            eventId,
            sessionId: profile.session_id
          }
        })
      );

    await Promise.all(imagePromises);
    this.processPrefetchQueue();
  }

  /**
   * Prefetch chat messages when match is likely to be opened
   */
  async prefetchChatMessages(matchId: string, eventId: string, currentSessionId: string): Promise<void> {
    try {
      const profiles = await EventProfileAPI.filter({
        session_id: matchId,
        event_id: eventId
      });

      if (profiles.length > 0) {
        const matchProfile = profiles[0];
        
        await this.queuePrefetch({
          key: `chat_profile_${matchId}`,
          type: 'profiles',
          priority: 'high',
          timestamp: Date.now(),
          data: matchProfile
        });

        // Prefetch recent messages
        await this.queuePrefetch({
          key: `chat_messages_${matchId}`,
          type: 'messages',
          priority: 'medium',
          timestamp: Date.now(),
          data: { matchId, eventId, currentSessionId }
        });
      }
    } catch (error) {
      console.warn('PrefetchManager: Failed to prefetch chat data:', error);
    }
  }

  /**
   * Queue item for prefetching
   */
  private async queuePrefetch(item: PrefetchItem): Promise<void> {
    // Check if already cached
    const existing = GlobalDataCache.get(item.key);
    if (existing) {
      return;
    }

    // Add to queue if not already present
    const existingIndex = this.prefetchQueue.findIndex(q => q.key === item.key);
    if (existingIndex === -1) {
      this.prefetchQueue.push(item);
      this.sortQueueByPriority();
    }
  }

  /**
   * Process prefetch queue
   */
  private async processPrefetchQueue(): Promise<void> {
    if (this.processing || this.prefetchQueue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.prefetchQueue.length > 0 && this.activeRequests < this.maxConcurrent) {
      const item = this.prefetchQueue.shift();
      if (!item) break;

      this.processPrefetchItem(item);
    }

    if (this.activeRequests === 0) {
      this.processing = false;
    }
  }

  /**
   * Process individual prefetch item
   */
  private async processPrefetchItem(item: PrefetchItem): Promise<void> {
    this.activeRequests++;

    try {
      console.log(`PrefetchManager: Processing ${item.type} - ${item.key}`);

      switch (item.type) {
        case 'profiles':
          await this.prefetchProfiles(item);
          break;
        case 'images':
          await this.prefetchImages(item);
          break;
        case 'messages':
          await this.prefetchMessages(item);
          break;
        case 'events':
          await this.prefetchEvents(item);
          break;
      }

      console.log(`PrefetchManager: Completed ${item.key}`);
    } catch (error) {
      console.warn(`PrefetchManager: Failed to prefetch ${item.key}:`, error);
    } finally {
      this.activeRequests--;

      // Continue processing queue
      if (this.prefetchQueue.length > 0) {
        setTimeout(() => this.processPrefetchQueue(), 100);
      } else {
        this.processing = false;
      }
    }
  }

  /**
   * Prefetch profile data
   */
  private async prefetchProfiles(item: PrefetchItem): Promise<void> {
    if (item.data) {
      // Direct data provided
      GlobalDataCache.set(item.key, item.data, 5 * 60 * 1000);
    } else {
      // Extract IDs from key and fetch
      // Implementation would depend on specific key format
      console.log(`PrefetchManager: Would fetch profiles for ${item.key}`);
    }
  }

  /**
   * Prefetch image data
   */
  private async prefetchImages(item: PrefetchItem): Promise<void> {
    if (item.data?.url) {
      await ImageCacheService.getCachedImageUri(
        item.data.url,
        item.data.eventId,
        item.data.sessionId
      );
    }
  }

  /**
   * Prefetch message data
   */
  private async prefetchMessages(item: PrefetchItem): Promise<void> {
    // Would implement message prefetching logic here
    console.log(`PrefetchManager: Would fetch messages for ${item.key}`);
  }

  /**
   * Prefetch event data
   */
  private async prefetchEvents(item: PrefetchItem): Promise<void> {
    // Would implement event prefetching logic here
    console.log(`PrefetchManager: Would fetch events for ${item.key}`);
  }

  /**
   * Sort queue by priority (high -> medium -> low)
   */
  private sortQueueByPriority(): void {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    
    this.prefetchQueue.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // If same priority, sort by timestamp (older first)
      return a.timestamp - b.timestamp;
    });
  }

  /**
   * Clear prefetch queue and cache for event
   */
  clearEventCache(eventId: string): void {
    // Remove items related to this event
    this.prefetchQueue = this.prefetchQueue.filter(
      item => !item.key.includes(eventId)
    );

    console.log(`PrefetchManager: Cleared prefetch queue for event ${eventId}`);
  }

  /**
   * Get prefetch statistics
   */
  getStats() {
    return {
      queueLength: this.prefetchQueue.length,
      activeRequests: this.activeRequests,
      processing: this.processing,
      priorityBreakdown: {
        high: this.prefetchQueue.filter(i => i.priority === 'high').length,
        medium: this.prefetchQueue.filter(i => i.priority === 'medium').length,
        low: this.prefetchQueue.filter(i => i.priority === 'low').length
      }
    };
  }
}

export const PrefetchManager = new PrefetchManagerClass();