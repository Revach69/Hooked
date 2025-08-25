'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useSessionContext } from './SessionProvider';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationPermissionPromptWithSuspense } from './LazyComponents';

interface NotificationContextType {
  isSupported: boolean;
  permission: NotificationPermission;
  isLoading: boolean;
  registrationToken: string | null;
  requestPermission: () => Promise<boolean>;
  initialize: (sessionId: string) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType>({
  isSupported: false,
  permission: 'default',
  isLoading: false,
  registrationToken: null,
  requestPermission: async () => false,
  initialize: async () => false,
});

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider');
  }
  return context;
}

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { sessionId } = useSessionContext();
  const notifications = useNotifications();

  // Auto-initialize notifications when user has session and granted permission
  useEffect(() => {
    if (sessionId && notifications.permission === 'granted' && !notifications.registrationToken) {
      notifications.initialize(sessionId);
    }
  }, [sessionId, notifications.permission, notifications.registrationToken, notifications.initialize]);

  return (
    <NotificationContext.Provider value={notifications}>
      {children}
      {/* Show notification permission prompt with session ID */}
      {sessionId && (
        <NotificationPermissionPromptWithSuspense 
          sessionId={sessionId}
          onPermissionGranted={() => {
            console.log('Notifications enabled for session:', sessionId);
          }}
          onPermissionDenied={() => {
            console.log('Notifications disabled for session:', sessionId);
          }}
        />
      )}
    </NotificationContext.Provider>
  );
}