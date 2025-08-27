/**
 * Android Notification Channels Configuration
 * 
 * Manages notification channels for Android with proper categorization
 * and consistent importance levels.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export interface NotificationChannel {
  id: string;
  name: string;
  description: string;
  importance: Notifications.AndroidImportance;
  sound: boolean;
  vibrationPattern?: number[];
  lightColor?: string;
}

// Stable channel definitions - NEVER change IDs once published
const CHANNELS: NotificationChannel[] = [
  {
    id: 'hooked_matches',
    name: 'Matches',
    description: 'Notifications when you get matched with someone',
    importance: Notifications.AndroidImportance.HIGH,
    sound: true,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#8b5cf6' // Purple theme color
  },
  {
    id: 'hooked_messages', 
    name: 'Messages',
    description: 'New chat messages from your matches',
    importance: Notifications.AndroidImportance.HIGH,
    sound: true,
    vibrationPattern: [0, 200],
    lightColor: '#8b5cf6'
  },
  {
    id: 'hooked_general',
    name: 'General',
    description: 'General app notifications and updates',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: true,
    vibrationPattern: [0, 100],
    lightColor: '#8b5cf6'
  }
];

class AndroidChannelsService {
  private initialized = false;
  
  /**
   * Initialize all notification channels (call once on app start)
   */
  async initialize(): Promise<void> {
    if (Platform.OS !== 'android' || this.initialized) {
      return;
    }
    
    try {
      // Create all channels
      for (const channel of CHANNELS) {
        await Notifications.setNotificationChannelAsync(channel.id, {
          name: channel.name,
          description: channel.description,
          importance: channel.importance,
          sound: channel.sound,
          vibrationPattern: channel.vibrationPattern,
          lightColor: channel.lightColor,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: false, // Don't bypass Do Not Disturb
          showBadge: true
        });
      }
      
      this.initialized = true;
      console.log('AndroidChannelsService: All notification channels created');
      
    } catch (error) {
      console.error('AndroidChannelsService: Failed to initialize channels:', error);
    }
  }
  
  /**
   * Get the appropriate channel ID for a notification type
   */
  getChannelId(type: 'match' | 'message' | 'general'): string {
    switch (type) {
      case 'match':
        return 'hooked_matches';
      case 'message':
        return 'hooked_messages';
      case 'general':
      default:
        return 'hooked_general';
    }
  }
  
  /**
   * Get all configured channels
   */
  getAllChannels(): NotificationChannel[] {
    return [...CHANNELS];
  }
  
  /**
   * Check if channels are properly initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

export const AndroidChannels = new AndroidChannelsService();
export default AndroidChannels;