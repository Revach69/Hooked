import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, CACHE_SIZE_UNLIMITED, getDocs, collection, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

// Your Firebase configuration (using environment variables)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDkVAo_xXbBHy8FYwFtMQA66aju08qK_yE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "hooked-69.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "hooked-69",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "hooked-69.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "741889428835",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:741889428835:web:d5f88b43a503c9e6351756",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-6YHKXLN806"
};

// Initialize Firebase app with error handling
let app;
try {
  app = initializeApp(firebaseConfig);
  console.log('✅ Firebase app initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Firebase app:', error);
  // Create a fallback app with a different name if initialization fails
  try {
    app = initializeApp(firebaseConfig, 'fallback-app');
    console.log('✅ Firebase app initialized with fallback name');
  } catch (fallbackError) {
    console.error('❌ Failed to initialize Firebase app with fallback:', fallbackError);
    throw new Error('Firebase initialization failed completely');
  }
}

// Initialize Firebase services with performance optimizations
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Connect to emulators in development (matching mobile app behavior)
if (import.meta.env.DEV) {
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
  } catch (emulatorError) {
    console.warn('⚠️ Failed to connect to emulators (this is normal if emulators are not running):', emulatorError.message);
  }
}

// Initialize Analytics (only in browser environment)
let analytics = null;
if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app);
    console.log('✅ Firebase Analytics initialized');
  } catch (error) {
    console.warn('⚠️ Analytics initialization failed:', error);
  }
}
export { analytics };

// Performance optimizations for Firestore
const initializeFirestoreOptimizations = async () => {
  try {
    // Enable offline persistence with unlimited cache size
    await enableIndexedDbPersistence(db, {
      synchronizeTabs: true
    });
    console.log('✅ Firestore offline persistence enabled');
  } catch (error) {
    if (error.code === 'failed-precondition') {
      console.warn('⚠️ Multiple tabs open, persistence can only be enabled in one tab at a time');
    } else if (error.code === 'unimplemented') {
      console.warn('⚠️ Browser doesn\'t support persistence');
    } else {
      console.error('❌ Error enabling Firestore persistence:', error);
    }
  }
};

// Initialize optimizations
initializeFirestoreOptimizations();

// Memory management utilities
export const firebaseMemoryManager = {
  // Track active listeners for cleanup
  activeListeners: new Map(),
  
  // Register a listener for cleanup
  registerListener(id, unsubscribe) {
    this.activeListeners.set(id, unsubscribe);
    console.log(`📡 Registered listener: ${id} (total: ${this.activeListeners.size})`);
  },
  
  // Unregister and cleanup a specific listener
  unregisterListener(id) {
    const unsubscribe = this.activeListeners.get(id);
    if (unsubscribe) {
      unsubscribe();
      this.activeListeners.delete(id);
      console.log(`🧹 Cleaned up listener: ${id} (remaining: ${this.activeListeners.size})`);
    }
  },
  
  // Cleanup all listeners
  cleanupAllListeners() {
    console.log(`🧹 Cleaning up ${this.activeListeners.size} active listeners...`);
    this.activeListeners.forEach((unsubscribe, id) => {
      unsubscribe();
      console.log(`🧹 Cleaned up listener: ${id}`);
    });
    this.activeListeners.clear();
    console.log('✅ All listeners cleaned up');
  },
  
  // Get listener count for debugging
  getListenerCount() {
    return this.activeListeners.size;
  }
};

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    firebaseMemoryManager.cleanupAllListeners();
  });
  
  // Also cleanup when tab becomes hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      console.log('📱 Tab hidden, listeners remain active for background updates');
    }
  });
}

// Test Firebase connection
export const testFirebaseConnection = async () => {
  try {
    console.log('🔍 Testing Firebase connection...');
    
    // Test Firestore connection by trying to read from a collection
    const testQuery = await getDocs(collection(db, 'events'));
    console.log('✅ Firestore connection successful');
    console.log(`📊 Found ${testQuery.docs.length} events in database`);
    
    return {
      success: true,
      eventCount: testQuery.docs.length,
      events: testQuery.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    };
  } catch (error) {
    console.error('❌ Firebase connection test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export default app; 