import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebaseConfig';
import { AsyncStorageUtils } from '../asyncStorageUtils';
import { NotificationManager } from './NotificationManager';
import { router } from 'expo-router';

interface CrossDeviceNotificationPayload {
  type: 'match' | 'message' | 'generic';
  title: string;
  body: string;
  data?: Record<string, any>;
  targetSessionId?: string;
  senderSessionId?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

interface FirebaseNotificationResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

class FirebaseNotificationServiceClass {
  private sendNotificationCallable: any;

  constructor() {
    this.sendNotificationCallable = httpsCallable(functions, 'sendCrossDeviceNotification');
  }

  /**
   * Send cross-device notification via Firebase Functions
   */
  async sendCrossDeviceNotification(
    payload: CrossDeviceNotificationPayload
  ): Promise<FirebaseNotificationResponse> {
    try {
      const result = await this.sendNotificationCallable(payload);
      return result.data as FirebaseNotificationResponse;
    } catch (error) {
      console.error('Error sending cross-device notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send match notification (cross-device)
   */
  async sendMatchNotification(
    targetSessionId: string,
    matchedUserName: string,
    isLiker: boolean = false
  ): Promise<boolean> {
    const currentSessionId = await AsyncStorageUtils.getItem<string>('currentSessionId');
    
    const payload: CrossDeviceNotificationPayload = {
      type: 'match',
      title: "You got Hooked!",
      body: `You and ${matchedUserName} liked each other.`,
      targetSessionId,
      senderSessionId: currentSessionId || undefined,
      priority: 'high',
      data: {
        type: 'match',
        matchedUserName,
        isLiker,
        action: 'view_matches',
      },
    };

    const result = await this.sendCrossDeviceNotification(payload);
    return result.success;
  }

  /**
   * Send message notification (cross-device)
   */
  async sendMessageNotification(
    targetSessionId: string,
    senderName: string,
    messagePreview: string
  ): Promise<boolean> {
    const currentSessionId = await AsyncStorageUtils.getItem<string>('currentSessionId');
    
    const payload: CrossDeviceNotificationPayload = {
      type: 'message',
      title: `Message from ${senderName}`,
      body: messagePreview,
      targetSessionId,
      senderSessionId: currentSessionId || undefined,
      priority: 'medium',
      data: {
        type: 'message',
        senderName,
        messagePreview,
        action: 'view_chat',
      },
    };

    const result = await this.sendCrossDeviceNotification(payload);
    return result.success;
  }

  /**
   * Send generic notification (cross-device)
   */
  async sendGenericNotification(
    targetSessionId: string,
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<boolean> {
    const currentSessionId = await AsyncStorageUtils.getItem<string>('currentSessionId');
    
    const payload: CrossDeviceNotificationPayload = {
      type: 'generic',
      title,
      body,
      targetSessionId,
      senderSessionId: currentSessionId || undefined,
      priority: 'medium',
      data: {
        type: 'generic',
        ...data,
      },
    };

    const result = await this.sendCrossDeviceNotification(payload);
    return result.success;
  }

  /**
   * Handle incoming Firebase notifications (when app is in foreground)
   */
  handleIncomingFirebaseNotification(notification: any): void {
    const data = notification.request?.content?.data;
    
    if (!data || !data.type) {
      return;
    }

    switch (data.type) {
      case 'match':
        this.handleMatchNotification(data);
        break;
      case 'message':
        this.handleMessageNotification(data);
        break;
      case 'generic':
        this.handleGenericNotification(data);
        break;
    }
  }

  /**
   * Handle match notification
   */
  private handleMatchNotification(data: any): void {
    const matchedUserName = data.matchedUserName || 'Someone';
    
    NotificationManager.match(matchedUserName, () => {
      router.push('/matches');
    });
  }

  /**
   * Handle message notification
   */
  private handleMessageNotification(data: any): void {
    const senderName = data.senderName || 'Someone';
    const preview = data.messagePreview || 'New message';
    
    NotificationManager.message(senderName, preview, () => {
      router.push('/chat');
    });
  }

  /**
   * Handle generic notification
   */
  private handleGenericNotification(data: any): void {
    const title = data.title || 'Notification';
    const body = data.body || '';
    
    NotificationManager.info(title, body);
  }

  /**
   * Register notification handlers for Firebase notifications
   */
  registerNotificationHandlers(): (() => void) {
    // DISABLED: Creating duplicate notifications - NotificationRouter handles this now
    // const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
    //   this.handleIncomingFirebaseNotification(notification);
    // });

    // Handle notification taps
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      
      if (data?.action === 'view_matches') {
        router.push('/matches');
      } else if (data?.action === 'view_chat') {
        router.push('/chat');
      }
    });

    return () => {
      // foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }

  /**
   * Initialize Firebase notification service
   */
  async initialize(): Promise<void> {
    // Register handlers (notification handler is set in _layout.tsx)
    this.registerNotificationHandlers();

    // Initialize notification channels for Android
    if (Platform.OS === 'android') {
      await this.initializeNotificationChannels();
    }
  }

  /**
   * Initialize Android notification channels
   */
  private async initializeNotificationChannels(): Promise<void> {
    if (Platform.OS !== 'android') return;

    try {
      await Notifications.setNotificationChannelAsync('matches', {
        name: 'Matches',
        description: 'Notifications for new matches',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });

      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        description: 'Notifications for new messages',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });

      await Notifications.setNotificationChannelAsync('general', {
        name: 'General',
        description: 'General notifications',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
    } catch (error) {
      console.error('Error creating notification channels:', error);
    }
  }
}

export const FirebaseNotificationService = new FirebaseNotificationServiceClass();
export default FirebaseNotificationService;