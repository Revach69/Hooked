import { Stack } from 'expo-router';
import { useColorScheme, View, Text, AppState, TouchableOpacity } from 'react-native';
import { useEffect, useState, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';
import CustomSplashScreen from '../lib/components/SplashScreen';
import ErrorBoundary from '../lib/components/ErrorBoundary';
import { SurveyNotificationService } from '../lib/surveyNotificationService';
import { initSentry } from '../lib/sentryConfig';
import { Heart } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkPendingMessageNotifications, updateUserActivity } from '../lib/messageNotificationHelper';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebaseConfig';

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

  // Custom toast configuration
  const toastConfig = {
    success: ({ text1, text2, onPress }: any) => (
      <View style={{
        backgroundColor: isDark ? '#1f2937' : '#ffffff',
        borderWidth: 1,
        borderColor: isDark ? '#374151' : '#e5e7eb',
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 16,
        marginTop: 50,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
      }}>
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
      </View>
    ),
    error: ({ text1, text2, onPress }: any) => (
      <View style={{
        backgroundColor: isDark ? '#1f2937' : '#ffffff',
        borderWidth: 1,
        borderColor: isDark ? '#374151' : '#e5e7eb',
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 16,
        marginTop: 50,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
      }}>
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
      </View>
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
            } else if (type === 'message') {
              // Navigate to matches page for message notifications
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
          console.error('Error handling app state change:', error);
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
        
        console.log('📱 Layout: Loading user data:', { sessionId, eventId });
        
        setCurrentSessionId(sessionId);
        
        if (eventId) {
          // The eventId is stored as a simple string, not JSON
          setCurrentEvent({ id: eventId });
          console.log('📱 Layout: Using eventId as string:', eventId);
        }
      } catch (error) {
        console.error('Error loading user data for global message listener:', error);
      }
    };
    
    loadUserData();
  }, []);

  // Load user profile when event data is available
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!currentSessionId || !currentEvent?.id) return;
      
      try {
        console.log('📱 Layout: Loading user profile for session:', currentSessionId, 'event:', currentEvent.id);
        const { EventProfileAPI } = await import('../lib/firebaseApi');
        const userProfiles = await EventProfileAPI.filter({
          session_id: currentSessionId,
          event_id: currentEvent.id
        });
        
        if (userProfiles.length > 0) {
          setCurrentUserProfile(userProfiles[0]);
          console.log('📱 Layout: User profile loaded:', userProfiles[0].first_name);
        } else {
          console.log('📱 Layout: No user profile found');
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    };
    
    loadUserProfile();
  }, [currentSessionId, currentEvent?.id]);

  // Global message listener for toast notifications
  useEffect(() => {
    console.log('📱 Layout: Global message listener useEffect triggered');
    console.log('📱 Layout: Dependencies:', { 
      currentEventId: currentEvent?.id, 
      currentSessionId, 
      currentUserProfileId: currentUserProfile?.id 
    });
    
    if (!currentEvent?.id || !currentSessionId || !currentUserProfile?.id) {
      console.log('📱 Layout: Missing dependencies, not setting up listener');
      return;
    }

    console.log('📱 Layout: Setting up global message listener');
    
    try {
      const messagesQuery = query(
        collection(db, 'messages'),
        where('event_id', '==', currentEvent.id),
        where('to_profile_id', '==', currentUserProfile.id)
      );

      console.log('📱 Layout: Created query for messages to profile:', currentUserProfile.id);

      const unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
        try {
          console.log('📱 Layout: Global message listener triggered');
          console.log('📱 Layout: Snapshot size:', snapshot.docs.length);
          
          // Check if there are unseen messages using manual check
          const { MessageAPI, EventProfileAPI } = await import('../lib/firebaseApi');
          const allMessages = await MessageAPI.filter({
            event_id: currentEvent.id,
            to_profile_id: currentUserProfile.id
          });
          
          // Filter for unseen messages only
          const unseenMessages = allMessages.filter(message => !message.seen);
          
          if (unseenMessages.length > 0) {
            console.log('📱 Layout: Unseen messages detected - checking for recent ones');
            
            // Get the latest unseen message
            const latestUnseenMessage = unseenMessages.sort((a, b) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0];
            
            // Check if this is a recent message (within last 5 minutes)
            const messageTime = typeof latestUnseenMessage.created_at === 'string' 
              ? new Date(latestUnseenMessage.created_at).getTime() 
              : (latestUnseenMessage.created_at as any).toDate().getTime();
            const now = new Date().getTime();
            const fiveMinutesAgo = now - (5 * 60 * 1000);
            
            console.log('📱 Layout: Latest unseen message time check:', {
              messageTime: new Date(messageTime),
              now: new Date(now),
              fiveMinutesAgo: new Date(fiveMinutesAgo),
              timeDiff: now - messageTime,
              isRecent: messageTime > fiveMinutesAgo
            });
            
            if (messageTime > fiveMinutesAgo) {
              console.log('📱 Layout: Recent unseen message detected - showing toast');
              
              // Get sender's profile to get their name
              const senderProfile = await EventProfileAPI.get(latestUnseenMessage.from_profile_id);
              
              if (senderProfile) {
                console.log('📱 Layout: Sender profile found:', senderProfile.first_name);
                const { showInAppMessageToast } = await import('../lib/messageNotificationHelper');
                showInAppMessageToast(senderProfile.first_name, senderProfile.session_id);
              } else {
                console.log('📱 Layout: Sender profile not found');
              }
            } else {
              console.log('📱 Layout: Unseen message too old, not showing toast');
            }
          } else {
            console.log('📱 Layout: No unseen messages found');
          }
        } catch (error) {
          console.error('📱 Layout: Error in global message listener:', error);
        }
      });

      console.log('📱 Layout: Global message listener set up successfully');

      return () => {
        console.log('📱 Layout: Cleaning up global message listener');
        unsubscribe();
      };
    } catch (error) {
      console.error('📱 Layout: Error setting up global message listener:', error);
    }
  }, [currentEvent?.id, currentSessionId, currentUserProfile?.id]);

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
        <Toast config={toastConfig} />
      </View>
    </ErrorBoundary>
  );
} 