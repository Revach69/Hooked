'use client';

import { useState, useEffect } from 'react';

export interface OfflineState {
  isOnline: boolean;
  isOffline: boolean;
  connectionType: string | null;
  effectiveType: string | null;
  saveForLater: (key: string, data: any) => void;
  getOfflineData: (key: string) => any | null;
  clearOfflineData: (key: string) => void;
  getPendingActions: () => any[];
  addPendingAction: (action: any) => void;
  clearPendingActions: () => void;
}

export function useOffline(): OfflineState {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionInfo, setConnectionInfo] = useState<{
    type: string | null;
    effectiveType: string | null;
  }>({
    type: null,
    effectiveType: null,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Set initial online status
    setIsOnline(navigator.onLine);

    // Get network connection info
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;
    
    if (connection) {
      setConnectionInfo({
        type: connection.type || null,
        effectiveType: connection.effectiveType || null,
      });

      const updateConnectionInfo = () => {
        setConnectionInfo({
          type: connection.type || null,
          effectiveType: connection.effectiveType || null,
        });
      };

      connection.addEventListener('change', updateConnectionInfo);
    }

    // Handle online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      
      // Process pending actions when coming back online
      const pendingActions = getPendingActions();
      if (pendingActions.length > 0) {
        console.log(`Processing ${pendingActions.length} pending actions...`);
        // Here you could dispatch these actions to your sync service
        // For now, we'll just log them
        processPendingActions(pendingActions);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (connection) {
        connection.removeEventListener('change', () => {});
      }
    };
  }, []);

  const saveForLater = (key: string, data: any) => {
    try {
      const offlineData = JSON.parse(localStorage.getItem('offline-data') || '{}');
      offlineData[key] = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem('offline-data', JSON.stringify(offlineData));
    } catch (error) {
      console.error('Error saving offline data:', error);
    }
  };

  const getOfflineData = (key: string): any | null => {
    try {
      const offlineData = JSON.parse(localStorage.getItem('offline-data') || '{}');
      const item = offlineData[key];
      
      if (item) {
        // Check if data is still valid (24 hours)
        const isExpired = Date.now() - item.timestamp > 24 * 60 * 60 * 1000;
        if (isExpired) {
          clearOfflineData(key);
          return null;
        }
        return item.data;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting offline data:', error);
      return null;
    }
  };

  const clearOfflineData = (key: string) => {
    try {
      const offlineData = JSON.parse(localStorage.getItem('offline-data') || '{}');
      delete offlineData[key];
      localStorage.setItem('offline-data', JSON.stringify(offlineData));
    } catch (error) {
      console.error('Error clearing offline data:', error);
    }
  };

  const getPendingActions = (): any[] => {
    try {
      return JSON.parse(localStorage.getItem('pending-actions') || '[]');
    } catch (error) {
      console.error('Error getting pending actions:', error);
      return [];
    }
  };

  const addPendingAction = (action: any) => {
    try {
      const pendingActions = getPendingActions();
      pendingActions.push({
        ...action,
        timestamp: Date.now(),
        id: Date.now() + Math.random(),
      });
      localStorage.setItem('pending-actions', JSON.stringify(pendingActions));
    } catch (error) {
      console.error('Error adding pending action:', error);
    }
  };

  const clearPendingActions = () => {
    try {
      localStorage.removeItem('pending-actions');
    } catch (error) {
      console.error('Error clearing pending actions:', error);
    }
  };

  const processPendingActions = async (actions: any[]) => {
    // This is where you would implement the actual sync logic
    // For now, we'll just clear them to prevent accumulation
    try {
      for (const action of actions) {
        console.log('Processing pending action:', action.type, action);
        // Here you would dispatch the action to your services
        // await YourSyncService.processAction(action);
      }
      clearPendingActions();
    } catch (error) {
      console.error('Error processing pending actions:', error);
    }
  };

  return {
    isOnline,
    isOffline: !isOnline,
    connectionType: connectionInfo.type,
    effectiveType: connectionInfo.effectiveType,
    saveForLater,
    getOfflineData,
    clearOfflineData,
    getPendingActions,
    addPendingAction,
    clearPendingActions,
  };
}