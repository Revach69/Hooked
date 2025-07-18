import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { initializeNotifications, checkNotificationPermission } from '../lib/notifications';
import NotificationPermissionModal from '../lib/NotificationPermissionModal';

export default function RootLayout() {
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionChecked, setPermissionChecked] = useState(false);

  useEffect(() => {
    const initNotifications = async () => {
      try {
        // Check if permission is already granted
        const permission = await checkNotificationPermission();
        
        if (permission.granted) {
          // Initialize notifications if permission is already granted
          await initializeNotifications();
        } else if (permission.canAskAgain) {
          // Show custom permission modal if we can ask again
          setShowPermissionModal(true);
        }
        
        setPermissionChecked(true);
      } catch (error) {
        console.error('Error initializing notifications:', error);
        setPermissionChecked(true);
      }
    };

    // Delay the permission check to avoid showing modal immediately on app launch
    const timer = setTimeout(initNotifications, 2000);
    
    return () => clearTimeout(timer);
  }, []);

  const handlePermissionGranted = () => {
    console.log('Notification permission granted');
  };

  const handleClosePermissionModal = () => {
    setShowPermissionModal(false);
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: Platform.OS === 'ios' ? 'default' : 'slide_from_right',
        }}
      />
      
      <NotificationPermissionModal
        visible={showPermissionModal && permissionChecked}
        onClose={handleClosePermissionModal}
        onPermissionGranted={handlePermissionGranted}
      />
    </SafeAreaProvider>
  );
} 