import { Animated } from 'react-native';
import { CustomNotificationProps } from '../components/CustomNotification';

export interface NotificationItem extends Omit<CustomNotificationProps, 'animatedValue'> {
  id: string;
  timestamp: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  persistent?: boolean;
  animatedValue?: Animated.Value;
  timeoutId?: ReturnType<typeof setTimeout>;
}

export interface NotificationConfig {
  maxNotifications: number;
  defaultDuration: number;
  animationDuration: number;
  stackSpacing: number;
  queueProcessingInterval: number;
}

type NotificationListener = (notifications: NotificationItem[]) => void;

class NotificationManagerClass {
  private notifications: NotificationItem[] = [];
  private queue: NotificationItem[] = [];
  private listeners: Set<NotificationListener> = new Set();
  private processingQueue = false;
  private nextId = 1;

  private config: NotificationConfig = {
    maxNotifications: 3,
    defaultDuration: 4000,
    animationDuration: 300,
    stackSpacing: 10,
    queueProcessingInterval: 100,
  };

  configure(config: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }

  private generateId(): string {
    return `notification_${this.nextId++}_${Date.now()}`;
  }

  private getPriority(type: CustomNotificationProps['type']): NotificationItem['priority'] {
    switch (type) {
      case 'error': return 'urgent';
      case 'warning': return 'high';
      case 'success': return 'medium';
      case 'info': return 'low';
      default: return 'medium';
    }
  }

  private sortNotificationsByPriority(notifications: NotificationItem[]): NotificationItem[] {
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
    return notifications.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.timestamp - a.timestamp; // More recent first if same priority
    });
  }

  private async animateIn(notification: NotificationItem): Promise<void> {
    return new Promise((resolve) => {
      if (!notification.animatedValue) {
        notification.animatedValue = new Animated.Value(0);
      }

      Animated.timing(notification.animatedValue, {
        toValue: 1,
        duration: this.config.animationDuration,
        useNativeDriver: false,
      }).start(() => resolve());
    });
  }

  private async animateOut(notification: NotificationItem): Promise<void> {
    return new Promise((resolve) => {
      if (!notification.animatedValue) {
        resolve();
        return;
      }

      Animated.timing(notification.animatedValue, {
        toValue: 0,
        duration: this.config.animationDuration,
        useNativeDriver: false,
      }).start(() => resolve());
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processingQueue || this.queue.length === 0) {
      return;
    }

    this.processingQueue = true;

    while (this.queue.length > 0 && this.notifications.length < this.config.maxNotifications) {
      const notification = this.queue.shift();
      if (!notification) continue;

      // Animate in
      await this.animateIn(notification);

      // Add to active notifications
      this.notifications.push(notification);
      this.notifications = this.sortNotificationsByPriority(this.notifications);

      // Set up auto-dismiss if not persistent
      if (!notification.persistent && notification.duration !== 0) {
        const duration = notification.duration || this.config.defaultDuration;
        notification.timeoutId = setTimeout(() => {
          this.dismiss(notification.id);
        }, duration);
      }

      this.notifyListeners();

      // Small delay between notifications
      await new Promise(resolve => setTimeout(resolve, this.config.queueProcessingInterval));
    }

    this.processingQueue = false;
  }

  show(options: Omit<CustomNotificationProps, 'id' | 'animatedValue'> & {
    priority?: NotificationItem['priority'];
    persistent?: boolean;
  }): string {
    const id = this.generateId();
    const priority = options.priority || this.getPriority(options.type);
    
    const notification: NotificationItem = {
      ...options,
      id,
      timestamp: Date.now(),
      priority,
      animatedValue: new Animated.Value(0),
    };

    // Add to queue
    this.queue.push(notification);
    this.queue = this.sortNotificationsByPriority(this.queue);

    // Process queue
    setTimeout(() => this.processQueue(), 0);

    return id;
  }

  async dismiss(id: string): Promise<void> {
    const notificationIndex = this.notifications.findIndex(n => n.id === id);
    if (notificationIndex === -1) {
      // Check if it's in queue and remove
      this.queue = this.queue.filter(n => n.id !== id);
      return;
    }

    const notification = this.notifications[notificationIndex];

    // Clear timeout if exists
    if (notification.timeoutId) {
      clearTimeout(notification.timeoutId);
    }

    // Animate out
    await this.animateOut(notification);

    // Remove from notifications
    this.notifications.splice(notificationIndex, 1);
    this.notifyListeners();

    // Process queue to show next notification
    setTimeout(() => this.processQueue(), 50);
  }

  dismissAll(): void {
    this.notifications.forEach(notification => {
      if (notification.timeoutId) {
        clearTimeout(notification.timeoutId);
      }
    });
    this.notifications = [];
    this.queue = [];
    this.notifyListeners();
  }

  // Convenience methods
  success(title: string, message?: string, options?: Partial<NotificationItem>): string {
    return this.show({
      type: 'success',
      title,
      message,
      ...options,
    });
  }

  error(title: string, message?: string, options?: Partial<NotificationItem>): string {
    return this.show({
      type: 'error',
      title,
      message,
      persistent: true, // Errors should be persistent by default
      ...options,
    });
  }

  warning(title: string, message?: string, options?: Partial<NotificationItem>): string {
    return this.show({
      type: 'warning',
      title,
      message,
      duration: 6000, // Longer duration for warnings
      ...options,
    });
  }

  info(title: string, message?: string, options?: Partial<NotificationItem>): string {
    return this.show({
      type: 'info',
      title,
      message,
      ...options,
    });
  }

  // Match-specific notification
  match(matchedUserName: string, onViewMatch?: () => void): string {
    return this.show({
      type: 'success',
      title: "You got Hooked!",
      message: `You and ${matchedUserName} liked each other.`,
      duration: 6000,
      onPress: onViewMatch,
      priority: 'high',
    });
  }

  // Message-specific notification
  message(senderName: string, preview: string, onViewChat?: () => void): string {
    return this.show({
      type: 'info',
      title: `Message from ${senderName}`,
      message: preview,
      duration: 5000,
      onPress: onViewChat,
      priority: 'medium',
    });
  }

  getActiveNotifications(): NotificationItem[] {
    return [...this.notifications];
  }

  getQueuedNotifications(): NotificationItem[] {
    return [...this.queue];
  }
}

export const NotificationManager = new NotificationManagerClass();
export default NotificationManager;