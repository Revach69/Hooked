import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ErrorLog {
  id: string;
  timestamp: string;
  operation: string;
  error: string;
  code?: string;
  platform: string;
  isDev: boolean;
  networkStatus?: string;
  retryCount?: number;
  userId?: string;
  eventId?: string;
}

export interface ErrorStats {
  totalErrors: number;
  errorsByOperation: Record<string, number>;
  errorsByCode: Record<string, number>;
  errorsByHour: Record<string, number>;
  recentErrors: ErrorLog[];
}

class ErrorMonitor {
  private readonly maxLogs = 1000;
  private readonly storageKey = 'firebase_error_logs';

  async logError(error: any, operation: string, context?: {
    userId?: string;
    eventId?: string;
    retryCount?: number;
    networkStatus?: string;
  }): Promise<void> {
    try {
      const errorLog: ErrorLog = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        operation,
        error: error.message || error.toString(),
        code: error.code,
        platform: 'react-native',
        isDev: __DEV__,
        networkStatus: context?.networkStatus,
        retryCount: context?.retryCount,
        userId: context?.userId,
        eventId: context?.eventId
      };

      const existingLogs = await this.getLogs();
      existingLogs.unshift(errorLog);

      // Keep only the most recent logs
      if (existingLogs.length > this.maxLogs) {
        existingLogs.splice(this.maxLogs);
      }

      await AsyncStorage.setItem(this.storageKey, JSON.stringify(existingLogs));
      
      // Log to console in development
      if (__DEV__) {
        console.error('📊 Error logged:', errorLog);
      }
    } catch (storageError) {
      console.error('❌ Failed to log error to storage:', storageError);
    }
  }

  async getLogs(): Promise<ErrorLog[]> {
    try {
      const logs = await AsyncStorage.getItem(this.storageKey);
      return logs ? JSON.parse(logs) : [];
    } catch (error) {
      console.error('❌ Failed to retrieve error logs:', error);
      return [];
    }
  }

  async getStats(hours: number = 24): Promise<ErrorStats> {
    const logs = await this.getLogs();
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const recentLogs = logs.filter(log => new Date(log.timestamp) > cutoffTime);
    
    const stats: ErrorStats = {
      totalErrors: recentLogs.length,
      errorsByOperation: {},
      errorsByCode: {},
      errorsByHour: {},
      recentErrors: recentLogs.slice(0, 50) // Last 50 errors
    };

    recentLogs.forEach(log => {
      // Count by operation
      stats.errorsByOperation[log.operation] = (stats.errorsByOperation[log.operation] || 0) + 1;
      
      // Count by error code
      const code = log.code || 'unknown';
      stats.errorsByCode[code] = (stats.errorsByCode[code] || 0) + 1;
      
      // Count by hour
      const hour = new Date(log.timestamp).getHours().toString();
      stats.errorsByHour[hour] = (stats.errorsByHour[hour] || 0) + 1;
    });

    return stats;
  }

  async clearLogs(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.storageKey);
      console.log('✅ Error logs cleared');
    } catch (error) {
      console.error('❌ Failed to clear error logs:', error);
    }
  }

  async exportLogs(): Promise<string> {
    const logs = await this.getLogs();
    return JSON.stringify(logs, null, 2);
  }

  // Get error patterns for debugging
  async getErrorPatterns(): Promise<{
    mostCommonErrors: Array<{ error: string; count: number }>;
    operationsWithMostErrors: Array<{ operation: string; count: number }>;
    timeOfDayWithMostErrors: Array<{ hour: string; count: number }>;
  }> {
    const stats = await this.getStats(24);
    
    const mostCommonErrors = Object.entries(stats.errorsByCode)
      .map(([code, count]) => ({ error: code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const operationsWithMostErrors = Object.entries(stats.errorsByOperation)
      .map(([operation, count]) => ({ operation, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const timeOfDayWithMostErrors = Object.entries(stats.errorsByHour)
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      mostCommonErrors,
      operationsWithMostErrors,
      timeOfDayWithMostErrors
    };
  }
}

export const errorMonitor = new ErrorMonitor();

// Helper function to log errors with context
export const logFirebaseError = async (
  error: any, 
  operation: string, 
  context?: {
    userId?: string;
    eventId?: string;
    retryCount?: number;
    networkStatus?: string;
  }
): Promise<void> => {
  await errorMonitor.logError(error, operation, context);
};

// Helper function to get error insights
export const getErrorInsights = async (): Promise<{
  stats: ErrorStats;
  patterns: Awaited<ReturnType<typeof errorMonitor.getErrorPatterns>>;
}> => {
  const [stats, patterns] = await Promise.all([
    errorMonitor.getStats(),
    errorMonitor.getErrorPatterns()
  ]);

  return { stats, patterns };
}; 