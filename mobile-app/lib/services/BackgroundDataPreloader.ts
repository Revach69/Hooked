/**
 * BackgroundDataPreloader - Preloads data for instant page transitions
 * 
 * Preloads profile, matches, and chat data when entering an event
 * so that first-time navigation to these pages is instant
 */

import { EventProfileAPI, LikeAPI, EventAPI, MessageAPI, MutedMatchAPI } from '../firebaseApi';
import { AsyncStorageUtils } from '../asyncStorageUtils';
import { GlobalDataCache, CacheKeys } from '../cache/GlobalDataCache';
import { ImageCacheService } from './ImageCacheService';
import FastImage from 'react-native-fast-image';

interface PreloadedData {
  profile: any | null;
  matches: any[];
  conversations: any[];
  images: string[];
}

class BackgroundDataPreloaderClass {
  private isPreloading = false;
  private preloadedData: PreloadedData = {
    profile: null,
    matches: [],
    conversations: [],
    images: []
  };

  /**
   * Main preloading function - call after entering an event
   */
  async preloadEventData(): Promise<void> {
    if (this.isPreloading) {
      console.log('BackgroundDataPreloader: Already preloading, skipping');
      return;
    }

    try {
      this.isPreloading = true;
      console.log('🚀 BackgroundDataPreloader: Starting comprehensive data preloading...');

      const eventId = await AsyncStorageUtils.getItem<string>('currentEventId');
      const sessionId = await AsyncStorageUtils.getItem<string>('currentSessionId');

      if (!eventId || !sessionId) {
        console.warn('BackgroundDataPreloader: Missing event/session data, skipping preload');
        return;
      }

      // Run all preloading in parallel for maximum speed
      await Promise.all([
        this.preloadProfileData(eventId, sessionId),
        this.preloadMatchesData(eventId, sessionId),
        this.preloadConversationsData(eventId, sessionId)
      ]);

      console.log('✅ BackgroundDataPreloader: All data preloaded successfully');

    } catch (error) {
      console.error('BackgroundDataPreloader: Preloading failed:', error);
    } finally {
      this.isPreloading = false;
    }
  }

  /**
   * Preload profile data for instant Profile page display
   */
  private async preloadProfileData(eventId: string, sessionId: string): Promise<void> {
    try {
      console.log('📄 BackgroundDataPreloader: Preloading profile data...');
      
      // Fetch profile data
      const profiles = await EventProfileAPI.filter({
        event_id: eventId,
        session_id: sessionId
      });

      if (profiles && profiles.length > 0) {
        const profile = profiles[0];
        this.preloadedData.profile = profile;

        // Cache profile data with longer TTL for instant access
        GlobalDataCache.set(CacheKeys.PROFILE_DATA, profile, 10 * 60 * 1000); // 10 minutes
        
        // Also fetch event data for profile page
        const event = await EventAPI.get(eventId);
        GlobalDataCache.set(CacheKeys.EVENT_DATA, event, 10 * 60 * 1000);

        // Preload profile image if exists
        if (profile.profile_photo_url) {
          await this.preloadImage(profile.profile_photo_url, eventId, sessionId);
        }

        console.log('📄 BackgroundDataPreloader: Profile data preloaded');
      }
    } catch (error) {
      console.warn('BackgroundDataPreloader: Profile preload failed:', error);
    }
  }

  /**
   * Preload matches data for instant Matches page display
   */
  private async preloadMatchesData(eventId: string, sessionId: string): Promise<void> {
    try {
      console.log('💕 BackgroundDataPreloader: Preloading matches data...');

      // Fetch likes data (matches are mutual likes)
      const likes = await LikeAPI.filter({
        event_id: eventId,
        liker_session_id: sessionId
      });

      const receivedLikes = await LikeAPI.filter({
        event_id: eventId,
        liked_session_id: sessionId
      });

      // Find mutual likes (matches)
      const matches = likes.filter(sentLike => 
        receivedLikes.some(receivedLike => 
          receivedLike.liker_session_id === sentLike.liked_session_id
        )
      );

      // Fetch full profile data for each match
      const matchProfilePromises = matches.map(async (match) => {
        try {
          const profiles = await EventProfileAPI.filter({
            event_id: eventId,
            session_id: match.liked_session_id
          });
          return profiles[0] || null;
        } catch {
          return null;
        }
      });

      const matchProfiles = (await Promise.all(matchProfilePromises)).filter(Boolean);
      this.preloadedData.matches = matchProfiles;

      // Cache matches data
      GlobalDataCache.set(CacheKeys.MATCHES_DATA, {
        matches: matchProfiles,
        sentLikes: likes,
        receivedLikes: receivedLikes
      }, 5 * 60 * 1000); // 5 minutes

      // Preload match profile images
      const imagePromises = matchProfiles
        .filter(profile => profile?.profile_photo_url && profile?.session_id)
        .map(profile => profile && this.preloadImage(profile.profile_photo_url!, eventId, profile.session_id!))
        .filter(Boolean);

      await Promise.all(imagePromises);

      console.log(`💕 BackgroundDataPreloader: ${matchProfiles.length} matches preloaded`);

    } catch (error) {
      console.warn('BackgroundDataPreloader: Matches preload failed:', error);
    }
  }

