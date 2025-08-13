import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, limit, getDocs } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import NetInfo from '@react-native-community/netinfo';
import { auth } from './firebaseAuth';
import * as Sentry from '@sentry/react-native';

// Firebase configuration with platform-specific app IDs
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyDkVAo_xXbBHy8FYwFtMQA66aju08qK_yE",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "hooked-69.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "hooked-69",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "hooked-69.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "741889428835",
  // Use platform-specific app IDs
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID_IOS || "1:741889428835:ios:85c8cffc54475305351756", // iOS app ID
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-6YHKXLN806"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Storage
export const storage = getStorage(app);

// Firebase reconnection manager
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
      await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
      
      // Check if connection is restored
      const isConnected = await this.checkConnection();
      if (isConnected) {
        this.reconnectAttempts = 0;
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
NetInfo.addEventListener(state => {
  if (state.isConnected) {
    firebaseReconnectionManager.attemptReconnection();
  }
});