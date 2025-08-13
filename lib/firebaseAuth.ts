import { getAuth } from 'firebase/auth';
import { app } from './firebaseConfig';

// Initialize Firebase Auth
let auth: any = null;

try {
  // Initialize auth - Firebase will use default persistence for the platform
  auth = getAuth(app);
  
  // For Firebase v9+, persistence is often handled automatically
  // The warning about AsyncStorage is informational and doesn't break functionality
} catch (error) {
  console.error('Firebase Auth initialization error:', error);
}

export { auth };