  /**
   * Preload conversation data for instant Chat functionality
   */
  private async preloadConversationsData(eventId: string, sessionId: string): Promise<void> {
    try {
      console.log('💬 BackgroundDataPreloader: Preloading conversations data...');

      // Get conversation list (recent messages)
      const [sentMessages, receivedMessages] = await Promise.all([
        MessageAPI.filter({
          event_id: eventId,
          from_profile_id: sessionId
        }),
        MessageAPI.filter({
          event_id: eventId,
          to_profile_id: sessionId
        })
      ]);
      
      const messages = [...sentMessages, ...receivedMessages];

      // Group messages by conversation
      const conversationMap = new Map();
      
      messages.forEach((message: any) => {
        const otherSessionId = message.from_profile_id === sessionId 
          ? message.to_profile_id 
          : message.from_profile_id;
        
        if (!conversationMap.has(otherSessionId)) {
          conversationMap.set(otherSessionId, []);
        }
        conversationMap.get(otherSessionId).push(message);
      });

      // Sort conversations by latest message
      const conversations = Array.from(conversationMap.entries()).map(([otherSessionId, msgs]: [string, any[]]) => {
        const sortedMessages = msgs.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        return {
          sessionId: otherSessionId,
          messages: sortedMessages,
          latestMessage: sortedMessages[0],
          unreadCount: sortedMessages.filter((m: any) => 
            m.to_profile_id === sessionId && !m.read_at
          ).length
        };
      }).sort((a: any, b: any) => 
        new Date(b.latestMessage.created_at).getTime() - 
        new Date(a.latestMessage.created_at).getTime()
      );

      this.preloadedData.conversations = conversations;

      // Cache conversations data
      GlobalDataCache.set(CacheKeys.CONVERSATIONS_DATA, conversations, 3 * 60 * 1000); // 3 minutes

      console.log(`💬 BackgroundDataPreloader: ${conversations.length} conversations preloaded`);

    } catch (error) {
      console.warn('BackgroundDataPreloader: Conversations preload failed:', error);
    }
  }

  /**
   * Preload a single image with both ImageCacheService and FastImage
   */
  private async preloadImage(imageUrl: string, eventId: string, sessionId: string): Promise<void> {
    try {
      // Get cached URI through ImageCacheService
      const cachedUri = await ImageCacheService.getCachedImageUri(imageUrl, eventId, sessionId);
      
      // Preload with FastImage for native performance
      await FastImage.preload([{
        uri: cachedUri,
        priority: FastImage.priority.normal, // Normal priority for background loading
        cache: FastImage.cacheControl.immutable
      }]);

      this.preloadedData.images.push(cachedUri);
    } catch (error) {
      console.warn('BackgroundDataPreloader: Image preload failed for:', imageUrl, error);
    }
  }

  /**
   * Get preloaded data - used by pages for instant display
   */
  getPreloadedProfile(): any | null {
    return this.preloadedData.profile;
  }

  getPreloadedMatches(): any[] {
    return this.preloadedData.matches;
  }

  getPreloadedConversations(): any[] {
    return this.preloadedData.conversations;
  }

  /**
   * Check if specific data is preloaded
   */
  isProfilePreloaded(): boolean {
    return this.preloadedData.profile !== null;
  }

  isMatchesPreloaded(): boolean {
    return this.preloadedData.matches.length > 0;
  }

  isConversationsPreloaded(): boolean {
    return this.preloadedData.conversations.length > 0;
  }

  /**
   * Clear preloaded data (call when leaving event)
   */
  clearPreloadedData(): void {
    console.log('🗑️ BackgroundDataPreloader: Clearing preloaded data');
    this.preloadedData = {
      profile: null,
      matches: [],
      conversations: [],
      images: []
    };
  }

  /**
   * Get loading status
   */
  getIsPreloading(): boolean {
    return this.isPreloading;
  }
}

// Export singleton
export const BackgroundDataPreloader = new BackgroundDataPreloaderClass();
export default BackgroundDataPreloader;