import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { router, useFocusEffect } from 'expo-router';
import { Heart, MessageCircle, Users, User, UserX, VolumeX, Volume2 } from 'lucide-react-native';
import { EventProfileAPI, LikeAPI, EventAPI, MessageAPI, MutedMatchAPI } from '../lib/firebaseApi';
import { AsyncStorageUtils } from '../lib/asyncStorageUtils';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebaseConfig';
import UserProfileModal from '../lib/UserProfileModal';

import { updateUserActivity } from '../lib/messageNotificationHelper';
import { setMuteStatus } from '../lib/utils/notificationUtils';


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
  const [mutedMatches, setMutedMatches] = useState<Set<string>>(new Set());
  const [unmatchingUsers, setUnmatchingUsers] = useState<Set<string>>(new Set());
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

  // Reload muted matches and refresh unread messages whenever user returns to this page
  useFocusEffect(
    React.useCallback(() => {
      console.log('Matches page focused - checking if can reload muted matches and unread messages', {
        platform: Platform.OS,
        hasCurrentEvent: !!currentEvent?.id,
        hasCurrentSessionId: !!currentSessionId
      });
      
      // Try to get session data if not available
      const reloadData = async () => {
        try {
          const eventId = currentEvent?.id || await AsyncStorageUtils.getItem<string>('currentEventId');
          const sessionId = currentSessionId || await AsyncStorageUtils.getItem<string>('currentSessionId');
          
          if (eventId && sessionId) {
            console.log('Reloading muted matches and unread messages with:', { eventId, sessionId });
            
            // Directly query Firestore for muted matches
            const { collection, query, where, getDocs } = await import('firebase/firestore');
            const { db } = await import('../lib/firebaseConfig');
            
            const mutedQuery = query(
              collection(db, 'muted_matches'),
              where('event_id', '==', eventId),
              where('muter_session_id', '==', sessionId)
            );
            
            const snapshot = await getDocs(mutedQuery);
            const mutedSessionIds = snapshot.docs.map(doc => doc.data().muted_session_id);
            
            console.log('Focus: Found muted matches:', mutedSessionIds.length, mutedSessionIds);
            setMutedMatches(new Set(mutedSessionIds));
            
            // Force refresh unread messages state when returning from chat (especially for Android)
            if (currentUserProfile?.id) {
              console.log('Focus: Refreshing unread messages state');
              
              // Query for unseen messages
              const messagesQuery = query(
                collection(db, 'messages'),
                where('event_id', '==', eventId),
                where('to_profile_id', '==', currentUserProfile.id),
                where('seen', '==', false)
              );
              
              const messagesSnapshot = await getDocs(messagesQuery);
              const unseenMessages = messagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
              
              if (unseenMessages.length > 0) {
                // Get sender session IDs
                const unseenSessionIds = new Set<string>();
                const { EventProfileAPI } = await import('../lib/firebaseApi');
                
                for (const message of unseenMessages) {
                  try {
                    const senderProfile = await EventProfileAPI.get((message as any).from_profile_id);
                    if (senderProfile) {
                      unseenSessionIds.add(senderProfile.session_id);
                    }
                  } catch {
                    // Skip if profile not found
                  }
                }
                
                console.log('Focus: Found unseen messages from sessions:', Array.from(unseenSessionIds));
                setUnreadMessages(unseenSessionIds);
                setHasUnreadMessages(unseenSessionIds.size > 0);
              } else {
                console.log('Focus: No unseen messages found - clearing indicators');
                setUnreadMessages(new Set());
                setHasUnreadMessages(false);
              }
            }
          } else {
            console.log('Focus: Cannot reload data - missing eventId or sessionId');
          }
        } catch (error) {
          console.error('Focus: Error reloading data:', error);
        }
      };
      
      reloadData();
    }, [currentEvent?.id, currentSessionId, currentUserProfile?.id])
  );

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
  // This listener automatically updates match card highlighting when new messages arrive
  // The highlighting will appear immediately without needing to leave and return to the page
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
              
              // Use Promise.all for concurrent processing with timeouts
              const senderPromises = unseenMessages.map(async (message: any) => {
                const { EventProfileAPI } = await import('../lib/firebaseApi');
                
                // Add timeout to prevent hanging
                const timeoutPromise = new Promise<never>((_, reject) => {
                  setTimeout(() => reject(new Error('Sender profile loading timeout')), 5000); // 5 second timeout
                });
                
                // Use get() method instead of filter() to fetch profile by ID
                const profilePromise = EventProfileAPI.get(message.from_profile_id);
                
                try {
                  const senderProfile = await Promise.race([profilePromise, timeoutPromise]);
                  if (senderProfile) {
                    const senderSessionId = senderProfile.session_id;
                    // Return all session IDs - we'll filter when rendering
                    return senderSessionId;
                  }
                  return null;
                } catch {
                  // If timeout or error, return null to avoid blocking the entire operation
                  return null;
                }
              });
              
              const senderSessionIds = await Promise.all(senderPromises);
              senderSessionIds.forEach(sessionId => {
                if (sessionId) {
                  unseenSessionIds.add(sessionId);
                }
              });
              
              console.log('🔴 Real-time unread messages update:', {
                platform: Platform.OS,
                totalUnseenMessages: unseenMessages.length,
                sessionIdsWithUnread: Array.from(unseenSessionIds),
                timestamp: new Date().toISOString()
              });
              
              setUnreadMessages(unseenSessionIds);
              setHasUnreadMessages(unseenSessionIds.size > 0);
              
              // Debug: Log current unread state after update
              console.log('🔴 Updated unreadMessages state:', {
                platform: Platform.OS,
                unseenSessionIds: Array.from(unseenSessionIds),
                totalMatches: matches.length,
                matchSessionIds: matches.map(m => m.session_id),
                willHighlight: matches.map(m => ({ name: m.first_name, sessionId: m.session_id, hasUnread: unseenSessionIds.has(m.session_id) }))
              });
            } else {
              console.log('No unseen messages found - clearing indicators', { platform: Platform.OS });
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
  }, [currentEvent?.id, currentUserProfile?.id, matches]);

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
            // User profile not found - redirect to home but keep session data
            // Homepage restoration will handle this gracefully
            console.log('User profile not found in real-time listener - redirecting to home');
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
              
              // Filter for unseen messages
              const unseenMessages = allMessages.filter(message => !message.seen);
              
              // Create a set of session IDs that have sent unseen messages
              const unseenSessionIds = new Set<string>();
              for (const message of unseenMessages) {
                // Get the sender's session ID using get() method instead of filter()
                const senderProfile = await EventProfileAPI.get(message.from_profile_id);
                if (senderProfile) {
                  unseenSessionIds.add(senderProfile.session_id);
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

  function setupMatchesListener() {
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
          const sessionIdsMap = userMatches.map(like => 
            like.liker_session_id === currentSessionId ? like.liked_session_id : like.liker_session_id
          );
          const otherSessionIds = Array.from(new Set(sessionIdsMap));

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
          
          // If there are no matches, clear unread messages indicator
          if (matchedProfiles.length === 0) {
            console.log('No matches found - clearing unread messages indicator');
            setUnreadMessages(new Set());
            setHasUnreadMessages(false);
          }
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

      const mutualMatchesUnsubscribe = onSnapshot(mutualMatchesQuery, async (snapshot) => {
        try {
          console.log('Matches screen: Processing mutual matches snapshot changes');
          
          // Process document changes for real-time match notifications
          for (const change of snapshot.docChanges()) {
            if (change.type === 'added') {
              const matchData = change.doc.data();
              console.log('Matches screen: New mutual match detected:', {
                docId: change.doc.id,
                likerSessionId: matchData.liker_session_id,
                recipientSessionId: matchData.recipient_session_id,
                currentSession: currentSessionId
              });
              
              // Only trigger notification if this user is the recipient (not the creator)
              if (matchData.recipient_session_id === currentSessionId) {
                // Get the liker's profile for notification
                let likerName = 'Someone';
                try {
                  const { EventProfileAPI } = await import('../lib/firebaseApi');
                  const likerProfiles = await EventProfileAPI.filter({
                    session_id: matchData.liker_session_id,
                    event_id: currentEvent?.id
                  });
                  if (likerProfiles.length > 0) {
                    likerName = likerProfiles[0].first_name || 'Someone';
                  }
                } catch (profileError) {
                  console.warn('Failed to get liker profile for match notification:', profileError);
                }
                
                // Import and trigger match notification
                try {
                  const { NotificationRouter } = await import('../lib/notifications/NotificationRouter');
                  await NotificationRouter.handleIncoming({
                    type: 'match',
                    id: change.doc.id,
                    createdAt: matchData.created_at?.toDate?.()?.getTime() || Date.now(),
                    isCreator: false, // This user is the recipient
                    otherSessionId: matchData.liker_session_id,
                    otherName: likerName
                  });
                } catch (notificationError) {
                  console.error('Failed to trigger match notification:', notificationError);
                }
              }
            }
          }
          
          // Matches list will be updated automatically by the Firestore listener
          
        } catch (error) {
          console.error('Error in mutual matches listener:', error);
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
  }

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

  const loadMutedMatches = useCallback(async () => {
    if (!currentEvent?.id || !currentSessionId) return;

    try {
      console.log('Loading muted matches for event:', currentEvent.id, 'session:', currentSessionId);
      
      // Directly query Firestore for muted matches
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('../lib/firebaseConfig');
      
      const mutedQuery = query(
        collection(db, 'muted_matches'),
        where('event_id', '==', currentEvent.id),
        where('muter_session_id', '==', currentSessionId)
      );
      
      const snapshot = await getDocs(mutedQuery);
      const mutedSessionIds = snapshot.docs.map(doc => doc.data().muted_session_id);
      
      console.log('Found muted matches:', mutedSessionIds.length, mutedSessionIds);
      setMutedMatches(new Set(mutedSessionIds));
    } catch (error) {
      console.error('Error loading muted matches:', error);
    }
  }, [currentEvent?.id, currentSessionId]);

  const handleUnmatch = async (matchSessionId: string, matchName: string) => {
    if (!currentEvent?.id || !currentSessionId) return;

    // Prevent double-clicking by checking if already unmatching
    if (unmatchingUsers.has(matchSessionId)) {
      console.log('Already unmatching this user, ignoring');
      return;
    }

    // Show confirmation alert first
    Alert.alert(
      'Unmatch',
      `Are you sure you want to unmatch ${matchName}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Unmatch',
          style: 'destructive',
          onPress: async () => {
            // Mark user as being unmatched to prevent double operations
            setUnmatchingUsers(prev => new Set(prev).add(matchSessionId));
            try {
              // Find and delete ALL like records between these two users
              // Need to check both profile IDs since session IDs might not match profile references
              const matchProfile = matches.find(m => m.session_id === matchSessionId);
              
              console.log('Unmatching users:', { 
                currentSessionId, 
                matchSessionId,
                currentProfileId: currentUserProfile?.id,
                matchProfileId: matchProfile?.id
              });

              const allLikes = await LikeAPI.filter({
                event_id: currentEvent.id
              });

              const likesToDelete = allLikes.filter(like => {
                // Check both session_id based and profile_id based matches
                const sessionMatch = (
                  (like.liker_session_id === currentSessionId && like.liked_session_id === matchSessionId) ||
                  (like.liker_session_id === matchSessionId && like.liked_session_id === currentSessionId)
                );
                
                const profileMatch = currentUserProfile?.id && matchProfile?.id && (
                  (like.from_profile_id === currentUserProfile.id && like.to_profile_id === matchProfile.id) ||
                  (like.from_profile_id === matchProfile.id && like.to_profile_id === currentUserProfile.id)
                );

                return sessionMatch || profileMatch;
              });

              console.log('Found likes to delete:', likesToDelete.length);
              
              // Delete all like records between these users
              await Promise.all(likesToDelete.map(like => LikeAPI.delete(like.id)));

              // Delete all messages between these users
              if (currentUserProfile?.id && matchProfile?.id) {
                try {
                  console.log('Deleting messages between users:', {
                    currentProfileId: currentUserProfile.id,
                    matchProfileId: matchProfile.id
                  });
                  
                  const allMessages = await MessageAPI.filter({
                    event_id: currentEvent.id
                  });
                  
                  const messagesToDelete = allMessages.filter(message => {
                    return (
                      (message.from_profile_id === currentUserProfile.id && message.to_profile_id === matchProfile.id) ||
                      (message.from_profile_id === matchProfile.id && message.to_profile_id === currentUserProfile.id)
                    );
                  });
                  
                  console.log('Found messages to delete:', messagesToDelete.length);
                  
                  // Delete all messages between these users
                  await Promise.all(messagesToDelete.map(message => MessageAPI.delete(message.id)));
                  
                  // Clear any muted match records
                  const mutedRecords = await MutedMatchAPI.filter({
                    event_id: currentEvent.id,
                    muter_session_id: currentSessionId,
                    muted_session_id: matchSessionId
                  });
                  
                  await Promise.all(mutedRecords.map(record => MutedMatchAPI.delete(record.id)));
                  
                } catch (error) {
                  console.warn('Failed to delete messages or muted records:', error);
                  // Continue with unmatch even if message deletion fails
                }
              }

              // Clear notification cache to allow notifications for re-matches
              try {
                const { clearMatchNotificationCache } = await import('../lib/notifications/NotificationRouter');
                await clearMatchNotificationCache(currentSessionId, matchSessionId);
                console.log('Cleared notification cache for unmatched users');
              } catch (error) {
                console.warn('Failed to clear notification cache:', error);
              }

              // Immediately remove the unmatched user from the UI
              setMatches(prevMatches => prevMatches.filter(m => m.session_id !== matchSessionId));
              
              // Also remove from unread messages to clear the red dot
              setUnreadMessages(prev => {
                const newSet = new Set(prev);
                newSet.delete(matchSessionId);
                return newSet;
              });

              Alert.alert(
                'Match Removed',
                'You have unmatched with this person. You can see them again in discovery.',
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('Unmatch error:', error);
              // Use Toast instead of notifications to match message toast design
              const Toast = require('react-native-toast-message').default;
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to unmatch',
                position: 'top',
                visibilityTime: 3500,
                autoHide: true,
                topOffset: 0,
              });
            } finally {
              // Clear the unmatching state regardless of success/failure
              setUnmatchingUsers(prev => {
                const newSet = new Set(prev);
                newSet.delete(matchSessionId);
                return newSet;
              });
            }
          },
        },
      ]
    );
  };

  const handleMuteMatch = async (matchSessionId: string) => {
    if (!currentEvent?.id || !currentSessionId) return;

    const isMuted = mutedMatches.has(matchSessionId);
    console.log(`handleMuteMatch: ${isMuted ? 'unmuting' : 'muting'} match ${matchSessionId}`);

    try {
      // Update UI immediately for better UX
      setMutedMatches(prev => {
        const newSet = new Set(prev);
        if (isMuted) {
          newSet.delete(matchSessionId);
          console.log(`Optimistically removed ${matchSessionId} from muted matches`);
        } else {
          newSet.add(matchSessionId);
          console.log(`Optimistically added ${matchSessionId} to muted matches`);
        }
        return newSet;
      });

      // Call the Firebase function to persist the mute status
      console.log('Calling setMuteStatus with:', {
        eventId: currentEvent.id,
        muterSessionId: currentSessionId,
        mutedSessionId: matchSessionId,
        muted: !isMuted
      });
      
      await setMuteStatus(
        currentEvent.id,
        currentSessionId,
        matchSessionId,
        !isMuted
      );
      
      console.log(`Successfully ${isMuted ? 'unmuted' : 'muted'} match ${matchSessionId} on server`);
      
      // Verify after a longer delay to ensure Firebase has updated
      setTimeout(async () => {
        console.log('Verifying mute status was saved (after 3 seconds)...');
        try {
          const { collection, query, where, getDocs } = await import('firebase/firestore');
          const { db } = await import('../lib/firebaseConfig');
          
          const mutedQuery = query(
            collection(db, 'muted_matches'),
            where('event_id', '==', currentEvent.id),
            where('muter_session_id', '==', currentSessionId),
            where('muted_session_id', '==', matchSessionId)
          );
          
          const snapshot = await getDocs(mutedQuery);
          const shouldBeMuted = !isMuted;
          const actuallyMuted = !snapshot.empty;
          
          console.log(`Verification: Should be muted: ${shouldBeMuted}, Actually muted: ${actuallyMuted}`);
          
          if (shouldBeMuted !== actuallyMuted) {
            console.error('Mute status verification failed! Reverting local state.');
            // Reload all muted matches to sync with server
            await loadMutedMatches();
          } else {
            console.log('Mute status verified successfully');
          }
        } catch (verifyError) {
          console.error('Error verifying mute status:', verifyError);
        }
      }, 3000);
    } catch (error) {
      console.error(`Error ${isMuted ? 'unmuting' : 'muting'} match:`, error);
      
      // Revert optimistic update on error
      setMutedMatches(prev => {
        const newSet = new Set(prev);
        if (isMuted) {
          newSet.add(matchSessionId);
          console.log(`Reverted: re-added ${matchSessionId} to muted matches after error`);
        } else {
          newSet.delete(matchSessionId);
          console.log(`Reverted: removed ${matchSessionId} from muted matches after error`);
        }
        return newSet;
      });
      
      // Use Toast instead of notifications to match message toast design
      const Toast = require('react-native-toast-message').default;
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: `Failed to ${isMuted ? 'unmute' : 'mute'} match`,
        position: 'top',
        visibilityTime: 3500,
        autoHide: true,
        topOffset: 0,
      });
      if (error) {
        try { require('@sentry/react-native').captureException(error); } catch { /* ignore */ }
      }
    }
  };

  async function initializeSession() {
    try {
      setIsLoading(true);
      const eventId = await AsyncStorageUtils.getItem<string>('currentEventId');
      const sessionId = await AsyncStorageUtils.getItem<string>('currentSessionId');
      
      if (!eventId || !sessionId) {
        // No session data - redirect to home for normal flow
        router.replace('/home');
        return;
      }

      setCurrentSessionId(sessionId);
      
      // Add timeout to prevent indefinite hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Event lookup timeout')), 15000); // 15 seconds
      });
      
      const eventPromise = EventAPI.filter({ id: eventId });
      const events = await Promise.race([eventPromise, timeoutPromise]);
      
      if (events.length > 0) {
        setCurrentEvent(events[0]);
      } else {
        // Event doesn't exist - clear only after confirmation
        console.log('Event not found, clearing session data');
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
      const profileTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Profile lookup timeout')), 15000); // 15 seconds
      });
      
      const profilePromise = EventProfileAPI.filter({
        event_id: eventId,
        session_id: sessionId
      });
      
      const userProfiles = await Promise.race([profilePromise, profileTimeoutPromise]);

      if (userProfiles.length === 0) {
        // Profile doesn't exist in database (user left event and deleted profile)
        console.log('User profile not found, clearing session data');
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

      // Load muted matches
      await loadMutedMatches();

      // Matches are now handled by real-time listener
    } catch (error) {
      console.error('Error initializing matches session:', error);
      
      // Don't clear session data on network/timeout errors
      // Let user try again or return to home naturally
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          // Show loading failed state but keep session data
          console.log('Initialization timeout - keeping session data for retry');
          // You could show a retry button here instead of redirecting
        } else {
          // Log other errors but don't immediately clear session
          console.log('Initialization error - redirecting to home but keeping session data');
        }
      }
      
      // Redirect to home but don't clear session data
      // Homepage will handle session restoration
      router.replace('/home');
    } finally {
      setIsLoading(false);
    }
  }

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
      setLikedProfiles(prev => new Set([...Array.from(prev), likedProfile.session_id]));

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

      // Like notification handled by centralized system

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
    destructiveAction: {
      borderTopWidth: 1,
      borderTopColor: isDark ? '#374151' : '#e5e7eb',
      marginTop: 4,
      paddingTop: 12,
    },
    destructiveText: {
      color: '#dc2626',
    },
    destructiveActionButton: {
      backgroundColor: '#fef2f2',
      borderColor: '#dc2626',
      borderWidth: 1,
    },
    iconButton: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 20,
      backgroundColor: isDark ? '#404040' : '#f3f4f6',
      alignItems: 'center',
      justifyContent: 'center',
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
              accessibilityRole="button"
              accessibilityLabel="Make visible"
              accessibilityHint="Navigate to profile settings to make your profile visible"
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
            {matches.map((match) => {
              const hasUnreadMessage = unreadMessages.has(match.session_id);
              
              // Debug logging for unread message detection
              if (hasUnreadMessage) {
                console.log(`🔴 Match ${match.first_name} (${match.session_id}) has unread messages - Platform: ${Platform.OS}`);
              }
              
              // Build styles step by step for better Android compatibility
              let cardStyles: any[] = [styles.matchCard];
              
              if (hasUnreadMessage) {
                console.log(`🔴 Applying highlight styles for ${match.first_name} on ${Platform.OS}`);
                const highlightStyle = {
                  borderWidth: 3,
                  borderColor: '#8b5cf6',
                  backgroundColor: isDark ? '#2d1b3d' : '#f3f0ff',
                };
                
                if (Platform.OS === 'ios') {
                  Object.assign(highlightStyle, {
                    shadowColor: '#8b5cf6',
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.8,
                    shadowRadius: 16,
                    transform: [{ scale: 1.02 }],
                  });
                } else {
                  // Android specific styles
                  Object.assign(highlightStyle, {
                    elevation: 12,
                    shadowColor: '#8b5cf6',
                  });
                }
                
                console.log(`🔴 Final highlight style for ${match.first_name}:`, highlightStyle);
                cardStyles.push(highlightStyle);
              }
              
              if (mutedMatches.has(match.session_id)) {
                cardStyles.push({
                  opacity: 0.6,
                  backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
                  borderColor: isDark ? '#404040' : '#d1d5db',
                  borderWidth: 1,
                  borderStyle: 'dashed',
                });
              }
              
              return (
                <TouchableOpacity
                  key={match.id}
                  style={cardStyles}
                onPress={() => {
                  // Navigate to chat without marking messages as seen
                  router.push(`/chat?matchId=${match.session_id}&matchName=${match.first_name}`);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Open chat with ${match.first_name}${mutedMatches.has(match.session_id) ? ' (muted)' : ''}`}
                accessibilityHint={`Tap to open chat with ${match.first_name}`}
              >
                <TouchableOpacity
                  style={styles.matchImageContainer}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleProfileTap(match);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${match.first_name}'s profile`}
                  accessibilityHint="Opens profile details modal"
                >
                    {match.profile_photo_url ? (
                      <Image source={{ uri: match.profile_photo_url }}
        onError={() => {}} style={[styles.matchImage, mutedMatches.has(match.session_id) && { opacity: 0.5 }]} />
                    ) : (
                      <View style={[styles.matchImageFallback, { backgroundColor: match.profile_color || '#cccccc' }, mutedMatches.has(match.session_id) && { opacity: 0.5 }]}>
                        <Text style={styles.matchImageFallbackText}>{match.first_name[0]}</Text>
                      </View>
                    )}
                    {/* Mute icon for muted matches */}
                    {mutedMatches.has(match.session_id) && (
                      <View style={{
                        position: 'absolute',
                        bottom: -4,
                        right: -4,
                        backgroundColor: isDark ? '#374151' : '#6b7280',
                        borderRadius: 12,
                        width: 24,
                        height: 24,
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderWidth: 2,
                        borderColor: isDark ? '#1a1a1a' : '#ffffff',
                        ...(Platform.OS === 'ios' ? {
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.3,
                          shadowRadius: 2,
                        } : {
                          elevation: 3,
                        })
                      }}>
                        <VolumeX size={12} color="#ffffff" />
                      </View>
                    )}
                  </TouchableOpacity>
                
                <View style={styles.matchInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={[styles.matchName, mutedMatches.has(match.session_id) && { opacity: 0.7 }]}>
                      {match.first_name}
                    </Text>
                    {mutedMatches.has(match.session_id) && (
                      <VolumeX size={14} color={isDark ? '#9ca3af' : '#6b7280'} style={{ marginLeft: 6 }} />
                    )}
                  </View>
                  <Text style={[styles.matchAge, mutedMatches.has(match.session_id) && { opacity: 0.7 }]}>
                    {match.age} years old{mutedMatches.has(match.session_id) ? ' • Muted' : ''}
                  </Text>
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
                      accessibilityRole="button"
                      accessibilityLabel={`Message ${match.first_name}`}
                      accessibilityHint={`Open chat with ${match.first_name}`}
                    >
                      <MessageCircle size={16} color="#6b7280" />
                      <Text style={styles.actionText}>Message</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.iconButton}
                      onPress={() => handleMuteMatch(match.session_id)}
                      accessibilityRole="button"
                      accessibilityLabel={mutedMatches.has(match.session_id) ? 'Unmute match' : 'Mute match'}
                      accessibilityHint={mutedMatches.has(match.session_id) ? 'Unmute notifications from this match' : 'Mute notifications from this match'}
                    >
                      {mutedMatches.has(match.session_id) ? (
                        <Volume2 size={20} color="#6b7280" />
                      ) : (
                        <VolumeX size={20} color="#6b7280" />
                      )}
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.iconButton}
                      onPress={() => handleUnmatch(match.session_id, match.first_name)}
                      accessibilityRole="button"
                      accessibilityLabel="Unmatch"
                      accessibilityHint="Remove this match and return them to discovery"
                    >
                      <UserX size={20} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            )
          })}
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
              accessibilityRole="button"
              accessibilityLabel="Browse singles"
              accessibilityHint="Navigate to discovery page to browse and like profiles"
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
          accessibilityRole="button"
          accessibilityLabel="Profile"
          accessibilityHint="Navigate to your profile page"
        >
          <User size={24} color="#9ca3af" />
          <Text style={styles.navButtonText}>Profile</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push('/discovery')}
          accessibilityRole="button"
          accessibilityLabel="Discover"
          accessibilityHint="Navigate to discovery page to browse profiles"
        >
          <Users size={24} color="#9ca3af" />
          <Text style={styles.navButtonText}>Discover</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.navButton, styles.navButtonActive]}
          onPress={() => {}} // Already on matches page
          accessibilityRole="button"
          accessibilityLabel="Matches"
          accessibilityHint="Currently on matches page"
          accessibilityState={{ selected: true }}
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