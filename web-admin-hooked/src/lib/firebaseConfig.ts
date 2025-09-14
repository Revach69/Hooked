import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your Firebase configuration - using environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID!
};

// Initialize Firebase app only on client side with proper error handling
const initializeFirebaseApp = () => {
  if (typeof window === 'undefined') {
    return { app: null, auth: null, db: null, storage: null };
  }
  
  try {
    const app = initializeApp(firebaseConfig);
    console.log('✅ Firebase app initialized successfully');
    
    const auth = getAuth(app);
    const db = getFirestore(app);
    const storage = getStorage(app);
    
    console.log('✅ Firebase services initialized:', {
      auth: !!auth,
      db: !!db,
      storage: !!storage,
      projectId: firebaseConfig.projectId
    });
    
    // Log environment to verify correct configuration is loaded
    console.log('🔧 Environment check:', {
      NODE_ENV: process.env.NODE_ENV,
      projectId: firebaseConfig.projectId,
      isDevelopment: firebaseConfig.projectId?.includes('development') || false,
      isProduction: !firebaseConfig.projectId?.includes('development')
    });
    
    return { app, auth, db, storage };
  } catch (error: unknown) {
    console.error('❌ Failed to initialize Firebase app:', error);
    // Create a fallback app with a different name if initialization fails
    try {
      const app = initializeApp(firebaseConfig, 'fallback-app');
      console.log('✅ Firebase app initialized with fallback name');
      
      const auth = getAuth(app);
      const db = getFirestore(app);
      const storage = getStorage(app);
      
      return { app, auth, db, storage };
    } catch (fallbackError: unknown) {
      console.error('❌ Failed to initialize Firebase app with fallback:', fallbackError);
      return { app: null, auth: null, db: null, storage: null };
    }
  }
};

// Initialize Firebase services
const firebase = initializeFirebaseApp();
const app = firebase.app;
const auth = firebase.auth;
const db = firebase.db;
const storage = firebase.storage;

export { auth, db, storage };
export default app;

// Helper functions to ensure Firebase is initialized
export const getAuthInstance = () => {
  if (!auth) {
    if (typeof window === 'undefined') {
      throw new Error('Firebase Auth cannot be initialized on server side');
    }
    throw new Error('Firebase Auth not initialized - check console for initialization errors');
  }
  return auth;
};

export const getDbInstance = () => {
  if (!db) {
    if (typeof window === 'undefined') {
      throw new Error('Firebase Firestore cannot be initialized on server side');
    }
    throw new Error('Firebase Firestore not initialized - check console for initialization errors');
  }
  return db;
};

export const getStorageInstance = () => {
  if (!storage) {
    if (typeof window === 'undefined') {
      throw new Error('Firebase Storage cannot be initialized on server side');
    }
    throw new Error('Firebase Storage not initialized - check console for initialization errors');
  }
  return storage;
};