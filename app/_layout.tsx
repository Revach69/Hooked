import { Stack } from 'expo-router';
import { useColorScheme, View, Text } from 'react-native';
import { useEffect, useState, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';
import CustomSplashScreen from '../lib/components/SplashScreen';
import ErrorBoundary from '../lib/components/ErrorBoundary';
import { SurveyNotificationService } from '../lib/surveyNotificationService';
import { initSentry } from '../lib/sentryConfig';


export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [appIsReady, setAppIsReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const notificationSubscriptionRef = useRef<any>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;
    
    let isMounted = true;
    
    async function prepare() {
      try {
        // Initialize Sentry first
        initSentry();
        
        // Request notification permissions - always request if not granted
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        // Always request permission if not granted
        if (existingStatus !== 'granted') {
          try {
            const { status } = await Notifications.requestPermissionsAsync({
              ios: {
                allowAlert: true,
                allowBadge: true,
                allowSound: true,
              },
            });
            finalStatus = status;
            console.log('Notification permission request result:', status);
          } catch (error) {
            console.error('Error requesting notification permission:', error);
          }
        }
        
        if (finalStatus !== 'granted') {
          console.log('Notification permission not granted - user may have denied it');
        } else {
          console.log('Notification permission granted successfully');
        }
        
        // Simple notification handler setup
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });

        // Handle notification response with minimal processing
        notificationSubscriptionRef.current = Notifications.addNotificationResponseReceivedListener((response) => {
          if (!isMounted) return;
          
          try {
            const data = response.notification.request.content.data as any;
            const { type, eventId, eventName, sessionId } = data;
            
            if (type === 'survey_request') {
              // Simple navigation without complex validation
              setTimeout(() => {
                if (isMounted) {
                  router.push({
                    pathname: '/survey',
                    params: { 
                      eventId, 
                      eventName, 
                      sessionId,
                      source: 'notification'
                    }
                  });
                }
              }, 1000);
            } else if (type === 'match') {
              // Navigate to matches page for match notifications
              setTimeout(() => {
                if (isMounted) {
                  router.push('/matches');
                }
              }, 1000);
            }
          } catch (error) {
            console.error('Error processing notification response:', error);
          }
        });

        // Simple loading progress without complex delays
        const steps = [20, 40, 60, 80, 95, 100];
        for (const step of steps) {
          if (!isMounted) break;
          await new Promise(resolve => setTimeout(resolve, 200));
          if (isMounted) {
            setProgress(step);
          }
        }

        // Final delay
        if (isMounted) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (e) {
        console.warn('Error during app preparation:', e);
      } finally {
        // Tell the application to render only if still mounted
        if (isMounted) {
          setAppIsReady(true);
        }
      }
    }

    prepare();

    // Cleanup function
    return () => {
      isMounted = false;
      if (notificationSubscriptionRef.current) {
        try {
          notificationSubscriptionRef.current.remove();
          notificationSubscriptionRef.current = null;
        } catch (error) {
          console.error('Error removing notification subscription:', error);
        }
      }
    };
  }, []);

  if (!appIsReady) {
    return (
      <ErrorBoundary>
        <CustomSplashScreen progress={progress} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
              <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="home" />
          <Stack.Screen name="join" />
          <Stack.Screen name="consent" />
          <Stack.Screen name="discovery" />
          <Stack.Screen name="matches" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="chat" />
          <Stack.Screen name="survey" />
          <Stack.Screen name="adminLogin" />
          <Stack.Screen name="admin" />

        </Stack>
        <Toast />
    </ErrorBoundary>
  );
} 