import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import CustomSplashScreen from '../lib/components/SplashScreen';
import { SurveyNotificationService } from '../lib/surveyNotificationService';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [appIsReady, setAppIsReady] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    async function prepare() {
      try {
        // Configure notification handler
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });

        // Handle notification response
        const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
          const data = response.notification.request.content.data as any;
          const { type, eventId, eventName, sessionId } = data;
          
          if (type === 'survey_request') {
            // Check if survey is still valid (within 24h window)
            SurveyNotificationService.isSurveyNotificationValid(eventId).then(isValid => {
              if (isValid) {
                // Navigate to survey screen
                router.push({
                  pathname: '/survey',
                  params: { 
                    eventId, 
                    eventName, 
                    sessionId,
                    source: 'notification'
                  }
                });
              } else {
                // Show expired message
                Alert.alert(
                  'Survey Expired',
                  'The feedback period for this event has ended. Thanks for using Hooked!'
                );
              }
            });
          }
        });

        // Simulate loading progress
        const steps = [
          { progress: 20, delay: 300 },
          { progress: 40, delay: 300 },
          { progress: 60, delay: 300 },
          { progress: 80, delay: 300 },
          { progress: 95, delay: 200 },
          { progress: 100, delay: 100 }
        ];

        for (const step of steps) {
          await new Promise(resolve => setTimeout(resolve, step.delay));
          setProgress(step.progress);
        }

        // Additional delay to show 100% completion
        await new Promise(resolve => setTimeout(resolve, 200));

        // Cleanup subscription on unmount
        return () => subscription?.remove();
      } catch (e) {
        console.warn(e);
      } finally {
        // Tell the application to render
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  if (!appIsReady) {
    return <CustomSplashScreen progress={progress} />;
  }

  return (
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
  );
} 