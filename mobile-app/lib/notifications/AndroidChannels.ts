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
  sound: string | null;
  vibrationPattern?: number[];
  lightColor?: string;
}

// Stable channel definitions - NEVER change IDs once published
const CHANNELS: NotificationChannel[] = [
  {
    id: 'matches',
    name: 'Matches',
    description: 'Notifications when you get matched with someone',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#8b5cf6' // Purple theme color
  },
  {
    id: 'messages', 
    name: 'Messages',
    description: 'New chat messages from your matches',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 200],
    lightColor: '#8b5cf6'
  },
  {
    id: 'general',
    name: 'General',
    description: 'General app notifications and updates',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
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
    if (Platform.OS !== 'android') {
      console.log('AndroidChannelsService: Skipping - not Android platform');
      return;
    }
    
    if (this.initialized) {
      console.log('AndroidChannelsService: Already initialized, skipping');
      return;
    }
    
    try {
      console.log('AndroidChannelsService: Starting channel initialization...');
      
      // Check permissions first
      const perms = await Notifications.getPermissionsAsync();
      console.log('AndroidChannelsService: Current permissions:', perms.status);
      
      // Create all channels
      const createdChannels = [];
      for (const channel of CHANNELS) {
        try {
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
          
          createdChannels.push(channel.id);
          console.log(`AndroidChannelsService: Created channel '${channel.id}'`);
        } catch (channelError) {
          console.error(`AndroidChannelsService: Failed to create channel '${channel.id}':`, channelError);
          
          console.error(channelError, {
            tags: {
              operation: 'android_channel_creation',
              channel_id: channel.id
            },
            extra: {
              channelConfig: channel,
              permissions: perms
            }
          });
        }
      }
      
      // Verify channels were created
      const existingChannels = await Notifications.getNotificationChannelsAsync();
      console.log('AndroidChannelsService: Existing channels after creation:', 
        existingChannels.map(ch => ch.id));
      
      this.initialized = true;
      
      const successMessage = `AndroidChannelsService: Initialized ${createdChannels.length}/${CHANNELS.length} channels successfully`;
      console.log(successMessage);
      
      // Log success to Sentry
      console.log({
        message: successMessage,
        level: 'info',
        category: 'android_notifications',
        data: {
          createdChannels,
          totalChannels: CHANNELS.length,
          existingChannels: existingChannels.length,
          permissions: perms.status
        }
      });
      
    } catch (error) {
      console.error('AndroidChannelsService: Failed to initialize channels:', error);
      
      // Log error to Sentry for remote debugging
      console.error(error, {
        tags: {
          operation: 'android_channel_initialization',
          platform: Platform.OS
        },
        extra: {
          channelCount: CHANNELS.length,
          initialized: this.initialized
        }
      });
      
      // Don't throw - allow app to continue without proper channels
      // The app will still work, just might have less optimal notification display
    }
  }
  
  /**
   * Get the appropriate channel ID for a notification type
   */
  getChannelId(type: 'match' | 'message' | 'general'): string {
    switch (type) {
      case 'match':
        return 'matches';
      case 'message':
        return 'messages';
      case 'general':
      default:
        return 'general';
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