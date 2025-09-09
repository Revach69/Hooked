// Platform import removed - not needed for current implementation
import * as Notifications from 'expo-notifications';

import { AsyncStorageUtils } from '../asyncStorageUtils';
import { registerPushToken } from './registerPushToken';
import { getInstallationId } from '../session/sessionId';

interface PushSetupCache {
  permissions: {
    status: string;
    timestamp: number;
  };
  token: {
    value: string;
    timestamp: number;
    sessionId: string;
    installationId: string;
  } | null;
  lastSuccessfulSetup: {
    timestamp: number;
    sessionId: string;
    installationId: string;
  } | null;
}

interface EnsurePushSetupOptions {
  forceRefresh?: boolean;
  sessionId?: string;
}

class EnsurePushSetupService {
  private cache: PushSetupCache | null = null;
  private isSetupInProgress = false;
  private setupPromise: Promise<boolean> | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly PERMISSION_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  /**
   * Idempotent push setup with intelligent gating
   * Ensures push notifications are properly configured without redundant operations
   */
  async ensurePushSetup(options: EnsurePushSetupOptions = {}): Promise<boolean> {
    const { forceRefresh = false, sessionId: providedSessionId } = options;

    // If setup is already in progress, return the existing promise
    if (this.isSetupInProgress && this.setupPromise && !forceRefresh) {
      console.log('ensurePushSetup: Setup already in progress, waiting for completion');
      return await this.setupPromise;
    }

    // If not forced and recent successful setup exists, return early
    if (!forceRefresh && await this.isRecentSetupValid(providedSessionId)) {
      console.log('ensurePushSetup: Recent valid setup found, skipping');
      return true;
    }

    // Gate concurrent calls
    this.isSetupInProgress = true;
    this.setupPromise = this.performPushSetup(options);

    try {
      const result = await this.setupPromise;
      return result;
    } finally {
      this.isSetupInProgress = false;
      this.setupPromise = null;
    }
  }

  /**
   * Perform the actual push setup with comprehensive validation
   */
  private async performPushSetup(options: EnsurePushSetupOptions): Promise<boolean> {
    const { forceRefresh = false, sessionId: providedSessionId } = options;
    // skipPermissionCheck removed as we always want to check permissions for reliability

    try {
      console.log('ensurePushSetup: Starting push notification setup', { 
        forceRefresh, 
        hasProvidedSessionId: !!providedSessionId 
      });

      // Load cache
      await this.loadCache();

      // Get current session and installation IDs
      const sessionId = providedSessionId || await AsyncStorageUtils.getItem<string>('currentSessionId');
      const eventId = await AsyncStorageUtils.getItem<string>('currentEventId');
      const installationId = await getInstallationId();

      if (!sessionId || !eventId) {
        console.log('ensurePushSetup: No session available, skipping push setup');
        console.log({
          message: 'Push setup skipped - no session available',
          level: 'info',
          category: 'push_notification'
        });
        return false;
      }

      // Step 1: Check and request permissions (with caching)
      const permissionsGranted = await this.ensurePermissions(forceRefresh);
      if (!permissionsGranted) {
        console.log('ensurePushSetup: Permissions not granted');
        return false;
      }

      // Step 2: Check if token needs refresh
      const needsTokenRefresh = this.shouldRefreshToken(sessionId, installationId, forceRefresh);
      
      if (!needsTokenRefresh) {
        console.log('ensurePushSetup: Token is valid and current');
        await this.updateSuccessfulSetupCache(sessionId, installationId);
        return true;
      }

      // Step 3: Get current Expo push token
      const currentToken = await this.getCurrentPushToken();
      if (!currentToken) {
        console.log('ensurePushSetup: Failed to obtain push token');
        return false;
      }

      // Step 4: Check if token actually changed
      if (this.cache?.token?.value === currentToken && 
          this.cache?.token?.sessionId === sessionId &&
          !forceRefresh) {
        console.log('ensurePushSetup: Token unchanged, updating cache timestamp');
        await this.updateTokenCache(currentToken, sessionId, installationId);
        await this.updateSuccessfulSetupCache(sessionId, installationId);
        return true;
      }

      // Step 5: Register the token
      console.log('ensurePushSetup: Registering push token');
      const registrationSuccess = await registerPushToken(sessionId);

      if (registrationSuccess) {
        // Update all caches on successful registration
        await this.updateTokenCache(currentToken, sessionId, installationId);
        await this.updateSuccessfulSetupCache(sessionId, installationId);
        await this.saveCache();

        console.log('ensurePushSetup: Push setup completed successfully');
        
        console.log({
          message: 'Push setup completed successfully',
          level: 'info',
          category: 'push_notification',
          data: { 
            sessionId: sessionId.substring(0, 8) + '...',
            installationId: installationId.substring(0, 8) + '...'
          }
        });

        return true;
      } else {
        console.log('ensurePushSetup: Token registration failed');
        return false;
      }

    } catch (error) {
      console.error('ensurePushSetup: Setup failed with error:', error);
      
      console.error(error, {
        tags: {
          operation: 'ensure_push_setup',
          source: 'ensurePushSetup'
        },
        extra: {
          options,
          cacheState: this.cache
        }
      });

      return false;
    }
  }

  /**
   * Check if recent setup is still valid
   */
  private async isRecentSetupValid(providedSessionId?: string): Promise<boolean> {
    await this.loadCache();

    if (!this.cache?.lastSuccessfulSetup) {
      return false;
    }

    const now = Date.now();
    const setupAge = now - this.cache.lastSuccessfulSetup.timestamp;

    // Check if setup is too old
    if (setupAge > this.CACHE_DURATION) {
      return false;
    }

    // Check if session/installation changed
    const currentSessionId = providedSessionId || await AsyncStorageUtils.getItem<string>('currentSessionId');
    const currentInstallationId = await getInstallationId();

    if (this.cache.lastSuccessfulSetup.sessionId !== currentSessionId ||
        this.cache.lastSuccessfulSetup.installationId !== currentInstallationId) {
      return false;
    }

    return true;
  }

