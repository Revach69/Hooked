import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, enableNetwork, disableNetwork, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
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

// Initialize Firebase app with error handling
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error: any) {
  console.error('❌ Failed to initialize Firebase app:', error);
  // Create a fallback app with a different name if initialization fails
  try {
    app = initializeApp(firebaseConfig, 'fallback-app');
  } catch (fallbackError: any) {
    console.error('❌ Failed to initialize Firebase app with fallback:', fallbackError);
    throw new Error('Firebase initialization failed completely');
  }
}

// Initialize Firebase services with error handling
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Connect to emulators in development
if (__DEV__) {
  try {
    // Only connect to emulators if they're not already connected
    if (!auth.config?.emulator) {
      connectAuthEmulator(auth, 'http://localhost:9099');
      console.log('✅ Connected to Auth emulator');
    }
    if (!db._delegate?._databaseId?.projectId?.includes('demo-')) {
      connectFirestoreEmulator(db, 'localhost', 8080);
      console.log('✅ Connected to Firestore emulator');
    }
    if (!storage.app.options?.storageBucket?.includes('demo-')) {
      connectStorageEmulator(storage, 'localhost', 9199);
      console.log('✅ Connected to Storage emulator');
    }
  } catch (emulatorError: any) {
    console.warn('⚠️ Failed to connect to emulators (this is normal if emulators are not running):', emulatorError.message);
  }
}

// Enhanced network management with exponential backoff and better error handling
const enableNetworkWithRetry = async (maxRetries = 3, baseDelay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await enableNetwork(db);
      console.log(`✅ Firestore network enabled successfully on attempt ${attempt}`);
      return;
    } catch (error: any) {
      // Check if it's an internal assertion error
      if (error.message && error.message.includes('INTERNAL ASSERTION FAILED')) {
        console.warn(`⚠️ Internal assertion error detected (attempt ${attempt}/${maxRetries}), retrying...`);
        // For internal assertion errors, use a longer delay
        const delay = baseDelay * Math.pow(3, attempt - 1) + Math.random() * 2000;
        console.log(`⏳ Retrying network enable in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
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
      // Check if it's an internal assertion error
      if (error.message && error.message.includes('INTERNAL ASSERTION FAILED')) {
        console.warn(`⚠️ Internal assertion error detected during disable (attempt ${attempt}/${maxRetries}), retrying...`);
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
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

// Circuit breaker for network operations with better internal assertion error handling
class NetworkCircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold = 3;
  private readonly resetTimeout = 60000;
  private isOpen = false;
  private internalAssertionErrorCount = 0;
  private readonly maxInternalAssertionErrors = 2;

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isOpen) {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        console.log('🔄 Circuit breaker resetting...');
        this.isOpen = false;
        this.failureCount = 0;
        this.internalAssertionErrorCount = 0;
      } else {
        throw new Error('Circuit breaker is open - too many recent failures');
      }
    }

    try {
      const result = await operation();
      this.failureCount = 0;
      this.internalAssertionErrorCount = 0;
      return result;
    } catch (error: any) {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      
      // Special handling for internal assertion errors
      if (error.message && error.message.includes('INTERNAL ASSERTION FAILED')) {
        this.internalAssertionErrorCount++;
        console.warn(`⚠️ Internal assertion error detected (${this.internalAssertionErrorCount}/${this.maxInternalAssertionErrors})`);
        
        if (this.internalAssertionErrorCount >= this.maxInternalAssertionErrors) {
          this.isOpen = true;
          console.error('🚨 Circuit breaker opened due to repeated internal assertion errors');
          throw new Error('Circuit breaker opened due to repeated internal assertion errors - please restart the app');
        }
        
        // For internal assertion errors, use a longer delay before retry
        const delay = 5000 + Math.random() * 5000; // 5-10 seconds
        console.log(`⏳ Waiting ${Math.round(delay)}ms before retry due to internal assertion error...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        throw error;
      }
      
      if (this.failureCount >= this.failureThreshold) {
        this.isOpen = true;
        console.error('🚨 Circuit breaker opened due to repeated failures');
      }
      
      throw error;
    }
  }
}

const networkCircuitBreaker = new NetworkCircuitBreaker();

// iOS Simulator specific connection handling with improved timing and error prevention
if (Platform.OS === 'ios' && __DEV__) {
  // Increased delay for iOS simulator to prevent race conditions and internal assertion errors
  setTimeout(async () => {
    try {
      await networkCircuitBreaker.execute(() => enableNetworkWithRetry());
    } catch (error: any) {
      if (error.message && error.message.includes('INTERNAL ASSERTION FAILED')) {
        console.error('❌ Internal assertion error during iOS simulator network enable - this may require app restart');
        // Don't retry immediately for internal assertion errors
        return;
      }
      console.error('❌ Failed to enable Firestore network on iOS simulator:', error);
    }
  }, 2000);
}

// Enhanced network connectivity monitoring with better error handling
let isNetworkListenerActive = false;
let lastNetworkOperation = 0;
const MIN_NETWORK_OPERATION_INTERVAL = 3000; // Minimum 3 seconds between network operations

const setupNetworkListener = () => {
  if (isNetworkListenerActive) return;
  
  NetInfo.addEventListener(state => {
    console.log('🌐 Network state changed:', {
      isConnected: state.isConnected,
      type: state.type,
      timestamp: new Date().toISOString()
    });

    const now = Date.now();
    if (now - lastNetworkOperation < MIN_NETWORK_OPERATION_INTERVAL) {
      console.log('⏳ Skipping network operation - too soon since last operation');
      return;
    }

    if (state.isConnected) {
      // Add delay for iOS simulator with better timing
      const delay = Platform.OS === 'ios' && __DEV__ ? 1200 : 300;
      
      setTimeout(async () => {
        try {
          lastNetworkOperation = Date.now();
          await networkCircuitBreaker.execute(() => enableNetworkWithRetry());
        } catch (error: any) {
          if (error.message && error.message.includes('INTERNAL ASSERTION FAILED')) {
            console.error('❌ Internal assertion error during network enable - skipping retry');
            return;
          }
          console.error('❌ Failed to enable Firestore network after connection restored:', error);
        }
      }, delay);
    } else {
      // Disable Firestore network when connection is lost
      setTimeout(async () => {
        try {
          lastNetworkOperation = Date.now();
          await networkCircuitBreaker.execute(() => disableNetworkWithRetry());
        } catch (error: any) {
          if (error.message && error.message.includes('INTERNAL ASSERTION FAILED')) {
            console.error('❌ Internal assertion error during network disable - skipping retry');
            return;
          }
          console.error('❌ Failed to disable Firestore network after connection lost:', error);
        }
      }, 200);
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