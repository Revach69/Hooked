import { AsyncStorageUtils } from '../asyncStorageUtils';
import { GlobalNotificationService } from './GlobalNotificationService';
import { setCurrentSessionIdForDedup } from '../notifications/NotificationRouter';
// AppStateSyncService removed - deprecated
import { ImageCacheService } from './ImageCacheService';


/**
 * Service to handle proper session cleanup when user leaves event or deletes profile
 */
class SessionCleanupServiceClass {

  /**
   * Clear all session-related data when user leaves event or deletes profile
   * This ensures they start fresh when joining a new event
   */
  async clearSession(reason: 'profile_deleted' | 'event_left' | 'user_logout' = 'profile_deleted'): Promise<void> {
    try {
      console.log(`SessionCleanupService: Starting session cleanup (reason: ${reason})`);
      
      console.log({
        message: 'SessionCleanupService: Starting session cleanup',
        level: 'info',
        category: 'session_cleanup',
        data: { reason }
      });

      // 1. Stop app state sync
      // AppStateSyncService.stopAppStateSync(); // Service deprecated
      
      // 2. Cleanup global notification listeners
      GlobalNotificationService.cleanup();
      
      // 3. Clear notification router session
      setCurrentSessionIdForDedup(null);
      
      // 4. Clear all session-related AsyncStorage data including viewed profiles
      const currentEventId = await AsyncStorageUtils.getItem<string>('currentEventId');
      
      const sessionKeys = [
        'currentSessionId',
        'currentEventId',
        'userProfile',
        'currentChatSessionId',
        'lastActiveTimestamp'
      ];
      
      // Add viewed profiles key for current event if it exists
      if (currentEventId) {
        sessionKeys.push(`viewedProfiles_${currentEventId}`);
      }
      
      const clearPromises = sessionKeys.map(key => 
        AsyncStorageUtils.removeItem(key).catch(error => {
          console.warn(`Failed to clear ${key}:`, error);
          // Don't throw - continue clearing other keys
        })
      );
      
      await Promise.all(clearPromises);
      
      // 5. Clear any cached notification data
      await this.clearNotificationCache();
      
      // 6. Clear image cache
      await this.clearImageCache();
      
      console.log('SessionCleanupService: Session cleanup complete');
      
      console.log({
        message: 'SessionCleanupService: Session cleanup completed',
        level: 'info',
        category: 'session_cleanup',
        data: { 
          reason,
          clearedKeys: sessionKeys.length,
          success: true
        }
      });
      
    } catch (error) {
      console.error('SessionCleanupService: Failed to clear session:', error);
      console.error(error, {
        tags: {
          operation: 'session_cleanup',
          reason,
          source: 'SessionCleanupService'
        }
      });
      throw error; // Re-throw so caller knows cleanup failed
    }
  }

  /**
   * Clear notification-specific cache data
   */
  private async clearNotificationCache(): Promise<void> {
    try {
      // Clear any persistent notification cache entries
      // This is a best-effort cleanup - we can't easily enumerate all notification cache keys
      // since they're dynamically generated, but we clear what we can
      
      const notificationCacheKeys = [
        'firebase_connection_state',
        'firebase_last_error',
        'firebase_critical_errors'
      ];
      
      const clearPromises = notificationCacheKeys.map(key =>
        AsyncStorageUtils.removeItem(key).catch(error => {
          console.warn(`Failed to clear notification cache ${key}:`, error);
        })
      );
      
      await Promise.all(clearPromises);
      
      console.log('SessionCleanupService: Notification cache cleared');
      
    } catch (error) {
      console.warn('SessionCleanupService: Error clearing notification cache:', error);
      // Don't throw - this is cleanup, not critical
    }
  }
  
  /**
   * Clear image cache data
   */
  private async clearImageCache(): Promise<void> {
    try {
      console.log('SessionCleanupService: Clearing image cache');
      await ImageCacheService.clearAllCache();
      console.log('SessionCleanupService: Image cache cleared');
    } catch (error) {
      console.warn('SessionCleanupService: Error clearing image cache:', error);
      // Don't throw - this is cleanup, not critical
    }
  }

  /**
   * Verify that session has been properly cleared
   * Returns true if session is clean, false if there are remnants
   */
  async verifySessionCleared(): Promise<{ isCleared: boolean; remainingData?: string[] }> {
    try {
      const sessionKeys = [
        'currentSessionId',
        'currentEventId', 
        'userProfile'
      ];
      
      const remainingData: string[] = [];
      
      for (const key of sessionKeys) {
        const value = await AsyncStorageUtils.getItem(key);
        if (value !== null) {
          remainingData.push(key);
        }
      }
      
      const isCleared = remainingData.length === 0;
      
      console.log('SessionCleanupService: Session verification:', {
        isCleared,
        remainingData: remainingData.length > 0 ? remainingData : undefined
      });
      
      return { isCleared, remainingData: remainingData.length > 0 ? remainingData : undefined };
      
    } catch (error) {
      console.error('SessionCleanupService: Failed to verify session cleanup:', error);
      return { isCleared: false, remainingData: ['verification_failed'] };
    }
  }

  /**
   * Force cleanup everything related to notifications and sessions
   * Use this as a last resort when things get stuck
   */
  async forceCleanupAll(): Promise<void> {
    console.log('SessionCleanupService: Starting force cleanup of all session data');
    
    try {
      // Stop all services
      // AppStateSyncService.stopAppStateSync(); // Service deprecated
      GlobalNotificationService.cleanup();
      setCurrentSessionIdForDedup(null);
      
      // Clear image cache completely
      try {
        await ImageCacheService.clearAllCache();
        console.log('SessionCleanupService: Force cleared image cache');
      } catch (error) {
        console.warn('SessionCleanupService: Failed to force clear image cache:', error);
      }
      
      // Get all AsyncStorage keys and clear anything that looks session-related
      const allKeys = await AsyncStorageUtils.getAllKeys();
      const sessionRelatedKeys = allKeys.filter(key => 
        key.includes('session') || 
        key.includes('event') || 
        key.includes('profile') ||
        key.includes('notification') ||
        key.includes('firebase') ||
        key.includes('chat') ||
        key.includes('image_cache') ||
        key.includes('cached_image') ||
        key.startsWith('viewedProfiles_')
      );
      
      console.log(`SessionCleanupService: Force clearing ${sessionRelatedKeys.length} keys:`, sessionRelatedKeys);
      
      const clearPromises = sessionRelatedKeys.map(key =>
        AsyncStorageUtils.removeItem(key).catch(error => {
          console.warn(`Force cleanup failed for ${key}:`, error);
        })
      );
      
      await Promise.all(clearPromises);
      
      console.log('SessionCleanupService: Force cleanup complete');
      
      console.log({
        message: 'SessionCleanupService: Force cleanup completed',
        level: 'info', 
        category: 'session_cleanup',
        data: { clearedKeysCount: sessionRelatedKeys.length }
      });
      
    } catch (error) {
      console.error('SessionCleanupService: Force cleanup failed:', error);
      console.error(error);
      throw error;
    }
  }
}

export const SessionCleanupService = new SessionCleanupServiceClass();
export default SessionCleanupService;