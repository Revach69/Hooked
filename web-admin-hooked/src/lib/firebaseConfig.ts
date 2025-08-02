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

// Initialize Firebase app only on client side
let app: any;
let auth: any;
let db: any;
let storage: any;

if (typeof window !== 'undefined') {
  try {
    app = initializeApp(firebaseConfig);
    console.log('✅ Firebase app initialized successfully');
    
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    
    console.log('✅ Firebase services initialized:', {
      auth: !!auth,
      db: !!db,
      storage: !!storage,
      projectId: firebaseConfig.projectId
    });
  } catch (error: unknown) {
    console.error('❌ Failed to initialize Firebase app:', error);
    // Create a fallback app with a different name if initialization fails
    try {
      app = initializeApp(firebaseConfig, 'fallback-app');
      console.log('✅ Firebase app initialized with fallback name');
      
      auth = getAuth(app);
      db = getFirestore(app);
      storage = getStorage(app);
    } catch (fallbackError: unknown) {
      console.error('❌ Failed to initialize Firebase app with fallback:', fallbackError);
      throw new Error('Firebase initialization failed completely');
    }
  }
}

export { auth, db, storage };
export default app;