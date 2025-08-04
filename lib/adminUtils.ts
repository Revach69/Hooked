import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthAPI } from './firebaseApi';

export const AdminUtils = {
  // Check if current user is admin
  async isAdmin(): Promise<boolean> {
    try {
      // Check admin session from AsyncStorage
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
      
      return false;
    } catch (error) {
      console.error('Error checking admin status:', error);
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
      console.error('Error setting admin session:', error);
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
      console.error('Error clearing admin session:', error);
    }
  },

  // Get admin email
  async getAdminEmail(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('adminEmail');
    } catch (error) {
      console.error('Error getting admin email:', error);
      return null;
    }
  }
}; 