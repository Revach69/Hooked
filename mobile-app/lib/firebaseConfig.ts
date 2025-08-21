import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage as getFirebaseStorage, type FirebaseStorage } from 'firebase/storage';
import { getFunctions as getFirebaseFunctions, type Functions } from 'firebase/functions';
import NetInfo from '@react-native-community/netinfo';
import * as Sentry from '@sentry/react-native';
import { Platform } from 'react-native';

// Firebase configuration with platform-specific app IDs
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  // Use platform-specific app IDs (fallback to general app ID if not specified)
  appId:
    Platform.OS === 'ios'
      ? (process.env.EXPO_PUBLIC_FIREBASE_APP_ID_IOS || process.env.EXPO_PUBLIC_FIREBASE_APP_ID)!
      : (process.env.EXPO_PUBLIC_FIREBASE_APP_ID_ANDROID || process.env.EXPO_PUBLIC_FIREBASE_APP_ID)!,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID!,
};

// Lazy initialization to prevent JS thread errors
let _app: FirebaseApp | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;
let _functions: Functions | null = null;
let _isInitialized = false;

// Initialize Firebase app lazily
function initializeFirebase(): FirebaseApp {
  if (!_app) {
    _app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    _isInitialized = true;
  }
  return _app;
}

// Get Firebase app (initializes if needed)
export const app: FirebaseApp = initializeFirebase();

// Get Firestore instance (initializes if needed)
export function getDb(): Firestore {
  if (!_db) {
    _db = getFirestore(app);
  }
  return _db;
}

// Get Storage instance (initializes if needed)
export function getStorage(): FirebaseStorage {
  if (!_storage) {
    _storage = getFirebaseStorage(app);
  }
  return _storage;
}

// Get Functions instance (initializes if needed)
export function getFunctions(): Functions {
  if (!_functions) {
    _functions = getFirebaseFunctions(app);
  }
  return _functions;
}

// Legacy exports for backward compatibility (but they now use lazy initialization)
export const db: Firestore = getDb();
export const storage: FirebaseStorage = getStorage();
export const functions: Functions = getFunctions();

// Check if Firebase is initialized
export function isFirebaseInitialized(): boolean {
  return _isInitialized;
}

// --- Optional: Reconnection helper (unchanged logic, just isolated from auth) ---

class FirebaseReconnectionManager {
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  async checkConnection(): Promise<boolean> {
    try {
      const netInfo = await NetInfo.fetch();
      return netInfo.isConnected ?? false;
    } catch (error) {
      Sentry.captureException(error);
      return false;
    }
  }

  async attemptReconnection(): Promise<boolean> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return false;
    }

    this.reconnectAttempts++;

    try {
      // Wait before attempting reconnection
      await new Promise((resolve) => setTimeout(resolve, this.reconnectDelay));

      // Check if connection is restored
      const isConnected = await this.checkConnection();
      if (isConnected) {
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000; // reset backoff when successful
        return true;
      }
    } catch (error) {
      Sentry.captureException(error);
    }

    // Exponential backoff
    this.reconnectDelay *= 2;
    return false;
  }

  resetAttempts(): void {
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
  }
}

export const firebaseReconnectionManager = new FirebaseReconnectionManager();

// Initialize connection monitoring only after Firebase is initialized
export function initializeConnectionMonitoring(): void {
  NetInfo.addEventListener((state) => {
    if (state.isConnected) {
      void firebaseReconnectionManager.attemptReconnection();
    }
  });
}
