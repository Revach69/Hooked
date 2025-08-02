import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Validate required environment variables
const requiredEnvVars = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required Firebase environment variables:', missingVars);
  throw new Error(`Missing required Firebase environment variables: ${missingVars.join(', ')}`);
}

// Initialize Firebase app with error handling
let app;
try {
  app = initializeApp(firebaseConfig);
  console.log('✅ Firebase app initialized successfully');
} catch (error: any) {
  console.error('❌ Failed to initialize Firebase app:', error);
  // Create a fallback app with a different name if initialization fails
  try {
    app = initializeApp(firebaseConfig, 'fallback-app');
    console.log('✅ Firebase app initialized with fallback name');
  } catch (fallbackError: any) {
    console.error('❌ Failed to initialize Firebase app with fallback:', fallbackError);
    throw new Error('Firebase initialization failed completely');
  }
}

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app, { 
  region: process.env.EXPO_PUBLIC_FIREBASE_REGION || 'me-west1' 
});
export const storage = getStorage(app);

console.log('✅ Firebase services initialized:', {
  auth: !!auth,
  db: !!db,
  storage: !!storage,
  projectId: firebaseConfig.projectId
});

export default app;