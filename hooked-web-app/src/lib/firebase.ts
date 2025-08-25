import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage as getFirebaseStorage, type FirebaseStorage } from 'firebase/storage';
import { getFunctions as getFirebaseFunctions, type Functions } from 'firebase/functions';

// Firebase configuration for web app (mobile-focused)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID!,
};

// Lazy initialization to prevent errors during SSR
let _app: FirebaseApp | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;
let _functions: Functions | null = null;
let _isInitialized = false;

// Initialize Firebase app lazily (browser-only)
function initializeFirebase(): FirebaseApp {
  if (typeof window === 'undefined') {
    throw new Error('Firebase can only be initialized in the browser');
  }

  if (!_app) {
    // Check if all required environment variables are present
    const hasRequiredEnvVars = process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
                              process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN && 
                              process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    
    if (!hasRequiredEnvVars) {
      throw new Error('Missing required Firebase environment variables');
    }

    _app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    _isInitialized = true;
  }
  return _app;
}

// Get Firebase app (initializes if needed)
export function getFirebaseApp(): FirebaseApp {
  return initializeFirebase();
}

// Get Firestore instance (initializes if needed)
export function getDb(): Firestore {
  if (!_db) {
    _db = getFirestore(getFirebaseApp());
  }
  return _db;
}

// Alias for backward compatibility
export { getDb as getFirestore };

// Get Storage instance (initializes if needed)
export function getStorage(): FirebaseStorage {
  if (!_storage) {
    _storage = getFirebaseStorage(getFirebaseApp());
  }
  return _storage;
}

// Get Functions instance (initializes if needed)
export function getFunctions(): Functions {
  if (!_functions) {
    _functions = getFirebaseFunctions(getFirebaseApp());
  }
  return _functions;
}

// Check if Firebase is initialized
export function isFirebaseInitialized(): boolean {
  return _isInitialized;
}

// Connection monitoring for mobile web
class WebConnectionManager {
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 1000;

  async checkConnection(): Promise<boolean> {
    if (!navigator.onLine) return false;
    
    try {
      // Simple connectivity test with Firebase
      const response = await fetch(`https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseapp.com/`, { 
        method: 'HEAD', 
        mode: 'no-cors',
        signal: AbortSignal.timeout(5000)
      });
      return true;
    } catch {
      return false;
    }
  }

  async attemptReconnection(): Promise<boolean> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return false;
    }

    this.reconnectAttempts++;

    try {
      await new Promise((resolve) => setTimeout(resolve, this.reconnectDelay));
      
      const isConnected = await this.checkConnection();
      if (isConnected) {
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        return true;
      }
    } catch (error) {
      console.warn('Firebase reconnection attempt failed:', error);
    }

    this.reconnectDelay *= 1.5;
    return false;
  }

  resetAttempts(): void {
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
  }
}

export const webConnectionManager = new WebConnectionManager();

// Initialize connection monitoring (browser-only)
export function initializeConnectionMonitoring(): void {
  if (typeof window === 'undefined') return;
  
  window.addEventListener('online', () => {
    void webConnectionManager.attemptReconnection();
  });

  window.addEventListener('offline', () => {
    console.warn('App is now offline');
  });
}