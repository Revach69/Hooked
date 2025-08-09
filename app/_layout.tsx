import { Stack } from 'expo-router';
import { useColorScheme, View, Text, AppState, TouchableOpacity, Platform } from 'react-native';
import { useEffect, useState, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';
import CustomSplashScreen from '../lib/components/SplashScreen';
import ErrorBoundary from '../lib/components/ErrorBoundary';
import { initSentry } from '../lib/sentryConfig';
import { Heart, MessageCircle } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkPendingMessageNotifications, updateUserActivity } from '../lib/messageNotificationHelper';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebaseConfig';
import { initializeNotificationChannels } from '../lib/notificationService';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [appIsReady, setAppIsReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const notificationSubscriptionRef = useRef<any>(null);
  const isInitialized = useRef(false);
  const [currentEvent, setCurrentEvent] = useState<any>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);

  // Platform-specific toast configuration
  const toastConfig = Platform.OS === 'ios' ? {
    // iOS-specific toast config
    success: ({ text1, text2, onPress }: any) => (
      <TouchableOpacity 
        style={{
          backgroundColor: isDark ? '#1f2937' : '#ffffff',
          borderWidth: 1,
          borderColor: isDark ? '#374151' : '#e5e7eb',
          borderRadius: 12,
          padding: 16,
          marginHorizontal: 16,
          marginTop: 60,
          flexDirection: 'row',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 0,
          zIndex: 9999,
        }}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Heart size={24} color="#ef4444" style={{ marginRight: 12 }} />
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: isDark ? '#ffffff' : '#1f2937',
            marginBottom: 4,
          }}>
            {text1}
          </Text>
          {text2 && (
            <Text style={{
              fontSize: 16,
              color: isDark ? '#9ca3af' : '#6b7280',
              lineHeight: 22,
            }}>
              {text2}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    ),
    error: ({ text1, text2, onPress }: any) => (
      <TouchableOpacity 
        style={{
          backgroundColor: isDark ? '#1f2937' : '#ffffff',
          borderWidth: 1,
          borderColor: isDark ? '#374151' : '#e5e7eb',
          borderRadius: 12,
          padding: 16,
          marginHorizontal: 16,
          marginTop: 60,
          flexDirection: 'row',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 0,
          zIndex: 9999,
        }}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Heart size={24} color="#ef4444" style={{ marginRight: 12 }} />
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: isDark ? '#ffffff' : '#1f2937',
            marginBottom: 4,
          }}>
            {text1}
          </Text>
          {text2 && (
            <Text style={{
              fontSize: 16,
              color: isDark ? '#9ca3af' : '#6b7280',
              lineHeight: 22,
            }}>
              {text2}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    ),
    info: ({ text1, text2, onPress }: any) => (
      <TouchableOpacity 
        style={{
          backgroundColor: isDark ? '#1f2937' : '#ffffff',
          borderWidth: 1,
          borderColor: isDark ? '#374151' : '#e5e7eb',
          borderRadius: 12,
          padding: 16,
          marginHorizontal: 16,
          marginTop: 60,
          flexDirection: 'row',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 0,
          zIndex: 9999,
        }}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <MessageCircle size={24} color="#3b82f6" style={{ marginRight: 12 }} />
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: isDark ? '#ffffff' : '#1f2937',
            marginBottom: 4,
          }}>
            {text1}
          </Text>
          {text2 && (
            <Text style={{
              fontSize: 16,
              color: isDark ? '#9ca3af' : '#6b7280',
              lineHeight: 22,
            }}>
              {text2}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    ),
  } : {
    // Android-specific toast config
    success: ({ text1, text2, onPress }: any) => (
      <TouchableOpacity 
        style={{
          backgroundColor: isDark ? '#1f2937' : '#ffffff',
          borderWidth: 1,
          borderColor: isDark ? '#374151' : '#e5e7eb',
          borderRadius: 12,
          padding: 16,
          marginHorizontal: 16,
          marginTop: 40,
          flexDirection: 'row',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 8,
          zIndex: 9999,
        }}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Heart size={24} color="#ef4444" style={{ marginRight: 12 }} />
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: isDark ? '#ffffff' : '#1f2937',
            marginBottom: 4,
          }}>
            {text1}
          </Text>
          {text2 && (
            <Text style={{
              fontSize: 16,
              color: isDark ? '#9ca3af' : '#6b7280',
              lineHeight: 22,
            }}>
              {text2}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    ),
    error: ({ text1, text2, onPress }: any) => (
      <TouchableOpacity 
        style={{
          backgroundColor: isDark ? '#1f2937' : '#ffffff',
          borderWidth: 1,
          borderColor: isDark ? '#374151' : '#e5e7eb',
          borderRadius: 12,
          padding: 16,
          marginHorizontal: 16,
          marginTop: 40,
          flexDirection: 'row',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 8,
          zIndex: 9999,
        }}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Heart size={24} color="#ef4444" style={{ marginRight: 12 }} />
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: isDark ? '#ffffff' : '#1f2937',
            marginBottom: 4,
          }}>
            {text1}
          </Text>
          {text2 && (
            <Text style={{
              fontSize: 16,
              color: isDark ? '#9ca3af' : '#6b7280',
              lineHeight: 22,
            }}>
              {text2}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    ),
    info: ({ text1, text2, onPress }: any) => (
      <TouchableOpacity 
        style={{
          backgroundColor: isDark ? '#1f2937' : '#ffffff',
          borderWidth: 1,
          borderColor: isDark ? '#374151' : '#e5e7eb',
          borderRadius: 12,
          padding: 16,
          marginHorizontal: 16,
          marginTop: 40,
          flexDirection: 'row',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 8,
          zIndex: 9999,
        }}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <MessageCircle size={24} color="#3b82f6" style={{ marginRight: 12 }} />
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: isDark ? '#ffffff' : '#1f2937',
            marginBottom: 4,
          }}>
            {text1}
          </Text>
          {text2 && (
            <Text style={{
              fontSize: 16,
              color: isDark ? '#9ca3af' : '#6b7280',
              lineHeight: 22,
            }}>
              {text2}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    ),
  };

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;
    
    let isMounted = true;
    
    async function prepare() {
      try {
        // Initialize Sentry first
        initSentry();
        
        // Request notification permissions with proper iOS configuration
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        // Always request permission if not granted
        if (existingStatus !== 'granted') {
          try {
            console.log('Requesting notification permissions...');
            const { status } = await Notifications.requestPermissionsAsync({
              ios: {
                allowAlert: true,
                allowBadge: true,
                allowSound: true,
                allowCriticalAlerts: false,
              },
              android: {
                allowAlert: true,
                allowBadge: true,
                allowSound: true,
              }
            });
            finalStatus = status;
            console.log('Notification permission request result:', status);
    
          } catch (error) {
            // Error requesting notification permission
            console.log('Error requesting notification permission:', error);
          }
        } else {
          console.log('Notification permissions already granted');
        }
        
        if (finalStatus !== 'granted') {
          // Notification permission not granted - this is expected for some users
          console.log('Notification permission not granted - user may have denied or not yet decided');
        } else {
          // Notification permission granted
          console.log('Notification permission granted successfully');
        }
        
        // Enhanced notification handler setup
        Notifications.setNotificationHandler({
          handleNotification: async (notification) => {
            return {
              shouldPlaySound: true,
              shouldSetBadge: false,
              shouldShowBanner: true,
              shouldShowList: true,
            };
          },
        });

        // Initialize Android notification channels
        await initializeNotificationChannels();

        // Register for push notifications and get token
        try {
          const token = await Notifications.getExpoPushTokenAsync({
            projectId: '7a1de260-e3cb-4cbb-863c-1557213d69f0', // Your Expo project ID
          });
          
          // Store the token when we have a session
          const currentSessionId = await AsyncStorage.getItem('currentSessionId');
          if (currentSessionId && token.data) {
            const { storePushToken } = await import('../lib/notificationService');
            await storePushToken(currentSessionId, token.data);
          }
        } catch (error) {
          // Error registering for push notifications
        }

        // Handle notification response with minimal processing
        notificationSubscriptionRef.current = Notifications.addNotificationResponseReceivedListener((response) => {
          if (!isMounted) return;
          
          try {
            const data = response.notification.request.content.data as any;
            const { type } = data;
            
            if (type === 'match') {
              // Navigate to matches page for match notifications
              setTimeout(() => {
                if (isMounted) {
                  router.push('/matches');
                }
              }, 1000);
            } else if (type === 'message') {
              // Navigate to matches page for message notifications
              setTimeout(() => {
                if (isMounted) {
                  router.push('/matches');
                }
              }, 1000);
            }
          } catch (error) {
            // Error processing notification response
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
        // Error during app preparation
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
          // Error removing notification subscription
        }
      }
    };
  }, []);

  // Handle app state changes for message notifications
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === 'active') {
        // App became active - check for pending notifications
        try {
          await checkPendingMessageNotifications();
          
          // Update user activity
          const currentSessionId = await AsyncStorage.getItem('currentSessionId');
          if (currentSessionId) {
            await updateUserActivity(currentSessionId);
          }
        } catch (error) {
          // Error handling app state change
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  // Load user data for global message listener
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const [sessionId, eventId] = await Promise.all([
          AsyncStorage.getItem('currentSessionId'),
          AsyncStorage.getItem('currentEventId')
        ]);
        
    
        
        setCurrentSessionId(sessionId);
        
        if (eventId) {
          // The eventId is stored as a simple string, not JSON
          setCurrentEvent({ id: eventId });
  
        }
      } catch (error) {
        // Error loading user data for global message listener
      }
    };
    
    loadUserData();
  }, []);

  // Load user profile when event data is available
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!currentSessionId || !currentEvent?.id) return;
      
      try {

        const { EventProfileAPI } = await import('../lib/firebaseApi');
        const userProfiles = await EventProfileAPI.filter({
          session_id: currentSessionId,
          event_id: currentEvent.id
        });
        
        if (userProfiles.length > 0) {
          setCurrentUserProfile(userProfiles[0]);

        } else {

        }
      } catch (error) {
        // Error loading user profile
      }
    };
    
    loadUserProfile();
  }, [currentSessionId, currentEvent?.id]);

  // Global message listener for real-time notifications
  useEffect(() => {
    if (!currentEvent?.id || !currentUserProfile?.id) return;

    const setupMessageListener = async () => {
      try {
        const { onSnapshot, collection, query, where, orderBy, limit } = await import('firebase/firestore');
        const { db } = await import('../lib/firebaseConfig');
        const { showInAppMessageToast } = await import('../lib/messageNotificationHelper');

        const messagesQuery = query(
          collection(db, 'messages'),
          where('event_id', '==', currentEvent.id),
          where('to_profile_id', '==', currentUserProfile.id),
          where('seen', '==', false),
          orderBy('created_at', 'desc'),
          limit(10)
        );

        const unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
          if (snapshot.docs.length > 0) {
            // Check if any messages are recent (within last 5 minutes)
            const recentMessages = snapshot.docs.filter(doc => {
              const messageData = doc.data();
              const messageTime = new Date(messageData.created_at).getTime();
              const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
              return messageTime > fiveMinutesAgo;
            });

            if (recentMessages.length > 0) {
              const latestMessage = recentMessages[0];
              const messageData = latestMessage.data();
              
              // Get sender profile
              const { EventProfileAPI } = await import('../lib/firebaseApi');
              const senderProfiles = await EventProfileAPI.filter({
                event_id: currentEvent.id,
                id: messageData.from_profile_id
              });

              if (senderProfiles.length > 0) {
                const senderProfile = senderProfiles[0];
                // Show toast notification for new message
                showInAppMessageToast(senderProfile.first_name, senderProfile.session_id);
              }
            }
          }
        });

        return unsubscribe;
      } catch (error) {
        // Error setting up global message listener
        console.error('Error setting up message listener:', error);
      }
    };

    const unsubscribe = setupMessageListener();
    return () => {
      unsubscribe.then(unsub => unsub?.());
    };
  }, [currentEvent?.id, currentUserProfile?.id]);

  // Global match listener - works across all pages
  useEffect(() => {
    if (!currentEvent?.id || !currentSessionId) return;

    const setupMatchListener = async () => {
      try {
        const { onSnapshot, collection, query, where } = await import('firebase/firestore');
        const { db } = await import('../lib/firebaseConfig');
        const { showMatchNotification } = await import('../lib/matchAlertService');
        const { EventProfileAPI, LikeAPI } = await import('../lib/firebaseApi');

        // Mutual matches listener - for real-time match notifications
        const mutualMatchesQuery = query(
          collection(db, 'likes'),
          where('event_id', '==', currentEvent.id),
          where('is_mutual', '==', true)
        );

        const unsubscribe = onSnapshot(mutualMatchesQuery, async (snapshot) => {
          try {
            const mutualLikes = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            })) as any[];

            // Filter to only include matches where this user is involved
            const userMatches = mutualLikes.filter(like => 
              like.liker_session_id === currentSessionId || like.liked_session_id === currentSessionId
            );

            // Group matches by the pair of users to avoid duplicate processing
            const processedPairs = new Set<string>();

            // Check for new matches that haven't been notified yet
            for (const match of userMatches) {
              // Create a unique identifier for this user pair (always in same order)
              const userPair = [match.liker_session_id, match.liked_session_id].sort().join('_');
              
              // Skip if we've already processed this pair
              if (processedPairs.has(userPair)) {
                continue;
              }
              processedPairs.add(userPair);
              
              const isLiker = match.liker_session_id === currentSessionId;
              const shouldNotify = isLiker ? !match.liker_notified_of_match : !match.liked_notified_of_match;
              
              if (shouldNotify) {
                // Get the other person's profile
                const otherSessionId = isLiker ? match.liked_session_id : match.liker_session_id;
                const otherProfiles = await EventProfileAPI.filter({
                  session_id: otherSessionId,
                  event_id: currentEvent.id
                });
                
                if (otherProfiles.length > 0) {
                  const otherProfile = otherProfiles[0];
                  
                  // Find both like records for this mutual match to determine who liked first
                  const bothRecords = mutualLikes.filter(like => 
                    (like.liker_session_id === match.liker_session_id && like.liked_session_id === match.liked_session_id) ||
                    (like.liker_session_id === match.liked_session_id && like.liked_session_id === match.liker_session_id)
                  );
                  
                  // Find which record has the current user as the liker (they liked first)
                  const currentUserAsLiker = bothRecords.find(record => record.liker_session_id === currentSessionId);
                  
                  // Mark both records as notified to prevent duplicate processing
                  await Promise.all(bothRecords.map(record => 
                    LikeAPI.update(record.id, {
                      liker_notified_of_match: true,
                      liked_notified_of_match: true
                    })
                  ));
                  
                  // Show match notification using the global service
                  await showMatchNotification({
                    matchedUserName: otherProfile.first_name,
                    matchId: match.id,
                    isLiker: !!currentUserAsLiker,
                    currentEventId: currentEvent.id,
                    currentSessionId
                  });
                }
              }
            }
          } catch (error) {
            // Error in global match listener
            console.error('Error in global match listener:', error);
          }
        });

        return unsubscribe;
      } catch (error) {
        // Error setting up global match listener
        console.error('Error setting up global match listener:', error);
      }
    };

    const unsubscribe = setupMatchListener();
    return () => {
      unsubscribe.then(unsub => unsub?.());
    };
  }, [currentEvent?.id, currentSessionId]);

  if (!appIsReady) {
    return (
      <ErrorBoundary>
        <CustomSplashScreen progress={progress} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <View style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
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
        <Toast 
          config={toastConfig} 
          position="top"
          topOffset={Platform.OS === 'ios' ? 60 : 40}
          visibilityTime={Platform.OS === 'ios' ? 5000 : 4000}
          autoHide={true}
        />
      </View>
    </ErrorBoundary>
  );
} 