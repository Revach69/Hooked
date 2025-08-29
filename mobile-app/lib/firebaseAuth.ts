import { initializeAuth, getAuth, type Auth } from 'firebase/auth';
import { app } from './firebaseConfig';

// Initialize Firebase Auth
let auth: Auth;

try {
  // Initialize auth (React Native handles persistence automatically)
  auth = initializeAuth(app);
} catch {
  // If already initialized, just return the existing instance.
  auth = getAuth(app);
}

export { auth };
