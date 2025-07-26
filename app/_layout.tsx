import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { initializeNotifications, checkNotificationPermission, requestNotificationPermission } from '../lib/notifications';
import { checkForRecoveryOnStartup, firebaseRecovery } from '../lib/firebaseRecovery';
import { ErrorAnalytics } from '../lib/errorMonitoring';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 Initializing app...');
        
        // Check for Firebase recovery on startup
        await checkForRecoveryOnStartup();
        
        // Initialize Firebase recovery system
        await firebaseRecovery.resetRecoveryState();
        setFirebaseInitialized(true);
        
        console.log('✅ Firebase recovery system initialized');
      } catch (error) {
        console.error('❌ Error initializing Firebase recovery:', error);
        setFirebaseInitialized(true); // Continue anyway
      }
    };

    initializeApp();
  }, []);

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

  // Global error handler for unhandled Firebase errors
  useEffect(() => {
    const handleGlobalError = (error: Error, isFatal?: boolean) => {
      console.error('🚨 Global error caught:', error);
      
      // Check if it's a Firebase-related error
      if (error.message?.includes('Firebase') || 
          error.message?.includes('firebase') ||
          error.message?.includes('INTERNAL ASSERTION FAILED')) {
        
        // Record the error
        ErrorAnalytics.recordError(error, 'global_error_handler');
        
        // Attempt recovery if Firebase is initialized
        if (firebaseInitialized) {
          firebaseRecovery.handleFirebaseError(error, 'global_error_handler')
            .then(success => {
              if (success) {
                console.log('✅ Global Firebase error recovered');
              } else {
                console.warn('⚠️ Global Firebase error recovery failed');
              }
            })
            .catch(recoveryError => {
              console.error('❌ Error during global recovery:', recoveryError);
            });
        }
      }
    };

    // Set up global error handler
    if (__DEV__) {
      // In development, we can use console.error to catch errors
      const originalConsoleError = console.error;
      console.error = (...args) => {
        originalConsoleError.apply(console, args);
        
        // Check if any of the args contain Firebase errors
        const errorString = args.join(' ');
        if (errorString.includes('Firebase') || 
            errorString.includes('firebase') ||
            errorString.includes('INTERNAL ASSERTION FAILED')) {
          handleGlobalError(new Error(errorString), false);
        }
      };
    }

    return () => {
      // Cleanup if needed
    };
  }, [firebaseInitialized]);

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