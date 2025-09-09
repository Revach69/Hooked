/**
 * Android Notification Manager
 * 
 * Central management for all Android notification features including:
 * - Diagnostics and debugging
 * - Channel management  
 * - Fallback mechanisms
 * - Error reporting
 */

import { Platform } from 'react-native';
import { AndroidNotificationDebugger } from './AndroidNotificationDebugger';
import { AndroidChannels } from './AndroidChannels';

import AsyncStorage from '@react-native-async-storage/async-storage';

interface AndroidNotificationStatus {
  platform: string;
  isSupported: boolean;
  channelsInitialized: boolean;
  diagnosticResults?: any;
  fallbackConfig: {
    aggressiveEnabled: boolean;
    usageCount: number;
    lastUsed?: number;
  };
  recentErrors: any[];
}

class AndroidNotificationManagerService {
  private readonly ERROR_LOG_KEY = 'android_notification_errors';
  private readonly MAX_ERROR_LOGS = 20;

  /**
   * Get comprehensive Android notification status
   */
  async getAndroidStatus(): Promise<AndroidNotificationStatus> {
    if (Platform.OS !== 'android') {
      return {
        platform: Platform.OS,
        isSupported: false,
        channelsInitialized: false,
        fallbackConfig: { aggressiveEnabled: false, usageCount: 0 },
        recentErrors: []
      };
    }

    try {
      // Run diagnostic
      const diagnosticResults = await AndroidNotificationDebugger.runDiagnostic();
      
      // Get fallback usage
      const fallbackUsage = await this.getFallbackUsage();
      
      // Get recent errors
      const recentErrors = await this.getRecentErrors();
      
      const status: AndroidNotificationStatus = {
        platform: Platform.OS,
        isSupported: true,
        channelsInitialized: AndroidChannels.isInitialized(),
        diagnosticResults,
        fallbackConfig: {
          aggressiveEnabled: fallbackUsage.count > 0,
          usageCount: fallbackUsage.count,
          lastUsed: fallbackUsage.lastUsed
        },
        recentErrors
      };

      console.log('🤖 Android Notification Status:', status);
      
      // Send comprehensive status to Sentry
      console.log({
        message: 'Android Notification Status Check Complete',
        level: 'info',
        category: 'android_notification_manager',
        data: status
      });

      return status;

    } catch (error) {
      console.error('Failed to get Android status:', error);
      
      console.error(error, {
        tags: {
          operation: 'android_status_check',
          platform: 'android'
        }
      });

      return {
        platform: Platform.OS,
        isSupported: true,
        channelsInitialized: false,
        fallbackConfig: { aggressiveEnabled: false, usageCount: 0 },
        recentErrors: [{ error: error instanceof Error ? error.message : String(error), timestamp: Date.now() }]
      };
    }
  }

