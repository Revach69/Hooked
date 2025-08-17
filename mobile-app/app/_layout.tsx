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
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { NotificationProvider } from '../lib/contexts/NotificationContext';
import { NotificationRouter, setCurrentSessionIdForDedup } from '../lib/notifications/NotificationRouter';
import { useIsForegroundGetter } from '../lib/notifications/helpers';
import CustomSplashScreen from '../lib/components/SplashScreen';
import ErrorBoundary from '../lib/components/ErrorBoundary';
import { CustomMatchToast } from '../lib/components/CustomMatchToast';
import * as Notifications from 'expo-notifications';
import { registerPushToken } from '../lib/notifications/registerPushToken';
import { initializeNotificationChannels } from '../lib/notificationService';
import { FirebaseNotificationService } from '../lib/services/FirebaseNotificationService';
import { AppStateSyncService } from '../lib/services/AppStateSyncService';
import { initializeAppCheck } from '../lib/firebaseAppCheck';

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getFirestore, collection, query, where, orderBy, limit, onSnapshot
} from 'firebase/firestore';
import { getSessionAndInstallationIds } from '../lib/session/sessionId';

// Types
import type { MatchEvent, MessageEvent } from '../lib/notifications/types';

// ===== Helpers to read current context =====
// Improved session ID parsing with better error handling
function parseStoredValue(rawValue: string | null): string | null {
  if (!rawValue) return null;
  
  try {
    // Try to parse as JSON first
    const parsed = JSON.parse(rawValue);
    
    // Handle different storage formats
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed.value || parsed.sessionId || null;
    } else if (typeof parsed === 'string') {
      return parsed;
    }
    
    return null;
  } catch {
    // If JSON parsing fails, treat as plain string
    return typeof rawValue === 'string' && rawValue.trim() ? rawValue.trim() : null;
  }
}

export async function getCurrentSessionId(): Promise<string | null> {
  try {
    const sessionIdData = await AsyncStorage.getItem('currentSessionId');
    
    const sessionId = parseStoredValue(sessionIdData);
    return sessionId;
  } catch (error) { 
    Sentry.captureException(error, {
        tags: {
          operation: 'firebase_operation',
          source: 'unknown'
        }
      });
    return null; 
  }
}

// Synchronous version for router (will be updated by state)
// let currentSessionIdSync: string | null = null;

// Global function to retry profile ID lookup (can be called from other screens)
export const retryGetProfileId = async () => {
  const profileId = await getMyProfileId();
  return profileId;
};

async function getCurrentEventId(): Promise<string | null> {
  try {
    const eventIdData = await AsyncStorage.getItem('currentEventId');
    
    const eventId = parseStoredValue(eventIdData);
    return eventId;
  } catch (error) { 
    Sentry.captureException(error, {
        tags: {
          operation: 'firebase_operation',
          source: 'unknown'
        }
      });
    return null; 
  }
}

async function getMyProfileId(): Promise<string | null> {
  try {
    // Get current session and event IDs
    const { getOrCreateSessionId } = await import('../lib/session/sessionId');
    const [sessionId, eventId] = await Promise.all([
      getOrCreateSessionId(),
      getCurrentEventId()
    ]);
    
    if (!sessionId || !eventId) return null;
    
    // Query for the user's profile using session_id and event_id
    const { EventProfileAPI } = await import('../lib/firebaseApi');
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Profile lookup timeout')), 10000); // 10 second timeout
    });
    
    const profilePromise = EventProfileAPI.filter({
      session_id: sessionId,
      event_id: eventId
    });
    
    const userProfiles = await Promise.race([profilePromise, timeoutPromise]);
    
    const profileId = userProfiles.length > 0 ? userProfiles[0].id : null;
    return profileId;
  } catch (error) { 
    Sentry.captureException(error, {
        tags: {
          operation: 'firebase_operation',
          source: 'unknown'
        }
      });
    return null; 
  }
}

