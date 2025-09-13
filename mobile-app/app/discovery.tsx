import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  AppState,
  Modal,
  Alert,
  useColorScheme,
  StatusBar,
  RefreshControl,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from 'expo-router';
import { unifiedNavigator } from '../lib/navigation/UnifiedNavigator';
import { crossPageEventBus } from '../lib/navigation/CrossPageEventBus';
import { Filter, Users, User, MessageCircle, X } from 'lucide-react-native';
import { EventProfileAPI, LikeAPI, EventAPI, BlockedMatchAPI, SkippedProfileAPI } from '../lib/firebaseApi';
// Sentry removed

import { AsyncStorageUtils } from '../lib/asyncStorageUtils';
import { ImageCacheService } from '../lib/services/ImageCacheService';
// BackgroundDataPreloader removed - now using direct consent-fetched profiles
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { getDbForEvent } from '../lib/firebaseConfig';
import UserProfileModal from '../lib/UserProfileModal';
import CountdownTimer from '../lib/components/CountdownTimer';
import { HowItWorksModal } from '../lib/components/HowItWorksModal';
import { HowItWorksUtils } from '../lib/utils/howItWorksUtils';

import { updateUserActivity } from '../lib/messageNotificationHelper';
import { usePerformanceMonitoring } from '../lib/hooks/usePerformanceMonitoring';
import { GlobalDataCache, CacheKeys } from '../lib/cache/GlobalDataCache';

// Dual Handle Range Slider Component
interface DualHandleRangeSliderProps {
  min: number;
  max: number;
  minValue: number;
  maxValue: number;
  onValueChange: (minValue: number, maxValue: number) => void;
}

