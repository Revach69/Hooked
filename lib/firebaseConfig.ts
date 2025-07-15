import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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
// For Firebase 11, we'll use getAuth which should work fine for React Native
// The persistence warning is just a recommendation, not a requirement
export const auth = getAuth(app);
export const db = getFirestore(app);

// Configure Firestore to use me-west1 region
// Note: You'll need to set up your Firestore database in the me-west1 region
// and update the projectId above to match your Firebase project

// For development, you can connect to emulator
// if (__DEV__) {
//   connectFirestoreEmulator(db, 'localhost', 8080);
// }

export default app;