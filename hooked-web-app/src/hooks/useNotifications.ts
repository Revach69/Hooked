'use client';

import { useState, useEffect, useCallback } from 'react';
import { NotificationService, NotificationType, type HookedNotification } from '@/lib/notificationService';

export interface NotificationState {
  isSupported: boolean;
  permission: NotificationPermission;
  isLoading: boolean;
  registrationToken: string | null;
  lastNotification: HookedNotification | null;
}

export interface NotificationActions {
  requestPermission: () => Promise<boolean>;
  initialize: (sessionId: string) => Promise<boolean>;
  showLocalNotification: (notification: HookedNotification) => void;
  clearLastNotification: () => void;
}

export function useNotifications(): NotificationState & NotificationActions {
  const [state, setState] = useState<NotificationState>({
    isSupported: false,
    permission: 'default',
    isLoading: false,
    registrationToken: null,
    lastNotification: null,
  });

  // Initialize notification support detection
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const isSupported = NotificationService.isSupported();
    const permission = NotificationService.getPermissionStatus();
    
    setState(prev => ({
      ...prev,
      isSupported,
      permission,
    }));
  }, []);

  // Set up foreground message listener
  useEffect(() => {
    if (!state.isSupported || state.permission !== 'granted') return;

    let unsubscribe: (() => void) | null = null;

    const setupForegroundListener = async () => {
      try {
        unsubscribe = await NotificationService.onForegroundMessage((payload) => {
          const notification: HookedNotification = {
            type: payload.data?.type || NotificationType.EVENT_UPDATE,
            title: payload.notification?.title || 'Hooked',
            body: payload.notification?.body || 'You have a new notification',
            data: payload.data,
            icon: payload.notification?.icon,
            image: payload.notification?.image,
          };

          setState(prev => ({
            ...prev,
            lastNotification: notification,
          }));

          // Show local notification for foreground messages
          NotificationService.showLocalNotification(notification.title, {
            body: notification.body,
            icon: notification.icon,
            image: notification.image,
            data: notification.data,
            tag: notification.data?.type,
            requireInteraction: notification.requireInteraction,
          });
        });
      } catch (error) {
        console.error('Error setting up foreground message listener:', error);
      }
    };

    setupForegroundListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [state.isSupported, state.permission]);

  // Listen for notification clicks from service worker
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_CLICK') {
        // Handle navigation from notification click
        const { url, data } = event.data;
        
        if (url && url !== window.location.pathname) {
          window.location.href = url;
        }
        
        // Update last notification with click data
        if (data) {
          setState(prev => ({
            ...prev,
            lastNotification: {
              type: data.type || NotificationType.EVENT_UPDATE,
              title: 'Notification Clicked',
              body: 'You clicked on a notification',
              data: data,
            },
          }));
        }
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) {
      console.warn('Push notifications are not supported');
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const permission = await NotificationService.requestPermission();
      
      setState(prev => ({
        ...prev,
        permission,
        isLoading: false,
      }));

      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [state.isSupported]);

  const initialize = useCallback(async (sessionId: string): Promise<boolean> => {
    if (!state.isSupported) return false;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const success = await NotificationService.initialize(sessionId);
      
      if (success) {
        const token = await NotificationService.getRegistrationToken();
        setState(prev => ({
          ...prev,
          registrationToken: token,
          permission: NotificationService.getPermissionStatus(),
          isLoading: false,
        }));
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }

      return success;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [state.isSupported]);

  const showLocalNotification = useCallback((notification: HookedNotification) => {
    if (state.permission !== 'granted') return;

    NotificationService.showLocalNotification(notification.title, {
      body: notification.body,
      icon: notification.icon,
      image: notification.image,
      badge: notification.badge,
      data: notification.data,
      tag: notification.tag,
      requireInteraction: notification.requireInteraction,
    });
  }, [state.permission]);

  const clearLastNotification = useCallback(() => {
    setState(prev => ({ ...prev, lastNotification: null }));
  }, []);

  return {
    ...state,
    requestPermission,
    initialize,
    showLocalNotification,
    clearLastNotification,
  };
}