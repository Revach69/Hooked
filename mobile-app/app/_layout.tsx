import 'react-native-get-random-values';
// Sentry removed for faster startup

// Initialize React Native Firebase - but only after app is ready
// import '../lib/firebaseNativeConfig';

// Expo notifications handles background processing automatically
// No manual background handler needed for Expo apps

import React, { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { NotificationRouter } from '../lib/notifications/NotificationRouter';
import { useIsForegroundGetter } from '../lib/notifications/helpers';
import CustomSplashScreen from '../lib/components/SplashScreen';
import ErrorBoundary from '../lib/components/ErrorBoundary';
import { CustomMatchToast } from '../lib/components/CustomMatchToast';
import MatchAlertModal from '../lib/components/MatchAlertModal';
import * as Notifications from 'expo-notifications';
// import { AppStateSyncService } from '../lib/services/AppStateSyncService'; // DEPRECATED - Client handles notification display
import * as Linking from 'expo-linking';
// import * as Updates from 'expo-updates'; // Now handled by UpdateService
import { AppState, Platform } from 'react-native';

import { getSessionAndInstallationIds } from '../lib/session/sessionId';

// ===== Helpers to read current context =====

// ===== Update Service Integration =====
// Update checking is now handled by ../lib/updateService.ts
// which checks both App Store/Play Store versions AND OTA updates






// Legacy mapping functions removed - now handled by GlobalNotificationService

export default function RootLayout() {
  const router = useRouter();
  const [appIsReady, setAppIsReady] = useState(false);
  
  // Match alert modal state
  const [matchModalVisible, setMatchModalVisible] = useState(false);
  const [matchModalData, setMatchModalData] = useState<{
    partnerName: string;
    partnerImage?: string;
    partnerSessionId: string;
  } | null>(null);

  // 1) Provide getIsForeground to the router
  const getIsForeground = useIsForegroundGetter();

  // 2) Initialize NotificationRouter and Android channels when app is ready
  useEffect(() => {
    if (!appIsReady) return;
    
    console.log('_layout.tsx: Initializing notification system');
    
    // Initialize Android notification channels first
    import('../lib/notifications/AndroidChannels').then(async ({ AndroidChannels }) => {
      await AndroidChannels.initialize();
      
      // Run Android notification diagnostic after channel initialization
      if (Platform.OS === 'android') {
        import('../lib/notifications/AndroidNotificationDebugger').then(({ AndroidNotificationDebugger }) => {
          AndroidNotificationDebugger.runDiagnostic().catch(error => {
            console.warn('Failed to run Android notification diagnostic:', error);
          });
        });
      }
    }).catch(error => {
      console.warn('Failed to initialize Android channels:', error);
    });
    
    // Initialize local notification fallback service
    import('../lib/notifications/LocalNotificationFallback').then(({ LocalNotificationFallback }) => {
      LocalNotificationFallback.initialize();
    }).catch(error => {
      console.warn('Failed to initialize Local Notification Fallback:', error);
    });
    
    // Initialize NotificationRouter with modal trigger
    const showMatchModal = (partnerName: string, partnerSessionId: string, partnerImage?: string) => {
      console.log('🎯 Triggering match modal from NotificationRouter:', { partnerName, partnerSessionId });
      setMatchModalData({
        partnerName,
        partnerImage,
        partnerSessionId
      });
      setMatchModalVisible(true);
    };

    NotificationRouter.init({
      getIsForeground,
      navigateToMatches: () => router.push('/matches'),
      showMatchModal,
    });
    
    console.log('_layout.tsx: Notification system initialization complete');
  }, [appIsReady, getIsForeground, router]);

  // 2.4) Push notification received handler - Show in-app when foreground
  useEffect(() => {
    // Client-side deduplication cache with memory leak prevention
    const recentNotifications = new Set<string>();
    const MAX_CACHED_IDS = 100; // Prevent unbounded growth
    
    const sub = Notifications.addNotificationReceivedListener(async (notification) => {
      try {
        const data = notification.request.content.data as any;
        const isForeground = getIsForeground();
        
        // Enhanced deduplication check
        const notifId = data?.notificationId;
        if (notifId && recentNotifications.has(notifId)) {
          console.log('_layout.tsx: Duplicate notification blocked:', notifId);
          return; // Skip duplicate
        }
        
        if (notifId) {
          // Prevent unbounded growth by removing oldest entries
          if (recentNotifications.size >= MAX_CACHED_IDS) {
            const firstId = recentNotifications.values().next().value;
            if (firstId) {
              recentNotifications.delete(firstId);
            }
            console.log('_layout.tsx: Removed oldest notification ID to prevent memory leak');
          }
          
          recentNotifications.add(notifId);
          // Clean up after 10 seconds to prevent memory leaks
          setTimeout(() => recentNotifications.delete(notifId), 10000);
        }
        
        console.log('_layout.tsx: Notification received:', {
          isForeground,
          type: data?.type,
          source: data?.source,
          notificationId: notifId?.substring(0, 10) + '...'
        });

        // EMERGENCY DEBUG: Log full notification data for debugging
        console.log('🔔 FULL NOTIFICATION DEBUG:', {
          isForeground,
          type: data?.type,
          hasPartnerName: !!data?.partnerName,
          hasPartnerSessionId: !!data?.partnerSessionId,
          partnerName: data?.partnerName,
          partnerSessionId: data?.partnerSessionId?.substring(0, 10) + '...',
          allDataKeys: Object.keys(data || {}),
          willShowModal: isForeground && data?.type === 'match'
        });
        
        // CLIENT-SIDE DECISION: Show in-app notification if foreground
        if (isForeground && data?.source !== 'local_fallback') {
          // Show in-app alert for foreground notifications
          if (data?.type === 'match') {
            console.log('🎯 MATCH NOTIFICATION - Setting modal data:', {
              partnerName: data.partnerName || 'Your match',
              partnerSessionId: data.partnerSessionId || '',
              hasPartnerImage: !!data.partnerImage
            });
            
            // Show custom match alert modal instead of toast
            setMatchModalData({
              partnerName: data.partnerName || 'Your match',
              partnerImage: data.partnerImage, // If available in notification data
              partnerSessionId: data.partnerSessionId || ''
            });
            setMatchModalVisible(true);
            
            console.log('🎯 MATCH MODAL - State updated, visible should be true');
          } else if (data?.type === 'message') {
            Toast.show({
              type: 'info',
              text1: notification.request.content.title || 'New Message',
              text2: notification.request.content.body || 'You have a new message!',
              position: 'top',
              visibilityTime: 4000,
              onPress: () => {
                if (data?.conversationId && data?.partnerSessionId) {
                  router.push({
                    pathname: '/chat',
                    params: {
                      matchId: data.partnerSessionId,
                      matchName: data.partnerName || 'Your conversation'
                    }
                  });
                } else {
                  router.push('/matches');
                }
              }
            });
          }
        }
        
        // Cancel any local fallbacks if this is a real push
        if (data?.source !== 'local_fallback' && data?.id) {
          const { LocalNotificationFallback } = await import('../lib/notifications/LocalNotificationFallback');
          await LocalNotificationFallback.cancelLocalFallback(data.id, data.type);
        }
      } catch (error) {
        console.error('_layout.tsx: Error handling received notification:', error);
        console.error('Notification received handler error:', error);
        // Continue app execution - don't crash
      }
    });

    return () => {
      sub.remove();
    };
  }, [getIsForeground, router]);

  // Match modal handlers
  const handleStartChatting = () => {
    if (matchModalData?.partnerSessionId) {
      router.push({
        pathname: '/chat',
        params: {
          matchId: matchModalData.partnerSessionId,
          matchName: matchModalData.partnerName
        }
      });
    } else {
      router.push('/matches');
    }
  };

  const handleCloseMatchModal = () => {
    setMatchModalVisible(false);
    setMatchModalData(null);
  };

  // 2.5) Push notification tap handler with analytics
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      try {
        const data = (response?.notification?.request?.content?.data || {}) as any;
        
        // Track notification interaction analytics
        console.log('Notification tapped:', { type: data?.type, notificationId: data?.notificationId?.substring(0, 10) + '...' });
        
        console.log('_layout.tsx: Notification tapped:', {
          type: data?.type,
          notificationId: data?.notificationId?.substring(0, 10) + '...'
        });
        
        if (data?.type === 'match') {
          // Route to specific chat with the matched user if we have their session ID
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
        console.error('_layout.tsx: Error handling notification tap:', e);
        console.error('Notification tap handler error:', e);
        // Continue app execution - don't crash
        // Fallback to matches page on error
        try {
          router.push('/matches');
        } catch (navError) {
          console.error('_layout.tsx: Failed to navigate to fallback:', navError);
        }
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
        console.error('Deep link error:', error);
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
          // CRITICAL: Suppress ALL system notifications when in foreground
          if (isForeground) {
            console.log('_layout.tsx: Suppressing foreground notification for type:', data?.type);
            return {
              shouldPlaySound: false,      // Disable sound - toast will handle
              shouldSetBadge: false,       // Disable badge in foreground - toast will handle  
              shouldShowBanner: false,     // Disable banner - toast will handle
              shouldShowList: false,       // Disable notification list - toast will handle
            };
          }
          
          // Background: Allow all system notifications
          return {
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          };
        },
      });
    }
  }, [getIsForeground]);

  // 2.6) CRITICAL: Handle notification tap when app was killed
  useEffect(() => {
    if (!appIsReady) return;
    
    // Check if app was opened by tapping a notification while killed
    const checkInitialNotification = async () => {
      try {
        const lastNotificationResponse = await Notifications.getLastNotificationResponseAsync();
        
        if (lastNotificationResponse) {
          const data = lastNotificationResponse.notification.request.content.data as any;
          
          console.log('_layout.tsx: App opened from killed state by notification:', {
            type: data?.type,
            notificationId: data?.notificationId?.substring(0, 10) + '...'
          });
          
          console.log('App opened from killed state by notification:', { type: data?.type, notificationId: data?.notificationId?.substring(0, 10) + '...' });
          
          // CRITICAL: Wait for navigation to be ready before navigating
          // Navigation might not be initialized immediately from killed state
          setTimeout(() => {
            try {
              if (data?.type === 'match') {
                if (data?.partnerSessionId) {
                  router.push({
                    pathname: '/chat',
                    params: {
                      matchId: data.partnerSessionId,
                      matchName: data.partnerName || 'Your match'
                    }
                  });
                } else {
                  router.push('/matches');
                }
              } else if (data?.type === 'message') {
                if (data?.partnerSessionId) {
                  router.push({
                    pathname: '/chat',
                    params: {
                      matchId: data.partnerSessionId,
                      matchName: data.partnerName || 'Your match'
                    }
                  });
                } else {
                  router.push('/matches');
                }
              }
            } catch (navError) {
              console.warn('_layout.tsx: Navigation error from killed state notification:', navError);
              // Fallback to matches page
              router.push('/matches');
            }
          }, 1500); // Give navigation 1.5 seconds to initialize
        }
        
      } catch (error) {
        console.error('_layout.tsx: Error checking initial notification:', error);
        console.error('Initial notification check error:', error);
        // Continue app initialization - don't crash
      }
    };
    
    checkInitialNotification();
  }, [appIsReady, router]);

  // 3) App initialization using the robust AppInitializationService
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('_layout.tsx: Starting app initialization with AppInitializationService');
        
        // Use the robust initialization service with retry logic
        const { AppInitializationService } = await import('../lib/services/AppInitializationService');
        const initSuccess = await AppInitializationService.initializeApp(1); // 1 retry attempt for faster startup
        
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
          console.error('App initialization failed after all retries');
        }
        
        // Check for updates after app initialization (both store and OTA)
        try {
          const { default: UpdateService } = await import('../lib/updateService');
          await UpdateService.checkForUpdates();
        } catch (updateError) {
          console.warn('_layout.tsx: Update check failed:', updateError);
        }
        
        setAppIsReady(true);
        
      } catch (error) {
        console.error('_layout.tsx: Critical app initialization error:', error);
        console.error('Critical app initialization error:', error);
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
        
        console.log('App initialization with session IDs:', { 
          sessionId: sessionId.substring(0, 8) + '...',
          installationId: installationId.substring(0, 8) + '...'
        });
        
        // Push token registration is now handled in AppInitializationService
        // to ensure it happens before notification services are initialized
        
        // DEPRECATED: App state sync no longer needed - client handles notification display
        // await AppStateSyncService.startAppStateSync(sessionId);
        
      } catch (error) {
        console.error('Session initialization error:', error);
      }
    })();
    return () => { 
      cancelled = true; 
      // AppStateSyncService.stopAppStateSync(); // DEPRECATED
    };
  }, [appIsReady]);

  // 3.7) Check for updates when app resumes from background
  useEffect(() => {
    if (!appIsReady) return;

    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        // Check for updates when app becomes active (resumed from background)
        import('../lib/updateService').then(({ default: UpdateService }) => {
          return UpdateService.checkForUpdates();
        }).catch(error => {
          console.warn('_layout.tsx: Background update check failed:', error);
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
        }}
        />
        
        {/* Match Alert Modal */}
        <MatchAlertModal
          visible={matchModalVisible}
          partnerName={matchModalData?.partnerName || ''}
          partnerImage={matchModalData?.partnerImage}
          onStartChatting={handleStartChatting}
          onClose={handleCloseMatchModal}
        />
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}