/**
 * Android Notification Debug Utility
 * 
 * Provides comprehensive debugging for Android notification issues
 * Logs to console and Sentry for remote monitoring
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import AsyncStorage from '@react-native-async-storage/async-storage';

interface AndroidNotificationDebugInfo {
  timestamp: string;
  permissions: {
    status: string;
    granted: boolean;
    canAskAgain: boolean;
    android?: any;
  };
  channels: {
    available: any[];
    initialized: boolean;
    error?: string;
  };
  pushToken: {
    hasToken: boolean;
    tokenPrefix?: string;
    error?: string;
  };
  deviceInfo: {
    platform: string;
    isPhysicalDevice: boolean;
  };
  storage: {
    hasSession: boolean;
    hasEvent: boolean;
    pushSetupCache?: any;
  };
}

class AndroidNotificationDebuggerService {
  private readonly DEBUG_KEY = 'android_notification_debug_log';
  private readonly MAX_LOG_ENTRIES = 10;

  /**
   * Comprehensive Android notification diagnostic
   */
  async runDiagnostic(): Promise<AndroidNotificationDebugInfo> {
    const timestamp = new Date().toISOString();
    console.log('🔍 Android Notification Diagnostic Starting...', timestamp);

    const diagnostic: AndroidNotificationDebugInfo = {
      timestamp,
      permissions: await this.checkPermissions(),
      channels: await this.checkChannels(),
      pushToken: await this.checkPushToken(),
      deviceInfo: this.getDeviceInfo(),
      storage: await this.checkStorage()
    };

    // Log to console
    console.log('📱 Android Notification Diagnostic Results:', diagnostic);

    // Save to local storage for later review
    await this.saveDiagnosticLog(diagnostic);

    // Send to Sentry for remote monitoring
    console.log({
      message: 'Android Notification Diagnostic Complete',
      level: 'info',
      category: 'android_notification_debug',
      data: diagnostic
    });

    // If there are issues, send as Sentry event for visibility
    const hasIssues = this.detectIssues(diagnostic);
    if (hasIssues.length > 0) {
      console.warn('Android Notification Issues Detected:', {
        level: 'warning',
        tags: {
          platform: 'android',
          operation: 'notification_diagnostic'
        },
        extra: {
          diagnostic,
          issues: hasIssues
        }
      });
    }

    return diagnostic;
  }

  /**
   * Check notification permissions in detail
   */
  private async checkPermissions(): Promise<AndroidNotificationDebugInfo['permissions']> {
    try {
      const perms = await Notifications.getPermissionsAsync();
      
      const result = {
        status: perms.status,
        granted: perms.status === 'granted',
        canAskAgain: perms.canAskAgain,
        android: Platform.OS === 'android' ? perms.android : undefined
      };

      console.log('🔐 Android Permissions Check:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to check permissions:', error);
      return {
        status: 'error',
        granted: false,
        canAskAgain: false,
        android: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  /**
   * Check notification channels
   */
  private async checkChannels(): Promise<AndroidNotificationDebugInfo['channels']> {
    if (Platform.OS !== 'android') {
      return { available: [], initialized: true };
    }

    try {
      // Try to get all notification channels
      const channels = await Notifications.getNotificationChannelsAsync();
      
      const result = {
        available: channels || [],
        initialized: channels && channels.length > 0
      };

      console.log('📢 Android Channels Check:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to check channels:', error);
      return {
        available: [],
        initialized: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Check push token status
   */
  private async checkPushToken(): Promise<AndroidNotificationDebugInfo['pushToken']> {
    try {
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID || '7a1de260-e3cb-4cbb-863c-1557213d69f0'
      });

      const result = {
        hasToken: !!token?.data,
        tokenPrefix: token?.data ? token.data.substring(0, 50) + '...' : undefined
      };

      console.log('🎫 Android Push Token Check:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to get push token:', error);
      return {
        hasToken: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get device information
   */
  private getDeviceInfo(): AndroidNotificationDebugInfo['deviceInfo'] {
    return {
      platform: Platform.OS,
      isPhysicalDevice: !__DEV__ // Rough approximation
    };
  }

  /**
   * Check storage state
   */
  private async checkStorage(): Promise<AndroidNotificationDebugInfo['storage']> {
    try {
      const sessionId = await AsyncStorage.getItem('currentSessionId');
      const eventId = await AsyncStorage.getItem('currentEventId');
      const pushSetupCache = await AsyncStorage.getItem('pushSetupCache');

      const result = {
        hasSession: !!sessionId,
        hasEvent: !!eventId,
        pushSetupCache: pushSetupCache ? JSON.parse(pushSetupCache) : undefined
      };

      console.log('💾 Android Storage Check:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to check storage:', error);
      return {
        hasSession: false,
        hasEvent: false
      };
    }
  }

  /**
   * Detect potential issues from diagnostic
   */
  private detectIssues(diagnostic: AndroidNotificationDebugInfo): string[] {
    const issues: string[] = [];

    if (!diagnostic.permissions.granted) {
      issues.push('Permissions not granted');
    }

    if (!diagnostic.channels.initialized) {
      issues.push('Notification channels not initialized');
    }

    if (!diagnostic.pushToken.hasToken) {
      issues.push('Push token not available');
    }

    if (!diagnostic.storage.hasSession) {
      issues.push('No session ID in storage');
    }

    if (!diagnostic.storage.hasEvent) {
      issues.push('No event ID in storage');
    }

    return issues;
  }

  /**
   * Save diagnostic log for later review
   */
  private async saveDiagnosticLog(diagnostic: AndroidNotificationDebugInfo): Promise<void> {
    try {
      const existingLogsStr = await AsyncStorage.getItem(this.DEBUG_KEY);
      const existingLogs = existingLogsStr ? JSON.parse(existingLogsStr) : [];
      
      // Add new log
      existingLogs.unshift(diagnostic);
      
      // Keep only recent entries
      const trimmedLogs = existingLogs.slice(0, this.MAX_LOG_ENTRIES);
      
      await AsyncStorage.setItem(this.DEBUG_KEY, JSON.stringify(trimmedLogs));
    } catch (error) {
      console.warn('Failed to save diagnostic log:', error);
    }
  }

  /**
   * Get previous diagnostic logs
   */
  async getDiagnosticHistory(): Promise<AndroidNotificationDebugInfo[]> {
    try {
      const logsStr = await AsyncStorage.getItem(this.DEBUG_KEY);
      return logsStr ? JSON.parse(logsStr) : [];
    } catch (error) {
      console.warn('Failed to get diagnostic history:', error);
      return [];
    }
  }

  /**
   * Clear diagnostic history
   */
  async clearDiagnosticHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.DEBUG_KEY);
    } catch (error) {
      console.warn('Failed to clear diagnostic history:', error);
    }
  }

  /**
   * Force notification permission request (for testing)
   */
  async forcePermissionRequest(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      console.log('🔄 Force requesting Android notification permissions...');
      
      const result = await Notifications.requestPermissionsAsync({
        android: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        }
      });

      const granted = result.status === 'granted';
      
      console.log('📝 Permission request result:', { 
        status: result.status, 
        granted,
        android: result.android 
      });

      // Log result to Sentry
      console.log({
        message: 'Android permission force request',
        level: 'info',
        category: 'android_notification_debug',
        data: { result, granted }
      });

      return granted;
    } catch (error) {
      console.error('❌ Failed to force request permissions:', error);
      console.error(error, {
        tags: {
          operation: 'android_permission_force_request'
        }
      });
      return false;
    }
  }

  /**
   * Test local notification (bypass FCM)
   */
  async testLocalNotification(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      console.log('🧪 Testing Android local notification...');

      const result = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧪 Hooked Test Notification',
          body: 'This is a test notification to verify Android notifications work locally.',
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 1
        }
      });

      console.log('📱 Local notification scheduled:', result);
      
      console.log({
        message: 'Android local notification test',
        level: 'info',
        category: 'android_notification_debug',
        data: { notificationId: result }
      });

      return true;
    } catch (error) {
      console.error('❌ Failed to test local notification:', error);
      console.error(error, {
        tags: {
          operation: 'android_local_notification_test'
        }
      });
      return false;
    }
  }
}

export const AndroidNotificationDebugger = new AndroidNotificationDebuggerService();
export default AndroidNotificationDebugger;