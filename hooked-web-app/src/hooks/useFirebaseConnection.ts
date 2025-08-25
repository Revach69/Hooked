'use client';

import { useEffect, useState, useCallback } from 'react';
import { webConnectionManager, isFirebaseInitialized, getFirebaseApp } from '@/lib/firebase';

export interface ConnectionStatus {
  isOnline: boolean;
  isFirebaseConnected: boolean;
  isInitialized: boolean;
  lastChecked: number;
  error?: string;
}

export function useFirebaseConnection() {
  const [status, setStatus] = useState<ConnectionStatus>({
    isOnline: true,
    isFirebaseConnected: false,
    isInitialized: false,
    lastChecked: Date.now(),
  });

  const checkConnection = useCallback(async () => {
    try {
      const isOnline = navigator.onLine;
      const isInitialized = isFirebaseInitialized();
      let isFirebaseConnected = false;
      let error: string | undefined;

      if (isOnline && isInitialized) {
        try {
          // Test Firebase connection
          await getFirebaseApp();
          isFirebaseConnected = await webConnectionManager.checkConnection();
        } catch (err) {
          error = err instanceof Error ? err.message : 'Unknown connection error';
        }
      }

      setStatus({
        isOnline,
        isFirebaseConnected,
        isInitialized,
        lastChecked: Date.now(),
        error,
      });
    } catch (err) {
      setStatus(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Connection check failed',
        lastChecked: Date.now(),
      }));
    }
  }, []);

  const reconnect = useCallback(async () => {
    if (!status.isOnline) {
      console.warn('Cannot reconnect: device is offline');
      return false;
    }

    try {
      const success = await webConnectionManager.attemptReconnection();
      if (success) {
        await checkConnection();
      }
      return success;
    } catch (error) {
      console.error('Reconnection failed:', error);
      return false;
    }
  }, [status.isOnline, checkConnection]);

  // Initial connection check
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log('Device came online, checking Firebase connection...');
      checkConnection();
    };

    const handleOffline = () => {
      console.log('Device went offline');
      setStatus(prev => ({
        ...prev,
        isOnline: false,
        isFirebaseConnected: false,
        lastChecked: Date.now(),
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkConnection]);

  // Periodic connection check (every 30 seconds when page is visible)
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        checkConnection();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [checkConnection]);

  // Check connection when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkConnection();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [checkConnection]);

  return {
    ...status,
    checkConnection,
    reconnect,
  };
}