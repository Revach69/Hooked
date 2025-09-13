/**
 * BackgroundDataPreloader - Preloads data for instant page transitions
 * 
 * Preloads profile, matches, and chat data when entering an event
 * so that first-time navigation to these pages is instant
 */

import { EventProfileAPI, LikeAPI, EventAPI, MessageAPI } from '../firebaseApi';
import { AsyncStorageUtils } from '../asyncStorageUtils';
import { GlobalDataCache, CacheKeys } from '../cache/GlobalDataCache';
import { ImageCacheService } from './ImageCacheService';
import FastImage from 'react-native-fast-image';
import type { 
  BackgroundPreloaderData, 
  EventProfile, 
  Event, 
  Like, 
  Match, 
  PreloadedConversation,
  PreloadedProfileData,
  PreloadedMatchData,
  Message
} from '../types';
import { timestampToDate } from '../types';

class BackgroundDataPreloaderClass {
  private isPreloading = false;
  private preloadAbortController?: AbortController;
  private preloadedData: BackgroundPreloaderData = {
    profile: null,
    matches: null,
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

    // Cancel previous preload if still running
    if (this.preloadAbortController) {
      console.log('BackgroundDataPreloader: Cancelling previous preload');
      this.preloadAbortController.abort();
    }

    try {
      this.isPreloading = true;
      this.preloadAbortController = new AbortController();
      const signal = this.preloadAbortController.signal;
      
      console.log('🚀 BackgroundDataPreloader: Starting comprehensive data preloading...');

      const eventId = await AsyncStorageUtils.getItem<string>('currentEventId');
      const sessionId = await AsyncStorageUtils.getItem<string>('currentSessionId');

      if (!eventId || !sessionId) {
        console.warn('BackgroundDataPreloader: Missing event/session data, skipping preload');
        return;
      }

      // Check if cancelled before starting
      if (signal.aborted) {
        console.log('BackgroundDataPreloader: Preload cancelled before starting');
        return;
      }

      // Run all preloading in parallel for maximum speed
      await Promise.all([
        this.preloadProfileData(eventId, sessionId, signal),
        this.preloadMatchesData(eventId, sessionId, signal),
        this.preloadConversationsData(eventId, sessionId, signal)
      ]);

      console.log('✅ BackgroundDataPreloader: All data preloaded successfully');

    } catch (error) {
      // Handle abort error gracefully
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('BackgroundDataPreloader: Preload cancelled');
        return;
      }
      console.error('BackgroundDataPreloader: Preloading failed:', error);
    } finally {
      this.isPreloading = false;
      this.preloadAbortController = undefined;
    }
  }

  /**
   * Preload profile data for instant Profile page display
   */
  private async preloadProfileData(eventId: string, sessionId: string, signal?: AbortSignal): Promise<void> {
    try {
      console.log('📄 BackgroundDataPreloader: Preloading profile data...');
      
      // Check if cancelled
      if (signal?.aborted) {
        throw new Error('AbortError');
      }
      
      // Fetch profile data
      const profiles = await EventProfileAPI.filter({
        event_id: eventId,
        session_id: sessionId
      }) as unknown as EventProfile[];

      if (profiles && profiles.length > 0) {
        const profile = profiles[0];
        const event = await EventAPI.get(eventId) as Event;
        
        this.preloadedData.profile = {
          profile,
          event
        };

        // Cache profile data with longer TTL for instant access
        GlobalDataCache.set(CacheKeys.PROFILE_DATA, profile, 10 * 60 * 1000); // 10 minutes
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
  private async preloadMatchesData(eventId: string, sessionId: string, signal?: AbortSignal): Promise<void> {
    try {
      console.log('💕 BackgroundDataPreloader: Preloading matches data...');

      // Check if cancelled
      if (signal?.aborted) {
        throw new Error('AbortError');
      }

      // Fetch likes data (matches are mutual likes)
      const likes = await LikeAPI.filter({
        event_id: eventId,
        liker_session_id: sessionId
      }) as unknown as Like[];

      const receivedLikes = await LikeAPI.filter({
        event_id: eventId,
        liked_session_id: sessionId
      }) as unknown as Like[];

      // Find mutual likes (matches)
      const mutualLikes = likes.filter(sentLike => 
        receivedLikes.some(receivedLike => 
          receivedLike.liker_session_id === sentLike.liked_session_id
        )
      );

      // Fetch full profile data for each match
      const matchProfilePromises = mutualLikes.map(async (like): Promise<Match | null> => {
        try {
          const profiles = await EventProfileAPI.filter({
            event_id: eventId,
            session_id: like.liked_session_id
          }) as unknown as EventProfile[];
          
          const profile = profiles[0];
          if (!profile) return null;
          
          return {
            id: like.id,
            event_id: eventId,
            profile1_session_id: sessionId,
            profile2_session_id: like.liked_session_id,
            created_at: like.created_at as any,
            profile
          };
        } catch {
          return null;
        }
      });

      const matches = (await Promise.all(matchProfilePromises)).filter((match): match is Match => match !== null);
      
      this.preloadedData.matches = {
        matches,
        sentLikes: likes,
        receivedLikes
      };

      // Cache matches data
      GlobalDataCache.set(CacheKeys.MATCHES_DATA, this.preloadedData.matches, 5 * 60 * 1000); // 5 minutes

      // Preload match profile images
      const imagePromises = matches
        .filter(match => match.profile?.profile_photo_url)
        .map(match => match.profile && this.preloadImage(match.profile.profile_photo_url!, eventId, match.profile.session_id));

      await Promise.all(imagePromises.filter(Boolean));

      console.log(`💕 BackgroundDataPreloader: ${matches.length} matches preloaded`);

    } catch (error) {
      console.warn('BackgroundDataPreloader: Matches preload failed:', error);
    }
  }

  /**
   * Preload conversation data for instant Chat functionality
   */
  private async preloadConversationsData(eventId: string, sessionId: string, signal?: AbortSignal): Promise<void> {
    try {
      console.log('💬 BackgroundDataPreloader: Preloading conversations data...');

      // Check if cancelled
      if (signal?.aborted) {
        throw new Error('AbortError');
      }

      // Get conversation list (recent messages)
      const [sentMessages, receivedMessages] = await Promise.all([
        MessageAPI.filter({
          event_id: eventId,
          from_profile_id: sessionId
        }) as unknown as Promise<Message[]>,
        MessageAPI.filter({
          event_id: eventId,
          to_profile_id: sessionId
        }) as unknown as Promise<Message[]>
      ]);
      
      const messages = [...sentMessages, ...receivedMessages];

      // Group messages by conversation
      const conversationMap = new Map<string, Message[]>();
      
      messages.forEach((message: Message) => {
        const otherSessionId = message.from_profile_id === sessionId 
          ? message.to_profile_id 
          : message.from_profile_id;
        
        if (!conversationMap.has(otherSessionId)) {
          conversationMap.set(otherSessionId, []);
        }
        conversationMap.get(otherSessionId)!.push(message);
      });

      // Sort conversations by latest message
      const conversations: PreloadedConversation[] = Array.from(conversationMap.entries()).map(([otherSessionId, msgs]) => {
        const sortedMessages = msgs.sort((a, b) => {
          const aTime = timestampToDate(a.created_at).getTime();
          const bTime = timestampToDate(b.created_at).getTime();
          return bTime - aTime;
        });
        
        return {
          sessionId: otherSessionId,
          messages: sortedMessages,
          latestMessage: sortedMessages[0],
          unreadCount: sortedMessages.filter((m) => 
            m.to_profile_id === sessionId && !m.read_at
          ).length
        };
      }).sort((a, b) => {
        const aTime = timestampToDate(a.latestMessage.created_at).getTime();
        const bTime = timestampToDate(b.latestMessage.created_at).getTime();
        return bTime - aTime;
      });

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
  getPreloadedProfile(): PreloadedProfileData | null {
    return this.preloadedData.profile;
  }

  getPreloadedMatches(): PreloadedMatchData | null {
    return this.preloadedData.matches;
  }

  getPreloadedConversations(): PreloadedConversation[] {
    return this.preloadedData.conversations;
  }

  /**
   * Check if specific data is preloaded
   */
  isProfilePreloaded(): boolean {
    return this.preloadedData.profile !== null;
  }

  isMatchesPreloaded(): boolean {
    return this.preloadedData.matches?.matches?.length ? this.preloadedData.matches.matches.length > 0 : false;
  }

  isConversationsPreloaded(): boolean {
    return this.preloadedData.conversations.length > 0;
  }

  /**
   * Clear preloaded data (call when leaving event)
   */
  clearPreloadedData(): void {
    console.log('🗑️ BackgroundDataPreloader: Clearing preloaded data');
    
    // Cancel any ongoing preload
    if (this.preloadAbortController) {
      this.preloadAbortController.abort();
      this.preloadAbortController = undefined;
    }
    
    this.preloadedData = {
      profile: null,
      matches: null,
      conversations: [],
      images: []
    };
  }

  /**
   * Invalidate specific user's cached data
   */
  invalidateUserData(sessionId: string): void {
    console.log('🗑️ BackgroundDataPreloader: Invalidating user data for session:', sessionId.substring(0, 8) + '...');
    
    // Clear preloaded data for this user
    if (this.preloadedData.profile?.profile?.session_id === sessionId) {
      this.preloadedData.profile = null;
    }
    
    // Clear matches involving this user
    if (this.preloadedData.matches) {
      this.preloadedData.matches.matches = this.preloadedData.matches.matches.filter(
        (match: Match) => match.profile?.session_id !== sessionId
      );
    }
    
    // Clear conversations with this user
    this.preloadedData.conversations = this.preloadedData.conversations.filter(
      conv => conv.sessionId !== sessionId
    );
    
    // Clear related cache entries
    const cacheKeysToInvalidate = [
      `${CacheKeys.PROFILE_DATA}_${sessionId}`,
      `${CacheKeys.MATCHES_DATA}_${sessionId}`,
    ];
    
    cacheKeysToInvalidate.forEach(key => {
      GlobalDataCache.clear(key);
    });
  }

  /**
   * Refresh specific data type for current session
   */
  async refreshData(dataType: 'profile' | 'matches' | 'conversations'): Promise<void> {
    const eventId = await AsyncStorageUtils.getItem<string>('currentEventId');
    const sessionId = await AsyncStorageUtils.getItem<string>('currentSessionId');
    
    if (!eventId || !sessionId) {
      console.warn('BackgroundDataPreloader: Missing session data for refresh');
      return;
    }
    
    console.log(`🔄 BackgroundDataPreloader: Refreshing ${dataType} data`);
    
    try {
      switch (dataType) {
        case 'profile':
          await this.preloadProfileData(eventId, sessionId);
          break;
        case 'matches':
          await this.preloadMatchesData(eventId, sessionId);
          break;
        case 'conversations':
          await this.preloadConversationsData(eventId, sessionId);
          break;
      }
    } catch (error) {
      console.warn(`BackgroundDataPreloader: Failed to refresh ${dataType}:`, error);
    }
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