import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  AppState,
  Modal,
  useColorScheme,
} from 'react-native';
import { useNotifications } from '../lib/contexts/NotificationContext';
import { router } from 'expo-router';
import { Heart, Filter, Users, User, MessageCircle, X } from 'lucide-react-native';
import { EventProfileAPI, LikeAPI, EventAPI, BlockedMatchAPI } from '../lib/firebaseApi';
import * as Sentry from '@sentry/react-native';

import { AsyncStorageUtils } from '../lib/asyncStorageUtils';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebaseConfig';
import UserProfileModal from '../lib/UserProfileModal';

import { updateUserActivity } from '../lib/messageNotificationHelper';
import { usePerformanceMonitoring } from '../lib/hooks/usePerformanceMonitoring';

const { width } = Dimensions.get('window');
const gap = 8;
const cardSize = (width - 64 - gap * 2) / 3; // 3 columns with 16px padding on each side and 8px gap between cards

const BASIC_INTERESTS = [
  'music', 'tech', 'food', 'books', 'travel', 'art', 'fitness', 'nature', 'movies', 'business', 'photography', 'dancing'
];

const EXTENDED_INTERESTS = [
  'yoga', 'gaming', 'comedy', 'startups', 'fashion', 'spirituality', 'volunteering', 'crypto', 'cocktails', 'politics', 'hiking', 'design', 'podcasts', 'pets', 'wellness'
];