// Map Firestore Like doc -> MatchEvent (only for change.type === 'added')
async function mapLikeToMatchEvent(
  docData: any,
  mySession: string,
  docId: string
): Promise<MatchEvent | null> {
  const d = docData;
  
  if (!d?.event_id || !d?.is_mutual) {
    return null;
  }

  // Add debugging
  console.log('mapLikeToMatchEvent:', {
    mySession,
    liker_session_id: d.liker_session_id,
    liked_session_id: d.liked_session_id,
    is_mutual: d.is_mutual
  });

  // The liker_session_id is the person who just liked (second liker = creator)
  // The liked_session_id is the person who was liked first (first liker = recipient)
  const isCreator = d.liker_session_id === mySession; // I am the one who just liked
  const iAmFirstLiker = d.liked_session_id === mySession; // I am the one who was liked first

  console.log('Match logic:', { isCreator, iAmFirstLiker, mySession });

  if (!isCreator && !iAmFirstLiker) {
    console.log('Not for me - skipping');
    return null; // not for me
  }

  const otherSessionId = isCreator ? d.liked_session_id : d.liker_session_id;

  // Fetch other user's name
  let otherName: string | undefined;
  try {
    const { EventProfileAPI } = await import('../lib/firebaseApi');
    const otherProfiles = await EventProfileAPI.filter({
      session_id: otherSessionId,
      event_id: d.event_id
    });
    if (otherProfiles.length > 0) {
      otherName = otherProfiles[0].first_name || (otherProfiles[0] as any).name;
    }
  } catch (error) {
    console.warn('Failed to fetch other user name for match notification:', error);
  }

  const event = {
    id: docId,
    type: 'match' as const,
    createdAt: d.created_at?.seconds ? d.created_at.seconds * 1000 : Date.now(),
    isCreator,
    otherSessionId,
    otherName,
  };
  
  console.log('Created match event:', event);
  return event;
}

// Map Firestore Message doc -> MessageEvent (recipient only)
async function mapMessageToEvent(
  docData: any,
  myProfileId: string,
  docId: string
): Promise<MessageEvent | null> {
  const d = docData;
  
  if (!d?.event_id) {
    return null;
  }
  if (d.to_profile_id !== myProfileId) {
    return null;
  }
  if (d.from_profile_id === myProfileId) {
    return null; // don't notify sender
  }

  // Get sender's session ID and name for mute checks and display
  let senderSessionId: string | undefined;
  let senderName = d.sender_name;
  
  try {
    const { EventProfileAPI } = await import('../lib/firebaseApi');
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Sender profile lookup timeout')), 10000); // 10 second timeout
    });
    
    const profilePromise = EventProfileAPI.get(d.from_profile_id);
    const senderProfile = await Promise.race([profilePromise, timeoutPromise]);
    
    // If sender profile doesn't exist (deleted), don't show notification
    if (!senderProfile) {
      console.log('mapMessageToEvent: sender profile not found (deleted), skipping notification');
      return null;
    }
    
    senderSessionId = senderProfile.session_id;
    
    console.log('mapMessageToEvent: sender profile lookup result:', {
      fromProfileId: d.from_profile_id,
      senderSessionId,
      senderName: senderProfile?.first_name
    });
    
    // If sender_name is missing from message, get it from profile
    if (!senderName && senderProfile?.first_name) {
      senderName = senderProfile.first_name;
    }
  } catch (error) {
    console.warn('mapMessageToEvent: error looking up sender profile:', error);
    // If we can't look up the sender profile, don't show notification
    return null;
  }

  const event = {
    id: docId,
    type: 'message' as const,
    createdAt: Date.parse(d.created_at ?? new Date().toISOString()),
    senderProfileId: d.from_profile_id,
    senderSessionId,
    senderName: senderName || 'Someone',
    conversationId: d.to_profile_id, // or a composed id if you use one
    preview: d.content?.slice?.(0, 80),
  };
  
  return event;
}

