import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, limit, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import NetInfo from '@react-native-community/netinfo';

// Firebase configuration with fallbacks
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyDkVAo_xXbBHy8FYwFtMQA66aju08qK_yE",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "hooked-69.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "hooked-69",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "hooked-69.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "741889428835",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:741889428835:web:d5f88b43a503c9e6351756",
};

// Initialize Firebase with error handling
let app: any = null;
let db: any = null;
let auth: any = null;
let storage: any = null;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  storage = getStorage(app);
} catch {
          // Failed to initialize Firebase
}

// Firebase reconnection manager
class FirebaseReconnectionManager {
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000; // 5 seconds
  private isReconnecting = false;

  async attemptReconnection(): Promise<boolean> {
    if (this.isReconnecting || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return false;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;

    try {
      // Test connectivity by making a simple query
      const eventsRef = collection(db, 'events');
      const q = query(eventsRef, limit(1));
      await getDocs(q);
      
      this.reconnectAttempts = 0;
      this.isReconnecting = false;
      return true;
    } catch {
      this.isReconnecting = false;
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => this.attemptReconnection(), this.reconnectInterval);
      }
      
      return false;
    }
  }

  resetAttempts(): void {
    this.reconnectAttempts = 0;
    this.isReconnecting = false;
  }
}

export const reconnectionManager = new FirebaseReconnectionManager();

// Check Firebase status
export const checkFirebaseStatus = async (): Promise<{ isConnected: boolean; error?: string }> => {
  try {
    const netInfo = await NetInfo.fetch();
    
    if (!netInfo.isConnected) {
      return { isConnected: false, error: 'No internet connection' };
    }

    // Test Firebase connectivity
    const eventsRef = collection(db, 'events');
    const q = query(eventsRef, limit(1));
    await getDocs(q);
    
    return { isConnected: true };
  } catch {
    return { isConnected: false, error: 'Firebase connection failed' };
  }
};

// Export Firebase instances
export { app, db, auth, storage };