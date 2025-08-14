import { initializeAuth, getAuth, type Auth } from 'firebase/auth';
import { app } from './firebaseConfig';

// Initialize Firebase Auth with React Native persistence.
// For Firebase v12.1.0, we'll use the standard approach
// Firebase will automatically use AsyncStorage for persistence on React Native

let auth: Auth;

try {
  // Initialize auth - Firebase will use default React Native persistence
  auth = initializeAuth(app);
} catch {
  // If already initialized, just return the existing instance.
  auth = getAuth(app);
}

export { auth };
