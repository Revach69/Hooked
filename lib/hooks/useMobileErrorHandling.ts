import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import mobileErrorHandler, { 
  withErrorHandling, 
  queueOfflineAction, 
  getErrorMessage, 
  isOnline, 
  getOfflineQueueLength 
} from '../mobileErrorHandler';

export const useMobileErrorHandling = () => {
  const [isOnline, setIsOnline] = useState(mobileErrorHandler.getOnlineStatus());
  const [offlineQueueLength, setOfflineQueueLength] = useState(getOfflineQueueLength());
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsProcessingQueue(true);
    };

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

    // Listen for online/offline events
    if ((global as any).eventEmitter) {
      (global as any).eventEmitter.on('appOnline', handleAppOnline);
      (global as any).eventEmitter.on('appOffline', handleOffline);
    }

    // Initial check
    setIsOnline(mobileErrorHandler.getOnlineStatus());
    setOfflineQueueLength(getOfflineQueueLength());

    return () => {
      if ((global as any).eventEmitter) {
        (global as any).eventEmitter.off('appOnline', handleAppOnline);
        (global as any).eventEmitter.off('appOffline', handleOffline);
      }
    };
  }, []);

  // Enhanced operation wrapper with error handling
  const executeWithRetry = useCallback(async (operation: () => Promise<any>, options: any = {}) => {
    try {
      return await withErrorHandling(operation, options);
    } catch (error) {
      const userMessage = getErrorMessage(error);
      throw { ...(error as any), userMessage };
    }
  }, []);

  // Queue operation for offline execution
  const queueForOffline = useCallback((operation: () => Promise<any>, metadata: any = {}) => {
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

// Hook for managing async operations with loading states
export const useMobileAsyncOperation = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const { executeWithRetry, queueForOffline, isOnline } = useMobileErrorHandling();

  const executeOperation = useCallback(async (operation: () => Promise<any>, options: any = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await executeWithRetry(operation, options);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [executeWithRetry]);

  const executeOperationWithOfflineFallback = useCallback(async (operation: () => Promise<any>, metadata: any = {}) => {
    if (!isOnline) {
      // Queue for offline execution
      const actionId = queueForOffline(operation, metadata);
      return { queued: true, actionId };
    }

    try {
      const result = await executeOperation(operation);
      return { success: true, result };
    } catch (err) {
      // If it's a network error and we're offline, queue it
      if ((err as any).message?.includes('No internet connection') || (err as any).code === 'unavailable') {
        const actionId = queueForOffline(operation, metadata);
        return { queued: true, actionId, error: err };
      }
      throw err;
    }
  }, [isOnline, executeOperation, queueForOffline]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const showErrorAlert = useCallback((error: any, onRetry?: () => void) => {
    const message = getErrorMessage(error);
    Alert.alert(
      'Error',
      message,
      [
        { text: 'OK', style: 'default' },
        ...(onRetry ? [{ text: 'Retry', onPress: onRetry }] : [])
      ]
    );
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
        message: 'You\'re offline. Some features may be limited.',
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
        message: `${offlineQueueLength} action${offlineQueueLength > 1 ? 's' : ''} queued for when you\'re back online.`,
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