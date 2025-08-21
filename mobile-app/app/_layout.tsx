import 'react-native-get-random-values';
import * as Sentry from '@sentry/react-native';

// Only initialize Sentry if DSN is available
if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    enableAutoPerformanceTracing: true,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2, // Lower sample rate in production
    enableAutoSessionTracking: true,
    debug: __DEV__, // Enable debug in development for troubleshooting
    environment: process.env.EXPO_PUBLIC_ENV || (__DEV__ ? 'development' : 'production'),
    release: `${process.env.EXPO_PUBLIC_APP_ID ?? 'hooked'}@${process.env.EXPO_PUBLIC_APP_VERSION ?? '1.0.0'}`,
    beforeSend(event) {
      // Add extra context for physical device debugging
      if (event.contexts) {
        event.contexts.device = {
          ...event.contexts.device,
          simulator: __DEV__,
        };
      }
      return event;
    },
  });
} else {
  console.warn('Sentry DSN not configured - error reporting disabled');
}

// Initialize React Native Firebase - but only after app is ready
// import '../lib/firebaseNativeConfig';

import React, { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { NotificationRouter } from '../lib/notifications/NotificationRouter';
import { useIsForegroundGetter } from '../lib/notifications/helpers';
import CustomSplashScreen from '../lib/components/SplashScreen';
import ErrorBoundary from '../lib/components/ErrorBoundary';
import { CustomMatchToast } from '../lib/components/CustomMatchToast';
import * as Notifications from 'expo-notifications';
import { AppStateSyncService } from '../lib/services/AppStateSyncService';
import * as Linking from 'expo-linking';

import { getSessionAndInstallationIds } from '../lib/session/sessionId';

// ===== Helpers to read current context =====






// Legacy mapping functions removed - now handled by GlobalNotificationService

export default function RootLayout() {
  const router = useRouter();
  const [appIsReady, setAppIsReady] = useState(false);

  // 1) Provide getIsForeground to the router
  const getIsForeground = useIsForegroundGetter();

  // 2) Initialize NotificationRouter when app is ready and dependencies are available
  useEffect(() => {
    if (!appIsReady) return;
    
    console.log('_layout.tsx: Initializing NotificationRouter with dependencies');
    NotificationRouter.init({
      getIsForeground,
      navigateToMatches: () => router.push('/matches'),
    });
    
    console.log('_layout.tsx: NotificationRouter initialization complete');
  }, [appIsReady, getIsForeground, router]);


  // 2.5) Push notification tap handler
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      try {
        const data = (response?.notification?.request?.content?.data || {}) as any;
        if (data?.type === 'match') {
          router.push('/matches');
        } else if (data?.type === 'message') {
          // Route to specific chat with partner session ID
          if (data?.partnerSessionId) {
            router.push(`/chat?partner=${data.partnerSessionId}`);
          } else {
            // Fallback to matches page if no partner info
            router.push('/matches');
          }
        }
      } catch (e) {
        Sentry.captureException(e);
      }
    });
    return () => sub.remove();
  }, [router]);

  const handleDeepLink = (url: string) => {
    try {
      const { path, queryParams } = Linking.parse(url);
      
      // Handle hooked://join?code=XXXXX
      if (path === 'join' && queryParams?.code) {
        const code = queryParams.code as string;
        router.push(`/join?code=${code.toUpperCase()}`);
      }
    } catch (error) {
      console.error('Error handling deep link:', error);
      Sentry.captureException(error);
    }
  };

  // 2.6) Deep linking handler for QR codes from native camera
  useEffect(() => {
    if (!appIsReady) return;

    // Handle initial URL (app was closed)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Handle URL changes (app was in background)
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [appIsReady, router, handleDeepLink]);





  // 2.7) Foreground notification policy - prevent duplicate notifications on iOS
  useEffect(() => {
    if (!(Notifications as any).__hookedHandlerSet) {
      (Notifications as any).__hookedHandlerSet = true;
      Notifications.setNotificationHandler({
        handleNotification: async () => {
          // For iOS, don't show banner/sound when app is in foreground to prevent duplicates
          // The custom toast system will handle foreground notifications
          
          return {
            shouldPlaySound: false,      // Disable sound - toast will handle
            shouldSetBadge: true,         // Keep badge on both platforms
            shouldShowBanner: false,      // Disable banner - toast will handle foreground
            shouldShowList: true,         // Show in notification list on both platforms
          };
        },
      });
    }
  }, []);

  // 3) App initialization using the robust AppInitializationService
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('_layout.tsx: Starting app initialization with AppInitializationService');
        
        // Use the robust initialization service with retry logic
        const { AppInitializationService } = await import('../lib/services/AppInitializationService');
        const initSuccess = await AppInitializationService.initializeApp(3); // 3 retry attempts
        
        if (initSuccess) {
          console.log('_layout.tsx: App initialization successful');
          
          // Retry any failed components
          try {
            await AppInitializationService.retryFailedComponents();
          } catch (retryError) {
            console.warn('_layout.tsx: Some components failed retry, but continuing:', retryError);
          }
          
        } else {
          console.error('_layout.tsx: App initialization failed after all retries');
          Sentry.addBreadcrumb({
            message: 'App initialization failed after all retries',
            level: 'error',
            category: 'app_initialization'
          });
        }
        
        setAppIsReady(true);
        
      } catch (error) {
        console.error('_layout.tsx: Critical app initialization error:', error);
        Sentry.captureException(error, {
          tags: {
            operation: 'app_initialization',
            source: '_layout.tsx'
          }
        });
        setAppIsReady(true); // Still set ready to prevent infinite loading
      }
    };

    initializeApp();
  }, []);

  // 3.5) Start app state sync when session is available (push token is now registered in AppInitializationService)
  useEffect(() => {
    if (!appIsReady) return;
    
    let cancelled = false;
    (async () => {
      try {
        // Get session and installation IDs using the new session management
        const { sessionId, installationId } = await getSessionAndInstallationIds();
        
        if (!sessionId || cancelled) return;
        
        Sentry.addBreadcrumb({
          message: 'App initialization with session IDs',
          level: 'info',
          category: 'session',
          data: { 
            sessionId: sessionId.substring(0, 8) + '...',
            installationId: installationId.substring(0, 8) + '...'
          }
        });
        
        // Push token registration is now handled in AppInitializationService
        // to ensure it happens before notification services are initialized
        
        // Start app state sync
        AppStateSyncService.startAppStateSync(sessionId);
        
      } catch (error) {
        Sentry.captureException(error, {
          tags: {
            operation: 'session_initialization',
            source: 'layout'
          }
        });
      }
    })();
    return () => { 
      cancelled = true; 
      AppStateSyncService.stopAppStateSync();
    };
  }, [appIsReady]);

  // Legacy Firestore listeners removed - now handled by GlobalNotificationService
  // The GlobalNotificationService is initialized by AppInitializationService and provides
  // always-on listeners for matches and messages with the same filtering logic

  if (!appIsReady) {
    return (
      <ErrorBoundary>
        <CustomSplashScreen />
      </ErrorBoundary>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
          <Stack 
            screenOptions={{ 
              headerShown: false,
              gestureEnabled: false,  // Disable swipe gestures
            }} 
          />
        <Toast 
          config={{
          /* eslint-disable react/prop-types */
          matchSuccess: (props) => (
            <CustomMatchToast
              text1={props.text1 || ''}
              text2={props.text2}
              onPress={props.onPress}
              onHide={props.hide}
            />
          ),
          messageSuccess: (props) => (
            <CustomMatchToast
              text1={props.text1 || ''}
              text2={props.text2}
              onPress={props.onPress}
              onHide={props.hide}
            />
          ),
          success: (props) => (
            <CustomMatchToast
              text1={props.text1 || ''}
              text2={props.text2}
              onPress={props.onPress}
              onHide={props.hide}
            />
          ),
          info: (props) => (
            <CustomMatchToast
              text1={props.text1 || ''}
              text2={props.text2}
              onPress={props.onPress}
              onHide={props.hide}
            />
          ),
          error: (props) => (
            <CustomMatchToast
              text1={props.text1 || ''}
              text2={props.text2}
              onPress={props.onPress}
              onHide={props.hide}
            />
          ),
          warning: (props) => (
            <CustomMatchToast
              text1={props.text1 || ''}
              text2={props.text2}
              onPress={props.onPress}
              onHide={props.hide}
            />
          ),
          /* eslint-enable react/prop-types */
        }}
        />
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}