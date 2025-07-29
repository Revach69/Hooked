import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your Firebase configuration (same as mobile app)
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
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;