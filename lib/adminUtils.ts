import { AsyncStorageUtils } from './asyncStorageUtils';
import { AuthAPI } from './firebaseApi';

export const AdminUtils = {
  // Check if current user is admin
  async isAdmin(): Promise<boolean> {
    try {
      // Check if user is authenticated - authenticated users are admins
      const currentUser = AuthAPI.getCurrentUser();
      if (!currentUser) {
        return false;
      }

      // Check admin session from AsyncStorage for performance
      const adminSession = await AsyncStorageUtils.getItem<string>('isAdmin');
      const adminAccessTime = await AsyncStorageUtils.getItem<string>('adminAccessTime');
      
      if (adminSession === 'true' && adminAccessTime) {
        const accessTime = new Date(adminAccessTime);
        const now = new Date();
        const hoursDiff = (now.getTime() - accessTime.getTime()) / (1000 * 60 * 60);
        
        // Admin session is valid for 24 hours
        if (hoursDiff <= 24) {
          return true;
        }
      }

      // If no valid session but user is authenticated, set admin session
      if (currentUser) {
        await this.setAdminSession(currentUser.email || '');
        return true;
      }
      
      return false;
    } catch {
              // Error checking admin status
      return false;
    }
  },

  // Set admin session
  async setAdminSession(email: string): Promise<void> {
    try {
      await AsyncStorageUtils.setItem('isAdmin', 'true');
      await AsyncStorageUtils.setItem('adminAccessTime', new Date().toISOString());
      await AsyncStorageUtils.setItem('adminEmail', email);
    } catch {
              // Error setting admin session
    }
  },

  // Clear admin session
  async clearAdminSession(): Promise<void> {
    try {
      await AsyncStorageUtils.multiRemove([
        'isAdmin',
        'adminAccessTime',
        'adminEmail',
        'adminUid'
      ]);
    } catch {
              // Error clearing admin session
    }
  },

  // Get admin email
  async getAdminEmail(): Promise<string | null> {
    try {
      return await AsyncStorageUtils.getItem<string>('adminEmail');
    } catch {
              // Error getting admin email
      return null;
    }
  }
}; 