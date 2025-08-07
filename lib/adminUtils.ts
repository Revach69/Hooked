import AsyncStorage from '@react-native-async-storage/async-storage';
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
      const adminSession = await AsyncStorage.getItem('isAdmin');
      const adminAccessTime = await AsyncStorage.getItem('adminAccessTime');
      
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
    } catch (error) {
              // Error checking admin status
      return false;
    }
  },

  // Set admin session
  async setAdminSession(email: string): Promise<void> {
    try {
      await AsyncStorage.setItem('isAdmin', 'true');
      await AsyncStorage.setItem('adminAccessTime', new Date().toISOString());
      await AsyncStorage.setItem('adminEmail', email);
    } catch (error) {
              // Error setting admin session
    }
  },

  // Clear admin session
  async clearAdminSession(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        'isAdmin',
        'adminAccessTime',
        'adminEmail',
        'adminUid'
      ]);
    } catch (error) {
              // Error clearing admin session
    }
  },

  // Get admin email
  async getAdminEmail(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('adminEmail');
    } catch (error) {
              // Error getting admin email
      return null;
    }
  }
}; 