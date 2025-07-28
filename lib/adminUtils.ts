import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from './firebaseApi';

// Simple admin verification system
// In production, this should be replaced with proper Firebase custom claims

const ADMIN_EMAILS = [
  'admin@hooked-app.com',
  'roi@hooked-app.com',
  // Add more admin emails as needed
];

export const AdminUtils = {
  // Check if current user is admin
  async isAdmin(): Promise<boolean> {
    try {
      const currentUser = User.getCurrentUser();
      if (!currentUser || !currentUser.email) {
        return false;
      }

      // Check if email is in admin list
      const isAdminEmail = ADMIN_EMAILS.includes(currentUser.email.toLowerCase());
      
      // Also check local storage for admin session
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
      
      return isAdminEmail;
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