import { signInAnonymously, onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../firebaseAuth';
import * as Sentry from '@sentry/react-native';

class AuthServiceClass {
  private currentUser: User | null = null;
  private isSigningIn = false;
  private authStatePromise: Promise<User | null> | null = null;

  /**
   * Initialize authentication and sign in anonymously
   */
  async initialize(): Promise<User | null> {
    // Return existing promise if already signing in
    if (this.authStatePromise) {
      return this.authStatePromise;
    }

    this.authStatePromise = new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        this.currentUser = user;
        
        if (user) {
          Sentry.addBreadcrumb({
            message: 'User authenticated successfully',
            level: 'info',
            category: 'auth',
            data: { userId: user.uid.substring(0, 8) + '...' }
          });
          unsubscribe();
          resolve(user);
        } else if (!this.isSigningIn) {
          // No user, attempt anonymous sign in
          this.isSigningIn = true;
          try {
            Sentry.addBreadcrumb({
              message: 'Attempting anonymous sign in',
              level: 'info',
              category: 'auth'
            });
            
            const credential = await signInAnonymously(auth);
            this.currentUser = credential.user;
            
            Sentry.addBreadcrumb({
              message: 'Anonymous sign in successful',
              level: 'info',
              category: 'auth',
              data: { userId: credential.user.uid.substring(0, 8) + '...' }
            });
            
            unsubscribe();
            resolve(credential.user);
          } catch (error) {
            Sentry.captureException(error, {
              tags: {
                operation: 'auth',
                source: 'anonymous_signin'
              }
            });
            unsubscribe();
            resolve(null);
          } finally {
            this.isSigningIn = false;
          }
        }
      });
    });

    return this.authStatePromise;
  }

  /**
   * Get current authenticated user
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  /**
   * Wait for authentication to complete
   */
  async waitForAuth(): Promise<User | null> {
    if (this.currentUser) {
      return this.currentUser;
    }

    return this.initialize();
  }
}

export const AuthService = new AuthServiceClass();
export default AuthService;