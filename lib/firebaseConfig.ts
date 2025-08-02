import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, collection, query, limit, getDocs } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import NetInfo from '@react-native-community/netinfo';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Auth (for admin operations only)
const auth = getAuth(app);

// Initialize Storage
const storage = getStorage(app);

// Network connectivity manager
class FirebaseNetworkManager {
  private isConnected = true;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor() {
    this.setupNetworkListener();
  }

  private setupNetworkListener() {
    NetInfo.addEventListener((state: any) => {
      const wasConnected = this.isConnected;
      this.isConnected = state.isConnected ?? false;
      
      if (!wasConnected && this.isConnected) {
        console.log('🌐 Network reconnected, attempting Firebase reconnection...');
        this.attemptReconnection();
      } else if (wasConnected && !this.isConnected) {
        console.log('🌐 Network disconnected');
      }
    });
  }

  public async checkConnection(): Promise<boolean> {
    if (!this.isConnected) {
      console.log('❌ No network connection');
      return false;
    }

    try {
      // Simple connection test - try to read events collection
      const eventsRef = collection(db, 'events');
      const q = query(eventsRef, limit(1));
      await getDocs(q);
      console.log('✅ Firebase connection verified');
      return true;
    } catch (error: any) {
      console.warn('⚠️ Firebase connection test failed:', error.message);
      return false;
    }
  }

  private async attemptReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Attempting Firebase reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    try {
      await this.checkConnection();
      this.reconnectAttempts = 0;
      console.log('✅ Firebase reconnection successful');
    } catch (error) {
      console.log('❌ Firebase reconnection failed, will retry...');
      setTimeout(() => this.attemptReconnection(), 2000);
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// Create network manager instance
export const firebaseNetworkManager = new FirebaseNetworkManager();

// Export Firebase services
export { app, db, auth, storage };

// Check Firebase status (for debugging)
export const checkFirebaseStatus = () => {
  console.log('🔍 Firebase Status Check:');
  console.log('- API Key:', process.env.EXPO_PUBLIC_FIREBASE_API_KEY ? '✅ Set' : '❌ Missing');
  console.log('- Project ID:', process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ? '✅ Set' : '❌ Missing');
  console.log('- Auth Domain:', process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ? '✅ Set' : '❌ Missing');
  console.log('- Storage Bucket:', process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ? '✅ Set' : '❌ Missing');
  console.log('- Network Status:', firebaseNetworkManager.getConnectionStatus() ? '✅ Connected' : '❌ Disconnected');
};