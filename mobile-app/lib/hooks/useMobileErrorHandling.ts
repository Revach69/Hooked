import { useState, useEffect, useCallback } from 'react';
import mobileErrorHandler, { 
  withErrorHandling, 
  queueOfflineAction, 
  getErrorMessage, 
  getOfflineQueueLength 
} from '../mobileErrorHandler';
import Toast from 'react-native-toast-message';
import type { ErrorReport } from '../types';
import { globalEventEmitter } from '../utils/globalEventEmitter';

export const useMobileErrorHandling = () => {
  const [isOnline, setIsOnline] = useState(mobileErrorHandler.getOnlineStatus());
  const [offlineQueueLength, setOfflineQueueLength] = useState(getOfflineQueueLength());
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleAppOnline = () => {
      // Update queue length after processing
      setTimeout(() => {
        setOfflineQueueLength(getOfflineQueueLength());
        setIsProcessingQueue(false);
      }, 1000);
    };

    // Listen for online/offline events using type-safe event emitter
    globalEventEmitter.on('appOnline', handleAppOnline);
    globalEventEmitter.on('appOffline', handleOffline);

    // Initial check
    setIsOnline(mobileErrorHandler.getOnlineStatus());
    setOfflineQueueLength(getOfflineQueueLength());

    return () => {
      globalEventEmitter.off('appOnline', handleAppOnline);
      globalEventEmitter.off('appOffline', handleOffline);
    };
  }, []);

  // Enhanced operation wrapper with error handling
  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>, 
    options: Record<string, unknown> = {}
  ): Promise<T> => {
    try {
      return await withErrorHandling(operation, options);
    } catch (error) {
      const userMessage = getErrorMessage(error);
      if (error instanceof Error) {
        const enhancedError = Object.assign(error, { userMessage });
        throw enhancedError;
      }
      throw new Error(`${error} - ${userMessage}`);
    }
  }, []);

  // Queue operation for offline execution
  const queueForOffline = useCallback(<T>(
    operation: () => Promise<T>, 
    metadata: Record<string, unknown> = {}
  ): string => {
    const actionId = queueOfflineAction(operation, metadata);
    setOfflineQueueLength(getOfflineQueueLength());
    return actionId;
  }, []);

  // Check connectivity
  const checkConnectivity = useCallback(async () => {
    const online = await mobileErrorHandler.checkConnectivity();
    setIsOnline(online);
    return online;
  }, []);

  return {
    isOnline,
    offlineQueueLength,
    isProcessingQueue,
    executeWithRetry,
    queueForOffline,
    checkConnectivity,
    getErrorMessage
  };
};

interface OperationResult<T> {
  success?: boolean;
  result?: T;
  queued?: boolean;
  actionId?: string;
  error?: Error;
}

// Hook for managing async operations with loading states
export const useMobileAsyncOperation = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { executeWithRetry, queueForOffline, isOnline } = useMobileErrorHandling();

  const executeOperation = useCallback(async <T>(
    operation: () => Promise<T>, 
    options: Record<string, unknown> = {}
  ): Promise<T> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await executeWithRetry(operation, options);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [executeWithRetry]);

  const executeOperationWithOfflineFallback = useCallback(async <T>(
    operation: () => Promise<T>, 
    metadata: Record<string, unknown> = {}
  ): Promise<OperationResult<T>> => {
    if (!isOnline) {
      // Queue for offline execution
      const actionId = queueForOffline(operation, metadata);
      return { queued: true, actionId };
    }

    try {
      const result = await executeOperation(operation);
      return { success: true, result };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      // If it's a network error and we're offline, queue it
      if (error.message?.includes('No internet connection') || 
          (error as any).code === 'unavailable') {
        const actionId = queueForOffline(operation, metadata);
        return { queued: true, actionId, error };
      }
      throw error;
    }
  }, [isOnline, executeOperation, queueForOffline]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const showErrorAlert = useCallback((error: Error | string, onRetry?: () => void) => {
    const message = getErrorMessage(error);
    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: message.substring(0, 37),
      position: 'top',
      visibilityTime: 5000, // longer visibility for persistent errors
      autoHide: true,
      topOffset: 0,
    });
    
    // If onRetry is provided, we could call it after a delay or via some other mechanism
    // This would need to be handled differently in the notification system
    if (onRetry) {
      // Store the retry function for potential use - this is a limitation of the current system
      // In a more advanced implementation, we could add action buttons to notifications
    }
  }, []);

  return {
    isLoading,
    error,
    executeOperation,
    executeOperationWithOfflineFallback,
    clearError,
    showErrorAlert
  };
};

// Hook for components that need to show offline status
export const useMobileOfflineStatus = () => {
  const { isOnline, offlineQueueLength, isProcessingQueue } = useMobileErrorHandling();

  const getStatusMessage = useCallback(() => {
    if (!isOnline) {
      return {
        type: 'offline',
        message: "You're offline. Some features may be limited.",
        icon: '📴'
      };
    }

    if (isProcessingQueue) {
      return {
        type: 'processing',
        message: 'Processing offline actions...',
        icon: '🔄'
      };
    }

    if (offlineQueueLength > 0) {
      return {
        type: 'queued',
        message: `${offlineQueueLength} action${offlineQueueLength > 1 ? 's' : ''} queued for when you're back online.`,
        icon: '📝'
      };
    }

    return {
      type: 'online',
      message: 'You\'re online',
      icon: '🌐'
    };
  }, [isOnline, offlineQueueLength, isProcessingQueue]);

  return {
    isOnline,
    offlineQueueLength,
    isProcessingQueue,
    statusMessage: getStatusMessage()
  };
}; 