const DualHandleRangeSlider: React.FC<DualHandleRangeSliderProps> = ({
  min,
  max,
  minValue,
  maxValue,
  onValueChange,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [sliderWidth, setSliderWidth] = React.useState(300);
  const [dragging, setDragging] = React.useState<'min' | 'max' | null>(null);
  const sliderRef = React.useRef<View>(null);
  const [sliderX, setSliderX] = React.useState(0);
  
  const getThumbPosition = (value: number) => {
    return ((value - min) / (max - min)) * sliderWidth;
  };
  
  const getValueFromPosition = (position: number) => {
    const value = (position / sliderWidth) * (max - min) + min;
    return Math.max(min, Math.min(max, value));
  };
  
  const handlePanGestureEvent = (event: any, thumb: 'min' | 'max') => {
    const { pageX } = event.nativeEvent;
    const relativeX = pageX - sliderX;
    const clampedX = Math.max(0, Math.min(sliderWidth, relativeX));
    const newValue = getValueFromPosition(clampedX);
    
    if (thumb === 'min') {
      const newMinValue = Math.round(Math.max(min, Math.min(newValue, maxValue - 1)));
      onValueChange(newMinValue, maxValue);
    } else {
      const newMaxValue = Math.round(Math.min(max, Math.max(newValue, minValue + 1)));
      onValueChange(minValue, newMaxValue);
    }
  };
  
  const minThumbPosition = getThumbPosition(minValue);
  const maxThumbPosition = getThumbPosition(maxValue);
  
  return (
    <View style={{
      height: 40,
      justifyContent: 'center',
      marginHorizontal: 16,
      marginTop: 8,
    }}>
      <View
        ref={sliderRef}
        style={{
          height: 6,
          backgroundColor: isDark ? '#404040' : '#e5e7eb',
          borderRadius: 3,
        }}
        onLayout={(event) => {
          setSliderWidth(event.nativeEvent.layout.width);
          sliderRef.current?.measure((x, y, width, height, pageX) => {
            setSliderX(pageX);
          });
        }}
      >
        {/* Active track between thumbs */}
        <View
          style={{
            position: 'absolute',
            left: minThumbPosition,
            width: maxThumbPosition - minThumbPosition,
            height: 6,
            backgroundColor: '#8b5cf6',
            borderRadius: 3,
          }}
        />
        
        {/* Min thumb */}
        <View
          style={{
            position: 'absolute',
            left: minThumbPosition - 12,
            top: -6,
            width: dragging === 'min' ? 28 : 24,
            height: dragging === 'min' ? 28 : 24,
            borderRadius: dragging === 'min' ? 14 : 12,
            backgroundColor: '#8b5cf6',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: dragging === 'min' ? 0.3 : 0.2,
            shadowRadius: 4,
            elevation: 3,
          }}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={() => setDragging('min')}
          onResponderMove={(event) => handlePanGestureEvent(event, 'min')}
          onResponderRelease={() => setDragging(null)}
        />
        
        {/* Max thumb */}
        <View
          style={{
            position: 'absolute',
            left: maxThumbPosition - 12,
            top: -6,
            width: dragging === 'max' ? 28 : 24,
            height: dragging === 'max' ? 28 : 24,
            borderRadius: dragging === 'max' ? 14 : 12,
            backgroundColor: '#8b5cf6',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: dragging === 'max' ? 0.3 : 0.2,
            shadowRadius: 4,
            elevation: 3,
          }}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={() => setDragging('max')}
          onResponderMove={(event) => handlePanGestureEvent(event, 'max')}
          onResponderRelease={() => setDragging(null)}
        />
      </View>
    </View>
  );
};

const { width } = Dimensions.get('window');
const gap = 8;
const cardSize = (width - 64 - gap * 2) / 3; // 3 columns with 16px padding on each side and 8px gap between cards




export default function Discovery() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
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
  // Initialize profiles from cache to prevent loading state
  const [profiles, setProfiles] = useState<any[]>(() => {
    const cachedProfiles = GlobalDataCache.get<any[]>(CacheKeys.DISCOVERY_PROFILES);
    return cachedProfiles || [];
  });
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [filteredProfiles, setFilteredProfiles] = useState<any[]>([]);
  // Initialize currentEvent from cache to prevent loading state
  const [currentEvent, setCurrentEvent] = useState<any>(() => {
    const cached = GlobalDataCache.get<any>(CacheKeys.DISCOVERY_EVENT);
    return cached || null;
  });
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [filters, setFilters] = useState({
    age_min: 18,
    age_max: 99
  });
  const [tempFilters, setTempFilters] = useState({
    age_min: 18,
    age_max: 99
  });
  const [showFilters, setShowFilters] = useState(false);
  const [likedProfiles, setLikedProfiles] = useState(new Set<string>());
  const [skippedProfiles, setSkippedProfiles] = useState(new Set<string>());
  const [selectedProfileForDetail, setSelectedProfileForDetail] = useState<any>(null);
  const [viewedProfiles, setViewedProfiles] = useState(new Set<string>());
  const [isAppActive, setIsAppActive] = useState(true);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const eventId = currentEvent?.id || await AsyncStorageUtils.getItem<string>('currentEventId');
      const sessionId = currentSessionId || await AsyncStorageUtils.getItem<string>('currentSessionId');
      
      if (eventId && sessionId) {
        console.log('Discovery Pull-to-refresh: Reloading all profiles data');
        
        // Reload profiles data directly from Firebase
        const allProfiles = await EventProfileAPI.filter({
          event_id: eventId,
          is_visible: true
        });
        
        const otherUsersProfiles = allProfiles.filter(p => p.session_id !== sessionId);
        setProfiles(otherUsersProfiles);
        
        // Update cache for next time
        GlobalDataCache.set(CacheKeys.DISCOVERY_PROFILES, otherUsersProfiles, 2 * 60 * 1000);
        
        // Reload likes data
        const likes = await LikeAPI.filter({
          event_id: eventId,
          liker_session_id: sessionId
        });
        setLikedProfiles(new Set(likes.map(like => like.liked_session_id)));
        
        // Reload skipped profiles
        const skipped = await SkippedProfileAPI.filter({
          event_id: eventId,
          skipper_session_id: sessionId
        });
        setSkippedProfiles(new Set(skipped.map(s => s.skipped_session_id)));
        
        console.log(`Discovery Pull-to-refresh: Refreshed ${otherUsersProfiles.length} profiles, ${likes.length} likes, ${skipped.length} skipped`);
      }
    } catch (error) {
      console.error('Discovery Pull-to-refresh error:', error);
      Toast.show({
        type: 'error',
        text1: 'Refresh Failed',
        text2: 'Could not refresh profiles. Please try again.',
        position: 'top',
        visibilityTime: 3000,
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [currentEvent?.id, currentSessionId]);
  
  // Single ref to hold all unsubscribe functions
  const listenersRef = useRef<{
    userProfile?: () => void;
    otherProfiles?: () => void;
    likes?: () => void;
    mutualMatches?: () => void;
  }>({});

  // Define initializeSession function first
  const initializeSession = useCallback(async () => {
    const eventId = await AsyncStorageUtils.getItem<string>('currentEventId');
    const sessionId = await AsyncStorageUtils.getItem<string>('currentSessionId');
    const profilePhotoUrl = await AsyncStorageUtils.getItem<string>('currentProfilePhotoUrl');
  
    if (!eventId || !sessionId) {
      // No active session - skip initialization for this page
      // Don't navigate away - let UnifiedNavigator handle navigation
      console.log('Discovery: No event context, skipping initialization');
      return;
    }

    setCurrentSessionId(sessionId);
    
    try {
      let eventData = null;
      
      // Check cache first for event data
      const cachedEvent = GlobalDataCache.get<any>(CacheKeys.DISCOVERY_EVENT);
      if (cachedEvent && cachedEvent.id === eventId) {
        setCurrentEvent(cachedEvent);
        eventData = cachedEvent;
        console.log('Discovery: Using cached event data');
      } else {
        // First try to get stored event data (fastest)
        const storedEventData = await AsyncStorageUtils.getItem<any>('currentEventData');
        if (storedEventData && storedEventData.id === eventId) {
          // Convert date strings back to Date objects
          const eventWithDates = {
            ...storedEventData,
            starts_at: storedEventData.starts_at ? new Date(storedEventData.starts_at) : null,
            expires_at: storedEventData.expires_at ? new Date(storedEventData.expires_at) : null,
            start_date: storedEventData.start_date ? new Date(storedEventData.start_date) : null,
            created_at: storedEventData.created_at ? new Date(storedEventData.created_at) : null,
            updated_at: storedEventData.updated_at ? new Date(storedEventData.updated_at) : null,
          };
          setCurrentEvent(eventWithDates);
          eventData = eventWithDates;
          GlobalDataCache.set(CacheKeys.DISCOVERY_EVENT, eventData, 10 * 60 * 1000); // Cache for 10 minutes
          console.log('Discovery: Using stored event data');
        } else {
          // Fallback to database query with regional support
          // Add timeout to prevent hanging indefinitely - but make it more lenient in dev
          const timeoutDuration = __DEV__ ? 45000 : 30000; // 45s in dev, 30s in production
          const eventTimeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Event loading timeout')), timeoutDuration);
          });
          
          try {
            // Get event country for regional database targeting
            const eventCountry = await AsyncStorageUtils.getItem<string>('currentEventCountry');
            const eventPromise = eventCountry 
              ? EventAPI.get(eventId, eventCountry)
              : EventAPI.filter({ id: eventId });
            
            const result = await Promise.race([eventPromise, eventTimeoutPromise]);
            const events = Array.isArray(result) ? result : (result ? [result] : []);
            
            if (events.length > 0) {
              eventData = events[0];
              setCurrentEvent(eventData);
              GlobalDataCache.set(CacheKeys.DISCOVERY_EVENT, eventData, 10 * 60 * 1000); // Cache for 10 minutes
              console.log('Discovery: Loaded and cached event data from database');
            }
          } catch (databaseError) {
            console.warn('Discovery: Failed to load event from database:', databaseError);
            
            // In development, don't immediately clear session data on network errors
            if (__DEV__) {
              console.log('Discovery: Development mode - not clearing session data on network error');
              // Try to continue with minimal functionality
              return;
            }
            
            // In production, still clear on actual network failures after some attempts
            eventData = null;
          }
        }
      }
      
      if (eventData) {
        // Load blocked, skipped, and viewed profiles (with their own caching)
        await loadBlockedProfiles(eventId, sessionId);
        await loadSkippedProfiles(eventId, sessionId);
        await loadViewedProfiles(eventId);
      } else if (!__DEV__) {
        // Only clear session data and redirect in production builds
        // In development, network issues are common and shouldn't reset the session
        console.log('Event not found, clearing session data');
        await AsyncStorageUtils.multiRemove([
          'currentEventId',
          'currentSessionId',
          'currentEventCode',
          'currentProfileColor',
          'currentProfilePhotoUrl',
          'currentEventCountry',
          'currentEventData'
        ]);
        unifiedNavigator.navigate('home', {}, true); // replace: true
        return;
      } else {
        console.log('Discovery: Development mode - event not found but keeping session for debugging');
      }

      // For photos set up display, we need to check if profilePhotoUrl is in storage
      // If it's not, then the user needs to reselect their photo
      if (!profilePhotoUrl) {
        console.log('No profile photo URL found in storage, redirecting to profile setup');
        unifiedNavigator.navigate('profile', {}, true); // Let them select a photo again
        return;
      }

      // CRITICAL FIX: Load user profile FIRST before other profiles
      // This ensures filtering has user profile available when other profiles load
      const cacheKey = `${CacheKeys.DISCOVERY_CURRENT_USER}_${sessionId}`;
      const cachedUserProfile = GlobalDataCache.get<any>(cacheKey);
      
      if (cachedUserProfile) {
        setCurrentUserProfile(cachedUserProfile);
        console.log('Discovery: Using cached user profile for filtering');
      } else {
        const profileTimeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Profile loading timeout')), 30000);
        });
        
        try {
          const eventCountry = await AsyncStorageUtils.getItem<string>('currentEventCountry');
          console.log(`Discovery: Looking for user profile in ${eventCountry || 'default'} region for session ${sessionId}`);
          const profilePromise = EventProfileAPI.filter({
            event_id: eventId,
            session_id: sessionId
          });
          const userProfiles = await Promise.race([profilePromise, profileTimeoutPromise]);

          if (userProfiles.length === 0) {
            console.log('User profile not found in discovery, clearing session data');
            await AsyncStorageUtils.multiRemove([
              'currentEventId',
              'currentSessionId',
              'currentEventCode',
              'currentProfileColor',
              'currentProfilePhotoUrl',
              'currentEventCountry',
              'currentEventData'
            ]);
            unifiedNavigator.navigate('home', {}, true);
            return;
          } else {
            setCurrentUserProfile(userProfiles[0]);
            GlobalDataCache.set(cacheKey, userProfiles[0], 5 * 60 * 1000);
            console.log('Discovery: Loaded user profile for filtering');
          }
        } catch (userProfileError) {
          console.error('Discovery: Failed to load user profile:', userProfileError);
          setIsInitialized(true);
          return;
        }
      }
      
      // Check if we already have consent-fetched profiles to avoid unnecessary refetch
      const hasConsentProfiles = GlobalDataCache.get('discovery_has_consent_profiles');
      
      if (hasConsentProfiles && profiles.length > 0) {
        console.log('Discovery: Skipping profile reload - already have consent-fetched profiles');
        // If we have consent profiles and event data, we can set initialized immediately
        if (currentEvent) {
          setIsInitialized(true);
        }
      } else {
        // Fallback: Load profiles if consent didn't provide them
        console.log('Discovery: Loading profiles as fallback (consent may have failed)');
        try {
          const allProfiles = await EventProfileAPI.filter({
            event_id: eventId,
            is_visible: true
          });
          
          const otherUsersProfiles = allProfiles.filter(p => p.session_id !== sessionId);
          setProfiles(otherUsersProfiles);
          
          // Cache for listeners to use
          GlobalDataCache.set(CacheKeys.DISCOVERY_PROFILES, otherUsersProfiles, 2 * 60 * 1000);
          console.log(`Discovery: Fallback loaded ${otherUsersProfiles.length} profiles`);
        } catch (profileLoadError) {
          console.error('Discovery: Fallback profile loading failed:', profileLoadError);
        }
        
        // Load likes for UI state
        try {
          const likes = await LikeAPI.filter({
            event_id: eventId,
            liker_session_id: sessionId
          });
          setLikedProfiles(new Set(likes.map(like => like.liked_session_id)));
          console.log(`Discovery: Loaded ${likes.length} likes for UI state`);
        } catch (likesError) {
          console.error('Discovery: Failed to load likes:', likesError);
        }
      }
      
      // All checks passed - session is valid
      setIsInitialized(true);
    } catch (error) {
      console.error('Discovery error:', error);
      
      // Handle errors gracefully without losing user session
      if (error instanceof Error && error.message === 'Event loading timeout') {
        console.log('Event loading timed out - continuing with cached data if available');
        // Set initialized to prevent infinite loading
        setIsInitialized(true);
        return;
      } else if (error instanceof Error && error.message === 'Profile loading timeout') {
        console.log('Profile loading timed out - continuing with cached data if available');
        // Set initialized to prevent infinite loading
        setIsInitialized(true);
        return;
      } else {
        console.error('Error in initializeSession:', error);
        // For other errors, still set initialized to prevent infinite loading
        setIsInitialized(true);
        return;
      }
    }
  }, []);

  // Listen for navigation events to re-check cached profiles when Discovery becomes active
  useEffect(() => {
    const unsubscribe = crossPageEventBus.subscribe(
      'discovery',
      'navigation:request',
      async (data) => {
        // Only handle when Discovery is the target page
        if (data.targetPage === 'discovery') {
          console.log('🔍 Discovery: Navigation request received, checking for full initialization');
          
          // Check if we have session context now (might not have had it during early mount)
          const eventId = await AsyncStorageUtils.getItem<string>('currentEventId');
          const sessionId = await AsyncStorageUtils.getItem<string>('currentSessionId');
          
          if (eventId && sessionId && (!currentEvent || profiles.length === 0)) {
            console.log('🔍 Discovery: Session context available, triggering full initialization');
            
            // Reset initialization state so main initialization can run
            setIsInitialized(false);
            
            // Trigger re-initialization by updating session context
            setCurrentSessionId(sessionId);
            
            return; // Let the main useEffect handle the full initialization
          }
          
          // If already initialized, just check for cached profiles
          const cachedProfiles = GlobalDataCache.get<any[]>(CacheKeys.DISCOVERY_PROFILES);
          const hasConsentProfiles = GlobalDataCache.get('discovery_has_consent_profiles');
          
          console.log(`🔍 Discovery: Navigation re-check - found ${cachedProfiles?.length || 0} cached profiles, hasConsentFlag: ${!!hasConsentProfiles}`);
          
          // If we have profiles now but didn't before, update the display
          if (cachedProfiles && Array.isArray(cachedProfiles) && cachedProfiles.length > 0 && profiles.length === 0) {
            if (sessionId) {
              const otherUsersProfiles = cachedProfiles.filter(p => p.session_id !== sessionId);
              setProfiles(otherUsersProfiles);
              console.log(`🔍 Discovery: Navigation update - loaded ${otherUsersProfiles.length} consent-fetched profiles`);
              
              // Mark that we have consent-fetched profiles
              GlobalDataCache.set('discovery_has_consent_profiles', true, 2 * 60 * 1000);
            }
          }
        }
      }
    );

    return unsubscribe;
  }, [profiles.length, currentEvent, isInitialized]); // Re-run if profiles, event, or init state changes

  const checkAndShowHowItWorksModal = useCallback(async () => {
    try {
      if (!currentEvent?.id) return;
      
      const shouldShow = await HowItWorksUtils.shouldShowHowItWorksModal(currentEvent.id);
      if (shouldShow) {
        // Add a small delay to ensure the UI is fully rendered
        setTimeout(() => {
          setShowHowItWorksModal(true);
        }, 1000);
      }
    } catch (error) {
      console.error('Error checking how it works modal:', error);
    }
  }, [currentEvent?.id]);

  // Use initializeSession in useEffect
  useEffect(() => {
    const init = async () => {
      const eventId = await AsyncStorageUtils.getItem<string>('currentEventId');
      const sessionId = await AsyncStorageUtils.getItem<string>('currentSessionId');
      
      // Set session ID immediately if available
      if (sessionId) {
        setCurrentSessionId(sessionId);
      }
      
      // If no session context, immediately set initialized to prevent infinite loading
      if (!eventId || !sessionId) {
        console.log('Discovery: No event context, setting initialized');
        setIsInitialized(true);
        return;
      }
      
      // PRIORITY 1: Load event data immediately from cache/storage to prevent loading screen
      const cachedEvent = GlobalDataCache.get<any>(CacheKeys.DISCOVERY_EVENT);
      if (cachedEvent && cachedEvent.id === eventId) {
        setCurrentEvent(cachedEvent);
        console.log('Discovery: Using cached event data for instant display');
      } else {
        // Try stored event data for instant display
        const storedEventData = await AsyncStorageUtils.getItem<any>('currentEventData');
        if (storedEventData && storedEventData.id === eventId) {
          // Convert date strings back to Date objects
          const eventWithDates = {
            ...storedEventData,
            starts_at: storedEventData.starts_at ? new Date(storedEventData.starts_at) : null,
            expires_at: storedEventData.expires_at ? new Date(storedEventData.expires_at) : null,
            start_date: storedEventData.start_date ? new Date(storedEventData.start_date) : null,
            created_at: storedEventData.created_at ? new Date(storedEventData.created_at) : null,
            updated_at: storedEventData.updated_at ? new Date(storedEventData.updated_at) : null,
          };
          setCurrentEvent(eventWithDates);
          GlobalDataCache.set(CacheKeys.DISCOVERY_EVENT, eventWithDates, 10 * 60 * 1000);
          console.log('Discovery: Using stored event data for instant display');
        }
      }
      
      // PRIORITY 2: Check for consent-fetched profiles (direct approach)
      const cachedProfiles = GlobalDataCache.get<any[]>(CacheKeys.DISCOVERY_PROFILES);
      console.log(`Discovery: Checking cached profiles - found ${cachedProfiles?.length || 0} profiles, sessionId: ${sessionId}`);
      
      if (cachedProfiles && Array.isArray(cachedProfiles) && cachedProfiles.length > 0) {
        const otherUsersProfiles = cachedProfiles.filter(p => p.session_id !== sessionId);
        setProfiles(otherUsersProfiles);
        console.log(`Discovery: Found ${otherUsersProfiles.length} consent-fetched profiles (filtered from ${cachedProfiles.length}), using immediately for instant display`);
        
        // Mark that we have consent-fetched profiles to prevent immediate overwriting
        GlobalDataCache.set('discovery_has_consent_profiles', true, 2 * 60 * 1000);
      } else {
        console.log('Discovery: No cached profiles found from consent');
      }
      
      // Initialize session to load any missing data and set up listeners
      initializeSession();
      // Initialize image cache service only when needed
      ImageCacheService.initialize();
    };
    
    init();
  }, [initializeSession]);
  
  // Navigation listener removed - consent-fetched profiles make this redundant

  // Force refresh user profile data when page gains focus (e.g., after visibility toggle on profile page)
  useFocusEffect(
    useCallback(() => {
      const refreshUserProfile = async () => {
        if (currentSessionId && currentEvent?.id) {
          try {
            const profiles = await EventProfileAPI.filter({
              event_id: currentEvent.id,
              session_id: currentSessionId
            });
            
            if (profiles.length > 0) {
              const updatedProfile = profiles[0];
              setCurrentUserProfile(updatedProfile);
              console.log('Discovery: Refreshed user profile on focus, is_visible:', updatedProfile.is_visible);
            }
          } catch (error) {
            console.error('Error refreshing user profile on focus:', error);
          }
        }
      };

      refreshUserProfile();
    }, [currentSessionId, currentEvent?.id])
  );

  // Check and show How It Works modal after event and profile are loaded
  useEffect(() => {
    if (currentEvent?.id && currentUserProfile?.id) {
      checkAndShowHowItWorksModal();
    }
  }, [currentEvent?.id, currentUserProfile?.id, checkAndShowHowItWorksModal]);

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

  // Periodic refresh for red dot status (Fix 2: handles cases where messages are deleted by other users)
  useEffect(() => {
    if (!currentEvent?.id || !currentSessionId) return;

    const refreshUnreadStatus = async () => {
      try {
        const { hasUnseenMessages } = await import('../lib/messageNotificationHelper');
        const hasUnseen = await hasUnseenMessages(currentEvent.id, currentSessionId);
        setHasUnreadMessages(hasUnseen);
      } catch (error) {
        console.error('Error refreshing unread status:', error);
      }
    };

    // Initial check
    refreshUnreadStatus();
    
    // Periodic refresh every 30 seconds to catch edge cases like message deletions
    const interval = setInterval(refreshUnreadStatus, 30000);
    return () => clearInterval(interval);
  }, [currentEvent?.id, currentSessionId]);

  // Real-time message listener for immediate unseen status updates
  useEffect(() => {
    if (!currentEvent?.id || !currentSessionId || !currentUserProfile?.id) return;

    const setupMessageListener = async () => {
      try {
        // Get event-specific database
        const eventCountry = await AsyncStorageUtils.getItem<string>('currentEventCountry');
        const eventDb = getDbForEvent(eventCountry);
      
      const messagesQuery = query(
        collection(eventDb, 'messages'),
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
          console.error('Discovery error:', error);
        }
      });

        return () => unsubscribe();
      } catch (error) {
        console.error('Discovery error:', error);
      }
    };

    setupMessageListener();
  }, [currentEvent?.id, currentSessionId, currentUserProfile?.id]);

  // Define setupOtherListeners before it's used
  const setupOtherListeners = useCallback(async () => {
    if (!currentEvent?.id || !currentSessionId) return;

    // Prevent multiple listener creation
    if (listenersRef.current.otherProfiles || listenersRef.current.likes) {
      return;
    }

    try {
      // Get event-specific database
      const eventCountry = await AsyncStorageUtils.getItem<string>('currentEventCountry');
      const eventDb = getDbForEvent(eventCountry);
      
      // 2. Other visible profiles listener
      const otherProfilesQuery = query(
        collection(eventDb, 'event_profiles'),
        where('event_id', '==', currentEvent.id),
        where('is_visible', '==', true)
      );

      // Real-time listener for live updates
      const otherProfilesUnsubscribe = onSnapshot(otherProfilesQuery, (otherSnapshot) => {
        try {
          const allVisibleProfiles = otherSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as any[];
          const otherUsersProfiles = allVisibleProfiles.filter(p => 
            p.session_id !== currentSessionId
          );
          
          // Check if we should respect consent-fetched profiles
          const hasConsentProfiles = GlobalDataCache.get('discovery_has_consent_profiles');
          
          // Update profiles from real-time listener for live updates
          // Only update if different to prevent unnecessary re-renders
          // Be more conservative when we have fresh consent-fetched profiles
          const shouldUpdate = JSON.stringify(otherUsersProfiles) !== JSON.stringify(profiles);
          
          if (shouldUpdate) {
            // If we have fresh consent profiles, only update if there's a significant change
            if (hasConsentProfiles && profiles.length > 0) {
              // Only update if there's a meaningful difference (new profiles, removed profiles, etc.)
              const currentIds = new Set(profiles.map(p => p.session_id));
              const newIds = new Set(otherUsersProfiles.map(p => p.session_id));
              const hasNewUsers = otherUsersProfiles.some(p => !currentIds.has(p.session_id));
              const hasRemovedUsers = profiles.some(p => !newIds.has(p.session_id));
              
              if (hasNewUsers || hasRemovedUsers) {
                setProfiles(otherUsersProfiles);
                console.log(`Discovery: Updated ${otherUsersProfiles.length} profiles from real-time listener (meaningful change detected)`);
              } else {
                console.log(`Discovery: Skipping profile update - no meaningful changes detected`);
              }
            } else {
              // No consent profiles or empty profile list, update normally
              setProfiles(otherUsersProfiles);
              console.log(`Discovery: Updated ${otherUsersProfiles.length} profiles from real-time listener`);
            }
          }
          
          // Image preloading removed - handled by consent page and hidden image pool
          
          // Cache the fresh data for next time
          GlobalDataCache.set(CacheKeys.DISCOVERY_PROFILES, otherUsersProfiles, 2 * 60 * 1000); // Cache for 2 minutes
        } catch (error) {
          console.error('Discovery error:', error);
        }
              }, (error) => {
          console.error('Discovery error:', error);
        });

      listenersRef.current.otherProfiles = otherProfilesUnsubscribe;

      // 3. Likes listener
      const likesQuery = query(
        collection(eventDb, 'likes'),
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
          console.error('Discovery error:', error);
        }
              }, (error) => {
          console.error('Discovery error:', error);
        });

      listenersRef.current.likes = likesUnsubscribe;

      // 4. Mutual matches listener - for real-time match notifications (handled globally in _layout.tsx)
      const mutualMatchesQuery = query(
        collection(eventDb, 'likes'),
        where('event_id', '==', currentEvent.id),
        where('is_mutual', '==', true)
      );

      const mutualMatchesUnsubscribe = onSnapshot(mutualMatchesQuery, async () => {
        // Match notifications are now handled globally in _layout.tsx
        // This listener is kept for any future local match-related functionality
      }, (error) => {
        console.error('Discovery error:', error);
      });

      listenersRef.current.mutualMatches = mutualMatchesUnsubscribe;

    } catch (error) {
      console.error('Discovery error:', error);
    }
  }, [currentEvent?.id, currentSessionId]);

  // Consolidated listener setup with proper cleanup
  useEffect(() => {
    if (!currentEvent?.id || !currentSessionId) {
      cleanupAllListeners();
      return;
    }

    // Clean up existing listeners before creating new ones
    cleanupAllListeners();

    const setupConsolidatedListeners = async () => {
      try {
        // Get event-specific database
        const eventCountry = await AsyncStorageUtils.getItem<string>('currentEventCountry');
        const eventDb = getDbForEvent(eventCountry);
      
      // 1. User profile listener
      const userProfileQuery = query(
        collection(eventDb, 'event_profiles'),
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
            // User profile not found - redirect to home but keep session data
            // Homepage restoration will handle this gracefully
            console.log('User profile not found in discovery listener - redirecting to home');
            // 3. Profile listener - profile not found, should go back
            unifiedNavigator.navigate('home', {}, true); // go back to home
            return;
          }

          // If user is not visible, clear profiles to show hidden state
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
          }
          // OPTION 1 FIX: Removed dependency on user profile for setting up other listeners
          // Other listeners are now set up independently below
        } catch (error) {
          console.error('Discovery error:', error);
        }
      }, (error) => {
        console.error('Discovery error:', error);
      });

        listenersRef.current.userProfile = userProfileUnsubscribe;
        
        // OPTION 1 FIX: Set up other listeners immediately, not dependent on user profile
        // This ensures profiles load even if user profile listener is slow
        if (!listenersRef.current.otherProfiles && !listenersRef.current.likes) {
          setupOtherListeners();
        }

      } catch (error) {
        console.error('Discovery error:', error);
      }
    };

    setupConsolidatedListeners();

    return () => {
      cleanupAllListeners();
    };
  }, [currentEvent?.id, currentSessionId, setupOtherListeners]);


  const cleanupAllListeners = () => {
    try {
      // Clean up user profile listener
      if (listenersRef.current.userProfile) {
        try {
          listenersRef.current.userProfile();
        } catch (error) {
          console.error('Discovery error:', error);
        }
        listenersRef.current.userProfile = undefined;
      }
      
      // Clean up other profiles listener
      if (listenersRef.current.otherProfiles) {
        try {
          listenersRef.current.otherProfiles();
        } catch (error) {
          console.error('Discovery error:', error);
        }
        listenersRef.current.otherProfiles = undefined;
      }
      
      // Clean up likes listener
      if (listenersRef.current.likes) {
        try {
          listenersRef.current.likes();
        } catch (error) {
          console.error('Discovery error:', error);
        }
        listenersRef.current.likes = undefined;
      }
      
      // Clean up mutual matches listener
      if (listenersRef.current.mutualMatches) {
        try {
          listenersRef.current.mutualMatches();
        } catch (error) {
          console.error('Discovery error:', error);
        }
        listenersRef.current.mutualMatches = undefined;
      }
    } catch (error) {
      console.error('Discovery error:', error);
    }
  };

  const loadBlockedProfiles = async (eventId: string, sessionId: string) => {
    try {
      const blocked = await BlockedMatchAPI.filter({
        event_id: eventId,
        blocker_session_id: sessionId
      });
      // Note: blocked profiles are handled by the API filtering, no local state needed
    } catch (error) {
      console.error('Discovery error:', error);
    }
  };

  const loadSkippedProfiles = async (eventId: string, sessionId: string) => {
    try {
      const skipped = await SkippedProfileAPI.filter({
        event_id: eventId,
        skipper_session_id: sessionId
      });
      setSkippedProfiles(new Set(skipped.map(s => s.skipped_session_id)));
    } catch (error) {
      console.error('Discovery error:', error);
    }
  };

  const loadViewedProfiles = async (eventId: string) => {
    try {
      const viewedKey = `viewedProfiles_${eventId}`;
      const viewedData = await AsyncStorageUtils.getItem<string[]>(viewedKey);
      if (viewedData && Array.isArray(viewedData)) {
        setViewedProfiles(new Set(viewedData));
      }
    } catch (error) {
      console.error('Error loading viewed profiles:', error);
    }
  };

  const saveViewedProfiles = async (eventId: string, viewedSet: Set<string>) => {
    try {
      const viewedKey = `viewedProfiles_${eventId}`;
      await AsyncStorageUtils.setItem(viewedKey, Array.from(viewedSet));
    } catch (error) {
      console.error('Error saving viewed profiles:', error);
    }
  };

  // Apply filters whenever profiles, user profile, filters, or profile states change
  useEffect(() => {
    
    // Sort profiles by priority (move inside to avoid dependency issues)
    function sortProfilesByPriority(profilesList: any[]) {
      return [...profilesList].sort((a, b) => {
        const aIsViewed = viewedProfiles.has(a.session_id);
        const bIsViewed = viewedProfiles.has(b.session_id);

        // Priority 1: Unseen profiles before seen profiles
        if (!aIsViewed && bIsViewed) return -1;
        if (aIsViewed && !bIsViewed) return 1;

        // Priority 2: Within same group (both unseen or both seen), sort by join date
        // Earlier joined users appear first (ascending order by created_at)
        if (a.created_at && b.created_at) {
          const aJoinTime = a.created_at.toDate ? a.created_at.toDate().getTime() : new Date(a.created_at).getTime();
          const bJoinTime = b.created_at.toDate ? b.created_at.toDate().getTime() : new Date(b.created_at).getTime();
          return aJoinTime - bJoinTime; // Earlier join time first
        }

        // Fallback: if no join date available, maintain current order
        return 0;
      });
    }

    // Apply filters (move inside to avoid dependency issues)
    function applyFilters() {
      if (!currentUserProfile) {
        setFilteredProfiles([]);
        return;
      }

      let tempFiltered = profiles.filter(otherUser => {
        // Filter out skipped profiles completely
        if (skippedProfiles.has(otherUser.session_id)) {
          return false;
        }

        // Filter out liked profiles completely
        if (likedProfiles.has(otherUser.session_id)) {
          return false;
        }

        // Mutual Gender Interest Check - based on user's profile preferences
        // Add defensive checks for missing fields
        const iAmInterestedInOther =
          !currentUserProfile.interested_in || 
          currentUserProfile.interested_in === 'everyone' ||
          (currentUserProfile.interested_in === 'men' && otherUser.gender_identity === 'man') ||
          (currentUserProfile.interested_in === 'women' && otherUser.gender_identity === 'woman');

        const otherIsInterestedInMe =
          !otherUser.interested_in ||
          otherUser.interested_in === 'everyone' ||
          (otherUser.interested_in === 'men' && currentUserProfile.gender_identity === 'man') ||
          (otherUser.interested_in === 'women' && currentUserProfile.gender_identity === 'woman');
        
        if (!iAmInterestedInOther || !otherIsInterestedInMe) {
          return false;
        }

        // Age Range Filter - add defensive check for missing age
        if (otherUser.age && !(otherUser.age >= filters.age_min && otherUser.age <= filters.age_max)) {
          return false;
        }

        
        return true;
      });

      // Apply priority-based sorting
      const sortedProfiles = sortProfilesByPriority(tempFiltered);

      setFilteredProfiles(sortedProfiles);
      console.log(`Discovery: Applied filtering and sorting - ${profiles.length} → ${sortedProfiles.length} profiles`);
    }

    applyFilters();
  }, [profiles, currentUserProfile, filters, likedProfiles, skippedProfiles, viewedProfiles, filteredProfiles.length]);

  // Obsolete comments removed


  const handleLike = async (likedProfile: any) => {
    if (likedProfiles.has(likedProfile.session_id) || !currentUserProfile) return;
    
    // Cannot like a profile that has been skipped
    if (skippedProfiles.has(likedProfile.session_id)) {
      Alert.alert(
        'Cannot Like',
        'You cannot like a profile you have skipped.',
        [{ text: 'OK' }]
      );
      return;
    }

    const eventId = await AsyncStorageUtils.getItem<string>('currentEventId');
    const likerSessionId = currentUserProfile.session_id;

    if (!eventId) return;

    // Track user interaction
    await trackUserInteraction('like_profile');

    // Check if both profiles are visible (required by Firestore rules)
    if (!currentUserProfile.is_visible || !likedProfile.is_visible) {
      Toast.show({
        type: 'warning',
        text1: 'Profile Not Visible',
        text2: 'Enable visibility in settings',
        position: 'top',
        visibilityTime: 3500,
        autoHide: true,
        topOffset: 0,
      });
      return;
    }

    try {
      // Optimistically update UI
      setLikedProfiles(prev => new Set([...prev, likedProfile.session_id]));
      
      // Filtering will be triggered by state change

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
        const eventCountry = await AsyncStorageUtils.getItem<string>('currentEventCountry') || undefined;
        await trackAsyncOperation('update_like_mutual', async () => {
          await Promise.all([
            LikeAPI.update(newLike.id, { 
              is_mutual: true,
              liker_notified_of_match: false // Don't mark as notified yet, let the listener handle it
            }, eventCountry),
            LikeAPI.update(theirLikeRecord.id, { 
              is_mutual: true,
              liked_notified_of_match: false // Don't mark as notified yet, let the listener handle it
            }, eventCountry)
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
      console.error('Discovery error:', error);
      // Revert optimistic update on error
      setLikedProfiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(likedProfile.session_id);
        return newSet;
      });
      
      // Filtering will be triggered by state change
      
      // Show user-friendly error message
      Alert.alert(
        'Error',
        'Unable to like this person. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleSkip = async (skippedProfile: any) => {
    if (skippedProfiles.has(skippedProfile.session_id) || !currentUserProfile) return;
    
    // Cannot skip a profile that has been liked
    if (likedProfiles.has(skippedProfile.session_id)) {
      Alert.alert(
        'Cannot Skip',
        'You cannot skip a profile you have liked. You can see your likes with pink heart icons.',
        [{ text: 'OK' }]
      );
      return;
    }

    const eventId = await AsyncStorageUtils.getItem<string>('currentEventId');
    const skipperSessionId = currentUserProfile.session_id;

    if (!eventId) return;

    // Track user interaction
    await trackUserInteraction('skip_profile');

    try {
      // Optimistically update UI
      setSkippedProfiles(prev => new Set([...prev, skippedProfile.session_id]));

      await trackAsyncOperation('create_skip', async () => {
        return await SkippedProfileAPI.create({
          event_id: eventId,
          skipper_session_id: skipperSessionId,
          skipped_session_id: skippedProfile.session_id,
        });
      });

      // Close profile modal if it's open
      setSelectedProfileForDetail(null);

    } catch (error) {
      console.error('Discovery error:', error);
      // Revert optimistic update on error
      setSkippedProfiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(skippedProfile.session_id);
        return newSet;
      });
      
      // Show user-friendly error message
      Alert.alert(
        'Error',
        'Unable to skip this person. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };
  
  const handleProfileTap = (profile: any) => {
    console.log('Discovery: Profile tapped, setting selectedProfileForDetail to:', profile.first_name);
    setSelectedProfileForDetail(profile);
  };




  const handleApplyFilters = () => {
    setFilters(tempFilters);
    setShowFilters(false);
  };

  const handleResetFilters = () => {
    const resetFilters = {
      age_min: 18,
      age_max: 99
    };
    setTempFilters(resetFilters);
  };

  const handleOpenFilters = () => {
    setTempFilters(filters); // Initialize temp filters with current filters
    setShowFilters(true);
  };

  const handleCancelFilters = () => {
    setTempFilters(filters); // Reset temp filters to current filters
    setShowFilters(false);
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
      textAlign: 'center',
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
    profileCardUnviewed: {
      // Subtle purple glow that works in both light and dark mode
      shadowColor: '#8b5cf6',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 8,
      elevation: 6,
      // Purple border around the entire thumbnail
      borderWidth: 3,
      borderColor: '#8b5cf6',
    },
    profileImageContainer: {
      width: cardSize - 12,
      height: cardSize - 12,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 6, // Reduced to lower the name
      backgroundColor: isDark ? '#404040' : '#e5e7eb',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
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
    nameOverlay: {
      position: 'absolute',
      bottom: -4, // Move down below the bottom edge to lower position
      left: 0,
      right: 0,
      backgroundColor: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.5)',
      padding: 6,
    },
    profileName: {
      fontSize: 12,
      fontWeight: '500',
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
    skippedOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      borderRadius: 12,
      zIndex: 1,
    },
  });

  // Only show loading for truly invalid states (no session data at all)
  if (!isInitialized && !currentEvent && !currentSessionId) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
        <StatusBar 
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={isDark ? '#000' : '#fff'}
        />
        {/* Logo Section */}
        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/Hooked Full Logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Loading State */}
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show hidden state if user is not visible
  if (currentUserProfile && !currentUserProfile.is_visible) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
        <StatusBar 
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={isDark ? '#000' : '#fff'}
        />
        {/* Logo Section */}
        <View style={styles.logoContainer}>
          <Image 
            // eslint-disable-next-line @typescript-eslint/no-require-imports
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
              onPress={() => unifiedNavigator.navigate('profile')}
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
            onPress={() => {}} // Already on discovery page but hidden
            accessibilityRole="button"
            accessibilityLabel="Discover"
            accessibilityHint="Currently on discovery page"
          >
            <Users size={24} color="#8b5cf6" />
            <Text style={[styles.navButtonText, styles.navButtonTextActive]}>Discover</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => unifiedNavigator.navigate('matches')}
            accessibilityRole="button"
            accessibilityLabel="Matches Tab"
            accessibilityHint="Navigate to your matches"
          >
            <MessageCircle size={24} color="#9ca3af" />
            <Text style={styles.navButtonText}>Matches</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => unifiedNavigator.navigate('profile')}
            accessibilityRole="button"
            accessibilityLabel="Profile Tab"
            accessibilityHint="Navigate to your profile settings"
          >
            <User size={24} color="#9ca3af" />
            <Text style={styles.navButtonText}>Profile</Text>
          </TouchableOpacity>
        </View>

        {/* How It Works Modal */}
        <HowItWorksModal
          visible={showHowItWorksModal}
          onClose={() => setShowHowItWorksModal(false)}
          eventId={currentEvent?.id || ''}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? '#000' : '#fff'}
      />
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
          {currentEvent?.name ? (
            <Text style={styles.title}>
              Singles at {currentEvent.name}
            </Text>
          ) : (
            <Text style={styles.title}>
              Loading event...
            </Text>
          )}
          {currentEvent?.expires_at ? (
            <CountdownTimer
              expiresAt={currentEvent.expires_at}
              prefix="Everything expires in "
              style={styles.subtitle}
            />
          ) : currentEvent?.name ? (
            <Text style={styles.subtitle}>{filteredProfiles.length} people discovered</Text>
          ) : (
            <Text style={styles.subtitle}>Preparing your experience...</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={handleOpenFilters}
          accessibilityRole="button"
          accessibilityLabel="Filter Profiles"
          accessibilityHint="Open filters to customize your discovery preferences"
        >
          <Filter size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Profiles Grid */}
      {currentEvent?.name ? (
        <ScrollView 
          style={styles.profilesContainer}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={['#FF6B6B']} // Android
              tintColor="#FF6B6B" // iOS
            />
          }
        >
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
                      style={[
                        styles.profileCard,
                        !viewedProfiles.has(profile.session_id) && styles.profileCardUnviewed
                      ]}
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
                            onLoad={() => console.log('Discovery thumbnail: Image decoded for modal instant display')}
                            style={styles.profileImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={[styles.fallbackAvatar, { backgroundColor: profile.profile_color || '#cccccc' }]}>
                            <Text style={styles.fallbackText}>{profile.first_name[0]}</Text>
                          </View>
                        )}

                        {/* Name Overlay */}
                        <View style={styles.nameOverlay}>
                          <Text style={styles.profileName}>{profile.first_name?.split(' ')[0] || profile.first_name}</Text>
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

        {filteredProfiles.length === 0 && (
          <View style={styles.emptyState}>
            <Users size={48} color="#9ca3af" />
            <Text style={styles.emptyTitle}>No singles found</Text>
            <Text style={styles.emptyText}>
              Try adjusting your filters or check back later as more people join the event.
            </Text>
            <TouchableOpacity
              style={styles.adjustFiltersButton}
              onPress={handleOpenFilters}
              accessibilityRole="button"
              accessibilityLabel="Adjust Filters"
              accessibilityHint="Open filters to adjust your discovery preferences"
            >
              <Text style={styles.adjustFiltersButtonText}>Adjust Filters</Text>
            </TouchableOpacity>
          </View>
        )}
        </ScrollView>
      ) : (
        <View style={[styles.profilesContainer, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={[styles.emptyTitle, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
            Loading profiles...
          </Text>
        </View>
      )}

      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
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
          onPress={() => unifiedNavigator.navigate('matches')}
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
        
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => unifiedNavigator.navigate('profile')}
          accessibilityRole="button"
          accessibilityLabel="Profile"
          accessibilityHint="Navigate to your profile page"
        >
          <User size={24} color="#9ca3af" />
          <Text style={styles.navButtonText}>Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Modal */}
      <Modal visible={showFilters} transparent animationType="slide" onRequestClose={handleCancelFilters} accessibilityViewIsModal={true}>
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleCancelFilters}
        >
          <TouchableOpacity 
            style={styles.modalCard}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={handleCancelFilters} accessibilityRole="button" accessibilityLabel="Close filters" accessibilityHint="Close the filters modal">
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Age Range */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Age Range</Text>
              <View style={styles.ageRangeContainer}>
                <Text style={styles.ageRangeText}>
                  {tempFilters.age_min} - {tempFilters.age_max} years
                </Text>
                <DualHandleRangeSlider
                  min={18}
                  max={99}
                  minValue={tempFilters.age_min}
                  maxValue={tempFilters.age_max}
                  onValueChange={(min, max) => {
                    setTempFilters(prev => ({ 
                      ...prev, 
                      age_min: Math.round(min), 
                      age_max: Math.round(max) 
                    }));
                  }}
                />
              </View>
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
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Profile Detail Modal */}
      <UserProfileModal
        visible={selectedProfileForDetail !== null}
        profile={selectedProfileForDetail}
        onClose={() => {
          console.log('Discovery: Profile modal closing, clearing selectedProfileForDetail');
          if (selectedProfileForDetail && currentEvent?.id) {
            const newViewedSet = new Set([...viewedProfiles, selectedProfileForDetail.session_id]);
            setViewedProfiles(newViewedSet);
            saveViewedProfiles(currentEvent.id, newViewedSet);
          }
          setSelectedProfileForDetail(null);
        }}
        onLike={handleLike}
        onSkip={handleSkip}
        isLiked={selectedProfileForDetail ? likedProfiles.has(selectedProfileForDetail.session_id) : false}
        isSkipped={selectedProfileForDetail ? skippedProfiles.has(selectedProfileForDetail.session_id) : false}
      />

      {/* Hidden Image Pool - Pre-renders modal-sized images for instant display */}
      <View style={{
        position: 'absolute',
        top: -10000,  // Way off screen
        left: -10000,
        width: 350,   // Match modal width
        height: 280,  // Match modal image height
        pointerEvents: 'none',  // Critical: Doesn't block touches
      }}>
        {filteredProfiles.map(profile => (
          profile.profile_photo_url ? (
            <Image
              key={profile.session_id}
              source={{ uri: profile.profile_photo_url }}
              style={{ 
                width: 350,   // Match modal image size exactly
                height: 280,  // Match modal image height exactly
                resizeMode: 'contain'  // Match modal resizeMode
              }}
              onLoad={() => console.log(`Pre-rendered modal-size image: ${profile.first_name}`)}
            />
          ) : null
        ))}
      </View>

      {/* How It Works Modal */}
      <HowItWorksModal
        visible={showHowItWorksModal}
        onClose={() => setShowHowItWorksModal(false)}
        eventId={currentEvent?.id || ''}
      />

    </SafeAreaView>
  );
} 