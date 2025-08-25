'use client';

import { useEffect, useState } from 'react';
import { useSession } from '@/lib/sessionManager';
import { useSessionContext } from '@/components/SessionProvider';
import { SessionService } from '@/lib/sessionService';
import { useFirebaseConnection } from '@/hooks/useFirebaseConnection';

export default function SessionTestPage() {
  const session = useSession();
  const sessionContext = useSessionContext();
  const firebaseConnection = useFirebaseConnection();
  const [testResults, setTestResults] = useState<{
    localSession: boolean;
    firebaseSession: boolean;
    persistence: boolean;
    error?: string;
  }>({
    localSession: false,
    firebaseSession: false,
    persistence: false,
  });

  const runTests = async () => {
    try {
      const results = {
        localSession: false,
        firebaseSession: false,
        persistence: false,
        error: undefined as string | undefined,
      };

      // Test 1: Local session existence
      results.localSession = !!session.sessionId && session.isActive;

      // Test 2: Firebase session validation
      if (sessionContext.sessionId) {
        results.firebaseSession = await SessionService.validateSession(sessionContext.sessionId);
      }

      // Test 3: Persistence test (check if session survives page refresh)
      const persistedSessionId = localStorage.getItem('hooked-web-session');
      results.persistence = !!persistedSessionId;

      setTestResults(results);
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Test failed',
      }));
    }
  };

  const createTestProfile = async () => {
    if (!sessionContext.sessionId) return;

    const testProfile = {
      id: `test_${Date.now()}`,
      name: 'Test User',
      age: 25,
      bio: 'Test user profile for session testing',
      photos: [],
      interests: ['testing', 'development'],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    };

    await SessionService.setUserProfile(sessionContext.sessionId, testProfile);
  };

  useEffect(() => {
    runTests();
  }, [session.sessionId, sessionContext.sessionId]);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-6">Session Management Test</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <h3 className="font-semibold">Local Session</h3>
              <p className="text-sm text-gray-600">ID: {session.sessionId || 'None'}</p>
              <p className="text-sm text-gray-600">Active: {session.isActive ? '✅' : '❌'}</p>
              <p className="text-sm text-gray-600">Valid: {session.isSessionValid() ? '✅' : '❌'}</p>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold">Firebase Session</h3>
              <p className="text-sm text-gray-600">ID: {sessionContext.sessionId || 'None'}</p>
              <p className="text-sm text-gray-600">Initialized: {sessionContext.isInitialized ? '✅' : '❌'}</p>
              <p className="text-sm text-gray-600">Loading: {sessionContext.isLoading ? '⏳' : '✅'}</p>
            </div>
          </div>

          <div className="space-y-2 mb-6">
            <h3 className="font-semibold">Firebase Connection</h3>
            <p className="text-sm text-gray-600">Online: {firebaseConnection.isOnline ? '✅' : '❌'}</p>
            <p className="text-sm text-gray-600">Firebase Connected: {firebaseConnection.isFirebaseConnected ? '✅' : '❌'}</p>
            <p className="text-sm text-gray-600">Initialized: {firebaseConnection.isInitialized ? '✅' : '❌'}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          
          <div className="space-y-3 mb-6">
            <TestItem 
              label="Local Session Active"
              passed={testResults.localSession}
              description="Session exists in local storage and is marked as active"
            />
            <TestItem 
              label="Firebase Session Valid"
              passed={testResults.firebaseSession}
              description="Session exists in Firebase and is not expired"
            />
            <TestItem 
              label="Session Persistence"
              passed={testResults.persistence}
              description="Session data persists across page refreshes"
            />
          </div>

          {testResults.error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
              <p className="text-red-700 text-sm">Error: {testResults.error}</p>
            </div>
          )}

          <div className="space-y-2">
            <button
              onClick={runTests}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Run Tests
            </button>
            
            <button
              onClick={createTestProfile}
              disabled={!sessionContext.sessionId}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Test Profile
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition-colors"
            >
              Test Page Refresh
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Current User Profile</h2>
          {session.userProfile ? (
            <div className="space-y-2">
              <p><strong>ID:</strong> {session.userProfile.id}</p>
              <p><strong>Name:</strong> {session.userProfile.name}</p>
              <p><strong>Age:</strong> {session.userProfile.age}</p>
              <p><strong>Bio:</strong> {session.userProfile.bio}</p>
              <p><strong>Interests:</strong> {session.userProfile.interests.join(', ')}</p>
            </div>
          ) : (
            <p className="text-gray-500">No profile created yet</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
          <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto">
            {JSON.stringify({
              localSession: {
                sessionId: session.sessionId,
                isActive: session.isActive,
                userProfile: !!session.userProfile,
                currentEventId: session.currentEventId,
                lastActivity: new Date(session.lastActivity).toISOString(),
              },
              firebaseConnection: {
                isOnline: firebaseConnection.isOnline,
                isFirebaseConnected: firebaseConnection.isFirebaseConnected,
                isInitialized: firebaseConnection.isInitialized,
                lastChecked: new Date(firebaseConnection.lastChecked).toISOString(),
                error: firebaseConnection.error,
              },
              sessionContext: {
                sessionId: sessionContext.sessionId,
                isInitialized: sessionContext.isInitialized,
                isLoading: sessionContext.isLoading,
                error: sessionContext.error,
              },
            }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

function TestItem({ label, passed, description }: { label: string; passed: boolean; description: string }) {
  return (
    <div className="flex items-start space-x-3 p-3 border border-gray-200 rounded-md">
      <div className={`w-3 h-3 rounded-full mt-0.5 flex-shrink-0 ${passed ? 'bg-green-500' : 'bg-red-500'}`} />
      <div>
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    </div>
  );
}