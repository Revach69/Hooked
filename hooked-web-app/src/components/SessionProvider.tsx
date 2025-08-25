'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { SessionService } from '@/lib/sessionService';
import { useSession } from '@/lib/sessionManager';
import { useFirebaseConnection } from '@/hooks/useFirebaseConnection';
import FirebaseErrorBoundary from './FirebaseErrorBoundary';

interface SessionContextType {
  sessionId: string | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  initialize: (metadata?: any) => Promise<void>;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

interface SessionProviderProps {
  children: ReactNode;
  initialMetadata?: any;
}

export function SessionProvider({ children, initialMetadata }: SessionProviderProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const session = useSession();
  const firebaseConnection = useFirebaseConnection();

  const initializeSession = async (metadata?: any) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const newSessionId = await SessionService.initialize(metadata || initialMetadata);
      setSessionId(newSessionId);
      setIsInitialized(true);
      
      console.log('Session initialized:', newSessionId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Session initialization failed';
      setError(errorMessage);
      console.error('Session initialization error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSession = async () => {
    if (sessionId) {
      try {
        const isValid = await SessionService.validateSession(sessionId);
        if (!isValid) {
          // Session expired, create new one
          await initializeSession();
        } else {
          // Update activity
          await SessionService.updateActivity(sessionId);
        }
      } catch (err) {
        console.error('Session refresh error:', err);
        // Try to reinitialize
        await initializeSession();
      }
    }
  };

  // Initialize session on mount
  useEffect(() => {
    initializeSession();
  }, []);

  // Set up activity heartbeat when Firebase is connected
  useEffect(() => {
    if (sessionId && firebaseConnection.isFirebaseConnected) {
      const cleanup = session.startActivityHeartbeat();
      return cleanup;
    }
  }, [sessionId, firebaseConnection.isFirebaseConnected, session]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      if (sessionId) {
        refreshSession();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [sessionId]);

  // Refresh session when Firebase connection is restored
  useEffect(() => {
    if (firebaseConnection.isFirebaseConnected && sessionId) {
      refreshSession();
    }
  }, [firebaseConnection.isFirebaseConnected]);

  const contextValue: SessionContextType = {
    sessionId,
    isInitialized,
    isLoading,
    error,
    initialize: initializeSession,
    refresh: refreshSession,
  };

  if (error && !sessionId) {
    return (
      <FirebaseErrorBoundary>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-md text-center">
            <div className="text-red-500 mb-4">⚠️</div>
            <h2 className="text-xl font-semibold mb-2">Session Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => initializeSession()}
              className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </FirebaseErrorBoundary>
    );
  }

  if (isLoading || !isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Setting up your session...</p>
        </div>
      </div>
    );
  }

  return (
    <SessionContext.Provider value={contextValue}>
      <FirebaseErrorBoundary>
        {children}
      </FirebaseErrorBoundary>
    </SessionContext.Provider>
  );
}

export function useSessionContext(): SessionContextType {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSessionContext must be used within a SessionProvider');
  }
  return context;
}