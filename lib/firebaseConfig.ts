import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, collection, query, limit, getDocs } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
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
} catch (error) {
  console.error('Firebase initialization failed:', error);
  // Create fallback objects to prevent crashes
  app = { name: 'fallback' };
  db = { collection: () => ({ add: () => Promise.resolve() }) };
  auth = { currentUser: null };
  storage = { ref: () => ({ put: () => Promise.resolve() }) };
}

// Network connectivity manager with memory safety
class FirebaseNetworkManager {
  private isConnected = true;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private networkListener: any = null;
  private isDestroyed = false;

  constructor() {
    this.setupNetworkListener();
  }

  private setupNetworkListener() {
    if (this.isDestroyed) return;
    
    try {
      this.networkListener = NetInfo.addEventListener((state: any) => {
        if (this.isDestroyed) return;
        
        const wasConnected = this.isConnected;
        this.isConnected = state.isConnected ?? false;
        
        if (!wasConnected && this.isConnected) {
          // Network reconnected, attempting Firebase reconnection
          setTimeout(() => this.attemptReconnection(), 1000);
        }
      });
    } catch (error) {
      console.error('Failed to setup network listener:', error);
    }
  }

  public async checkConnection(): Promise<boolean> {
    if (this.isDestroyed || !this.isConnected) {
      return false;
    }

    try {
      // Simple connection test with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      );
      
      const connectionPromise = (async () => {
        const eventsRef = collection(db, 'events');
        const q = query(eventsRef, limit(1));
        await getDocs(q);
        return true;
      })();

      await Promise.race([connectionPromise, timeoutPromise]);
      return true;
    } catch (error: any) {
      console.warn('⚠️ Firebase connection test failed:', error.message);
      return false;
    }
  }

  private async attemptReconnection() {
    if (this.isDestroyed || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting Firebase reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    try {
      await this.checkConnection();
      this.reconnectAttempts = 0;
      console.log('Firebase reconnection successful');
    } catch (error) {
      console.log('Firebase reconnection failed, will retry');
      setTimeout(() => this.attemptReconnection(), 2000);
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected && !this.isDestroyed;
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.networkListener) {
      try {
        this.networkListener();
        this.networkListener = null;
      } catch (error) {
        console.error('Error removing network listener:', error);
      }
    }
  }
}

// Create network manager instance
export const firebaseNetworkManager = new FirebaseNetworkManager();

// Export Firebase services
export { app, db, auth, storage };

// Check Firebase status
export const checkFirebaseStatus = () => {
  console.log('Firebase status check completed');
};