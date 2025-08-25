'use client';

import { useEffect, useState } from 'react';
import { getFirebaseApp, getDb, isFirebaseInitialized } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

interface FirebaseTestResult {
  initialized: boolean;
  appConfigured: boolean;
  firestoreConnected: boolean;
  error?: string;
}

export default function FirebaseTestPage() {
  const [testResult, setTestResult] = useState<FirebaseTestResult>({
    initialized: false,
    appConfigured: false,
    firestoreConnected: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function testFirebase() {
      try {
        setLoading(true);
        const result: FirebaseTestResult = {
          initialized: false,
          appConfigured: false,
          firestoreConnected: false,
        };

        // Test Firebase initialization
        try {
          const app = getFirebaseApp();
          result.initialized = isFirebaseInitialized();
          result.appConfigured = !!app;
        } catch (error) {
          result.error = `Firebase initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }

        // Test Firestore connection
        if (result.appConfigured) {
          try {
            const db = getDb();
            // Try to access a collection (even if it doesn't exist, this tests connectivity)
            await getDocs(collection(db, 'test-connection'));
            result.firestoreConnected = true;
          } catch (error) {
            // Connection errors vs permission errors
            if (error instanceof Error && error.message.includes('permission')) {
              result.firestoreConnected = true; // Connection works, just permission denied
            } else {
              result.error = `Firestore connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
            }
          }
        }

        setTestResult(result);
      } catch (error) {
        setTestResult({
          initialized: false,
          appConfigured: false,
          firestoreConnected: false,
          error: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      } finally {
        setLoading(false);
      }
    }

    testFirebase();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-md">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
          <p className="text-center text-gray-600 mt-4">Testing Firebase connection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Firebase Integration Test</h1>
        
        <div className="space-y-4">
          <TestResultItem
            label="Firebase Initialized"
            passed={testResult.initialized}
          />
          <TestResultItem
            label="App Configured"
            passed={testResult.appConfigured}
          />
          <TestResultItem
            label="Firestore Connected"
            passed={testResult.firestoreConnected}
          />
        </div>

        {testResult.error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm font-medium">Error:</p>
            <p className="text-red-600 text-sm">{testResult.error}</p>
          </div>
        )}

        {!testResult.error && testResult.firestoreConnected && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-700 text-sm font-medium">✅ All tests passed!</p>
            <p className="text-green-600 text-sm">Firebase Web SDK is ready for use</p>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Firebase Project ID: {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}
          </p>
        </div>
      </div>
    </div>
  );
}

function TestResultItem({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-md border border-gray-200">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className={`w-3 h-3 rounded-full ${passed ? 'bg-green-500' : 'bg-red-500'}`} />
    </div>
  );
}