  /**
   * Force all Android notification systems to reinitialize
   */
  async forceAndroidReinit(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      console.log('🔄 Force reinitializing Android notification systems...');
      
      // Clear caches and reset state
      await this.clearAllCaches();
      
      // Reinitialize channels
      await AndroidChannels.initialize();
      
      // Test permissions
      const permissionGranted = await AndroidNotificationDebugger.forcePermissionRequest();
      
      // Test local notification
      if (permissionGranted) {
        await AndroidNotificationDebugger.testLocalNotification();
      }
      
      // Run diagnostic
      const diagnostic = await AndroidNotificationDebugger.runDiagnostic();
      
      const success = diagnostic.permissions.granted && diagnostic.channels.initialized;
      
      console.log({
        message: 'Android notification reinit completed',
        level: success ? 'info' : 'warning',
        category: 'android_notification_manager',
        data: { success, diagnostic }
      });

      console.log(`🤖 Android reinit ${success ? 'successful' : 'failed'}:`, diagnostic);
      
      return success;

    } catch (error) {
      console.error('Android reinit failed:', error);
      
      console.error(error, {
        tags: {
          operation: 'android_reinit',
          platform: 'android'
        }
      });

      return false;
    }
  }

  /**
   * Log Android notification error for debugging
   */
  async logAndroidError(error: any, context: string): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      const errorLog = {
        timestamp: Date.now(),
        error: error.message || String(error),
        context,
        stack: error.stack
      };

      // Get existing errors
      const existingLogsStr = await AsyncStorage.getItem(this.ERROR_LOG_KEY);
      const existingLogs = existingLogsStr ? JSON.parse(existingLogsStr) : [];
      
      // Add new error
      existingLogs.unshift(errorLog);
      
      // Keep only recent errors
      const trimmedLogs = existingLogs.slice(0, this.MAX_ERROR_LOGS);
      
      // Save back to storage
      await AsyncStorage.setItem(this.ERROR_LOG_KEY, JSON.stringify(trimmedLogs));
      
      console.error(`🤖 Android Notification Error [${context}]:`, error);
      
      // Send to Sentry with Android-specific tags
      console.error(error, {
        tags: {
          platform: 'android',
          notification_context: context,
          source: 'AndroidNotificationManager'
        },
        extra: { errorLog }
      });

    } catch (logError) {
      console.warn('Failed to log Android error:', logError);
    }
  }

  /**
   * Get recent Android notification errors
   */
  async getRecentErrors(): Promise<any[]> {
    if (Platform.OS !== 'android') {
      return [];
    }

    try {
      const logsStr = await AsyncStorage.getItem(this.ERROR_LOG_KEY);
      return logsStr ? JSON.parse(logsStr) : [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Clear all Android notification caches and reset state
   */
  async clearAllCaches(): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      const keysToRemove = [
        'android_notification_debug_log',
        'android_push_failure_history',
        'android_aggressive_fallback_usage',
        'pushSetupCache',
        this.ERROR_LOG_KEY
      ];

      await Promise.all(keysToRemove.map(key => 
        AsyncStorage.removeItem(key).catch((_error) => {
          // Ignore individual failures
        })
      ));

      console.log('🧹 Cleared all Android notification caches');

    } catch (_error) {
      console.warn('Failed to clear Android caches:', _error);
    }
  }

  /**
   * Get fallback usage statistics
   */
  private async getFallbackUsage(): Promise<{count: number, lastUsed?: number}> {
    try {
      const usage = await AsyncStorage.getItem('android_aggressive_fallback_usage');
      return usage ? JSON.parse(usage) : { count: 0 };
    } catch (_error) {
      return { count: 0 };
    }
  }

  /**
   * Generate Android notification report for debugging
   */
  async generateDebugReport(): Promise<string> {
    const status = await this.getAndroidStatus();
    const errors = await this.getRecentErrors();
    const _fallbackUsage = await this.getFallbackUsage();
    
    let report = `🤖 ANDROID NOTIFICATION DEBUG REPORT\n`;
    report += `Generated: ${new Date().toISOString()}\n\n`;
    
    report += `📱 PLATFORM: ${status.platform}\n`;
    report += `✅ SUPPORTED: ${status.isSupported}\n`;
    report += `📢 CHANNELS INITIALIZED: ${status.channelsInitialized}\n\n`;
    
    if (status.diagnosticResults) {
      const diag = status.diagnosticResults;
      report += `🔐 PERMISSIONS: ${diag.permissions.status} (granted: ${diag.permissions.granted})\n`;
      report += `📢 CHANNELS: ${diag.channels.available.length} available\n`;
      report += `🎫 PUSH TOKEN: ${diag.pushToken.hasToken ? 'Available' : 'Missing'}\n`;
      report += `💾 STORAGE: Session=${diag.storage.hasSession}, Event=${diag.storage.hasEvent}\n\n`;
    }
    
    report += `🚨 FALLBACK SYSTEM:\n`;
    report += `  - Aggressive enabled: ${status.fallbackConfig.aggressiveEnabled}\n`;
    report += `  - Usage count: ${status.fallbackConfig.usageCount}\n`;
    report += `  - Last used: ${status.fallbackConfig.lastUsed ? new Date(status.fallbackConfig.lastUsed).toISOString() : 'Never'}\n\n`;
    
    if (errors.length > 0) {
      report += `❌ RECENT ERRORS (${errors.length}):\n`;
      errors.slice(0, 5).forEach((error, i) => {
        report += `  ${i + 1}. [${error.context}] ${error.error} (${new Date(error.timestamp).toISOString()})\n`;
      });
    } else {
      report += `✅ NO RECENT ERRORS\n`;
    }
    
    console.log(report);
    return report;
  }
}

export const AndroidNotificationManager = new AndroidNotificationManagerService();
export default AndroidNotificationManager;