export default function RootLayout() {
  const router = useRouter();
  const [appIsReady, setAppIsReady] = useState(false);

  // 1) Provide getIsForeground to the router
  const getIsForeground = useIsForegroundGetter();

  // 2) Initialize router once
  useEffect(() => {
    NotificationRouter.init({
      getIsForeground,
      navigateToMatches: () => router.push('/matches'),
    });
  }, [getIsForeground, router]);


  // 2.5) Push notification tap handler
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      try {
        const data = (response?.notification?.request?.content?.data || {}) as any;
        if (data?.type === 'match') {
          router.push('/matches');
        } else if (data?.type === 'message') {
          router.push('/chat');
        }
      } catch (e) {
        Sentry.captureException(e);
      }
    });
    return () => sub.remove();
  }, [router]);





  // 2.6) Foreground notification policy - prevent duplicate notifications on iOS
  useEffect(() => {
    if (!(Notifications as any).__hookedHandlerSet) {
      (Notifications as any).__hookedHandlerSet = true;
      Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
          // For iOS, don't show banner/sound when app is in foreground to prevent duplicates
          // The custom toast system will handle foreground notifications
          const isIOS = Platform.OS === 'ios';
          
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

  // 3) App initialization
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Add a delay to ensure JS thread is ready (especially for iOS devices)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Initialize Firebase native config first
        await import('../lib/firebaseNativeConfig');
        
        // Initialize Firebase connection monitoring
        const { initializeConnectionMonitoring } = await import('../lib/firebaseConfig');
        initializeConnectionMonitoring();
        
        // Initialize Firebase App Check (required for callable functions)
        await initializeAppCheck();
        
        // Initialize Firebase Auth (sign in anonymously)
        const { AuthService } = await import('../lib/services/AuthService');
        await AuthService.initialize();
        
        // Initialize notification channels for Android
        await initializeNotificationChannels();
        
        // Request notification permissions early on iOS physical devices
        if (Platform.OS === 'ios') {
          try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            if (existingStatus !== 'granted') {
              await Notifications.requestPermissionsAsync();
            }
          } catch (permError) {
            console.warn('Failed to request notification permissions:', permError);
          }
        }
        
        // Initialize Firebase notification service
        await FirebaseNotificationService.initialize();
        
        // Additional delay to ensure everything is properly initialized on physical devices
        await new Promise(resolve => setTimeout(resolve, 1500));
        setAppIsReady(true);
      } catch (error) {
        Sentry.captureException(error, {
        tags: {
          operation: 'firebase_operation',
          source: 'unknown'
        }
      });
        setAppIsReady(true); // Still set ready to prevent infinite loading
      }
    };

    initializeApp();
  }, []);

  // 3.5) Register push token and start app state sync when session is available
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
        
        // Register push token
        console.log('About to register push token for session:', sessionId.substring(0, 8) + '...');
        const success = await registerPushToken(sessionId);
        
        if (!success) {
          console.error('Push token registration failed for session:', sessionId.substring(0, 8) + '...');
          Sentry.addBreadcrumb({
            message: 'Push token registration failed',
            level: 'warning'
          });
        } else {
          console.log('Push token registration successful for session:', sessionId.substring(0, 8) + '...');
        }
        
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

  // 4) Single subscription
  useEffect(() => {
    if (!appIsReady) return; // Wait for app to be ready

    let unsubLikes: (() => void) | undefined;
    let unsubMsgs: (() => void) | undefined;
    let cancelled = false;
    let retryCount = 0;
    const maxRetries = 5;

    const setupListeners = async () => {
      const { getOrCreateSessionId } = await import('../lib/session/sessionId');
      const [sessionId, eventId, myProfileId] = await Promise.all([
        getOrCreateSessionId(), getCurrentEventId(), getMyProfileId()
      ]);
      
      if (cancelled) return;
      
      if (!sessionId || !eventId) {
        return;
      }
      
      // Set session ID for notification deduplication
      setCurrentSessionIdForDedup(sessionId);
      
      if (!myProfileId) {
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(setupListeners, 2000); // Retry in 2 seconds
          return;
        }
      }

      // Update sync version for router
      // currentSessionIdSync = sessionId;

      const db = getFirestore();

      // ---- Likes (mutual) — ONLY 'added' changes ----
      {
        const likesRef = collection(db, 'likes');
        // Two queries to emulate OR:
        const qLikesILiked = query(
          likesRef,
          where('event_id', '==', eventId),
          where('is_mutual', '==', true),
          where('liker_session_id', '==', sessionId),
          orderBy('created_at', 'desc'),
          limit(50)
        );
        const qLikesILikedMe = query(
          likesRef,
          where('event_id', '==', eventId),
          where('is_mutual', '==', true),
          where('liked_session_id', '==', sessionId),
          orderBy('created_at', 'desc'),
          limit(50)
        );

        const handleLikeSnap = (snap: any) => {
          console.log('handleLikeSnap called with', snap.docChanges().length, 'changes');
          snap.docChanges().forEach(async (change: any) => {
            console.log('Processing change:', { type: change.type, docId: change.doc.id });
            if (change.type !== 'added') {
              console.log('Skipping non-added change');
              return; // critical: only new like docs == second liker action
            }
            
            // Only process matches that are very recent (within last 30 seconds)
            // This prevents showing notifications for old matches when app reloads
            const likeData = change.doc.data();
            const matchTime = likeData.created_at?.toDate?.() || new Date(likeData.created_at?.seconds * 1000 || Date.now());
            const now = new Date();
            const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);
            
            if (matchTime < thirtySecondsAgo) {
              console.log('Skipping old match for notification:', {
                matchId: change.doc.id,
                matchTime: matchTime.toISOString(),
                threshold: thirtySecondsAgo.toISOString()
              });
              return; // Skip old matches
            }
            
            console.log('Processing recent like document:', change.doc.data());
            const ev = await mapLikeToMatchEvent(change.doc.data(), sessionId, change.doc.id);
            if (ev) {
              console.log('Created match event, calling NotificationRouter');
              Sentry.addBreadcrumb({
                message: 'Firebase listener detected new match event',
                level: 'info',
                category: 'notification',
                data: {
                  eventId: ev.id,
                  isCreator: ev.isCreator,
                  otherSessionId: ev.otherSessionId
                }
              });
              NotificationRouter.handleIncoming(ev);
            } else {
              console.log('No match event created from like document');
            }
          });
        };

        const u1 = onSnapshot(qLikesILiked, handleLikeSnap, (error) => {
          // Handle index error gracefully
          if (error.code === 'failed-precondition') {
            Sentry.addBreadcrumb({
              message: 'Firestore index not ready for likes query',
              level: 'warning',
              data: { error: error.message }
            });
          } else {
            Sentry.captureException(error, {
              tags: {
                operation: 'firestore_listener',
                source: 'likes_query'
              }
            });
          }
        });
        const u2 = onSnapshot(qLikesILikedMe, handleLikeSnap, (error) => {
          // Handle index error gracefully
          if (error.code === 'failed-precondition') {
            Sentry.addBreadcrumb({
              message: 'Firestore index not ready for likes query',
              level: 'warning',
              data: { error: error.message }
            });
          } else {
            Sentry.captureException(error, {
              tags: {
                operation: 'firestore_listener',
                source: 'likes_query'
              }
            });
          }
        });
        unsubLikes = () => { u1(); u2(); };
      }

      // ---- Messages — recipient only, 'added' ----
      if (myProfileId) {
        const msgsRef = collection(db, 'messages');
        const qMsgs = query(
          msgsRef,
          where('event_id', '==', eventId),
          where('to_profile_id', '==', myProfileId),
          orderBy('created_at', 'desc'),
          limit(50)
        );

        unsubMsgs = onSnapshot(qMsgs, (snap) => {
          snap.docChanges().forEach(async (change: any) => {
            if (change.type !== 'added') return;
            
            // Only process messages that are very recent (within last 30 seconds)
            // This prevents showing toasts for old messages when app reloads
            const messageData = change.doc.data();
            const messageTime = messageData.created_at?.toDate?.() || new Date(messageData.created_at);
            const now = new Date();
            const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);
            
            if (messageTime < thirtySecondsAgo) {
              console.log('Skipping old message for toast notification:', {
                messageId: change.doc.id,
                messageTime: messageTime.toISOString(),
                threshold: thirtySecondsAgo.toISOString()
              });
              return; // Skip old messages
            }
            
            const ev = await mapMessageToEvent(change.doc.data(), myProfileId, change.doc.id);
            if (ev) {
              Sentry.addBreadcrumb({
                message: 'Firebase listener detected new message event',
                level: 'info',
                category: 'notification',
                data: {
                  eventId: ev.id,
                  senderName: ev.senderName,
                  senderSessionId: ev.senderSessionId,
                  preview: ev.preview?.substring(0, 20) + (ev.preview && ev.preview.length > 20 ? '...' : '')
                }
              });
              NotificationRouter.handleIncoming(ev);
            }
          });
        }, (error) => {
          // Handle index error gracefully
          if (error.code === 'failed-precondition') {
            Sentry.addBreadcrumb({
              message: 'Firestore index not ready for messages query',
              level: 'warning',
              data: { error: error.message }
            });
          } else {
            Sentry.captureException(error, {
              tags: {
                operation: 'firestore_listener',
                source: 'messages_query'
              }
            });
          }
        });
      }
    };

    setupListeners();

    return () => {
      cancelled = true;
      if (unsubLikes) unsubLikes();
      if (unsubMsgs) unsubMsgs();
    };
  }, [appIsReady]);

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
        <NotificationProvider>
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
        </NotificationProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}