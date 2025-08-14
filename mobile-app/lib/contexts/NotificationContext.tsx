import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { NotificationManager, NotificationItem } from '../services/NotificationManager';
import CustomNotification from '../components/CustomNotification';

interface NotificationContextType {
  show: typeof NotificationManager.show;
  dismiss: typeof NotificationManager.dismiss;
  dismissAll: typeof NotificationManager.dismissAll;
  success: typeof NotificationManager.success;
  error: typeof NotificationManager.error;
  warning: typeof NotificationManager.warning;
  info: typeof NotificationManager.info;
  match: typeof NotificationManager.match;
  message: typeof NotificationManager.message;
  activeNotifications: NotificationItem[];
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    const unsubscribe = NotificationManager.subscribe((updatedNotifications) => {
      setNotifications(updatedNotifications);
    });

    return unsubscribe;
  }, []);

  const contextValue: NotificationContextType = {
    show: NotificationManager.show.bind(NotificationManager),
    dismiss: NotificationManager.dismiss.bind(NotificationManager),
    dismissAll: NotificationManager.dismissAll.bind(NotificationManager),
    success: NotificationManager.success.bind(NotificationManager),
    error: NotificationManager.error.bind(NotificationManager),
    warning: NotificationManager.warning.bind(NotificationManager),
    info: NotificationManager.info.bind(NotificationManager),
    match: NotificationManager.match.bind(NotificationManager),
    message: NotificationManager.message.bind(NotificationManager),
    activeNotifications: notifications,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <NotificationContainer notifications={notifications} />
    </NotificationContext.Provider>
  );
};

interface NotificationContainerProps {
  notifications: NotificationItem[];
}

const NotificationContainer: React.FC<NotificationContainerProps> = ({ notifications }) => {
  const handleDismiss = (id: string) => {
    NotificationManager.dismiss(id);
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      {notifications.map((notification, index) => (
        <CustomNotification
          key={notification.id}
          {...notification}
          animatedValue={notification.animatedValue!}
          onDismiss={() => handleDismiss(notification.id)}
          style={{
            ...notification.position === 'top' ? { 
              top: 50 + (index * 80) // Stack notifications with spacing
            } : {},
            ...notification.position === 'bottom' ? {
              bottom: 50 + ((notifications.length - 1 - index) * 80)
            } : {},
          }}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    pointerEvents: 'box-none',
  },
});

export default NotificationProvider;