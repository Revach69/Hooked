import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import NetInfo from '@react-native-community/netinfo';
import * as Sentry from '@sentry/react-native';
import { Platform } from 'react-native';

// Firebase configuration with platform-specific app IDs
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDkVAo_xXbBHy8FYwFtMQA66aju08qK_yE',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'hooked-69.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'hooked-69',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'hooked-69.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '741889428835',
  // Use platform-specific app IDs (kept from your original code)
  appId:
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_FIREBASE_APP_ID_IOS || '1:741889428835:ios:85c8cffc54475305351756'
      : process.env.EXPO_PUBLIC_FIREBASE_APP_ID_ANDROID || '1:741889428835:android:783f31087e5bdcd7351756',
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-6YHKXLN806',
};

// Initialize (or reuse) the Firebase app with a proper type
export const app: FirebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Typed Firestore & Storage singletons
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

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

// Initialize connection monitoring
NetInfo.addEventListener((state) => {
  if (state.isConnected) {
    void firebaseReconnectionManager.attemptReconnection();
  }
});
