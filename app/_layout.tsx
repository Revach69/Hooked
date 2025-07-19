import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { initializeNotifications, checkNotificationPermission, requestNotificationPermission } from '../lib/notifications';

export default function RootLayout() {
  const colorScheme = useColorScheme();
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
          // For Android 13+ (API level 33+), we need to request POST_NOTIFICATIONS permission
          // For iOS and older Android versions, this will show the native permission popup
          const result = await requestNotificationPermission();
          
          if (result.granted) {
            // Initialize notifications if permission was just granted
            await initializeNotifications();
          }
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

  return (
    <SafeAreaProvider>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: Platform.OS === 'ios' ? 'default' : 'slide_from_right',
        }}
      />
    </SafeAreaProvider>
  );
} 