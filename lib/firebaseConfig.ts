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

// iOS Simulator specific connection handling
if (Platform.OS === 'ios' && __DEV__) {
  // Add a small delay before enabling network
  setTimeout(() => {
    enableNetwork(db).catch(error => {
      console.error('❌ Error enabling Firestore network:', error);
    });
  }, 1000);
}

// Monitor network connectivity and manage Firestore connection
NetInfo.addEventListener(state => {
  if (state.isConnected) {
    // Add delay for iOS simulator
    const delay = Platform.OS === 'ios' && __DEV__ ? 500 : 0;
    
    setTimeout(() => {
      enableNetwork(db).catch(error => {
        console.error('Error enabling Firestore network:', error);
      });
    }, delay);
  } else {
    // Disable Firestore network when connection is lost
    disableNetwork(db).catch(error => {
      console.error('Error disabling Firestore network:', error);
    });
  }
});

// Initialize network status (silently)
NetInfo.fetch().then(state => {
  // Network status fetched silently
});

export default app;