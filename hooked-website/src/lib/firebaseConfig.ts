import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Your Firebase configuration - using environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || ''
};

// Initialize Firebase app with error handling
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;

// Initialize Firebase app with error handling
function initializeFirebase() {
  if (app) return; // Already initialized
  
  // Only initialize if we have the required environment variables
  const hasRequiredEnvVars = process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
                            process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN && 
                            process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!hasRequiredEnvVars) {
    console.warn('Firebase environment variables not found');
    return;
  }

  try {
    app = initializeApp(firebaseConfig);
  } catch {
    // Create a fallback app with a different name if initialization fails
    try {
      app = initializeApp(firebaseConfig, 'fallback-app');
    } catch {
      console.warn('Firebase initialization failed completely');
      return;
    }
  }

  if (app) {
    // Initialize Firebase services
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  }
}

// Initialize Firebase only in browser or when explicitly called
if (typeof window !== 'undefined') {
  initializeFirebase();
}

// Export services (will be undefined if Firebase failed to initialize)
export { auth, db, storage };

export default app; 