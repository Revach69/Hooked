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
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Heart, MessageCircle, Users, User, UserX, VolumeX, Volume2, Flag } from 'lucide-react-native';
import { EventProfileAPI, LikeAPI, EventAPI, MessageAPI, MutedMatchAPI, ReportAPI } from '../lib/firebaseApi';
import * as Sentry from '@sentry/react-native';
import { AsyncStorageUtils } from '../lib/asyncStorageUtils';
import { ImageCacheService } from '../lib/services/ImageCacheService';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebaseConfig';
import CountdownTimer from '../lib/components/CountdownTimer';
import UserProfileModal from '../lib/UserProfileModal';
import DropdownMenu from '../components/DropdownMenu';
import { GlobalDataCache, CacheKeys } from '../lib/cache/GlobalDataCache';

import { updateUserActivity } from '../lib/messageNotificationHelper';
import { setMuteStatus } from '../lib/utils/notificationUtils';


export default function Matches() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [matches, setMatches] = useState<any[]>([]);
  const [currentEvent, setCurrentEvent] = useState<any>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [selectedProfileForDetail, setSelectedProfileForDetail] = useState<any>(null);
  const [likedProfiles, setLikedProfiles] = useState<Set<string>>(new Set());
  const [unreadMessages, setUnreadMessages] = useState<Set<string>>(new Set());
  const [isAppActive, setIsAppActive] = useState(true);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [mutedMatches, setMutedMatches] = useState<Set<string>>(new Set());
  const [unmatchingUsers, setUnmatchingUsers] = useState<Set<string>>(new Set());
  const [cachedImageUris, setCachedImageUris] = useState<Map<string, string>>(new Map());
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingMatch, setReportingMatch] = useState<any>(null);
  const [reportReason, setReportReason] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const eventId = currentEvent?.id || await AsyncStorageUtils.getItem<string>('currentEventId');
      const sessionId = currentSessionId || await AsyncStorageUtils.getItem<string>('currentSessionId');
      
      if (eventId && sessionId) {
        console.log('Pull-to-refresh: Reloading all matches data');
        
        // Reload muted matches
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const { db } = await import('../lib/firebaseConfig');
        
        const mutedQuery = query(
          collection(db, 'muted_matches'),
          where('event_id', '==', eventId),
          where('muter_session_id', '==', sessionId)
        );
        
        const snapshot = await getDocs(mutedQuery);
        const mutedSessionIds = snapshot.docs.map(doc => doc.data().muted_session_id);
        setMutedMatches(new Set(mutedSessionIds));
        
        // 🔄 NEW: Refresh latest messages for all matches on pull-to-refresh
        if (matches.length > 0) {
          console.log('Pull-to-refresh: Refreshing latest messages for all matches');
          try {
            await fetchLatestMessagesForMatches(matches);
            console.log('✅ Pull-to-refresh: Successfully refreshed latest messages');
          } catch (error) {
            console.warn('⚠️ Pull-to-refresh: Failed to refresh latest messages:', error);
          }
        }
        
        console.log('Pull-to-refresh: Data refreshed successfully');
      }
    } catch (error) {
      console.error('Pull-to-refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [currentEvent?.id, currentSessionId]);

  // Single ref to hold all unsubscribe functions
  const listenersRef = useRef<{
    userProfile?: () => void;
    matches?: () => void;
    likes?: () => void;
    // mutualMatches removed - handled by GlobalNotificationService
    messages?: () => void;
    periodicCheck?: number;
  }>({});

  // Cache for latest messages to prevent losing data on navigation
  const latestMessagesCache = useRef<Map<string, any>>(new Map());
  
  // Fetch latest messages for all matches when entering the page
  const fetchLatestMessagesForMatches = useCallback(async (matchProfiles: any[]) => {
    if (!currentEvent?.id || !currentUserProfile?.id || !matchProfiles.length) return;

    console.log('Fetching latest messages for', matchProfiles.length, 'matches');

    try {
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('../lib/firebaseConfig');

      // Fetch messages for each match
      const messagePromises = matchProfiles.map(async (profile) => {
        try {
          // Check cache first - if we have recent data, use it immediately
          const cachedMessage = latestMessagesCache.current.get(profile.session_id);
          const cacheTime = cachedMessage?.fetchedAt || 0;
          const isCacheRecent = Date.now() - cacheTime < 30000; // 30 seconds
          console.log(`Cache status for ${profile.first_name}: ${isCacheRecent ? 'recent' : 'stale'}`);  // Use the variable

          // Get all messages for this conversation
          const messagesFromUserQuery = query(
            collection(db, 'messages'),
            where('event_id', '==', currentEvent.id),
            where('from_profile_id', '==', currentUserProfile.id),
            where('to_profile_id', '==', profile.id)
          );
          
          const messagesToUserQuery = query(
            collection(db, 'messages'),
            where('event_id', '==', currentEvent.id),
            where('from_profile_id', '==', profile.id),
            where('to_profile_id', '==', currentUserProfile.id)
          );

          const [fromUserSnapshot, toUserSnapshot] = await Promise.all([
            getDocs(messagesFromUserQuery),
            getDocs(messagesToUserQuery)
          ]);

          const allMessages = [
            ...fromUserSnapshot.docs.map(doc => doc.data()),
            ...toUserSnapshot.docs.map(doc => doc.data())
          ];

          if (allMessages.length > 0) {
            allMessages.sort((a, b) => {
              const aTime = a.created_at?.toMillis?.() || a.created_at || 0;
              const bTime = b.created_at?.toMillis?.() || b.created_at || 0;
              return bTime - aTime;
            });

            const latestMessage = allMessages[0];
            const messageData = {
              ...latestMessage,
              fetchedAt: Date.now() // Add timestamp for cache management
            };

            // Cache the message
            latestMessagesCache.current.set(profile.session_id, messageData);
            
            console.log(`Updated message cache for ${profile.first_name}:`, {
              content: latestMessage?.content?.substring(0, 30) || latestMessage?.message?.substring(0, 30),
              messageCount: allMessages.length
            });

            return { sessionId: profile.session_id, message: messageData };
          }
        } catch (error) {
          console.warn(`Error fetching messages for ${profile.first_name}:`, error instanceof Error ? error.message : 'Unknown error');
        }
        return { sessionId: profile.session_id, message: null };
      });

      await Promise.all(messagePromises);
      console.log('Finished fetching latest messages for all matches');

    } catch (error) {
      console.error('Error in fetchLatestMessagesForMatches:', error);
    }
  }, [currentEvent?.id, currentUserProfile?.id]);

  useEffect(() => {
    // Move initializeSession inside useEffect to resolve dependency issue
    async function initializeSession() {
      try {
        const eventId = await AsyncStorageUtils.getItem<string>('currentEventId');
        const sessionId = await AsyncStorageUtils.getItem<string>('currentSessionId');
        
        if (!eventId || !sessionId) {
          // No session data - redirect to home for normal flow
          router.replace('/home');
          return;
        }

        setCurrentSessionId(sessionId);
        
        let eventData = null;
        
        // Check cache first for event data
        const cachedEvent = GlobalDataCache.get<any>(CacheKeys.MATCHES_EVENT);
        if (cachedEvent && cachedEvent.id === eventId) {
          setCurrentEvent(cachedEvent);
          eventData = cachedEvent;
          console.log('Matches: Using cached event data');
        } else {
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Event lookup timeout')), 15000); // 15 seconds
          });
          
          const eventPromise = EventAPI.filter({ id: eventId });
          const events = await Promise.race([eventPromise, timeoutPromise]);
          
          if (events.length > 0) {
            eventData = events[0];
            setCurrentEvent(eventData);
            GlobalDataCache.set(CacheKeys.MATCHES_EVENT, eventData, 10 * 60 * 1000); // Cache for 10 minutes
            console.log('Matches: Loaded and cached event data');
          }
        }
        
        if (!eventData) {
          // Event doesn't exist - clear only after confirmation
          console.log('Event not found, clearing session data');
          await AsyncStorageUtils.multiRemove([
            'currentEventId',
            'currentSessionId',
            'currentEventCode'
          ]);
          router.replace('/home');
          return;
        }
      } catch (error) {
        console.error('Failed to initialize session:', error);
        Sentry.captureException(error);
        
        // Don't clear session data or redirect on timeout/network errors
        if (error instanceof Error && error.message.includes('timeout')) {
          console.log('Matches initialization timeout - continuing with cached data');
          // User can still see cached matches
          return;
        }
        
        // For other errors, still don't clear session immediately
        console.log('Matches initialization error - staying on matches page with cached data');
        // User keeps their session and can navigate manually if needed
        return;
      }
    }

    initializeSession();
    // Initialize image cache service
    ImageCacheService.initialize();
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
      
      // Fetch latest messages for all matches when entering the page
      if (matches.length > 0 && currentUserProfile?.id) {
        fetchLatestMessagesForMatches(matches);
      }
    }, [currentEvent?.id, currentSessionId, currentUserProfile?.id, fetchLatestMessagesForMatches, matches])
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
      // Clear processed matches cache only on complete component unmount
      processedMatchesRef.current.clear();
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
              
              // 🔄 NEW: Refresh latest messages for affected matches
              // This ensures match cards show the most recent message content
              if (unseenSessionIds.size > 0 && matches.length > 0) {
                console.log('🔄 Refreshing match cards with new messages');
                try {
                  // Find matches that have new messages and update their latest message cache
                  const affectedMatches = matches.filter(match => 
                    unseenSessionIds.has(match.session_id)
                  );
                  
                  if (affectedMatches.length > 0) {
                    // Update latest messages cache for affected matches
                    await fetchLatestMessagesForMatches(affectedMatches);
                    
                    console.log('✅ Refreshed latest messages for', affectedMatches.length, 'matches');
                  }
                } catch (error) {
                  console.warn('⚠️ Failed to refresh match cards:', error);
                }
              }
              
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
  }, [currentEvent?.id, currentUserProfile?.id, matches.length]);

  // Define sortMatchesByLatestMessage before setupMatchesListener uses it
  const sortMatchesByLatestMessage = useCallback(async (profiles: any[]): Promise<any[]> => {
    if (!currentEvent?.id || !currentUserProfile?.id) return profiles;

    try {
      // Get latest message for each match
      const profilesWithLatestMessage = await Promise.all(
        profiles.map(async (profile) => {
          try {
            // Query messages between current user and this match
            const { collection, query, where, getDocs } = await import('firebase/firestore');
            const { db } = await import('../lib/firebaseConfig');
            
            // Simplified approach: Get ALL messages for this conversation, then sort locally
            // This avoids Firestore index requirements
            const messagesFromUserQuery = query(
              collection(db, 'messages'),
              where('event_id', '==', currentEvent.id),
              where('from_profile_id', '==', currentUserProfile.id),
              where('to_profile_id', '==', profile.id)
            );
            
            const messagesToUserQuery = query(
              collection(db, 'messages'),
              where('event_id', '==', currentEvent.id),
              where('from_profile_id', '==', profile.id),
              where('to_profile_id', '==', currentUserProfile.id)
            );
            
            // Execute both queries
            const [fromUserSnapshot, toUserSnapshot] = await Promise.all([
              getDocs(messagesFromUserQuery),
              getDocs(messagesToUserQuery)
            ]);
            
            // Combine all messages and sort locally to find the latest
            const allMessages = [
              ...fromUserSnapshot.docs.map(doc => doc.data()),
              ...toUserSnapshot.docs.map(doc => doc.data())
            ];
            
            // Sort messages by created_at timestamp (newest first)
            let latestMessage = null;
            if (allMessages.length > 0) {
              allMessages.sort((a, b) => {
                const aTime = a.created_at?.toMillis?.() || a.created_at || 0;
                const bTime = b.created_at?.toMillis?.() || b.created_at || 0;
                return bTime - aTime; // Descending order (newest first)
              });
              latestMessage = allMessages[0]; // Get the most recent message
              
              // Debug logging to understand what we're getting
              console.log(`Match ${profile.first_name}: Found ${allMessages.length} messages, latest:`, {
                content: latestMessage?.content?.substring(0, 50),
                message: latestMessage?.message?.substring(0, 50), // Check both field names
                from: latestMessage?.from_profile_id === currentUserProfile.id ? 'You' : profile.first_name,
                timestamp: latestMessage?.created_at,
                seen: latestMessage?.seen,
                fields: Object.keys(latestMessage || {})
              });
            }
            
            // Check if this match has unread messages
            const hasUnread = unreadMessages.has(profile.session_id);
            
            // Cache the latest message for this profile
            if (latestMessage) {
              latestMessagesCache.current.set(profile.session_id, latestMessage);
            }
            
            return {
              ...profile,
              latestMessageTimestamp: latestMessage?.created_at?.toMillis?.() || latestMessage?.created_at || 0,
              hasUnreadMessages: hasUnread,
              latestMessage: latestMessage,
              matchCreatedAt: profile.matchCreatedAt // Preserve match creation time
            };
          } catch (error) {
            console.warn('Error getting latest message for match:', profile.first_name, error);
            
            // Check if this match has unread messages (from the working unread detection)
            const hasUnread = unreadMessages.has(profile.session_id);
            
            // If there are unread messages but we can't fetch latest message due to index issues,
            // provide a helpful fallback
            const fallbackPreview = (error as Error)?.message?.includes('requires an index') 
              ? 'New message - tap to view'
              : hasUnread 
                ? 'New message - tap to view'  // If unread exists, there must be messages
                : null;
              
            console.log(`Error fetching messages for ${profile.first_name}:`, error instanceof Error ? error.message : 'Unknown error', { hasUnread });
            
            // Try to use cached message as fallback
            const cachedMessage = latestMessagesCache.current.get(profile.session_id);
            const finalMessage = cachedMessage || (fallbackPreview ? { content: fallbackPreview, from_profile_id: null } : null);
            
            return {
              ...profile,
              latestMessageTimestamp: cachedMessage?.created_at?.toMillis?.() || cachedMessage?.created_at || 0,
              hasUnreadMessages: hasUnread,
              latestMessage: finalMessage,
              matchCreatedAt: profile.matchCreatedAt // Preserve match creation time
            };
          }
        })
      );

      // Sort matches: 
      // 1. First priority: matches with unread messages (by latest message timestamp desc)
      // 2. Second priority: matches with messages (by latest message timestamp desc)  
      // 3. Third priority: matches without messages (by match creation time desc, fallback to alphabetical)
      const sortedProfiles = profilesWithLatestMessage.sort((a, b) => {
        // If one has unread messages and the other doesn't, prioritize unread
        if (a.hasUnreadMessages && !b.hasUnreadMessages) return -1;
        if (!a.hasUnreadMessages && b.hasUnreadMessages) return 1;
        
        // If both have unread messages or both don't have unread messages,
        // sort by latest message timestamp (most recent first)
        if (a.latestMessageTimestamp && b.latestMessageTimestamp) {
          return b.latestMessageTimestamp - a.latestMessageTimestamp;
        }
        
        // If one has messages and the other doesn't, prioritize the one with messages
        if (a.latestMessageTimestamp && !b.latestMessageTimestamp) return -1;
        if (!a.latestMessageTimestamp && b.latestMessageTimestamp) return 1;
        
        // If neither has messages, sort by match creation time (most recent first)
        // If no match creation time available, fall back to alphabetical sorting
        if (a.matchCreatedAt && b.matchCreatedAt) {
          const aTime = a.matchCreatedAt?.toMillis?.() || a.matchCreatedAt || 0;
          const bTime = b.matchCreatedAt?.toMillis?.() || b.matchCreatedAt || 0;
          return bTime - aTime; // Most recent match first
        }
        if (a.matchCreatedAt && !b.matchCreatedAt) return -1;
        if (!a.matchCreatedAt && b.matchCreatedAt) return 1;
        
        // Fall back to alphabetical if no match creation time available
        return a.first_name.localeCompare(b.first_name);
      });

      return sortedProfiles;
    } catch (error) {
      console.warn('Error sorting matches by latest message:', error);
      return profiles; // Return original order if sorting fails
    }
  }, [currentEvent?.id, currentUserProfile?.id, unreadMessages]);

  // Persistent processed matches cache to prevent infinite loops
  const processedMatchesRef = useRef(new Set<string>());



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

      // Check for cached user profile first
      const userCacheKey = `${CacheKeys.MATCHES_CURRENT_USER}_${currentSessionId}`;
      const cachedUserProfile = GlobalDataCache.get<any>(userCacheKey);
      if (cachedUserProfile) {
        setCurrentUserProfile(cachedUserProfile);
        console.log('Matches: Using cached user profile');
      }
      
      // Check for cached matches list to show immediately and prevent reordering
      const cachedMatches = GlobalDataCache.get<any[]>(CacheKeys.MATCHES_LIST);
      if (cachedMatches && Array.isArray(cachedMatches)) {
        setMatches(cachedMatches);
        console.log('Matches: Using cached matches list for instant display');
      }

      const userProfileUnsubscribe = onSnapshot(userProfileQuery, async (userSnapshot) => {
        try {
          const userProfiles = userSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as any[];
          
          const userProfile = userProfiles[0];
          setCurrentUserProfile(userProfile);
          
          // Cache the fresh user profile
          if (userProfile) {
            GlobalDataCache.set(userCacheKey, userProfile, 5 * 60 * 1000); // Cache for 5 minutes
          }

          if (!userProfile) {
            // User profile not found - likely a temporary issue
            // Don't redirect - user still has their session
            console.log('User profile not found in real-time listener - continuing with cached data');
            // User can still see their existing matches
            return;
          }

          // If user is not visible, still allow matches to be visible
          // (matches should be accessible even when user is hidden)
          
          // Set up matches listener directly to avoid dependency issues
          if (currentEvent?.id && currentSessionId) {
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

                  // Get profiles for all matched users and attach match creation time
                  const matchedProfiles: any[] = [];
                  for (const otherSessionId of otherSessionIds) {
                    const profiles = await EventProfileAPI.filter({
                      session_id: otherSessionId,
                      event_id: currentEvent.id
                    });
                    if (profiles.length > 0) {
                      // Find the corresponding like record for this match to get creation time
                      const matchLike = userMatches.find(like => 
                        (like.liker_session_id === currentSessionId && like.liked_session_id === otherSessionId) ||
                        (like.liker_session_id === otherSessionId && like.liked_session_id === currentSessionId)
                      );
                      
                      const profile = profiles[0];
                      // Add matchCreatedAt property for sorting
                      (profile as any).matchCreatedAt = matchLike?.created_at || matchLike?.updated_at || null;
                      
                      matchedProfiles.push(profile);
                    }
                  }

                  // Sort matches by latest message activity - but avoid infinite loops
                  const sortedMatches = await sortMatchesByLatestMessage(matchedProfiles);
                  setMatches(sortedMatches);
                  
                  // Cache the sorted matches to prevent visual reordering on next load
                  GlobalDataCache.set(CacheKeys.MATCHES_LIST, sortedMatches, 5 * 60 * 1000);
                  
                  // Fetch latest messages for caching when matches are loaded
                  if (sortedMatches.length > 0 && userProfile?.id) {
                    fetchLatestMessagesForMatches(sortedMatches);
                  }
                  
                  // Cache match profile images
                  if (currentEvent?.id && matchedProfiles.length > 0) {
                    const cacheMatchImages = async () => {
                      const newCachedUris = new Map<string, string>();
                      
                      for (const match of matchedProfiles) {
                        if (match.profile_photo_url) {
                          try {
                            const cachedUri = await ImageCacheService.getCachedImageUri(
                              match.profile_photo_url,
                              currentEvent.id,
                              match.session_id
                            );
                            newCachedUris.set(match.session_id, cachedUri);
                          } catch (error) {
                            console.warn('Failed to cache image for match:', match.session_id, error);
                            // Fallback to original URI
                            newCachedUris.set(match.session_id, match.profile_photo_url);
                          }
                        }
                      }
                      
                      setCachedImageUris(newCachedUris);
                    };
                    
                    cacheMatchImages();
                  }
                  
                  // Only clear unread messages indicator on initial load or when transitioning from having matches to no matches
                  if (matchedProfiles.length === 0 && matches.length > 0) {
                    console.log('Matches cleared - clearing unread messages indicator');
                    setUnreadMessages(new Set());
                    setHasUnreadMessages(false);
                  } else if (matchedProfiles.length === 0) {
                    // Initial state - don't spam logs
                    console.log('Initial load: No matches found');
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

              // NOTE: Match notifications are now handled globally by GlobalNotificationService
              // Removed duplicate listener to prevent multiple notifications for the same match
              console.log('Matches screen: Match notifications handled by GlobalNotificationService');

            } catch {
              // Error setting up matches listener
            }
          }
          
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

  // Use ref to track previous unread messages to avoid circular dependency
  const prevUnreadMessagesRef = useRef<Set<string>>(new Set());

  // Re-sort matches when unread messages change (separate concern from matches loading)
  useEffect(() => {
    // Check if unread messages actually changed
    const currentUnreadSet = new Set(unreadMessages);
    const prevUnreadSet = prevUnreadMessagesRef.current;
    
    const hasUnreadChanged = 
      currentUnreadSet.size !== prevUnreadSet.size ||
      [...currentUnreadSet].some(id => !prevUnreadSet.has(id)) ||
      [...prevUnreadSet].some(id => !currentUnreadSet.has(id));

    if (hasUnreadChanged && matches.length > 0 && currentEvent?.id && currentUserProfile?.id) {
      const resortMatches = async () => {
        try {
          const sortedMatches = await sortMatchesByLatestMessage(matches);
          // Only update if the order actually changed to avoid infinite loops
          const currentOrder = matches.map(m => m.session_id).join(',');
          const newOrder = sortedMatches.map(m => m.session_id).join(',');
          if (currentOrder !== newOrder) {
            setMatches(sortedMatches);
          }
        } catch (error) {
          console.warn('Error re-sorting matches:', error);
        }
      };
      resortMatches();
      
      // Update the ref after processing
      prevUnreadMessagesRef.current = currentUnreadSet;
    }
  }, [unreadMessages]); // eslint-disable-line react-hooks/exhaustive-deps
  // NOTE: We intentionally exclude 'matches' from dependencies to prevent circular dependency
  // matches -> useEffect -> setMatches -> matches (infinite loop)

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
      // mutualMatches listener removed - handled by GlobalNotificationService
      if (listenersRef.current.messages) {
        listenersRef.current.messages();
        listenersRef.current.messages = undefined;
      }
      if (listenersRef.current.periodicCheck) {
        clearInterval(listenersRef.current.periodicCheck);
        listenersRef.current.periodicCheck = undefined;
      }
      
      // Don't clear processed matches cache to prevent reprocessing old matches
      // The cache will be cleared naturally when the component unmounts completely
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

  const handleUnmatch = (matchSessionId: string, matchName: string) => {
    if (!currentEvent?.id || !currentSessionId) return;

    // Prevent double-clicking by checking if already unmatching
    if (unmatchingUsers.has(matchSessionId)) {
      console.log('Already unmatching this user, ignoring');
      return;
    }

    // Immediately mark as unmatching before showing alert to prevent race conditions
    setUnmatchingUsers(prev => new Set(prev).add(matchSessionId));

    // Show confirmation alert
    Alert.alert(
      'Unmatch',
      `Are you sure you want to unmatch ${matchName}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            // Clear the unmatching state if user cancels
            setUnmatchingUsers(prev => {
              const newSet = new Set(prev);
              newSet.delete(matchSessionId);
              return newSet;
            });
          },
        },
        {
          text: 'Unmatch',
          style: 'destructive',
          onPress: async () => {
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
              
              // Clear image cache for the unmatched user
              try {
                if (currentEvent?.id) {
                  await ImageCacheService.clearProfileCache(matchSessionId, currentEvent.id);
                  console.log('Cleared image cache for unmatched user');
                }
              } catch (cacheError) {
                console.warn('Failed to clear image cache for unmatched user:', cacheError);
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
              // Use Alert for critical errors
              Alert.alert(
                'Error',
                'Failed to unmatch. Please try again.',
                [{ text: 'OK' }]
              );
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
      
      // Show alert to explain what happened
      const matchProfile = matches.find(match => match.session_id === matchSessionId);
      const matchName = matchProfile?.first_name || 'This match';
      
      Alert.alert(
        isMuted ? "Match Unmuted!" : "Match Muted!",
        isMuted 
          ? `You will now receive notifications from ${matchName}. You can still see their messages and chat normally.`
          : `You will not receive notifications from ${matchName}. You can still see their messages and chat, but won't get push notifications.`,
        [{ text: "OK" }]
      );
      
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
      
      // Use Alert for critical errors
      Alert.alert(
        'Error',
        `Failed to ${isMuted ? 'unmute' : 'mute'} match. Please try again.`,
        [{ text: 'OK' }]
      );
      if (error) {
        try { require('@sentry/react-native').captureException(error); } catch { /* ignore */ }
      }
    }
  };

  const handleReportMatch = (match: any) => {
    setReportingMatch(match);
    setShowReportModal(true);
  };

  const submitReport = async () => {
    if (!reportReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for the report');
      return;
    }
    
    if (!currentEvent?.id || !currentSessionId || !reportingMatch) {
      Alert.alert('Error', 'Missing information for report');
      return;
    }

    setIsSubmittingReport(true);
    try {
      const reportData = {
        event_id: currentEvent.id,
        reporter_session_id: currentSessionId,
        reported_session_id: reportingMatch.session_id,
        reason: reportReason.trim(),
        details: '',
        status: 'pending' as const,
      };

      await ReportAPI.create(reportData);

      Alert.alert(
        'Report Submitted',
        'Thank you for your report. We will review it shortly.'
      );

      setShowReportModal(false);
      setReportReason('');
      setReportingMatch(null);
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit report');
    } finally {
      setIsSubmittingReport(false);
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
      backgroundColor: isDark ? '#1a1a1a' : '#f8fafc',
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
      borderRadius: 12,
      paddingVertical: 8, // Restored to original height
      paddingHorizontal: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.2 : 0.05,
      shadowRadius: 2,
      elevation: 2,
      borderWidth: 1,
      borderColor: isDark ? '#374151' : '#e5e7eb',
      alignItems: 'center',
      minHeight: 56,
      position: 'relative', // Enable absolute positioning for children
    },
    matchImageContainer: {
      marginRight: 12,
    },
    matchImage: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    matchImageFallback: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    matchImageFallbackText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: 'white',
    },
    fallbackAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#404040' : '#cccccc',
    },
    fallbackText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: 'white',
    },
    matchInfo: {
      flex: 1,
      justifyContent: 'flex-start', // Move content slightly toward the top
      alignItems: 'flex-start', // Align content to the left
      paddingLeft: 8, // Reduced padding to move text closer to thumbnail
      paddingBottom: 4, // Add bottom padding to push content up
    },
    matchHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between', // Name on left, dropdown on right
      width: '100%',
      marginBottom: 4, // Small spacing between name and message preview
    },
    matchNameContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1, // Take available space, pushing dropdown to right
      paddingRight: 5, // Add padding to prevent text overlap with menu button
    },
    matchName: {
      fontSize: 16,
      fontWeight: 'bold',
      color: isDark ? '#ffffff' : '#1f2937', // White in dark mode, dark gray in light mode
      textAlign: 'left', // Left align as requested
    },
    messagePreview: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
      lineHeight: 16, // Reduced line height to minimize vertical space
      textAlign: 'left', // Left align as requested
      paddingRight: 25, // Reduced padding to allow 3 more characters to show
      marginTop: 0, // Reset margin for proper spacing
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
    reportModalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    reportModalContent: {
      width: '100%',
      maxWidth: 400,
      borderRadius: 16,
      padding: 24,
    },
    reportModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    reportModalTitle: {
      fontSize: 20,
      fontWeight: '600',
    },
    reportModalCloseButton: {
      padding: 4,
    },
    reportModalDescription: {
      fontSize: 16,
      lineHeight: 22,
      marginBottom: 16,
    },
    reportReasonInput: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      textAlignVertical: 'top',
      height: 100,
      marginBottom: 20,
    },
    reportModalButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    reportModalButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    reportCancelButton: {
      // Styled inline in component
    },
    reportSubmitButton: {
      backgroundColor: '#dc2626',
    },
    reportButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: 'white',
    },
    disabledButton: {
      opacity: 0.5,
    },
  });

  // Show hidden state notice if user is not visible, but still allow access to matches
  const isProfileHidden = currentUserProfile && !currentUserProfile.is_visible;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>
            {matches.length} Mutual Connection{matches.length !== 1 ? 's' : ''}
          </Text>
          {currentEvent?.expires_at ? (
            <CountdownTimer
              expiresAt={currentEvent.expires_at}
              prefix="Matches Expire in "
              style={styles.subtitle}
            />
          ) : (
            <Text style={styles.subtitle}>
              Your Matches
            </Text>
          )}
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
      <ScrollView 
        style={styles.matchesContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#FF6B6B']} // Android
            tintColor="#FF6B6B" // iOS
          />
        }
      >
        {matches.length > 0 ? (
          <View style={styles.matchesList}>
            {matches.map((match) => {
              const hasUnreadMessage = unreadMessages.has(match.session_id);
              
              // Build styles step by step for better Android compatibility
              let cardStyles: any[] = [styles.matchCard];
              
              if (hasUnreadMessage) {
                const highlightStyle = {
                  borderWidth: 2,
                  borderColor: '#8b5cf6',
                  backgroundColor: isDark ? '#2d1b3d' : '#f3f0ff',
                };
                
                if (Platform.OS === 'ios') {
                  Object.assign(highlightStyle, {
                    shadowColor: '#8b5cf6',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.4,
                    shadowRadius: 8,
                    transform: [{ scale: 1.01 }],
                  });
                } else {
                  // Android specific styles
                  Object.assign(highlightStyle, {
                    elevation: 8,
                    shadowColor: '#8b5cf6',
                  });
                }
                
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
                      <Image source={{ uri: cachedImageUris.get(match.session_id) || match.profile_photo_url }}
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
                        bottom: -2,
                        right: -2,
                        backgroundColor: isDark ? '#374151' : '#6b7280',
                        borderRadius: 8,
                        width: 16,
                        height: 16,
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderWidth: 1.5,
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
                        <VolumeX size={8} color="#ffffff" />
                      </View>
                    )}
                  </TouchableOpacity>
                
                <View style={styles.matchInfo}>
                  <View style={styles.matchHeader}>
                    <View style={styles.matchNameContainer}>
                      <Text style={[styles.matchName, mutedMatches.has(match.session_id) && { opacity: 0.7 }]}>
                        {match.first_name?.split(' ')[0] || match.first_name}
                      </Text>
                      {mutedMatches.has(match.session_id) && (
                        <VolumeX size={14} color={isDark ? '#9ca3af' : '#6b7280'} style={{ marginLeft: 6 }} />
                      )}
                    </View>
                    
                    <View style={{ position: 'absolute', right: -4, top: '50%', transform: [{ translateY: -8 }] }}>
                      <DropdownMenu
                        items={[
                        {
                          id: 'mute',
                          label: mutedMatches.has(match.session_id) ? 'Unmute' : 'Mute',
                          icon: mutedMatches.has(match.session_id) ? Volume2 : VolumeX,
                          onPress: () => handleMuteMatch(match.session_id),
                        },
                        {
                          id: 'unmatch',
                          label: 'Unmatch',
                          icon: UserX,
                          onPress: () => handleUnmatch(match.session_id, match.first_name),
                        },
                        {
                          id: 'report',
                          label: 'Report',
                          icon: Flag,
                          onPress: () => handleReportMatch(match),
                          destructive: true,
                        },
                        ]}
                      />
                    </View>
                  </View>
                  
                  {/* Message preview */}
                  <Text 
                    style={[
                      styles.messagePreview, 
                      mutedMatches.has(match.session_id) && { opacity: 0.7 },
                      hasUnreadMessage && { fontWeight: 'bold' }
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {(() => {
                      // First try cached message, then match.latestMessage
                      const cachedMessage = latestMessagesCache.current.get(match.session_id);
                      const messageToShow = cachedMessage || match.latestMessage;
                      const messageContent = messageToShow?.content || messageToShow?.message;
                      
                      if (messageContent) {
                        return messageToShow.from_profile_id === currentUserProfile?.id 
                          ? `You: ${messageContent}` 
                          : messageContent;
                      }
                      return 'Tap to start chatting!';
                    })()}
                  </Text>
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
      </View>

      {/* Profile Detail Modal */}
      <UserProfileModal
        visible={selectedProfileForDetail !== null}
        profile={selectedProfileForDetail}
        onClose={() => setSelectedProfileForDetail(null)}
        onLike={handleLike}
        isLiked={selectedProfileForDetail ? likedProfiles.has(selectedProfileForDetail.session_id) : false}
      />

      {/* Report Modal */}
      <Modal
        visible={showReportModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={[styles.reportModalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.reportModalContent, { backgroundColor: isDark ? '#1f2937' : '#ffffff' }]}>
            <View style={styles.reportModalHeader}>
              <Text style={[styles.reportModalTitle, { color: isDark ? '#ffffff' : '#1f2937' }]}>
                Report User
              </Text>
              <TouchableOpacity
                onPress={() => setShowReportModal(false)}
                style={styles.reportModalCloseButton}
              >
                <UserX size={24} color={isDark ? '#9ca3af' : '#6b7280'} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.reportModalDescription, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
              Please provide a reason for reporting {reportingMatch?.first_name || 'this user'}:
            </Text>
            <TextInput
              style={[
                styles.reportReasonInput,
                {
                  backgroundColor: isDark ? '#374151' : '#f9fafb',
                  color: isDark ? '#ffffff' : '#1f2937',
                  borderColor: isDark ? '#4b5563' : '#d1d5db',
                }
              ]}
              value={reportReason}
              onChangeText={setReportReason}
              placeholder="Enter the reason for your report..."
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
              multiline
              numberOfLines={4}
            />
            <View style={styles.reportModalButtons}>
              <TouchableOpacity
                style={[styles.reportModalButton, styles.reportCancelButton, { backgroundColor: isDark ? '#374151' : '#f3f4f6' }]}
                onPress={() => setShowReportModal(false)}
              >
                <Text style={[styles.reportButtonText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.reportModalButton,
                  styles.reportSubmitButton,
                  !reportReason.trim() && styles.disabledButton
                ]}
                onPress={submitReport}
                disabled={!reportReason.trim() || isSubmittingReport}
              >
                {isSubmittingReport ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.reportButtonText}>Submit Report</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
} 