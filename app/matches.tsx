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
import { Heart, MessageCircle, Users, User, ArrowLeft, Flag } from 'lucide-react-native';
import { EventProfileAPI, LikeAPI, EventAPI } from '../lib/firebaseApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebaseConfig';
import UserProfileModal from '../lib/UserProfileModal';
import { sendMatchNotification, sendLikeNotification } from '../lib/notificationService';
import { updateUserActivity } from '../lib/messageNotificationHelper';

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

  // Debug: Monitor unreadMessages and matches state
  useEffect(() => {
    console.log('📱 Matches: unreadMessages state changed:', Array.from(unreadMessages));
    console.log('📱 Matches: matches array length:', matches.length);
    console.log('📱 Matches: Platform:', Platform.OS);
    matches.forEach(match => {
      console.log(`📱 Matches: Match ${match.first_name} (${match.session_id}) - has unread: ${unreadMessages.has(match.session_id)}`);
    });
  }, [unreadMessages, matches]);

  // Check for unseen messages - now handled when matches are loaded
  /*
  useEffect(() => {
    if (!currentEvent?.id || !currentSessionId) return;

    const checkUnseenMessages = async () => {
      try {
        console.log('📱 Matches: Checking unseen messages...');
        const { hasUnseenMessages } = await import('../lib/messageNotificationHelper');
        const hasUnseen = await hasUnseenMessages(currentEvent.id, currentSessionId);
        
        console.log('📱 Matches: Has unseen messages:', hasUnseen);
        
        if (hasUnseen) {
          // Get all messages sent TO the current user
          const { MessageAPI, EventProfileAPI } = await import('../lib/firebaseApi');
          const allMessages = await MessageAPI.filter({
            event_id: currentEvent.id,
            to_profile_id: currentUserProfile?.id
          });
          
          console.log('📱 Matches: Total messages received:', allMessages.length);
          
          // Filter for unseen messages only
          const unseenMessages = allMessages.filter(message => !message.seen);
          
          console.log('📱 Matches: Unseen messages:', unseenMessages.length);
          
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
              console.log('📱 Matches: Added unseen session:', senderProfiles[0].session_id);
            }
          }
          
          console.log('📱 Matches: Unseen session IDs:', Array.from(unseenSessionIds));
          setUnreadMessages(unseenSessionIds);
          
          // Debug: Log the current unreadMessages state
          console.log('📱 Matches: Current unreadMessages set:', Array.from(unseenSessionIds));
          console.log('📱 Matches: Number of matches:', matches.length);
          matches.forEach(match => {
            console.log(`📱 Matches: Match ${match.first_name} (${match.session_id}) - has unread: ${unseenSessionIds.has(match.session_id)}`);
          });
        } else {
          console.log('📱 Matches: No unseen messages, clearing unread set');
          setUnreadMessages(new Set());
        }
      } catch (error) {
        console.error('Error checking unseen messages:', error);
      }
    };

    checkUnseenMessages();
    
    // Check every 5 seconds instead of 30 for faster updates
    const interval = setInterval(checkUnseenMessages, 5000);
    return () => clearInterval(interval);
  }, [currentEvent?.id, currentSessionId, currentUserProfile?.id]);
  */

  // Real-time message listener for immediate unseen status updates
  useEffect(() => {
    if (!currentEvent?.id || !currentSessionId || !currentUserProfile?.id) return;

    try {
      const messagesQuery = query(
        collection(db, 'messages'),
        where('event_id', '==', currentEvent.id),
        where('to_profile_id', '==', currentUserProfile.id)
      );

      const unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
        // When messages change, immediately check unseen status
        try {
          console.log('📱 Matches: Real-time message listener triggered');
          console.log('📱 Matches: Snapshot size:', snapshot.docs.length);
          
          const { hasUnseenMessages } = await import('../lib/messageNotificationHelper');
          const hasUnseen = await hasUnseenMessages(currentEvent.id, currentSessionId);
          
          if (hasUnseen) {
            // Get all messages sent TO the current user
            const { MessageAPI, EventProfileAPI } = await import('../lib/firebaseApi');
            const allMessages = await MessageAPI.filter({
              event_id: currentEvent.id,
              to_profile_id: currentUserProfile.id
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
          } else {
            setUnreadMessages(new Set());
          }
          
          // Commented out toast logic since we now have a global listener in layout
          /*
          // Check for new messages and show toast notifications
          const newMessages = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as any))
            .filter(msg => msg.to_profile_id === currentUserProfile.id);
          
          console.log('📱 Matches: Messages sent to current user:', newMessages.length);
          
          // Get the latest new message
          if (newMessages.length > 0) {
            const latestMessage = newMessages[newMessages.length - 1];
            console.log('📱 Matches: Latest message:', {
              id: latestMessage.id,
              from: latestMessage.from_profile_id,
              to: latestMessage.to_profile_id,
              content: latestMessage.content?.substring(0, 50) + '...',
              created_at: latestMessage.created_at
            });
            
            const messageTime = typeof latestMessage.created_at === 'string' 
              ? new Date(latestMessage.created_at).getTime() 
              : latestMessage.created_at.toDate().getTime();
            const now = new Date().getTime();
            const tenSecondsAgo = now - (10 * 1000);
            
            console.log('📱 Matches: Time check:', {
              messageTime: new Date(messageTime),
              now: new Date(now),
              tenSecondsAgo: new Date(tenSecondsAgo),
              timeDiff: now - messageTime,
              isRecent: messageTime > tenSecondsAgo
            });
            
            // Show toast for recent messages (within last 10 seconds)
            if (messageTime > tenSecondsAgo) {
              console.log('📱 Matches: New message received - showing toast');
              
              // Get sender's profile to get their name
              const { EventProfileAPI } = await import('../lib/firebaseApi');
              const senderProfile = await EventProfileAPI.get(latestMessage.from_profile_id);
              
              if (senderProfile) {
                console.log('📱 Matches: Sender profile found:', senderProfile.first_name);
                // Show toast directly since we're the recipient
                const { showInAppMessageToast } = await import('../lib/messageNotificationHelper');
                showInAppMessageToast(senderProfile.first_name);
              } else {
                console.log('📱 Matches: Sender profile not found');
              }
            } else {
              console.log('📱 Matches: Message too old, not showing toast');
            }
          } else {
            console.log('📱 Matches: No messages sent to current user');
          }
          */
        } catch (error) {
          console.error('📱 Matches: Error checking unseen messages from real-time listener:', error);
        }
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up real-time message listener:', error);
    }
  }, [currentEvent?.id, currentSessionId, currentUserProfile?.id]);

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
            console.log('User profile not found in matches, redirecting to home');
            await AsyncStorage.multiRemove([
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
              console.log('📱 Matches: Checking unseen messages for user:', userProfile.first_name, 'ID:', userProfile.id, 'Platform:', Platform.OS);
              
              // Manual check for unseen messages
              const { MessageAPI, EventProfileAPI } = await import('../lib/firebaseApi');
              const allMessages = await MessageAPI.filter({
                event_id: currentEvent.id,
                to_profile_id: userProfile.id
              });
              
              console.log('📱 Matches: Manual check - Total messages received:', allMessages.length, 'Platform:', Platform.OS);
              console.log('📱 Matches: Manual check - Current user profile ID:', userProfile.id, 'Platform:', Platform.OS);
              
              // Filter for unseen messages only
              const unseenMessages = allMessages.filter(message => !message.seen);
              
              console.log('📱 Matches: Manual check - Unseen messages:', unseenMessages.length, 'Platform:', Platform.OS);
              console.log('📱 Matches: Manual check - All messages seen status:', allMessages.map(m => ({ id: m.id, seen: m.seen, from: m.from_profile_id, to: m.to_profile_id })));
              
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
                  console.log('📱 Matches: Manual check - Added unseen session:', senderProfiles[0].session_id, 'Platform:', Platform.OS);
                } else {
                  console.log('📱 Matches: Manual check - No sender profile found for message:', message.id, 'Platform:', Platform.OS);
                }
              }
              
              console.log('📱 Matches: Manual check - Unseen session IDs:', Array.from(unseenSessionIds), 'Platform:', Platform.OS);
              setUnreadMessages(unseenSessionIds);
              setHasUnreadMessages(unseenSessionIds.size > 0);
              
              // Also run the original hasUnseenMessages check for comparison
              const { hasUnseenMessages } = await import('../lib/messageNotificationHelper');
              const hasUnseen = await hasUnseenMessages(currentEvent.id, currentSessionId);
              console.log('📱 Matches: hasUnseenMessages function result:', hasUnseen, 'Platform:', Platform.OS);
              
            } catch (error) {
              console.error('Error checking unseen messages:', error);
            }
          };
          
          checkUnseenMessages();
          
          // Set up real-time message listener to update unseen messages
          const messagesQuery = query(
            collection(db, 'messages'),
            where('event_id', '==', currentEvent.id),
            where('to_profile_id', '==', userProfile.id)
          );

          const messagesUnsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
            try {
              console.log('📱 Matches: Real-time message listener triggered for user:', userProfile.first_name, 'Platform:', Platform.OS);
              console.log('📱 Matches: Snapshot size:', snapshot.size);
              
              // Manual check for unseen messages
              const { MessageAPI, EventProfileAPI } = await import('../lib/firebaseApi');
              const allMessages = await MessageAPI.filter({
                event_id: currentEvent.id,
                to_profile_id: userProfile.id
              });
              
              // Filter for unseen messages only
              const unseenMessages = allMessages.filter(message => !message.seen);
              
              console.log('📱 Matches: Real-time check - Unseen messages:', unseenMessages.length, 'Platform:', Platform.OS);
              
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
                  console.log('📱 Matches: Real-time check - Added unseen session:', senderProfiles[0].session_id, 'Platform:', Platform.OS);
                }
              }
              
              console.log('📱 Matches: Real-time check - Setting unreadMessages to:', Array.from(unseenSessionIds), 'Platform:', Platform.OS);
              setUnreadMessages(unseenSessionIds);
              setHasUnreadMessages(unseenSessionIds.size > 0);
              
            } catch (error) {
              console.error('Error in real-time message listener:', error);
            }
          });

          listenersRef.current.messages = messagesUnsubscribe;

          // Set up periodic check for unseen messages (every 5 seconds)
          const periodicCheck = setInterval(async () => {
            try {
              console.log('📱 Matches: Periodic check for unseen messages. Platform:', Platform.OS);
              
              // Manual check for unseen messages
              const { MessageAPI, EventProfileAPI } = await import('../lib/firebaseApi');
              const allMessages = await MessageAPI.filter({
                event_id: currentEvent.id,
                to_profile_id: userProfile.id
              });
              
              // Filter for unseen messages only
              const unseenMessages = allMessages.filter(message => !message.seen);
              
              console.log('📱 Matches: Periodic check - found unseen messages:', unseenMessages.length, 'Platform:', Platform.OS);
              
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
                  console.log('📱 Matches: Periodic check - added unseen session:', senderProfiles[0].session_id, 'Platform:', Platform.OS);
                }
              }
              
              console.log('📱 Matches: Periodic check - setting unreadMessages to:', Array.from(unseenSessionIds), 'Platform:', Platform.OS);
              setUnreadMessages(unseenSessionIds);
              setHasUnreadMessages(unseenSessionIds.size > 0);
              
            } catch (error) {
              console.error('Error in periodic check:', error);
            }
          }, 5000);
          
          listenersRef.current.periodicCheck = periodicCheck;
        } catch (error) {
          // Handle error silently
        }
              }, (error) => {
          // Handle error silently
        });

      listenersRef.current.userProfile = userProfileUnsubscribe;

    } catch (error) {
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

  // Check for unseen messages periodically
  useEffect(() => {
    if (!currentEvent?.id || !currentSessionId || !currentUserProfile?.id) return;

    const checkUnseenInterval = setInterval(async () => {
      try {
        const { hasUnseenMessages } = await import('../lib/messageNotificationHelper');
        const hasUnseen = await hasUnseenMessages(currentEvent.id, currentSessionId);
        
        if (hasUnseen) {
          // Get all messages sent TO the current user
          const { MessageAPI, EventProfileAPI } = await import('../lib/firebaseApi');
          const allMessages = await MessageAPI.filter({
            event_id: currentEvent.id,
            to_profile_id: currentUserProfile.id
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
        } else {
          setUnreadMessages(new Set());
          setHasUnreadMessages(false);
        }
      } catch (error) {
        console.error('Error in periodic unseen messages check:', error);
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(checkUnseenInterval);
  }, [currentEvent?.id, currentSessionId, currentUserProfile?.id]);

  // Force refresh unread messages when component mounts or user navigates to matches
  useEffect(() => {
    if (currentEvent?.id && currentSessionId && currentUserProfile?.id) {
      console.log('📱 Matches: Force refreshing unread messages. Platform:', Platform.OS);
      
      const refreshUnreadMessages = async () => {
        try {
          // Manual check for unseen messages
          const { MessageAPI, EventProfileAPI } = await import('../lib/firebaseApi');
          const allMessages = await MessageAPI.filter({
            event_id: currentEvent.id,
            to_profile_id: currentUserProfile.id
          });
          
          // Filter for unseen messages only
          const unseenMessages = allMessages.filter(message => !message.seen);
          
          console.log('📱 Matches: Force refresh - found unseen messages:', unseenMessages.length, 'Platform:', Platform.OS);
          
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
              console.log('📱 Matches: Force refresh - added unseen session:', senderProfiles[0].session_id, 'Platform:', Platform.OS);
            }
          }
          
          console.log('📱 Matches: Force refresh - setting unreadMessages to:', Array.from(unseenSessionIds), 'Platform:', Platform.OS);
          setUnreadMessages(unseenSessionIds);
          setHasUnreadMessages(unseenSessionIds.size > 0);
          
        } catch (error) {
          console.error('Error in force refresh:', error);
        }
      };
      
      refreshUnreadMessages();
    }
  }, [currentEvent?.id, currentSessionId, currentUserProfile?.id]);

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
        } catch (error) {
          console.error("Error in matches listener:", error);
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
        } catch (error) {
          console.error("Error in likes listener:", error);
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
          const mutualLikes = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as any[];

          // Filter to only include matches where this user is involved
          const userMatches = mutualLikes.filter(like => 
            like.liker_session_id === currentSessionId || like.liked_session_id === currentSessionId
          );

          // Check for new matches that haven't been notified yet
          for (const match of userMatches) {
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
                
                // Show native popup for user in the app
                Alert.alert(
                  "It's a Match!", 
                  `You and ${otherProfile.first_name} liked each other.`,
                  [
                    {
                      text: "Continue Browsing",
                      style: "cancel"
                    }
                  ]
                );

                // Mark as notified
                await LikeAPI.update(match.id, {
                  [isLiker ? 'liker_notified_of_match' : 'liked_notified_of_match']: true
                });
              }
            }
          }
        } catch (error) {
          console.error("Error in mutual matches listener:", error);
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

    } catch (error) {
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
    } catch (error) {
      // Handle error silently
    }
  };

  const initializeSession = async () => {
    try {
      setIsLoading(true);
      const eventId = await AsyncStorage.getItem('currentEventId');
      const sessionId = await AsyncStorage.getItem('currentSessionId');
      
      if (!eventId || !sessionId) {
        console.log('No event or session found, redirecting to home');
        router.replace('/home');
        return;
      }

      setCurrentSessionId(sessionId);
      
      const events = await EventAPI.filter({ id: eventId });
      if (events.length > 0) {
        setCurrentEvent(events[0]);
      } else {
        console.log('Event not found, redirecting to home');
        router.replace('/home');
        return;
      }

      // Matches are now handled by real-time listener
    } catch (error) {
      console.error('Error initializing matches session:', error);
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

    const eventId = await AsyncStorage.getItem('currentEventId');
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
      } catch (notificationError) {
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
          liker_notified_of_match: true
        });
        await LikeAPI.update(theirLikeRecord.id, { 
          is_mutual: true,
          liked_notified_of_match: true 
        });
        
        // 🎉 SEND PUSH NOTIFICATIONS TO BOTH USERS (for users not in the app)
        try {
          await Promise.all([
            sendMatchNotification(likerSessionId, likedProfile.first_name),
            sendMatchNotification(likedProfile.session_id, currentUserProfile.first_name)
          ]);
        } catch (notificationError) {
          // Handle notification error silently
        }

        // Note: Native popup will be shown by the real-time mutual matches listener
        // Match created! Native popup will be shown by real-time listener.
      }
    } catch (error) {
      console.error('Error creating like:', error);
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
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading your matches...</Text>
      </View>
    );
  }

  // Show hidden state if user is not visible
  if (currentUserProfile && !currentUserProfile.is_visible) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>
              Profile Hidden
            </Text>
            <Text style={styles.subtitle}>You are currently hidden from other users</Text>
          </View>
        </View>

        {/* Hidden State Content */}
        <View style={styles.hiddenStateContainer}>
          <View style={styles.hiddenStateContent}>
            <User size={64} color="#9ca3af" />
            <Text style={styles.hiddenStateTitle}>Your Profile is Hidden</Text>
            <Text style={styles.hiddenStateText}>
              While your profile is hidden, you cannot see other users and they cannot see you. 
              To access your matches again, make your profile visible in your profile settings.
            </Text>
            <TouchableOpacity
              style={styles.makeVisibleButton}
              onPress={() => router.push('/profile')}
              accessibilityLabel="Go to Profile"
              accessibilityHint="Navigate to profile settings to make your profile visible"
            >
              <Text style={styles.makeVisibleButtonText}>Go to Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Navigation */}
        <View style={styles.bottomNavigation}>
          <TouchableOpacity
            style={[styles.navButton, styles.navButtonActive]}
            onPress={() => router.push('/profile')}
          >
            <User size={24} color="#8b5cf6" />
            <Text style={[styles.navButtonText, styles.navButtonTextActive]}>Profile</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => router.push('/discovery')}
          >
            <Users size={24} color="#9ca3af" />
            <Text style={styles.navButtonText}>Discover</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => {}} // Already on matches page but hidden
          >
            <MessageCircle size={24} color="#9ca3af" />
            <Text style={styles.navButtonText}>Matches</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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

      {/* Matches List */}
      <ScrollView style={styles.matchesContainer}>
        {matches.length > 0 ? (
          <View style={styles.matchesList}>
            {matches.map((match) => (
              <TouchableOpacity
                key={match.id}
                style={[
                  styles.matchCard,
                  Platform.OS === 'android' && unreadMessages.has(match.session_id) && {
                    borderWidth: 3,
                    borderColor: '#ef4444',
                    backgroundColor: isDark ? '#2d1b1b' : '#fef2f2',
                    shadowColor: '#ef4444',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 8,
                  }
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
                    {/* Red dot for iOS only */}
                    {Platform.OS === 'ios' && unreadMessages.has(match.session_id) && (
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
                      }}>
                        <View style={{
                          width: 8,
                          height: 8,
                          backgroundColor: '#ffffff',
                          borderRadius: 4,
                        }} />
                      </View>
                    )}
                    
                    {/* Red dot for Android as well */}
                    {Platform.OS === 'android' && unreadMessages.has(match.session_id) && (
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