import { initializeAuth, getAuth, getReactNativePersistence, type Auth } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { app } from './firebaseConfig';

// Initialize Firebase Auth with React Native persistence using AsyncStorage

let auth: Auth;

try {
  // Initialize auth with explicit AsyncStorage persistence
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
} catch {
  // If already initialized, just return the existing instance.
  auth = getAuth(app);
}

export { auth };
