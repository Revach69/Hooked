import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableNetwork, disableNetwork, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDkVAo_xXbBHy8FYwFtMQA66aju08qK_yE",
  authDomain: "hooked-69.firebaseapp.com",
  projectId: "hooked-69",
  storageBucket: "hooked-69.firebasestorage.app",
  messagingSenderId: "741889428835",
  appId: "1:741889428835:web:d5f88b43a503c9e6351756",
  measurementId: "G-6YHKXLN806"
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);

// Configure Firestore with iOS simulator specific settings
export const db = getFirestore(app);

// Configure Storage
export const storage = getStorage(app);

// Enhanced network management with exponential backoff
const enableNetworkWithRetry = async (maxRetries = 3, baseDelay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await enableNetwork(db);
      console.log(`✅ Firestore network enabled successfully on attempt ${attempt}`);
      return;
    } catch (error: any) {
      console.error(`❌ Error enabling Firestore network (attempt ${attempt}/${maxRetries}):`, {
        operation: 'enableNetwork',
        platform: Platform.OS,
        isDev: __DEV__,
        timestamp: new Date().toISOString(),
        error: error.message,
        code: error.code
      });
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      console.log(`⏳ Retrying network enable in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

const disableNetworkWithRetry = async (maxRetries = 2, baseDelay = 500) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await disableNetwork(db);
      console.log(`✅ Firestore network disabled successfully on attempt ${attempt}`);
      return;
    } catch (error: any) {
      console.error(`❌ Error disabling Firestore network (attempt ${attempt}/${maxRetries}):`, {
        operation: 'disableNetwork',
        platform: Platform.OS,
        isDev: __DEV__,
        timestamp: new Date().toISOString(),
        error: error.message,
        code: error.code
      });
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Circuit breaker for network operations
class NetworkCircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold = 5;
  private readonly resetTimeout = 30000; // 30 seconds
  private isOpen = false;

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isOpen) {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        console.log('🔄 Circuit breaker resetting...');
        this.isOpen = false;
        this.failureCount = 0;
      } else {
        throw new Error('Circuit breaker is open - too many recent failures');
      }
    }

    try {
      const result = await operation();
      this.failureCount = 0;
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      
      if (this.failureCount >= this.failureThreshold) {
        this.isOpen = true;
        console.error('🚨 Circuit breaker opened due to repeated failures');
      }
      
      throw error;
    }
  }
}

const networkCircuitBreaker = new NetworkCircuitBreaker();

// iOS Simulator specific connection handling with improved timing
if (Platform.OS === 'ios' && __DEV__) {
  // Increased delay for iOS simulator to prevent race conditions
  setTimeout(async () => {
    try {
      await networkCircuitBreaker.execute(() => enableNetworkWithRetry());
    } catch (error) {
      console.error('❌ Failed to enable Firestore network on iOS simulator:', error);
    }
  }, 1500); // Increased from 1000ms to 1500ms
}

// Enhanced network connectivity monitoring
let isNetworkListenerActive = false;

const setupNetworkListener = () => {
  if (isNetworkListenerActive) return;
  
  NetInfo.addEventListener(state => {
    console.log('🌐 Network state changed:', {
      isConnected: state.isConnected,
      type: state.type,
      timestamp: new Date().toISOString()
    });

    if (state.isConnected) {
      // Add delay for iOS simulator with better timing
      const delay = Platform.OS === 'ios' && __DEV__ ? 800 : 200;
      
      setTimeout(async () => {
        try {
          await networkCircuitBreaker.execute(() => enableNetworkWithRetry());
        } catch (error) {
          console.error('❌ Failed to enable Firestore network after connection restored:', error);
        }
      }, delay);
    } else {
      // Disable Firestore network when connection is lost
      setTimeout(async () => {
        try {
          await networkCircuitBreaker.execute(() => disableNetworkWithRetry());
        } catch (error) {
          console.error('❌ Failed to disable Firestore network after connection lost:', error);
        }
      }, 100);
    }
  });
  
  isNetworkListenerActive = true;
};

// Initialize network status with better error handling
const initializeNetworkStatus = async () => {
  try {
    const state = await NetInfo.fetch();
    console.log('🌐 Initial network status:', {
      isConnected: state.isConnected,
      type: state.type,
      timestamp: new Date().toISOString()
    });
    
    if (state.isConnected) {
      await networkCircuitBreaker.execute(() => enableNetworkWithRetry());
    }
  } catch (error) {
    console.error('❌ Error fetching initial network status:', error);
  }
};

// Setup network monitoring
setupNetworkListener();
initializeNetworkStatus();

export default app;