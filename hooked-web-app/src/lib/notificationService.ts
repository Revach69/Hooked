'use client';

import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';
import { getFirebaseApp } from './firebase';
import { serviceWorkerCompat, webPushCompat } from './swCompat';
import { browserInfo } from './browserCompat';

// Notification service for Firebase Cloud Messaging
export class NotificationService {
  private static messaging: Messaging | null = null;
  private static vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

  // Initialize Firebase Cloud Messaging
  private static async initializeMessaging(): Promise<Messaging | null> {
    if (typeof window === 'undefined') return null;

    try {
      const app = getFirebaseApp();
      this.messaging = getMessaging(app);
      return this.messaging;
    } catch (error) {
      console.error('Error initializing Firebase Cloud Messaging:', error);
      return null;
    }
  }

  // Get FCM messaging instance
  private static async getMessaging(): Promise<Messaging | null> {
    if (!this.messaging) {
      return await this.initializeMessaging();
    }
    return this.messaging;
  }

  // Check if notifications are supported with browser compatibility
  static isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    
    // Use browser compatibility detection
    return browserInfo.supportsNotifications && 
           browserInfo.supportsServiceWorker && 
           browserInfo.supportsPushManager;
  }

  // Check notification permission status
  static getPermissionStatus(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  }

  // Request notification permission
  static async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      throw new Error('Push notifications are not supported in this browser');
    }

    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      throw error;
    }
  }

  // Get FCM registration token
  static async getRegistrationToken(): Promise<string | null> {
    if (!this.isSupported()) return null;

    try {
      const messaging = await this.getMessaging();
      if (!messaging || !this.vapidKey) {
        console.warn('Firebase messaging not initialized or VAPID key missing');
        return null;
      }

      // Check permission first
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission not granted');
        return null;
      }

      const token = await getToken(messaging, {
        vapidKey: this.vapidKey,
      });

      if (token) {
        console.log('FCM registration token:', token);
        return token;
      } else {
        console.warn('No registration token available');
        return null;
      }
    } catch (error) {
      console.error('Error getting FCM registration token:', error);
      return null;
    }
  }

  // Listen for foreground messages
  static async onForegroundMessage(callback: (payload: any) => void): Promise<() => void> {
    const messaging = await this.getMessaging();
    if (!messaging) {
      return () => {}; // Return empty unsubscribe function
    }

    return onMessage(messaging, (payload) => {
      console.log('Received foreground message:', payload);
      callback(payload);
    });
  }

  // Store FCM token for user
  static async registerTokenForUser(sessionId: string): Promise<boolean> {
    try {
      const token = await this.getRegistrationToken();
      if (!token) return false;

      // Store token in localStorage for persistence
      localStorage.setItem(`fcm-token-${sessionId}`, token);
      localStorage.setItem('last-fcm-token', token);
      
      // Here you would typically send the token to your backend
      // For now, we'll just store it locally
      console.log('FCM token registered for session:', sessionId, token);
      
      return true;
    } catch (error) {
      console.error('Error registering FCM token:', error);
      return false;
    }
  }

  // Get stored token for user
  static getStoredToken(sessionId: string): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(`fcm-token-${sessionId}`);
  }

  // Remove stored token
  static removeStoredToken(sessionId: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(`fcm-token-${sessionId}`);
  }

  // Show local notification (fallback)
  static showLocalNotification(title: string, options: NotificationOptions = {}): void {
    if (!this.isSupported() || Notification.permission !== 'granted') return;

    try {
      new Notification(title, {
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        ...options,
      });
    } catch (error) {
      console.error('Error showing local notification:', error);
    }
  }

  // Initialize notification service for user
  static async initialize(sessionId: string): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('Push notifications not supported');
      return false;
    }

    try {
      // Initialize messaging
      await this.getMessaging();
      
      // Register token for user
      const success = await this.registerTokenForUser(sessionId);
      
      if (success) {
        console.log('Notification service initialized for session:', sessionId);
      }
      
      return success;
    } catch (error) {
      console.error('Error initializing notification service:', error);
      return false;
    }
  }
}

// Notification types for the app
export enum NotificationType {
  NEW_MATCH = 'new_match',
  NEW_MESSAGE = 'new_message',
  EVENT_UPDATE = 'event_update',
  PROFILE_VIEW = 'profile_view',
}

// Notification payload interface
export interface HookedNotification {
  type: NotificationType;
  title: string;
  body: string;
  data?: {
    matchId?: string;
    eventId?: string;
    sessionId?: string;
    profileId?: string;
    [key: string]: any;
  };
  icon?: string;
  image?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
}