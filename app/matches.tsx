import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  useColorScheme,
  Alert,
  AppState,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Heart, MessageCircle, Users, User } from 'lucide-react-native';
import { EventProfileAPI, LikeAPI, EventAPI } from '../lib/firebaseApi';
import { AsyncStorageUtils } from '../lib/asyncStorageUtils';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebaseConfig';
import UserProfileModal from '../lib/UserProfileModal';

import { updateUserActivity } from '../lib/messageNotificationHelper';
import { sendLikeNotification } from '../lib/notificationService';

export default function Matches() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [matches, setMatches] = useState<any[]>([]);
  const [currentEvent, setCurrentEvent] = useState<any>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProfileForDetail, setSelectedProfileForDetail] = useState<any>(null);
  const [likedProfiles, setLikedProfiles] = useState<Set<string>>(new Set());
  const [unreadMessages, setUnreadMessages] = useState<Set<string>>(new Set());
  const [isAppActive, setIsAppActive] = useState(true);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  // Single ref to hold all unsubscribe functions
  const listenersRef = useRef<{
    userProfile?: () => void;
    matches?: () => void;
    likes?: () => void;
    mutualMatches?: () => void;
    messages?: () => void;
    periodicCheck?: number;
  }>({});

  useEffect(() => {
    initializeSession();
  }, []);

  // Track app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      setIsAppActive(nextAppState === 'active');
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  // Cleanup all listeners on unmount
  useEffect(() => {
    return () => {
      cleanupAllListeners();
    };
  }, []);

  // Check for unseen messages - now handled when matches are loaded
  /*
  useEffect(() => {
    if (!currentEvent?.id || !currentSessionId) return;

    const checkUnseenMessages = async () => {
      try {
        const { hasUnseenMessages } = await import('../lib/messageNotificationHelper');
        const hasUnseen = await hasUnseenMessages(currentEvent.id, currentSessionId);
        
        if (hasUnseen) {
          // Get all messages sent TO the current user
          const { MessageAPI, EventProfileAPI } = await import('../lib/firebaseApi');
          const allMessages = await MessageAPI.filter({
            event_id: currentEvent.id,
            to_profile_id: currentUserProfile?.id
          });
          
          // Find unseen messages and their senders
          const unseenMessages = allMessages.filter(message => !message.seen);
          const unseenSessionIds = new Set<string>();
          
          for (const message of unseenMessages) {
            const senderProfiles = await EventProfileAPI.filter({
              event_id: currentEvent.id,
              id: message.from_profile_id
            });
            
            if (senderProfiles.length > 0) {
              unseenSessionIds.add(senderProfiles[0].session_id);
            }
          }
          
          setUnreadMessages(unseenSessionIds);
        }
              } catch (error) {
        // Error checking unseen messages
      }
    };

    checkUnseenMessages();
  }, [currentEvent?.id, currentSessionId, currentUserProfile?.id]);
  */

  // Real-time message listener for unread indicators only (no toasts)
  useEffect(() => {
    if (!currentEvent?.id || !currentUserProfile?.id) return;

    const setupMessageListener = async () => {
      try {
        const { onSnapshot, collection, query, where } = await import('firebase/firestore');
        const { db } = await import('../lib/firebaseConfig');

        const messagesQuery = query(
          collection(db, 'messages'),
          where('event_id', '==', currentEvent.id),
          where('to_profile_id', '==', currentUserProfile.id)
        );

        const unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
          // Only update unread status, don't show toasts (handled by global listener)
          try {
            // Process snapshot data directly for better performance
            const unseenMessages = snapshot.docs
              .map(doc => ({ id: doc.id, ...doc.data() }))
              .filter((message: any) => !message.seen);
            
            if (unseenMessages.length > 0) {
              // Create a set of session IDs that have sent unseen messages
              const unseenSessionIds = new Set<string>();
              
              // Use Promise.all for concurrent processing
              const senderPromises = unseenMessages.map(async (message: any) => {
                const { EventProfileAPI } = await import('../lib/firebaseApi');
                const senderProfiles = await EventProfileAPI.filter({
                  id: message.from_profile_id,
                  event_id: currentEvent.id
                });
                return senderProfiles.length > 0 ? senderProfiles[0].session_id : null;
              });
              
              const senderSessionIds = await Promise.all(senderPromises);
              senderSessionIds.forEach(sessionId => {
                if (sessionId) {
                  unseenSessionIds.add(sessionId);
                }
              });
              
              setUnreadMessages(unseenSessionIds);
              setHasUnreadMessages(unseenSessionIds.size > 0);
            } else {
              setUnreadMessages(new Set());
              setHasUnreadMessages(false);
            }
          } catch {
            // Error refreshing unread messages
          }
        });

        listenersRef.current.messages = unsubscribe;
      } catch {
        // Error setting up message listener
      }
    };

    setupMessageListener();
  }, [currentEvent?.id, currentUserProfile?.id]);

  // Consolidated listener setup with proper cleanup
  useEffect(() => {
    if (!currentEvent?.id || !currentSessionId) {
      cleanupAllListeners();
      return;
    }

    // Clean up existing listeners before creating new ones
    cleanupAllListeners();

    try {
      // First, get the current user's profile to check visibility
      const userProfileQuery = query(
        collection(db, 'event_profiles'),
        where('event_id', '==', currentEvent.id),
        where('session_id', '==', currentSessionId)
      );

      const userProfileUnsubscribe = onSnapshot(userProfileQuery, async (userSnapshot) => {
        try {
          const userProfiles = userSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as any[];
          
          const userProfile = userProfiles[0];
          setCurrentUserProfile(userProfile);

          if (!userProfile) {
    
            await AsyncStorageUtils.multiRemove([
              'currentEventId',
              'currentSessionId',
              'currentEventCode',
              'currentProfileColor',
              'currentProfilePhotoUrl'
            ]);
            router.replace('/home');
            return;
          }

          // If user is not visible, still allow matches to be visible
          // (matches should be accessible even when user is hidden)
          setupMatchesListener();
          
          // Check for unseen messages after user profile is loaded
          const checkUnseenMessages = async () => {
            try {
              // Manual check for unseen messages
              const { MessageAPI, EventProfileAPI } = await import('../lib/firebaseApi');
              const allMessages = await MessageAPI.filter({
                event_id: currentEvent.id,
                to_profile_id: userProfile.id
              });
              
              // Filter for unseen messages only
              const unseenMessages = allMessages.filter(message => !message.seen);
              
              // Create a set of session IDs that have sent unseen messages
              const unseenSessionIds = new Set<string>();
              for (const message of unseenMessages) {
                // Get the sender's session ID
                const senderProfiles = await EventProfileAPI.filter({
                  id: message.from_profile_id,
                  event_id: currentEvent.id
                });
                if (senderProfiles.length > 0) {
                  unseenSessionIds.add(senderProfiles[0].session_id);
                }
              }
              
              setUnreadMessages(unseenSessionIds);
              setHasUnreadMessages(unseenSessionIds.size > 0);
            } catch {
              // Error checking unseen messages
            }
          };
          
          checkUnseenMessages();
          
        } catch {
          // Handle error silently
        }
              }, () => {
          // Handle error silently
        });

      listenersRef.current.userProfile = userProfileUnsubscribe;

    } catch {
      // Handle error silently
    }

    return () => {
      cleanupAllListeners();
    };
  }, [currentEvent?.id, currentSessionId]);

  // Update activity periodically while app is active
  useEffect(() => {
    if (!currentSessionId) return;

    const activityInterval = setInterval(() => {
      if (isAppActive) {
        updateUserActivity(currentSessionId);
      }
    }, 15000); // Update every 15 seconds instead of 30

    return () => clearInterval(activityInterval);
  }, [currentSessionId, isAppActive]);

  const setupMatchesListener = () => {
    if (!currentEvent?.id || !currentSessionId) return;

    try {
      const mutualLikesQuery = query(
        collection(db, 'likes'),
        where('event_id', '==', currentEvent.id),
        where('is_mutual', '==', true)
      );

      const matchesUnsubscribe = onSnapshot(mutualLikesQuery, async (snapshot) => {
        try {
          const mutualLikes = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as any[];

          // Filter to only include likes where this user is involved
          const userMatches = mutualLikes.filter(like => 
            like.liker_session_id === currentSessionId || like.liked_session_id === currentSessionId
          );

          // Get the other person's session ID for each match (remove duplicates)
          const otherSessionIds = [...new Set(userMatches.map(like => 
            like.liker_session_id === currentSessionId ? like.liked_session_id : like.liker_session_id
          ))];

          // Get profiles for all matched users
          const matchedProfiles: any[] = [];
          for (const otherSessionId of otherSessionIds) {
            const profiles = await EventProfileAPI.filter({
              session_id: otherSessionId,
              event_id: currentEvent.id
            });
            if (profiles.length > 0) {
              matchedProfiles.push(profiles[0]);
            }
          }

          setMatches(matchedProfiles);
                  } catch {
            // Error in matches listener
          }
              }, (error) => {
          // Handle Firestore listener errors gracefully
          if (error.code === 'permission-denied') {
            // Permission denied for matches listener
          } else if (error.code === 'unavailable') {
            // Firestore temporarily unavailable
          } else {
            // Error in matches listener
          }
        });

      listenersRef.current.matches = matchesUnsubscribe;

      // Add likes listener to track which profiles the user has liked
      const likesQuery = query(
        collection(db, 'likes'),
        where('event_id', '==', currentEvent.id),
        where('liker_session_id', '==', currentSessionId)
      );

      const likesUnsubscribe = onSnapshot(likesQuery, (snapshot) => {
        try {
          const likes = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as any[];
          
          setLikedProfiles(new Set(likes.map(like => like.liked_session_id)));
                  } catch {
            // Error in likes listener
          }
      }, (error) => {
        // Handle Firestore listener errors gracefully
        if (error.code === 'permission-denied') {
          // Permission denied for likes listener
        } else if (error.code === 'unavailable') {
          // Firestore temporarily unavailable
        } else {
          // Error in likes listener
        }
      });

      listenersRef.current.likes = likesUnsubscribe;

      // Add mutual matches listener for real-time match notifications
      const mutualMatchesQuery = query(
        collection(db, 'likes'),
        where('event_id', '==', currentEvent.id),
        where('is_mutual', '==', true)
      );

      const mutualMatchesUnsubscribe = onSnapshot(mutualMatchesQuery, async () => {
        try {
          // Note: Notifications are now handled globally in _layout.tsx
          // This listener only updates the matches list for display purposes
          
        } catch {
          // Error in mutual matches listener
        }
      }, (error) => {
        // Handle Firestore listener errors gracefully
        if (error.code === 'permission-denied') {
          // Permission denied for mutual matches listener
        } else if (error.code === 'unavailable') {
          // Firestore temporarily unavailable
        } else {
          // Error in mutual matches listener
        }
      });

      listenersRef.current.mutualMatches = mutualMatchesUnsubscribe;

    } catch {
      // Error setting up matches listener
    }
  };

  const cleanupAllListeners = () => {
    try {
      if (listenersRef.current.userProfile) {
        listenersRef.current.userProfile();
        listenersRef.current.userProfile = undefined;
      }
      if (listenersRef.current.matches) {
        listenersRef.current.matches();
        listenersRef.current.matches = undefined;
      }
      if (listenersRef.current.likes) {
        listenersRef.current.likes();
        listenersRef.current.likes = undefined;
      }
      if (listenersRef.current.mutualMatches) {
        listenersRef.current.mutualMatches();
        listenersRef.current.mutualMatches = undefined;
      }
      if (listenersRef.current.messages) {
        listenersRef.current.messages();
        listenersRef.current.messages = undefined;
      }
      if (listenersRef.current.periodicCheck) {
        clearInterval(listenersRef.current.periodicCheck);
        listenersRef.current.periodicCheck = undefined;
      }
    } catch {
      // Handle error silently
    }
  };

  const initializeSession = async () => {
    try {
      setIsLoading(true);
      const eventId = await AsyncStorageUtils.getItem<string>('currentEventId');
      const sessionId = await AsyncStorageUtils.getItem<string>('currentSessionId');
      
      if (!eventId || !sessionId) {

        router.replace('/home');
        return;
      }

      setCurrentSessionId(sessionId);
      
      const events = await EventAPI.filter({ id: eventId });
      if (events.length > 0) {
        setCurrentEvent(events[0]);
      } else {
        // Event doesn't exist, clear all data and redirect to home

        await AsyncStorageUtils.multiRemove([
          'currentEventId',
          'currentSessionId',
          'currentEventCode',
          'currentProfileColor',
          'currentProfilePhotoUrl'
        ]);
        router.replace('/home');
        return;
      }

      // Verify that the user's profile actually exists in the database
      const userProfiles = await EventProfileAPI.filter({
        event_id: eventId,
        session_id: sessionId
      });

      if (userProfiles.length === 0) {
        // Profile doesn't exist in database (user left event and deleted profile)
        // Clear all AsyncStorage data and redirect to home

        await AsyncStorageUtils.multiRemove([
          'currentEventId',
          'currentSessionId',
          'currentEventCode',
          'currentProfileColor',
          'currentProfilePhotoUrl'
        ]);
        router.replace('/home');
        return;
      }

      // Matches are now handled by real-time listener
    } catch {
      // Error initializing matches session
      // Clear data and redirect to home on error
      await AsyncStorageUtils.multiRemove([
        'currentEventId',
        'currentSessionId',
        'currentEventCode',
        'currentProfileColor',
        'currentProfilePhotoUrl'
      ]);
      router.replace('/home');
    } finally {
      setIsLoading(false);
    }
  };

  // Remove the old loadMatches function since we're using real-time listeners now

  const handleProfileTap = (profile: any) => {
    setSelectedProfileForDetail(profile);
  };

  const handleLike = async (likedProfile: any) => {
    if (likedProfiles.has(likedProfile.session_id) || !currentUserProfile) return;

    const eventId = await AsyncStorageUtils.getItem<string>('currentEventId');
    const likerSessionId = currentUserProfile.session_id;

    if (!eventId) return;

    // Check if both profiles are visible (required by Firestore rules)
    if (!currentUserProfile.is_visible || !likedProfile.is_visible) {
      Alert.alert(
        "Cannot Like", 
        "Both profiles must be visible to like someone. Please make sure your profile is visible in settings.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      // Optimistically update UI
      setLikedProfiles(prev => new Set([...prev, likedProfile.session_id]));

      const newLike = await LikeAPI.create({
        event_id: eventId,
        from_profile_id: currentUserProfile.id,
        to_profile_id: likedProfile.id,
        liker_session_id: likerSessionId,
        liked_session_id: likedProfile.session_id,
        is_mutual: false,
        liker_notified_of_match: false,
        liked_notified_of_match: false
      });

              // Like created successfully

      // Send notification to the person being liked (they get notified that someone liked them)
      try {
        await sendLikeNotification(likedProfile.session_id, currentUserProfile.first_name);
      } catch {
        // Handle notification error silently
      }

      // Check for mutual match
      const theirLikesToMe = await LikeAPI.filter({
        event_id: eventId,
        liker_session_id: likedProfile.session_id,
        liked_session_id: likerSessionId,
      });

      if (theirLikesToMe.length > 0) {
        // They already liked us! This creates a mutual match
        const theirLikeRecord = theirLikesToMe[0];

        // Update both records for mutual match
        await LikeAPI.update(newLike.id, { 
          is_mutual: true,
          liker_notified_of_match: false // Don't mark as notified yet, let the listener handle it
        });
        await LikeAPI.update(theirLikeRecord.id, { 
          is_mutual: true,
          liked_notified_of_match: false // Don't mark as notified yet, let the listener handle it
        });
        
        // 🎉 CORRECTED LOGIC: 
        // - First liker (User B) gets toast/push notification
        // - Second liker (User A, match creator) gets alert
        
        // Note: Match notifications will be handled by the mutual matches listener
        // This prevents duplicate notifications when both discovery and matches pages are active

        // Mark both as notified
        await Promise.all([
          LikeAPI.update(newLike.id, { 
            liker_notified_of_match: true
          }),
          LikeAPI.update(theirLikeRecord.id, { 
            liked_notified_of_match: true
          })
        ]);
      }
          } catch {
        // Error creating like
      // Revert optimistic update on error
      setLikedProfiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(likedProfile.session_id);
        return newSet;
      });
      
      // Show user-friendly error message
      Alert.alert(
        "Like Failed", 
        "Unable to like this person. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#1a1a1a' : '#f8fafc',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: isDark ? '#9ca3af' : '#6b7280',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      paddingTop: 32,
    },
    headerText: {
      flex: 1,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: isDark ? '#ffffff' : '#1f2937',
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 16,
      color: isDark ? '#9ca3af' : '#6b7280',
    },
    headerIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: isDark ? '#2d2d2d' : '#fef2f2',
      alignItems: 'center',
      justifyContent: 'center',
    },
    matchesContainer: {
      flex: 1,
      paddingHorizontal: 16,
    },
    matchesList: {
      gap: 12,
    },
    matchCard: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#1e293b' : '#ffffff',
      borderRadius: 16,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: 1,
      borderColor: isDark ? '#374151' : '#e5e7eb',
    },
    matchImageContainer: {
      marginRight: 16,
    },
    matchImage: {
      width: 80,
      height: 80,
      borderRadius: 40,
    },
    matchImageFallback: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    matchImageFallbackText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: 'white',
    },
    fallbackAvatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#404040' : '#cccccc',
    },
    fallbackText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: 'white',
    },
    matchInfo: {
      flex: 1,
      justifyContent: 'center',
    },
    matchName: {
      fontSize: 18,
      fontWeight: '600',
      color: isDark ? '#ffffff' : '#1f2937',
      marginBottom: 4,
    },
    matchAge: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
      marginBottom: 12,
    },
    matchActions: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#404040' : '#f3f4f6',
      borderRadius: 20,
      paddingVertical: 8,
      paddingHorizontal: 12,
      gap: 6,
    },
    actionText: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
      fontWeight: '500',
    },
    emptyState: {
      alignItems: 'center',
      padding: 32,
      marginTop: 32,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: isDark ? '#ffffff' : '#1f2937',
      marginTop: 16,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
      textAlign: 'center',
      marginBottom: 16,
      lineHeight: 20,
    },
    browseButton: {
      backgroundColor: '#8b5cf6',
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 24,
    },
    browseButtonText: {
      fontSize: 16,
      color: 'white',
      fontWeight: '600',
      textAlign: 'center',
    },
    bottomNavigation: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 20,
      backgroundColor: isDark ? '#2d2d2d' : 'white',
      borderTopWidth: 1,
      borderTopColor: isDark ? '#404040' : '#e5e7eb',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: isDark ? 0.1 : 0.05,
      shadowRadius: 4,
      elevation: 3,
    },
    navButton: {
      alignItems: 'center',
    },
    navButtonText: {
      fontSize: 12,
      color: isDark ? '#9ca3af' : '#9ca3af',
      marginTop: 4,
    },
    navButtonActive: {},
    navButtonTextActive: {
      fontWeight: '600',
      color: '#8b5cf6',
    },
    hiddenStateContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    hiddenStateContent: {
      alignItems: 'center',
      maxWidth: 300,
    },
    hiddenStateTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: isDark ? '#ffffff' : '#1f2937',
      marginTop: 16,
      marginBottom: 12,
      textAlign: 'center',
    },
    hiddenStateText: {
      fontSize: 16,
      color: isDark ? '#9ca3af' : '#6b7280',
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 24,
    },
    makeVisibleButton: {
      backgroundColor: '#8b5cf6',
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 32,
    },
    makeVisibleButtonText: {
      fontSize: 16,
      color: 'white',
      fontWeight: '600',
    },
    hiddenNotice: {
      backgroundColor: isDark ? '#1f2937' : '#fef3c7',
      borderWidth: 1,
      borderColor: isDark ? '#374151' : '#f59e0b',
      borderRadius: 12,
      marginHorizontal: 16,
      marginBottom: 16,
      padding: 16,
    },
    hiddenNoticeContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    hiddenNoticeText: {
      flex: 1,
      fontSize: 14,
      color: isDark ? '#e5e7eb' : '#92400e',
      lineHeight: 20,
    },
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading your matches...</Text>
      </View>
    );
  }

  // Show hidden state notice if user is not visible, but still allow access to matches
  const isProfileHidden = currentUserProfile && !currentUserProfile.is_visible;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>
            Your Matches
          </Text>
          <Text style={styles.subtitle}>
            {matches.length} mutual connection{matches.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.headerIcon}>
          <Heart size={24} color="#ec4899" fill="#ec4899" />
        </View>
      </View>

      {/* Hidden State Notice */}
      {isProfileHidden && (
        <View style={styles.hiddenNotice}>
          <View style={styles.hiddenNoticeContent}>
            <User size={20} color="#f59e0b" />
            <Text style={styles.hiddenNoticeText}>
              Your profile is hidden. You can still chat with your matches, but you won&apos;t see new people in discovery.
            </Text>
            <TouchableOpacity
              style={styles.makeVisibleButton}
              onPress={() => router.push('/profile')}
            >
              <Text style={styles.makeVisibleButtonText}>Make Visible</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Matches List */}
      <ScrollView style={styles.matchesContainer}>
        {matches.length > 0 ? (
          <View style={styles.matchesList}>
            {matches.map((match) => (
              <TouchableOpacity
                key={match.id}
                style={[
                  styles.matchCard,
                  unreadMessages.has(match.session_id) && Platform.select({
                    ios: {
                      borderWidth: 3,
                      borderColor: '#ef4444',
                      backgroundColor: isDark ? '#1f1f1f' : '#fef2f2',
                      shadowColor: '#ef4444',
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.4,
                      shadowRadius: 8,
                    },
                    android: {
                      borderWidth: 3,
                      borderColor: '#ef4444',
                      backgroundColor: isDark ? '#1f1f1f' : '#fef2f2',
                      elevation: 8,
                    }
                  })
                ]}
                onPress={() => {
                  // Navigate to chat without marking messages as seen
                  router.push(`/chat?matchId=${match.session_id}&matchName=${match.first_name}`);
                }}
                accessibilityLabel={`Open chat with ${match.first_name}`}
                accessibilityHint={`Tap to open chat with ${match.first_name}`}
              >
                <TouchableOpacity
                  style={styles.matchImageContainer}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleProfileTap(match);
                  }}
                >
                    {match.profile_photo_url ? (
                      <Image source={{ uri: match.profile_photo_url }} style={styles.matchImage} />
                    ) : (
                      <View style={[styles.matchImageFallback, { backgroundColor: match.profile_color || '#cccccc' }]}>
                        <Text style={styles.matchImageFallbackText}>{match.first_name[0]}</Text>
                      </View>
                    )}
                    {/* Red dot for both platforms */}
                    {unreadMessages.has(match.session_id) && (
                      <View style={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                        backgroundColor: '#ef4444',
                        borderRadius: 8,
                        width: 16,
                        height: 16,
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderWidth: 2,
                        borderColor: isDark ? '#1a1a1a' : '#ffffff',
                        shadowColor: '#ef4444',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 4,
                        elevation: 4,
                      }}>
                        <View style={{
                          width: 8,
                          height: 8,
                          backgroundColor: '#ffffff',
                          borderRadius: 4,
                        }} />
                      </View>
                    )}
                  </TouchableOpacity>
                
                <View style={styles.matchInfo}>
                  <Text style={styles.matchName}>{match.first_name}</Text>
                  <Text style={styles.matchAge}>{match.age} years old</Text>
                  <View style={styles.matchActions}>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => router.push({
                        pathname: '/chat',
                        params: { 
                          matchId: match.session_id,
                          matchName: match.first_name
                        }
                      })}
                      accessibilityLabel={`Message ${match.first_name}`}
                      accessibilityHint={`Open chat with ${match.first_name}`}
                    >
                      <MessageCircle size={16} color="#6b7280" />
                      <Text style={styles.actionText}>Message</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Heart size={64} color="#9ca3af" />
            <Text style={styles.emptyTitle}>No matches yet</Text>
            <Text style={styles.emptyText}>
              Keep browsing and liking profiles to find your matches!
            </Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => router.push('/discovery')}
            >
              <Text style={styles.browseButtonText}>Browse Singles</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push('/profile')}
        >
          <User size={24} color="#9ca3af" />
          <Text style={styles.navButtonText}>Profile</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push('/discovery')}
        >
          <Users size={24} color="#9ca3af" />
          <Text style={styles.navButtonText}>Discover</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.navButton, styles.navButtonActive]}
          onPress={() => {}} // Already on matches page
        >
          <View style={{ position: 'relative' }}>
            <MessageCircle size={24} color="#8b5cf6" />
            {hasUnreadMessages && (
              <View style={{
                position: 'absolute',
                top: -2,
                right: -2,
                backgroundColor: '#ef4444',
                borderRadius: 6,
                width: 12,
                height: 12,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <View style={{
                  width: 6,
                  height: 6,
                  backgroundColor: '#ffffff',
                  borderRadius: 3,
                }} />
              </View>
            )}
          </View>
          <Text style={[styles.navButtonText, styles.navButtonTextActive]}>Matches</Text>
        </TouchableOpacity>
      </View>

      {/* Profile Detail Modal */}
      <UserProfileModal
        visible={selectedProfileForDetail !== null}
        profile={selectedProfileForDetail}
        onClose={() => setSelectedProfileForDetail(null)}
        onLike={handleLike}
        isLiked={selectedProfileForDetail ? likedProfiles.has(selectedProfileForDetail.session_id) : false}
      />
    </SafeAreaView>
  );
} 