export default function Discovery() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const notifications = useNotifications();
  
  // Performance monitoring
  const { 
    trackUserInteraction, 
    trackAsyncOperation,
    trackCustomMetric
  } = usePerformanceMonitoring({ 
    screenName: 'discovery',
    enableScreenTracking: true,
    enableUserInteractionTracking: true 
  });
  const [profiles, setProfiles] = useState<any[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [filteredProfiles, setFilteredProfiles] = useState<any[]>([]);
  const [currentEvent, setCurrentEvent] = useState<any>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    age_min: 18,
    age_max: 99,
    interests: [] as string[]
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showExtendedInterests, setShowExtendedInterests] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [likedProfiles, setLikedProfiles] = useState(new Set<string>());
  const [blockedProfiles, setBlockedProfiles] = useState(new Set<string>());
  const [selectedProfileForDetail, setSelectedProfileForDetail] = useState<any>(null);
  const [isAppActive, setIsAppActive] = useState(true);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  
  // Single ref to hold all unsubscribe functions
  const listenersRef = useRef<{
    userProfile?: () => void;
    otherProfiles?: () => void;
    likes?: () => void;
    mutualMatches?: () => void;
  }>({});

  useEffect(() => {
    initializeSession();
  }, []);

  // Cleanup all listeners on unmount
  useEffect(() => {
    return () => {
      cleanupAllListeners();
    };
  }, []);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      setIsAppActive(nextAppState === 'active');
      
      // Update user activity when app becomes active
      if (nextAppState === 'active' && currentSessionId) {
        updateUserActivity(currentSessionId);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [currentSessionId]);

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

  // Check for unseen messages
  useEffect(() => {
    if (!currentEvent?.id || !currentSessionId) return;

    const checkUnseenMessages = async () => {
      try {
        const { hasUnseenMessages } = await import('../lib/messageNotificationHelper');
        const hasUnseen = await hasUnseenMessages(currentEvent.id, currentSessionId);
        setHasUnreadMessages(hasUnseen);
      } catch (error) {
        Sentry.captureException(error);
      }
    };

    checkUnseenMessages();
    
    // Check every 5 seconds instead of 30 for faster updates
    const interval = setInterval(checkUnseenMessages, 5000);
    return () => clearInterval(interval);
  }, [currentEvent?.id, currentSessionId]);

  // Real-time message listener for immediate unseen status updates
  useEffect(() => {
    if (!currentEvent?.id || !currentSessionId || !currentUserProfile?.id) return;

    try {
      const messagesQuery = query(
        collection(db, 'messages'),
        where('event_id', '==', currentEvent.id),
        where('to_profile_id', '==', currentUserProfile.id)
      );

      const unsubscribe = onSnapshot(messagesQuery, async () => {
        // When messages change, immediately check unseen status
        try {
          const { hasUnseenMessages } = await import('../lib/messageNotificationHelper');
          const hasUnseen = await hasUnseenMessages(currentEvent.id, currentSessionId);
          setHasUnreadMessages(hasUnseen);
        } catch (error) {
          Sentry.captureException(error);
        }
      });

      return () => unsubscribe();
    } catch (error) {
      Sentry.captureException(error);
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
      // 1. User profile listener
      const userProfileQuery = query(
        collection(db, 'event_profiles'),
        where('event_id', '==', currentEvent.id),
        where('session_id', '==', currentSessionId)
      );

      const userProfileUnsubscribe = onSnapshot(userProfileQuery, (userSnapshot) => {
        try {
          const userProfiles = userSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as any[];
          const userProfile = userProfiles[0];
          setCurrentUserProfile(userProfile);

          if (!userProfile) {
            AsyncStorageUtils.multiRemove([
              'currentEventId',
              'currentSessionId',
              'currentEventCode',
              'currentProfileColor',
              'currentProfilePhotoUrl'
            ]).then(() => {
              router.replace('/home');
            });
            return;
          }

          // If user is not visible, don't load other profiles and show hidden state
          if (!userProfile.is_visible) {
            setProfiles([]);
            setFilteredProfiles([]);
            // Clean up other listeners when user is not visible
            if (listenersRef.current.otherProfiles) {
              listenersRef.current.otherProfiles();
              listenersRef.current.otherProfiles = undefined;
            }
            if (listenersRef.current.likes) {
              listenersRef.current.likes();
              listenersRef.current.likes = undefined;
            }
          } else {
            // User is visible, set up other listeners only if they don't exist
            if (!listenersRef.current.otherProfiles && !listenersRef.current.likes) {
              setupOtherListeners();
            }
          }
        } catch (error) {
          Sentry.captureException(error);
        }
      }, (error) => {
        Sentry.captureException(error);
      });

      listenersRef.current.userProfile = userProfileUnsubscribe;

    } catch (error) {
      Sentry.captureException(error);
    }

    return () => {
      cleanupAllListeners();
    };
  }, [currentEvent?.id, currentSessionId]);

  const setupOtherListeners = () => {
    if (!currentEvent?.id || !currentSessionId) return;

    // Prevent multiple listener creation
    if (listenersRef.current.otherProfiles || listenersRef.current.likes) {
      return;
    }

    try {
      // 2. Other visible profiles listener
      const otherProfilesQuery = query(
        collection(db, 'event_profiles'),
        where('event_id', '==', currentEvent.id),
        where('is_visible', '==', true)
      );

      const otherProfilesUnsubscribe = onSnapshot(otherProfilesQuery, (otherSnapshot) => {
        try {
          const allVisibleProfiles = otherSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as any[];
          const otherUsersProfiles = allVisibleProfiles.filter(p => 
            p.session_id !== currentSessionId && !blockedProfiles.has(p.session_id)
          );
          setProfiles(otherUsersProfiles);
        } catch (error) {
          Sentry.captureException(error);
        }
              }, (error) => {
          Sentry.captureException(error);
        });

      listenersRef.current.otherProfiles = otherProfilesUnsubscribe;

      // 3. Likes listener
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
          Sentry.captureException(error);
        }
              }, (error) => {
          Sentry.captureException(error);
        });

      listenersRef.current.likes = likesUnsubscribe;

      // 4. Mutual matches listener - for real-time match notifications (handled globally in _layout.tsx)
      const mutualMatchesQuery = query(
        collection(db, 'likes'),
        where('event_id', '==', currentEvent.id),
        where('is_mutual', '==', true)
      );

      const mutualMatchesUnsubscribe = onSnapshot(mutualMatchesQuery, async () => {
        // Match notifications are now handled globally in _layout.tsx
        // This listener is kept for any future local match-related functionality
      }, (error) => {
        Sentry.captureException(error);
      });

      listenersRef.current.mutualMatches = mutualMatchesUnsubscribe;

    } catch (error) {
      Sentry.captureException(error);
    }
  };

  const cleanupAllListeners = () => {
    try {
      // Clean up user profile listener
      if (listenersRef.current.userProfile) {
        try {
          listenersRef.current.userProfile();
        } catch (error) {
          Sentry.captureException(error);
        }
        listenersRef.current.userProfile = undefined;
      }
      
      // Clean up other profiles listener
      if (listenersRef.current.otherProfiles) {
        try {
          listenersRef.current.otherProfiles();
        } catch (error) {
          Sentry.captureException(error);
        }
        listenersRef.current.otherProfiles = undefined;
      }
      
      // Clean up likes listener
      if (listenersRef.current.likes) {
        try {
          listenersRef.current.likes();
        } catch (error) {
          Sentry.captureException(error);
        }
        listenersRef.current.likes = undefined;
      }
      
      // Clean up mutual matches listener
      if (listenersRef.current.mutualMatches) {
        try {
          listenersRef.current.mutualMatches();
        } catch (error) {
          Sentry.captureException(error);
        }
        listenersRef.current.mutualMatches = undefined;
      }
    } catch (error) {
      Sentry.captureException(error);
    }
  };

  const loadBlockedProfiles = async (eventId: string, sessionId: string) => {
    try {
      const blocked = await BlockedMatchAPI.filter({
        event_id: eventId,
        blocker_session_id: sessionId
      });
      setBlockedProfiles(new Set(blocked.map(b => b.blocked_session_id)));
    } catch (error) {
      Sentry.captureException(error);
    }
  };

  // Apply filters whenever profiles or currentUserProfile changes
  useEffect(() => {
    applyFilters();
  }, [profiles, currentUserProfile, filters, blockedProfiles]);

  const initializeSession = async () => {
          const eventId = await AsyncStorageUtils.getItem<string>('currentEventId');
      const sessionId = await AsyncStorageUtils.getItem<string>('currentSessionId');
      const profilePhotoUrl = await AsyncStorageUtils.getItem<string>('currentProfilePhotoUrl');
    
    if (!eventId || !sessionId) {
      router.replace('/home');
      return;
    }

    setCurrentSessionId(sessionId);
    
    try {
      // Add timeout to prevent hanging indefinitely
      const eventTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Event loading timeout')), 15000); // 15 second timeout
      });
      
      const eventPromise = EventAPI.filter({ id: eventId });
      const events = await Promise.race([eventPromise, eventTimeoutPromise]);
      
      if (events.length > 0) {
        setCurrentEvent(events[0]);
        // Load blocked profiles
        await loadBlockedProfiles(eventId, sessionId);
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
      const profileTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Profile loading timeout')), 15000); // 15 second timeout
      });
      
      const profilePromise = EventProfileAPI.filter({
        event_id: eventId,
        session_id: sessionId
      });
      const userProfiles = await Promise.race([profilePromise, profileTimeoutPromise]);

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

      // Check if user has completed profile creation (has profile photo)
      if (!profilePhotoUrl) {
        // User hasn't completed profile creation, redirecting to consent
        router.replace('/consent');
        return;
      }

      // Likes are now handled by real-time listener
    } catch (error) {
      Sentry.captureException(error);
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
    setIsLoading(false);
  };



  const applyFilters = () => {
    if (!currentUserProfile) {
      setFilteredProfiles([]);
      return;
    }

    let tempFiltered = profiles.filter(otherUser => {
      // Mutual Gender Interest Check - based on user's profile preferences
      const iAmInterestedInOther =
        (currentUserProfile.interested_in === 'everybody') ||
        (currentUserProfile.interested_in === 'men' && otherUser.gender_identity === 'man') ||
        (currentUserProfile.interested_in === 'women' && otherUser.gender_identity === 'woman');

      const otherIsInterestedInMe =
        (otherUser.interested_in === 'everybody') ||
        (otherUser.interested_in === 'men' && currentUserProfile.gender_identity === 'man') ||
        (otherUser.interested_in === 'women' && currentUserProfile.gender_identity === 'woman');
      
      if (!iAmInterestedInOther || !otherIsInterestedInMe) {
        return false;
      }

      // Age Range Filter
      if (!(otherUser.age >= filters.age_min && otherUser.age <= filters.age_max)) {
        return false;
      }

      // Shared Interests Filter
      if (filters.interests.length > 0) {
        if (!otherUser.interests?.some((interest: any) => filters.interests.includes(interest))) {
          return false;
        }
      }
      
      return true;
    });

    setFilteredProfiles(tempFiltered);
  };

  const handleLike = async (likedProfile: any) => {
    if (likedProfiles.has(likedProfile.session_id) || !currentUserProfile) return;

    const eventId = await AsyncStorageUtils.getItem<string>('currentEventId');
    const likerSessionId = currentUserProfile.session_id;

    if (!eventId) return;

    // Track user interaction
    await trackUserInteraction('like_profile');

    // Check if both profiles are visible (required by Firestore rules)
    if (!currentUserProfile.is_visible || !likedProfile.is_visible) {
      notifications.warning("Both profiles must be visible to like someone. Please make sure your profile is visible in settings.");
      return;
    }

    try {
      // Optimistically update UI
      setLikedProfiles(prev => new Set([...prev, likedProfile.session_id]));

      const newLike = await trackAsyncOperation('create_like', async () => {
        return await LikeAPI.create({
          event_id: eventId,
          from_profile_id: currentUserProfile.id,
          to_profile_id: likedProfile.id,
          liker_session_id: likerSessionId,
          liked_session_id: likedProfile.session_id,
          is_mutual: false,
          liker_notified_of_match: false,
          liked_notified_of_match: false
        });
      });

      // Like notification handled by centralized system

      // Check for mutual match
      const theirLikesToMe = await trackAsyncOperation('check_mutual_like', async () => {
        return await LikeAPI.filter({
          event_id: eventId,
          liker_session_id: likedProfile.session_id,
          liked_session_id: likerSessionId,
        });
      });

      if (theirLikesToMe.length > 0) {
        // They already liked us! This creates a mutual match
        const theirLikeRecord = theirLikesToMe[0];

        // Update both records for mutual match
        await trackAsyncOperation('update_like_mutual', async () => {
          await Promise.all([
            LikeAPI.update(newLike.id, { 
              is_mutual: true,
              liker_notified_of_match: false // Don't mark as notified yet, let the listener handle it
            }),
            LikeAPI.update(theirLikeRecord.id, { 
              is_mutual: true,
              liked_notified_of_match: false // Don't mark as notified yet, let the listener handle it
            })
          ]);
        });
        
        // Track match metric
        await trackCustomMetric('matches_count', 1);
        
        // 🎉 CORRECTED LOGIC: 
        // - First liker (User B) gets toast/push notification
        // - Second liker (User A, match creator) gets alert
        
        // Match notification handled by centralized system

        // Note: All match notifications (toast/alert) will be handled by the mutual matches listener
        // This prevents duplicate notifications and ensures correct timing
        // The listener will determine who gets toast vs alert based on liker/liked roles
      }
    } catch (error) {
      Sentry.captureException(error);
      // Revert optimistic update on error
      setLikedProfiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(likedProfile.session_id);
        return newSet;
      });
      
      // Show user-friendly error message
      notifications.error("Unable to like this person. Please try again.");
    }
  };
  
  const handleProfileTap = (profile: any) => {
    setSelectedProfileForDetail(profile);
  };



  const handleToggleInterest = (interest: string) => {
    let newInterests = [...filters.interests];
    if (newInterests.includes(interest)) {
      newInterests = newInterests.filter(i => i !== interest);
    } else if (newInterests.length < 3) {
      newInterests.push(interest);
    }
    setFilters(prev => ({ ...prev, interests: newInterests }));
  };

  const handleApplyFilters = () => {
    setShowFilters(false);
    setShowExtendedInterests(false);
  };

  const handleResetFilters = () => {
    setFilters({
      age_min: 18,
      age_max: 99,
      interests: []
    });
    setShowExtendedInterests(false);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#2d2d2d' : 'white',
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
      paddingTop: 8,
    },
    logoContainer: {
      alignItems: 'flex-start',
      paddingVertical: 0,
      paddingHorizontal: 16,
    },
    logo: {
      width: 120,
      height: 36,
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
    filterButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark ? '#404040' : '#d1d5db',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#2d2d2d' : 'white',
    },
    profilesContainer: {
      flex: 1,
      paddingHorizontal: 16,
    },
    profilesGrid: {
      paddingHorizontal: 16,
    },
    profileCard: {
      width: cardSize,
      backgroundColor: isDark ? '#2d2d2d' : 'white',
      borderRadius: 16,
      padding: 6,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    profileImageContainer: {
      width: cardSize - 12,
      height: cardSize - 12,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 8,
      backgroundColor: isDark ? '#404040' : '#e5e7eb',
      alignItems: 'center',
      justifyContent: 'center',
    },
    profileImage: {
      width: '100%',
      height: '100%',
      borderRadius: 12,
    },
    fallbackAvatar: {
      width: cardSize - 12,
      height: cardSize - 12,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#404040' : '#cccccc',
    },
    fallbackText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: 'white',
    },
    likeButton: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    likeButtonActive: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
    },
    nameOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.8)',
      padding: 8,
    },
    profileName: {
      fontSize: 14,
      fontWeight: '600',
      color: '#ffffff',
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
    adjustFiltersButton: {
      borderWidth: 1,
      borderColor: isDark ? '#404040' : '#d1d5db',
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 24,
      backgroundColor: isDark ? '#2d2d2d' : 'white',
    },
    adjustFiltersButtonText: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
      fontWeight: '500',
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
      color: isDark ? '#ffffff' : '#1f2937',
    },
    // Filter Modal Styles
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalCard: {
      backgroundColor: isDark ? '#2d2d2d' : 'white',
      borderRadius: 20,
      padding: 24,
      width: Math.min(Dimensions.get('window').width * 0.9, 400), // Responsive width: 90% of screen width, max 400px
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: isDark ? '#ffffff' : '#1f2937',
    },
    filterSection: {
      marginBottom: 24,
    },
    filterSectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#ffffff' : '#1f2937',
      marginBottom: 12,
    },
    ageRangeContainer: {
      marginBottom: 16,
    },
    ageRangeText: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
      textAlign: 'center',
      marginBottom: 12,
    },
    sliderContainer: {
      gap: 16,
    },
    slider: {
      width: '100%',
      height: 40,
    },

    interestsContainer: {
      maxHeight: 200,
    },
    interestsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
      gap: 8,
    },
    interestOption: {
      backgroundColor: isDark ? '#404040' : '#f3f4f6',
      borderRadius: 20,
      paddingVertical: 10,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: '30%',
    },
    interestOptionSelected: {
      backgroundColor: '#8b5cf6',
    },
    interestOptionText: {
      fontSize: 14,
      color: isDark ? '#ffffff' : '#374151',
      textAlign: 'center',
    },
    interestOptionTextSelected: {
      color: 'white',
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      marginTop: 16,
    },
    resetButton: {
      flex: 1,
      backgroundColor: isDark ? '#404040' : '#f3f4f6',
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    resetButtonText: {
      fontSize: 16,
      color: isDark ? '#9ca3af' : '#6b7280',
      fontWeight: '600',
    },
    applyButton: {
      flex: 1,
      backgroundColor: '#8b5cf6',
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    applyButtonText: {
      fontSize: 16,
      color: 'white',
      fontWeight: '600',
    },
    interestsSection: {
      marginBottom: 16,
    },
    interestsSectionHeader: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: isDark ? '#404040' : '#f3f4f6',
      borderRadius: 12,
      marginBottom: 8,
    },
    interestsSectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#ffffff' : '#1f2937',
    },
    toggleIcon: {
      fontSize: 16,
      color: isDark ? '#9ca3af' : '#6b7280',
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
    profileRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      width: '100%',
      marginBottom: 8,
      gap: 8,
    },
    headerButtons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    visibilityButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark ? '#404040' : '#d1d5db',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#2d2d2d' : 'white',
    },
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading singles at this event...</Text>
      </View>
    );
  }

  // Show hidden state if user is not visible
  if (currentUserProfile && !currentUserProfile.is_visible) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
        {/* Logo Section */}
        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/Hooked Full Logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

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
              You can still access your matches and chat with them. To start discovering people again, make your profile visible.
            </Text>
            <TouchableOpacity
              style={styles.makeVisibleButton}
              onPress={() => router.push('/profile')}
              accessibilityRole="button"
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
            accessibilityRole="button"
            accessibilityLabel="Profile Tab"
            accessibilityHint="Navigate to your profile settings"
          >
            <User size={24} color="#8b5cf6" />
            <Text style={[styles.navButtonText, styles.navButtonTextActive]}>Profile</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => {}} // Already on discovery page but hidden
            accessibilityRole="button"
            accessibilityLabel="Discover"
            accessibilityHint="Currently on discovery page"
          >
            <Users size={24} color="#9ca3af" />
            <Text style={styles.navButtonText}>Discover</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => router.push('/matches')}
            accessibilityRole="button"
            accessibilityLabel="Matches Tab"
            accessibilityHint="Navigate to your matches"
          >
            <MessageCircle size={24} color="#9ca3af" />
            <Text style={styles.navButtonText}>Matches</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
      {/* Logo Section */}
      <View style={styles.logoContainer}>
        <Image 
          source={require('../assets/Hooked Full Logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>
            Singles at {currentEvent?.name}
          </Text>
          <Text style={styles.subtitle}>{filteredProfiles.length} people discovered</Text>
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
          accessibilityRole="button"
          accessibilityLabel="Filter Profiles"
          accessibilityHint="Open filters to customize your discovery preferences"
        >
          <Filter size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Profiles Grid */}
      <ScrollView style={styles.profilesContainer}>
        <View style={styles.profilesGrid}>
          {(() => {
            const rows = [];
            for (let i = 0; i < filteredProfiles.length; i += 3) {
              const rowProfiles = filteredProfiles.slice(i, i + 3);
              rows.push(
                <View key={i} style={styles.profileRow}>
                  {rowProfiles.map((profile) => (
                    <TouchableOpacity
                      key={profile.id}
                      style={styles.profileCard}
                      onPress={() => handleProfileTap(profile)}
                      accessibilityRole="button"
                      accessibilityLabel={`View ${profile.first_name}'s Profile`}
                      accessibilityHint={`Tap to view ${profile.first_name}'s full profile details`}
                    >
                      <View style={styles.profileImageContainer}>
                        {profile.profile_photo_url ? (
                          <Image
                            source={{ uri: profile.profile_photo_url }}
        onError={() => {}}
                            style={styles.profileImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={[styles.fallbackAvatar, { backgroundColor: profile.profile_color || '#cccccc' }]}>
                            <Text style={styles.fallbackText}>{profile.first_name[0]}</Text>
                          </View>
                        )}
                        
                        {/* Like Button Overlay */}
                        <TouchableOpacity
                          style={[
                            styles.likeButton,
                            likedProfiles.has(profile.session_id) && styles.likeButtonActive
                          ]}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleLike(profile);
                          }}
                          disabled={likedProfiles.has(profile.session_id)}
                          accessibilityRole="button"
                          accessibilityLabel={likedProfiles.has(profile.session_id) ? `Already liked ${profile.first_name}` : `Like ${profile.first_name}`}
                          accessibilityHint={likedProfiles.has(profile.session_id) ? "You have already liked this profile" : "Add like to this profile"}
                          accessibilityState={{ disabled: likedProfiles.has(profile.session_id) }}
                        >
                          <Heart 
                            size={16} 
                            color={likedProfiles.has(profile.session_id) ? '#ec4899' : '#9ca3af'} 
                            fill={likedProfiles.has(profile.session_id) ? '#ec4899' : 'none'}
                          />
                        </TouchableOpacity>

                        {/* Name Overlay */}
                        <View style={styles.nameOverlay}>
                          <Text style={styles.profileName}>{profile.first_name}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              );
            }
            return rows;
          })()}
        </View>

        {filteredProfiles.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <Users size={48} color="#9ca3af" />
            <Text style={styles.emptyTitle}>No singles found</Text>
            <Text style={styles.emptyText}>
              Try adjusting your filters or check back later as more people join the event.
            </Text>
            <TouchableOpacity
              style={styles.adjustFiltersButton}
              onPress={() => setShowFilters(true)}
              accessibilityRole="button"
              accessibilityLabel="Adjust Filters"
              accessibilityHint="Open filters to adjust your discovery preferences"
            >
              <Text style={styles.adjustFiltersButtonText}>Adjust Filters</Text>
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
          style={[styles.navButton, styles.navButtonActive]}
          onPress={() => {}} // Already on discovery page
          accessibilityRole="button"
          accessibilityLabel="Discover"
          accessibilityHint="Currently on discovery page"
          accessibilityState={{ selected: true }}
        >
          <Users size={24} color="#8b5cf6" />
          <Text style={[styles.navButtonText, styles.navButtonTextActive]}>Discover</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push('/matches')}
          accessibilityRole="button"
          accessibilityLabel="Matches"
          accessibilityHint="Navigate to your matches page"
        >
          <View style={{ position: 'relative' }}>
            <MessageCircle size={24} color="#9ca3af" />
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
          <Text style={styles.navButtonText}>Matches</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Modal */}
      <Modal visible={showFilters} transparent animationType="slide" onRequestClose={() => setShowFilters(false)} accessibilityViewIsModal={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)} accessibilityRole="button" accessibilityLabel="Close filters" accessibilityHint="Close the filters modal">
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Age Range */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Age Range</Text>
              <View style={styles.ageRangeContainer}>
                <Text style={styles.ageRangeText}>
                  {filters.age_min} - {filters.age_max} years
                </Text>
                <View style={styles.sliderContainer}>
                  <Slider
                    style={styles.slider}
                    minimumValue={18}
                    maximumValue={99}
                    value={filters.age_min}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, age_min: Math.round(value) }))}
                    minimumTrackTintColor="#8b5cf6"
                    maximumTrackTintColor="#d1d5db"
                    thumbTintColor="#8b5cf6"
                  />
                  <Slider
                    style={styles.slider}
                    minimumValue={18}
                    maximumValue={99}
                    value={filters.age_max}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, age_max: Math.round(value) }))}
                    minimumTrackTintColor="#8b5cf6"
                    maximumTrackTintColor="#d1d5db"
                    thumbTintColor="#8b5cf6"
                  />
                </View>
              </View>
            </View>



            {/* Interests Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Interests (up to 3)</Text>
              <ScrollView 
                style={styles.interestsContainer} 
                showsVerticalScrollIndicator={false}
                horizontal={false}
                showsHorizontalScrollIndicator={false}
              >
                {/* Basic Interests - Always Visible */}
                <View style={styles.interestsSection}>
                  <View style={styles.interestsGrid}>
                    {BASIC_INTERESTS.map((interest) => (
                      <TouchableOpacity
                        key={interest}
                        style={[
                          styles.interestOption,
                          filters.interests.includes(interest) && styles.interestOptionSelected
                        ]}
                        onPress={() => handleToggleInterest(interest)}
                        disabled={!filters.interests.includes(interest) && filters.interests.length >= 3}
                        accessibilityRole="button"
                        accessibilityLabel={`${interest.charAt(0).toUpperCase() + interest.slice(1)}`}
                        accessibilityHint={filters.interests.includes(interest) ? "Remove this interest filter" : "Add this interest filter"}
                        accessibilityState={{ 
                          selected: filters.interests.includes(interest),
                          disabled: !filters.interests.includes(interest) && filters.interests.length >= 3
                        }}
                      >
                        <Text style={[
                          styles.interestOptionText,
                          filters.interests.includes(interest) && styles.interestOptionTextSelected
                        ]}>
                          {interest.charAt(0).toUpperCase() + interest.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Extended Interests - Collapsible */}
                <View style={styles.interestsSection}>
                  <TouchableOpacity 
                    style={styles.interestsSectionHeader}
                    onPress={() => setShowExtendedInterests(!showExtendedInterests)}
                    accessibilityRole="button"
                    accessibilityLabel={`${showExtendedInterests ? 'Hide' : 'Show'} extended interests`}
                    accessibilityHint="Toggle visibility of additional interest options"
                  >
                    <Text style={styles.toggleIcon}>{showExtendedInterests ? '↑' : '↓'}</Text>
                  </TouchableOpacity>
                  
                  {showExtendedInterests && (
                    <View style={styles.interestsGrid}>
                      {EXTENDED_INTERESTS.map((interest) => (
                        <TouchableOpacity
                          key={interest}
                          style={[
                            styles.interestOption,
                            filters.interests.includes(interest) && styles.interestOptionSelected
                          ]}
                          onPress={() => handleToggleInterest(interest)}
                          disabled={!filters.interests.includes(interest) && filters.interests.length >= 3}
                          accessibilityRole="button"
                          accessibilityLabel={`${interest.charAt(0).toUpperCase() + interest.slice(1)}`}
                          accessibilityHint={filters.interests.includes(interest) ? "Remove this interest filter" : "Add this interest filter"}
                          accessibilityState={{ 
                            selected: filters.interests.includes(interest),
                            disabled: !filters.interests.includes(interest) && filters.interests.length >= 3
                          }}
                        >
                          <Text style={[
                            styles.interestOptionText,
                            filters.interests.includes(interest) && styles.interestOptionTextSelected
                          ]}>
                            {interest.charAt(0).toUpperCase() + interest.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </ScrollView>
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.resetButton} onPress={handleResetFilters} accessibilityRole="button" accessibilityLabel="Reset filters" accessibilityHint="Reset all filters to default values">
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={handleApplyFilters} accessibilityRole="button" accessibilityLabel="Apply filters" accessibilityHint="Apply the selected filters and close the modal">
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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