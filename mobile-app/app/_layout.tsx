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
import * as Updates from 'expo-updates';
import { AppState } from 'react-native';

import { getSessionAndInstallationIds } from '../lib/session/sessionId';

// ===== Helpers to read current context =====

// ===== OTA Update Helper =====
async function checkForOTAUpdates(): Promise<void> {
  if (!Updates.isEnabled) {
    console.log('_layout.tsx: Updates not enabled, skipping OTA check');
    return;
  }

  try {
    console.log('_layout.tsx: Checking for OTA updates...');
    const update = await Updates.checkForUpdateAsync();
    
    if (update.isAvailable) {
      console.log('_layout.tsx: OTA update available, downloading...');
      await Updates.fetchUpdateAsync();
      console.log('_layout.tsx: OTA update downloaded, will apply on next app launch');
      
      // Log to Sentry for tracking
      Sentry.addBreadcrumb({
        message: 'OTA update downloaded successfully',
        level: 'info',
        category: 'app_updates',
        data: {
          updateId: update.manifest?.id,
          currentUpdateId: Updates.updateId
        }
      });
    } else {
      console.log('_layout.tsx: No OTA updates available');
    }
  } catch (error) {
    console.warn('_layout.tsx: OTA update check failed:', error);
    Sentry.captureException(error, {
      tags: {
        operation: 'ota_update_check',
        source: '_layout.tsx'
      }
    });
  }
}






// Legacy mapping functions removed - now handled by GlobalNotificationService

export default function RootLayout() {
  const router = useRouter();
  const [appIsReady, setAppIsReady] = useState(false);

  // 1) Provide getIsForeground to the router
  const getIsForeground = useIsForegroundGetter();

  // 2) Initialize NotificationRouter and Android channels when app is ready
  useEffect(() => {
    if (!appIsReady) return;
    
    console.log('_layout.tsx: Initializing notification system');
    
    // Initialize Android notification channels first
    import('../lib/notifications/AndroidChannels').then(({ AndroidChannels }) => {
      AndroidChannels.initialize();
    }).catch(error => {
      console.warn('Failed to initialize Android channels:', error);
    });
    
    // Initialize local notification fallback service
    import('../lib/notifications/LocalNotificationFallback').then(({ LocalNotificationFallback }) => {
      LocalNotificationFallback.initialize();
    }).catch(error => {
      console.warn('Failed to initialize Local Notification Fallback:', error);
    });
    
    // Initialize NotificationRouter
    NotificationRouter.init({
      getIsForeground,
      navigateToMatches: () => router.push('/matches'),
    });
    
    console.log('_layout.tsx: Notification system initialization complete');
  }, [appIsReady, getIsForeground, router]);

  // 2.4) Push notification received handler - cancel local fallbacks when push arrives
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(async (notification) => {
      try {
        const data = notification.request.content.data as any;
        
        // If this is a push notification (not local fallback), cancel any local fallbacks for the same event
        if (data?.source !== 'local_fallback' && data?.id) {
          const { LocalNotificationFallback } = await import('../lib/notifications/LocalNotificationFallback');
          await LocalNotificationFallback.cancelLocalFallback(data.id, data.type);
          
          console.log('_layout.tsx: Push notification received, cancelled local fallback for event:', data.id);
        }
      } catch (error) {
        console.warn('_layout.tsx: Error handling received notification:', error);
      }
    });

    return () => {
      sub.remove();
    };
  }, []);

  // 2.5) Push notification tap handler
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      try {
        const data = (response?.notification?.request?.content?.data || {}) as any;
        if (data?.type === 'match') {
          // Route to specific chat with the matched user if we have their session ID
          if (data?.otherSessionId) {
            router.push({
              pathname: '/chat',
              params: {
                matchId: data.otherSessionId,
                matchName: data.otherName || 'Your match'
              }
            });
          } else {
            // Fallback to matches page if no partner info
            router.push('/matches');
          }
        } else if (data?.type === 'message') {
          // Route to specific chat with partner session ID
          if (data?.partnerSessionId) {
            router.push({
              pathname: '/chat',
              params: {
                matchId: data.partnerSessionId,
                matchName: data.partnerName || 'Your match'
              }
            });
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

  // 2.6) Deep linking handler for QR codes from native camera
  useEffect(() => {
    if (!appIsReady) return;

    // Move handleDeepLink inside useEffect to avoid dependency issues
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
  }, [appIsReady, router]);





  // 2.7) Enhanced foreground notification policy - intelligent handling
  useEffect(() => {
    if (!(Notifications as any).__hookedHandlerSet) {
      (Notifications as any).__hookedHandlerSet = true;
      Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
          // Enhanced logic: Check notification source and type
          const data = notification.request.content.data as any;
          const isLocalFallback = data?.source === 'local_fallback';
          const isForeground = getIsForeground();
          
          console.log('_layout.tsx: Handling foreground notification:', {
            type: data?.type,
            source: data?.source,
            isForeground,
            isLocalFallback
          });
          
          // Special case: Local fallback notifications can show banner
          // This handles the case where push failed but user is still in foreground
          if (isLocalFallback) {
            return {
              shouldPlaySound: true,       // Allow sound for fallback
              shouldSetBadge: true,        // Update badge
              shouldShowBanner: true,      // Show banner since push failed
              shouldShowList: true,        // Add to notification list
            };
          }
          
          // Standard foreground policy: Let toast system handle it
          return {
            shouldPlaySound: false,      // Disable sound - toast will handle
            shouldSetBadge: true,        // Keep badge on both platforms  
            shouldShowBanner: false,     // Disable banner - toast will handle
            shouldShowList: true,        // Show in notification list
          };
        },
      });
    }
  }, [getIsForeground]);

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
        
        // Check for OTA updates after app initialization
        try {
          await checkForOTAUpdates();
        } catch (updateError) {
          console.warn('_layout.tsx: OTA update check failed:', updateError);
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

  // 3.7) Check for updates when app resumes from background
  useEffect(() => {
    if (!appIsReady) return;

    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        // Check for updates when app becomes active (resumed from background)
        checkForOTAUpdates().catch(error => {
          console.warn('_layout.tsx: Background OTA update check failed:', error);
        });
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
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
              animation: 'none',      // Disable slide transitions - instant page changes
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