  /**
   * Ensure notification permissions with caching
   */
  private async ensurePermissions(forceRefresh: boolean): Promise<boolean> {
    // Check cached permissions first
    if (!forceRefresh && this.cache?.permissions) {
      const permissionAge = Date.now() - this.cache.permissions.timestamp;
      if (permissionAge < this.PERMISSION_CACHE_DURATION && 
          this.cache.permissions.status === 'granted') {
        console.log('ensurePushSetup: Using cached permission status');
        return true;
      }
    }

    try {
      const perms = await Notifications.getPermissionsAsync();
      const granted = perms.status === 'granted';

      // Cache permission status
      if (!this.cache) this.cache = this.createEmptyCache();
      this.cache.permissions = {
        status: perms.status,
        timestamp: Date.now()
      };

      if (granted) {
        console.log('ensurePushSetup: Permissions already granted');
        return true;
      }

      // Try to request permissions
      console.log('ensurePushSetup: Requesting permissions');
      const requestResult = await Notifications.requestPermissionsAsync();
      const newGranted = requestResult.status === 'granted';

      // Update cache with new permission status
      this.cache.permissions = {
        status: requestResult.status,
        timestamp: Date.now()
      };

      if (!newGranted) {
        console.log('ensurePushSetup: Permissions denied by user');
        console.log({
          message: 'Push notification permissions denied by user',
          level: 'warning',
          category: 'push_notification',
          data: { requestResult }
        });
      }

      return newGranted;
    } catch (error) {
      console.warn('ensurePushSetup: Permission check/request failed:', error);
      return false;
    }
  }

  /**
   * Check if token needs refresh
   */
  private shouldRefreshToken(sessionId: string, installationId: string, forceRefresh: boolean): boolean {
    if (forceRefresh) {
      return true;
    }

    if (!this.cache?.token) {
      return true;
    }

    // Check if session/installation changed
    if (this.cache.token.sessionId !== sessionId ||
        this.cache.token.installationId !== installationId) {
      return true;
    }

    // Check if token is too old
    const tokenAge = Date.now() - this.cache.token.timestamp;
    if (tokenAge > this.CACHE_DURATION) {
      return true;
    }

    return false;
  }

  /**
   * Get current Expo push token
   */
  private async getCurrentPushToken(): Promise<string | null> {
    try {
      const expoToken = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID || '7a1de260-e3cb-4cbb-863c-1557213d69f0'
      });

      return expoToken?.data || null;
    } catch (error) {
      console.error('ensurePushSetup: Failed to get push token:', error);
      return null;
    }
  }

  /**
   * Update token cache
   */
  private async updateTokenCache(token: string, sessionId: string, installationId: string): Promise<void> {
    if (!this.cache) this.cache = this.createEmptyCache();
    
    this.cache.token = {
      value: token,
      timestamp: Date.now(),
      sessionId,
      installationId
    };
  }

  /**
   * Update successful setup cache
   */
  private async updateSuccessfulSetupCache(sessionId: string, installationId: string): Promise<void> {
    if (!this.cache) this.cache = this.createEmptyCache();
    
    this.cache.lastSuccessfulSetup = {
      timestamp: Date.now(),
      sessionId,
      installationId
    };
  }

  /**
   * Create empty cache structure
   */
  private createEmptyCache(): PushSetupCache {
    return {
      permissions: {
        status: 'undetermined',
        timestamp: 0
      },
      token: null,
      lastSuccessfulSetup: null
    };
  }

  /**
   * Load cache from storage
   */
  private async loadCache(): Promise<void> {
    try {
      const cached = await AsyncStorageUtils.getItem<PushSetupCache>('pushSetupCache');
      this.cache = cached || this.createEmptyCache();
    } catch (error) {
      console.warn('ensurePushSetup: Failed to load cache:', error);
      this.cache = this.createEmptyCache();
    }
  }

  /**
   * Save cache to storage
   */
  private async saveCache(): Promise<void> {
    try {
      if (this.cache) {
        await AsyncStorageUtils.setItem('pushSetupCache', this.cache);
      }
    } catch (error) {
      console.warn('ensurePushSetup: Failed to save cache:', error);
    }
  }

  /**
   * Clear cache (useful for testing or troubleshooting)
   */
  async clearCache(): Promise<void> {
    this.cache = this.createEmptyCache();
    try {
      await AsyncStorageUtils.removeItem('pushSetupCache');
      console.log('ensurePushSetup: Cache cleared');
    } catch (error) {
      console.warn('ensurePushSetup: Failed to clear cache:', error);
    }
  }

  /**
   * Get current cache status for debugging
   */
  getCacheStatus(): PushSetupCache | null {
    return this.cache ? { ...this.cache } : null;
  }
}

// Export singleton instance
export const ensurePushSetup = new EnsurePushSetupService();

// Export the main function for easy import
export const ensurePushSetupFunction = (options?: EnsurePushSetupOptions) => 
  ensurePushSetup.ensurePushSetup(options);

// Export additional utility functions
export const clearPushSetupCache = () => ensurePushSetup.clearCache();
export const getPushSetupCacheStatus = () => ensurePushSetup.getCacheStatus();

// Export types for external use
export type { EnsurePushSetupOptions, PushSetupCache };