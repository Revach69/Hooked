import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Dimensions,
  Modal,
  TextInput,
  ActivityIndicator,
  useColorScheme,
  Image,
  Keyboard,
  ScrollView,
  FlatList,
  Platform,
  Switch,
  KeyboardAvoidingView
} from 'react-native';
import Toast from 'react-native-toast-message';
import { router, useFocusEffect } from 'expo-router';
import { Clock, Users, LogOut, Edit, User, AlertCircle, MessageCircle } from 'lucide-react-native';
import { AsyncStorageUtils } from '../lib/asyncStorageUtils';
import { ensureFirebaseReady } from '../lib/firebaseReady';
import { EventProfileAPI, EventAPI, ReportAPI, StorageAPI, LikeAPI, MessageAPI } from '../lib/firebaseApi';
import * as ImagePicker from 'expo-image-picker';
import { ImageCacheService } from '../lib/services/ImageCacheService';
import { SafeAreaView } from 'react-native-safe-area-context';
import { checkSimpleNetworkConnectivity } from '../lib/utils';
import * as Sentry from '@sentry/react-native';
import { GlobalDataCache, CacheKeys } from '../lib/cache/GlobalDataCache';


export default function Profile() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [profile, setProfile] = useState<any>(null);
  const [currentEvent, setCurrentEvent] = useState<any>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [tempPhotoUri, setTempPhotoUri] = useState<string | null>(null);
  const [aboutMe, setAboutMe] = useState(profile?.about_me || '');
  const [editingAboutMe, setEditingAboutMe] = useState(false);
  const [height, setHeight] = useState(profile?.height_cm ? String(profile.height_cm) : '');
  const [editingHeight, setEditingHeight] = useState(false);
  const [heightUnit, setHeightUnit] = useState<'cm' | 'feet'>('cm');
  const [feet, setFeet] = useState('');
  const [inches, setInches] = useState('');
  const [interests, setInterests] = useState(profile?.interests || []);
  const [showInterests, setShowInterests] = useState(false);
  const [eventVisible, setEventVisible] = useState(profile?.is_visible ?? true);
  const [saving, setSaving] = useState(false);
  const [editingBasicProfile, setEditingBasicProfile] = useState(false);
  const ALL_INTERESTS = [
    'music', 'tech', 'food', 'books', 'travel', 'art', 'fitness', 'nature', 'movies', 'business', 'photography', 'dancing',
    'yoga', 'gaming', 'comedy', 'startups', 'fashion', 'spirituality', 'volunteering', 'crypto', 'cocktails', 'politics', 'hiking', 'design', 'podcasts', 'pets', 'wellness'
  ];
  

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportStep, setReportStep] = useState<'select' | 'form'>('select');
  const [selectedUserToReport, setSelectedUserToReport] = useState<any>(null);
  const [reportExplanation, setReportExplanation] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [matchedUserIds, setMatchedUserIds] = useState<Set<string>>(new Set());
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [cachedProfileImageUri, setCachedProfileImageUri] = useState<string | null>(null);
  const [cachedUserImageUris, setCachedUserImageUris] = useState<Map<string, string>>(new Map());
  const [showImagePreview, setShowImagePreview] = useState(false);

  // Load cached image URI immediately on mount to prevent flash
  useEffect(() => {
    const loadCachedImageUri = async () => {
      const sessionId = await AsyncStorageUtils.getItem<string>('currentSessionId');
      if (sessionId) {
        const imageCacheKey = `profile_image_${sessionId}`;
        const cachedImageUri = GlobalDataCache.get<string>(imageCacheKey);
        
        if (cachedImageUri) {
          setCachedProfileImageUri(cachedImageUri);
          console.log('Profile: Loaded cached image URI immediately to prevent flash');
        }
      }
    };
    
    loadCachedImageUri();
  }, []);

  useEffect(() => {
    // Move initializeSession inside useEffect to resolve dependency issue
    const initializeSession = async () => {
      // Ensure Firebase is initialized
      const firebaseReady = await ensureFirebaseReady();
      if (!firebaseReady) {
        Alert.alert(
          'Connection Error',
          'Unable to connect to the server. Please check your internet connection and try again.',
          [
            {
              text: 'OK',
              onPress: () => router.back() // 11. Firebase connection error - go back to previous page
            }
          ]
        );
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      const eventId = await AsyncStorageUtils.getItem<string>('currentEventId');
      const sessionId = await AsyncStorageUtils.getItem<string>('currentSessionId');
      
      if (!eventId || !sessionId) {
        // 12. No active session - correct to go home
        router.replace('/home');
        return;
      }
      
      try {
        let currentEventData = null;
        
        // Check cache first for event data
        const cachedEvent = GlobalDataCache.get<any>(CacheKeys.PROFILE_EVENT);
        if (cachedEvent && cachedEvent.id === eventId) {
          setCurrentEvent(cachedEvent);
          currentEventData = cachedEvent;
          console.log('Profile: Using cached event data');
        } else {
          // Add timeout to prevent hanging indefinitely
          const eventTimeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Event loading timeout')), 30000); // 30 second timeout - give more time
          });
          
          const eventPromise = EventAPI.filter({ id: eventId });
          const events = await Promise.race([eventPromise, eventTimeoutPromise]);
          
          if (events.length > 0) {
            currentEventData = events[0];
            setCurrentEvent(currentEventData);
            GlobalDataCache.set(CacheKeys.PROFILE_EVENT, currentEventData, 10 * 60 * 1000); // Cache for 10 minutes
            console.log('Profile: Loaded and cached event data');
          } else {
            // Event doesn't exist - clear only after confirmation
            console.log('Event not found in profile, clearing session data');
            await AsyncStorageUtils.multiRemove([
              'currentEventId',
              'currentSessionId',
              'currentEventCode',
              'currentProfileColor',
              'currentProfilePhotoUrl'
            ]);
            // 13. Event not found - expired or deleted, correct to go home
            router.replace('/home');
            return;
          }
        }

        // Add timeout for profile lookup
        const profileTimeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Profile loading timeout')), 30000); // 30 second timeout - give more time
        });
        
        const profilePromise = EventProfileAPI.filter({ 
          session_id: sessionId,
          event_id: eventId 
        });
        const profiles = await Promise.race([profilePromise, profileTimeoutPromise]);
        
        if (profiles.length > 0) {
          setProfile(profiles[0]);
          
          // Load cached profile image URI immediately to prevent placeholder flash
          const userProfile = profiles[0];
          const imageCacheKey = `profile_image_${sessionId}`;
          const cachedImageUri = GlobalDataCache.get<string>(imageCacheKey);
          
          if (cachedImageUri) {
            setCachedProfileImageUri(cachedImageUri);
            console.log('Profile: Using cached image URI');
          }
          
          // Cache user's own profile image in background
          if (userProfile.profile_photo_url && currentEventData) {
            try {
              const cachedUri = await ImageCacheService.getCachedImageUri(
                userProfile.profile_photo_url,
                currentEventData.id,
                userProfile.session_id
              );
              setCachedProfileImageUri(cachedUri);
              // Cache the URI for next time
              GlobalDataCache.set(imageCacheKey, cachedUri, 30 * 60 * 1000); // Cache for 30 minutes
            } catch (error) {
              console.warn('Failed to cache profile image:', error);
              setCachedProfileImageUri(userProfile.profile_photo_url);
              // Cache the original URL
              GlobalDataCache.set(imageCacheKey, userProfile.profile_photo_url, 30 * 60 * 1000);
            }
          }
        } else {
          // Profile doesn't exist in database (user left event and deleted profile)
          // Clear session data only after confirming profile is truly gone
          console.log('User profile not found in profile initialization - clearing session data');
          await AsyncStorageUtils.multiRemove([
            'currentEventId',
            'currentSessionId',
            'currentEventCode',
            'currentProfileColor',
            'currentProfilePhotoUrl'
          ]);
          // 14. Profile deleted - must go home as profile cannot be recovered
          router.replace('/home');
          return;
        }
      } catch (error) {
        console.error('Error initializing profile session:', error);
        Sentry.captureException(error);
        
        // Don't clear session data on network/timeout errors
        // And don't redirect - let user stay on profile page
        if (error instanceof Error && error.message.includes('timeout')) {
          console.log('Profile initialization timeout - continuing with cached data if available');
          // User can still use the profile page with cached data
        } else {
          console.log('Profile initialization error - staying on profile page with cached data');
        }
        
        // DO NOT redirect on errors - let user continue using the app
        // They still have their session and can navigate manually if needed
        return;
      }
    };

    initializeSession();
    // Initialize image cache service
    ImageCacheService.initialize();
  }, []);

  // Check for unseen messages
  useEffect(() => {
    if (!currentEvent?.id || !profile?.session_id) return;

    const checkUnseenMessages = async () => {
      try {
        const { hasUnseenMessages } = await import('../lib/messageNotificationHelper');
        const hasUnseen = await hasUnseenMessages(currentEvent.id, profile.session_id);
        setHasUnreadMessages(hasUnseen);
      } catch (error) {
      Sentry.captureException(error);
        // Error checking unseen messages in profile
      }
    };

    checkUnseenMessages();
    
    // Check every 5 seconds for updates
    const interval = setInterval(checkUnseenMessages, 5000);
    return () => clearInterval(interval);
  }, [currentEvent?.id, profile?.session_id]);

  // Synchronize eventVisible state with profile data
  useEffect(() => {
    if (profile) {
      const newVisibility = profile.is_visible ?? true;
      setEventVisible(newVisibility);
    }
  }, [profile]);

  // Refresh profile data when returning to this page
  useFocusEffect(
    React.useCallback(() => {
      if (profile?.id) {
        // Refresh profile data to ensure toggle state is current
        const refreshProfile = async () => {
          try {
            const updatedProfile = await EventProfileAPI.get(profile.id);
            if (updatedProfile) {
              setProfile(updatedProfile);
            }
          } catch {
            // Handle error silently
          }
        };
        refreshProfile();
      }
    }, [profile?.id])
  );


  const handlePhotoUpload = async () => {
    try {
      Alert.alert(
        "Choose Photo",
        "How would you like to add your profile photo?",
        [
          {
            text: "Take Photo",
            onPress: () => handleCameraCapture()
          },
          {
            text: "Choose from Gallery",
            onPress: () => handleGalleryPick()
          },
          {
            text: "Cancel",
            style: "cancel"
          }
        ]
      );
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to open photo options. Please try again.',
        position: 'top',
        visibilityTime: 3500,
        autoHide: true,
        topOffset: 0,
      });
    }
  };

  const handleCameraCapture = async () => {
    try {
      // Check current camera permissions
      const permissionResult = await ImagePicker.getCameraPermissionsAsync();
      
      if (permissionResult.granted === false) {
        // Request camera permissions
        const requestResult = await ImagePicker.requestCameraPermissionsAsync();
        
        if (requestResult.granted === false) {
          Alert.alert("Permission Required", "Camera permission is required to take a photo!");
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.4, // Optimized for fast upload
        allowsMultipleSelection: false,
        base64: false,
        exif: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await processImageAsset(result.assets[0]);
      }
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to capture photo. Please try again.',
        position: 'top',
        visibilityTime: 3500,
        autoHide: true,
        topOffset: 0,
      });
    }
  };

  const handleGalleryPick = async () => {
    try {
      // Check current media library permissions
      const permissionResult = await ImagePicker.getMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        // Request media library permissions
        const requestResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (requestResult.granted === false) {
          Alert.alert("Permission Required", "Permission to access camera roll is required!");
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.4, // Optimized for fast upload
        allowsMultipleSelection: false,
        base64: false,
        exif: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await processImageAsset(result.assets[0]);
      }
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to pick image. Please try again.',
        position: 'top',
        visibilityTime: 3500,
        autoHide: true,
        topOffset: 0,
      });
    }
  };

  const processImageAsset = async (asset: any) => {
    // Consistent 5MB file size limit
    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
      Sentry.captureException(new Error(`File too large: ${asset.fileSize}`));
      Toast.show({
        type: 'warning',
        text1: 'File Too Large',
        text2: 'Image must be smaller than 5MB. Please choose a smaller image.',
        position: 'top',
        visibilityTime: 3500,
        autoHide: true,
        topOffset: 0,
      });
      return;
    }

    // Show thumbnail immediately
    setTempPhotoUri(asset.uri);
    
    // Start upload with progress indicator
    setIsUploadingPhoto(true);
    
    try {
      // Optimize image for faster upload
      const { ImageOptimizationService } = await import('../lib/services/ImageOptimizationService');
      const optimizedUri = await ImageOptimizationService.optimizeProfilePhoto(asset.uri);

      // Create file object for upload with optimized image
      const fileObject = {
        uri: optimizedUri,
        name: `profile-photo-${Date.now()}.jpg`,
        type: 'image/jpeg',
        fileSize: asset.fileSize // Note: Original size, optimized will be smaller
      };

      // Upload to Firebase Storage with simplified retry logic and timeout
      let uploadAttempts = 0;
      const maxAttempts = 2; // Reduced from 3 attempts
      
      while (uploadAttempts < maxAttempts) {
        try {
          // Create timeout promise only for the actual upload operation
          // This excludes the library browsing time since it's created here
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Upload timeout - please try again')), 30000);
          });
          
          const uploadPromise = StorageAPI.uploadFile(fileObject);
          const { file_url } = await Promise.race([uploadPromise, timeoutPromise]);
          
          // Update profile with new photo
          await EventProfileAPI.update(profile.id, { profile_photo_url: file_url });
          setProfile((prev: any) => ({ ...prev, profile_photo_url: file_url }));
          await AsyncStorageUtils.setItem('currentProfilePhotoUrl', file_url);
          
          // Clear temp photo and success - break out of retry loop
          setTempPhotoUri(null);
          break;
        } catch (uploadError) {
          uploadAttempts++;
          
          if (uploadAttempts >= maxAttempts) {
            throw uploadError;
          }
          
          // Wait before retrying (shorter fixed delay)
          const waitTime = 2000; // Fixed 2 second delay
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    } catch (err) {
      Sentry.captureException(err);
      
      // Enhanced error logging
      let errorMessage = 'Unknown upload error';
      
      if (err instanceof Error) {
        if (err.message.includes('Network request failed')) {
          errorMessage = 'Network connection failed. Please check your internet connection and try again.';
        } else if (err.message.includes('No internet connection')) {
          errorMessage = 'No internet connection. Please check your network and try again.';
        } else if (err.message.includes('Failed to upload local file')) {
          errorMessage = 'Failed to process image. Please try selecting a different photo.';
        } else {
          errorMessage = err.message;
        }
      }
      
      Toast.show({
        type: 'error',
        text1: 'Upload Failed',
        text2: `Failed to upload photo: ${errorMessage}. Please try again.`,
        position: 'top',
        visibilityTime: 3500,
        autoHide: true,
        topOffset: 0,
      });
      // Clear temp photo on error
      setTempPhotoUri(null);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const loadAllUsers = async () => {
    try {
      const eventId = await AsyncStorageUtils.getItem<string>('currentEventId');
      const sessionId = await AsyncStorageUtils.getItem<string>('currentSessionId');
      if (!eventId || !sessionId) return;

      // Get current user's profile first
      const currentUserProfiles = await EventProfileAPI.filter({ 
        event_id: eventId,
        session_id: sessionId
      });
      
      if (currentUserProfiles.length === 0) {
        // Profile not found
        return;
      }
      
      const currentUserProfile = currentUserProfiles[0];

      // Get all visible profiles
      const allVisibleProfiles = await EventProfileAPI.filter({ 
        event_id: eventId,
        is_visible: true 
      });
      
      // Filter users based on discovery page logic
      const filteredUsers = allVisibleProfiles.filter(otherUser => {
        // Exclude current user
        if (otherUser.session_id === sessionId) {
          return false;
        }

        // Mutual Gender Interest Check - based on user's profile preferences
        const iAmInterestedInOther =
          (currentUserProfile.interested_in === 'everybody') ||
          (currentUserProfile.interested_in === 'men' && otherUser.gender_identity === 'man') ||
          (currentUserProfile.interested_in === 'women' && otherUser.gender_identity === 'woman');

        const otherIsInterestedInMe =
          (otherUser.interested_in === 'everybody') ||
          (otherUser.interested_in === 'men' && currentUserProfile.gender_identity === 'man') ||
          (otherUser.interested_in === 'women' && currentUserProfile.gender_identity === 'woman');
        
        // Only show users that match mutual interest criteria
        return iAmInterestedInOther && otherIsInterestedInMe;
      });

      // Load matches to prioritize them at the top
      const likes = await LikeAPI.filter({
        event_id: eventId,
        is_mutual: true
      });
      
      // Get current user's mutual matches
      const currentUserMatches = likes.filter(like => 
        like.liker_session_id === sessionId || like.liked_session_id === sessionId
      );
      
      // Create a set of matched user session IDs
      const matchedSessionIds = new Set(
        currentUserMatches.map(like => 
          like.liker_session_id === sessionId ? like.liked_session_id : like.liker_session_id
        )
      );
      
      // Sort users: matches first, then others
      const sortedUsers = filteredUsers.sort((a, b) => {
        const aIsMatch = matchedSessionIds.has(a.session_id);
        const bIsMatch = matchedSessionIds.has(b.session_id);
        
        // Matches first
        if (aIsMatch && !bIsMatch) return -1;
        if (!aIsMatch && bIsMatch) return 1;
        
        // If both are matches or both are not matches, sort alphabetically
        return a.first_name.localeCompare(b.first_name);
      });

      setAllUsers(sortedUsers);
      setMatchedUserIds(matchedSessionIds);
      
      // Cache user profile images for report modal
      if (currentEvent && sortedUsers.length > 0) {
        const cacheUserImages = async () => {
          const newCachedUris = new Map<string, string>();
          
          for (const user of sortedUsers) {
            if (user.profile_photo_url) {
              try {
                const cachedUri = await ImageCacheService.getCachedImageUri(
                  user.profile_photo_url,
                  currentEvent.id,
                  user.session_id
                );
                newCachedUris.set(user.session_id, cachedUri);
              } catch (error) {
                console.warn('Failed to cache user image:', user.session_id, error);
                newCachedUris.set(user.session_id, user.profile_photo_url);
              }
            }
          }
          
          setCachedUserImageUris(newCachedUris);
        };
        
        cacheUserImages();
      }
    } catch (error) {
      Sentry.captureException(error);
              // Error loading users for report
      // Handle error silently
    }
  };

  const handleReportUser = () => {
    setShowReportModal(true);
    setReportStep('select');
    setSelectedUserToReport(null);
    setReportExplanation('');
    loadAllUsers();
  };

  const handleSelectUserToReport = (user: any) => {
    setSelectedUserToReport(user);
    setReportStep('form');
  };

  const handleSubmitReport = async () => {
    if (!selectedUserToReport || !reportExplanation.trim()) {
      Toast.show({
        type: 'warning',
        text1: 'Missing Information',
        text2: 'Please provide a report explanation.',
        position: 'top',
        visibilityTime: 3500,
        autoHide: true,
        topOffset: 0,
      });
      return;
    }

    setSubmittingReport(true);
    try {
      // Check network connectivity before attempting to submit report

      let isConnected = true; // Default to true to bypass network check if it's causing issues
      
      try {
        isConnected = await checkSimpleNetworkConnectivity();

      } catch (error) {
      Sentry.captureException(error);
        
        isConnected = true; // Proceed even if network check fails
      }
      
      if (!isConnected) {
        Toast.show({
          type: 'error',
          text1: 'No Internet Connection',
          text2: 'Please check your internet connection and try again.',
          position: 'top',
          visibilityTime: 3500,
          autoHide: true,
          topOffset: 0,
        });
        setSubmittingReport(false);
        return;
      }



      const eventId = await AsyncStorageUtils.getItem<string>('currentEventId');
      const sessionId = await AsyncStorageUtils.getItem<string>('currentSessionId');
      

      
      if (!eventId || !sessionId) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Session information not found. Please try again.',
          position: 'top',
          visibilityTime: 3500,
          autoHide: true,
          topOffset: 0,
        });
        return;
      }


      
      let reportResult;
      
      reportResult = await ReportAPI.create({
        event_id: eventId,
        reporter_session_id: sessionId,
        reported_session_id: selectedUserToReport.session_id,
        reason: 'Inappropriate behavior',
        details: reportExplanation.trim(),
        status: 'pending'
      });
      

      
      // Verify the report was created successfully
      if (!reportResult || !reportResult.id) {
        throw new Error('Report creation failed - no ID returned');
      }

      // Auto-unmatch after successful report
      try {
        // Import LikeAPI if not already imported
        const { LikeAPI } = await import('../lib/firebaseApi');
        
        // Find the like record between reporter and reported user
        const mutualLikes = await LikeAPI.filter({
          event_id: eventId,
          is_mutual: true
        });
        
        const likeToDelete = mutualLikes.find(like => 
          (like.liker_session_id === sessionId && like.liked_session_id === selectedUserToReport.session_id) ||
          (like.liker_session_id === selectedUserToReport.session_id && like.liked_session_id === sessionId)
        );
        
        if (likeToDelete) {
          // Delete the like to unmatch
          await LikeAPI.delete(likeToDelete.id);
          
          // Update the other user's like to set is_mutual to false
          const otherLikes = await LikeAPI.filter({
            event_id: eventId,
            liker_session_id: selectedUserToReport.session_id,
            liked_session_id: sessionId
          });
          
          if (otherLikes.length > 0) {
            await LikeAPI.update(otherLikes[0].id, { is_mutual: false });
          }
        }
      } catch (unmatchError) {
        console.error('Error unmatching after report:', unmatchError);
        // Continue even if unmatch fails - report is more important
      }
      
      Alert.alert(
        "Report Submitted",
        `Thank you for your report. We will review the information about ${selectedUserToReport.first_name}. This user has been unmatched.`,
        [
          {
            text: "OK",
            onPress: () => {
              setShowReportModal(false);
              setReportStep('select');
              setSelectedUserToReport(null);
              setReportExplanation('');
              Keyboard.dismiss();
            }
          }
        ]
      );
    } catch (error) {
      Sentry.captureException(error);
      // Report submission error details
      
      let errorMessage = "Failed to submit report. Please try again.";
      
      // Provide more specific error messages based on the error type
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        
        if (errorMsg.includes('permission') || errorMsg.includes('permission denied')) {
          errorMessage = "Unable to submit report. Please check your internet connection and try again.";
        } else if (errorMsg.includes('network') || errorMsg.includes('network request failed')) {
          errorMessage = "Network error. Please check your internet connection and try again.";
        } else if (errorMsg.includes('quota') || errorMsg.includes('quota exceeded')) {
          errorMessage = "Service temporarily unavailable. Please try again later.";
        } else if (errorMsg.includes('timeout') || errorMsg.includes('operation timeout')) {
          errorMessage = "Request timed out. Please check your connection and try again.";
        } else if (errorMsg.includes('offline') || errorMsg.includes('client is offline')) {
          errorMessage = "You appear to be offline. Please check your internet connection and try again.";
        } else if (errorMsg.includes('missing required fields')) {
          errorMessage = "Invalid report data. Please try again.";
        } else {
          // For unknown errors, show a more generic message but log the actual error
          errorMessage = "Unable to submit report. Please try again later.";
        }
      }
      
      Alert.alert(
        'Error',
        errorMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Leave Event & Delete Profile",
      "Are you sure you want to leave this event and delete your profile? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Leave Event",
          style: "destructive",
          onPress: async () => {
            try {
              // Set flag to indicate profile deletion is in progress
              await AsyncStorageUtils.setItem('profileDeletionInProgress', true);
              const eventId = await AsyncStorageUtils.getItem<string>('currentEventId');
              const sessionId = await AsyncStorageUtils.getItem<string>('currentSessionId');
              
              if (eventId && sessionId) {
                // Delete all likes where this user is the liker
                try {
                  const likesAsLiker = await LikeAPI.filter({
                    event_id: eventId,
                    liker_session_id: sessionId
                  });
                  for (const like of likesAsLiker) {
                    await LikeAPI.delete(like.id);
                  }
                } catch (error) {
                  console.warn('Failed to delete likes as liker:', error);
                }

                // Delete all likes where this user is the liked
                try {
                  const likesAsLiked = await LikeAPI.filter({
                    event_id: eventId,
                    liked_session_id: sessionId
                  });
                  for (const like of likesAsLiked) {
                    await LikeAPI.delete(like.id);
                  }
                } catch (error) {
                  console.warn('Failed to delete likes as liked:', error);
                }

                // Delete all messages where this user is the sender
                try {
                  const messagesAsSender = await MessageAPI.filter({
                    event_id: eventId,
                    from_profile_id: sessionId
                  });
                  for (const message of messagesAsSender) {
                    await MessageAPI.delete(message.id);
                  }
                } catch (error) {
                  console.warn('Failed to delete messages as sender:', error);
                }

                // Delete all messages where this user is the recipient
                try {
                  const messagesAsRecipient = await MessageAPI.filter({
                    event_id: eventId,
                    to_profile_id: sessionId
                  });
                  for (const message of messagesAsRecipient) {
                    await MessageAPI.delete(message.id);
                  }
                } catch (error) {
                  console.warn('Failed to delete messages as recipient:', error);
                }
              }

              // Delete profile from backend
              if (profile?.id) {
                await EventProfileAPI.delete(profile.id);
              }

              // Clear image cache for this profile
              try {
                if (eventId && sessionId) {
                  await ImageCacheService.clearProfileCache(sessionId, eventId);
                }
              } catch (cacheError) {
                console.warn('Failed to clear image cache:', cacheError);
              }
              
              // Use SessionCleanupService for comprehensive cleanup
              const { SessionCleanupService } = await import('../lib/services/SessionCleanupService');
              await SessionCleanupService.clearSession('profile_deleted');
              
              // Verify cleanup was successful
              const verification = await SessionCleanupService.verifySessionCleared();
              if (!verification.isCleared) {
                console.warn('Session cleanup incomplete:', verification.remainingData);
                // Try force cleanup as fallback
                await SessionCleanupService.forceCleanupAll();
              }
              
              // 15. Profile deletion complete - must go home
              router.replace('/home');
              return;
            } catch (error) {
              // Clear the deletion flag on error
              await AsyncStorageUtils.removeItem('profileDeletionInProgress');
              console.error('Error during profile deletion:', error);
              Sentry.captureException(error);
              // Error deleting profile - use Alert for critical errors
              Alert.alert(
                'Error',
                `Failed to delete profile: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
                [{ text: 'OK' }]
              );
            }
          }
        }
      ]
    );
  };

  const handleSaveAboutMe = async () => {
    setSaving(true);
    await EventProfileAPI.update(profile.id, { about_me: aboutMe });
    setProfile((prev: any) => ({ ...prev, about_me: aboutMe }));
    setEditingAboutMe(false);
    setSaving(false);
  };
  // Convert feet/inches to cm
  const feetInchesToCm = (feet: number, inches: number): number => {
    return Math.round((feet * 30.48) + (inches * 2.54));
  };



  const handleSaveHeight = async () => {
    setSaving(true);
    let heightInCm: number;
    
    if (heightUnit === 'cm') {
      heightInCm = parseInt(height);
    } else {
      heightInCm = feetInchesToCm(parseInt(feet), parseInt(inches));
    }
    
    await EventProfileAPI.update(profile.id, { height_cm: heightInCm });
    setProfile((prev: any) => ({ ...prev, height_cm: heightInCm }));
    setEditingHeight(false);
    setSaving(false);
  };
  const handleToggleInterest = (interest: string) => {
    let newInterests = [...interests];
    if (newInterests.includes(interest)) {
      newInterests = newInterests.filter(i => i !== interest);
    } else if (newInterests.length < 3) {
      newInterests.push(interest);
    }
    setInterests(newInterests);
  };
  const handleSaveInterests = async () => {
    setSaving(true);
    await EventProfileAPI.update(profile.id, { interests });
    setProfile((prev: any) => ({ ...prev, interests }));
    setShowInterests(false);
    setSaving(false);
  };
  const handleToggleVisibility = async (value: boolean) => {
    try {
      // Use the new toggleVisibility function
      await EventProfileAPI.toggleVisibility(profile.id, value);
      setProfile((prev: any) => ({ ...prev, is_visible: value }));
      setEventVisible(value);
      
      // Show success message
      Toast.show({
        type: 'success',
        text1: value ? 'Profile Visible' : 'Profile Hidden',
        text2: value 
          ? 'Your profile is now visible to other users. You can see and be seen by other users in discovery.' 
          : 'Your profile is now hidden. You won\'t see other users in discovery, but you can still access your matches and chat with them.',
        position: 'top',
        visibilityTime: 3500,
        autoHide: true,
        topOffset: 0,
      });
      
    } catch (error) {
      Sentry.captureException(error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update visibility. Please try again.',
        position: 'top',
        visibilityTime: 3500,
        autoHide: true,
        topOffset: 0,
      });
      // Revert the toggle if update failed
      setEventVisible(!value);
    }
  };

  const handleUpdateGender = async (gender: string) => {
    setSaving(true);
    await EventProfileAPI.update(profile.id, { gender_identity: gender });
    setProfile((prev: any) => ({ ...prev, gender_identity: gender }));
    setSaving(false);
  };

  const handleUpdateInterestedIn = async (interestedIn: string) => {
    setSaving(true);
    await EventProfileAPI.update(profile.id, { interested_in: interestedIn });
    setProfile((prev: any) => ({ ...prev, interested_in: interestedIn }));
    setSaving(false);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#1a1a1a' : '#f8fafc',
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
    content: {
      flex: 1,
      paddingHorizontal: 16,
    },
    photoSection: {
      alignItems: 'center',
      marginBottom: 20,
    },
    photoContainer: {
      position: 'relative',
      width: 100,
      height: 100,
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 10,
      borderWidth: 2,
      borderColor: '#8b5cf6',
      borderStyle: 'dashed',
    },
    profilePhoto: {
      width: '100%',
      height: '100%',
    },
    fallbackAvatar: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    fallbackText: {
      fontSize: 40,
      color: 'white',
    },
    name: {
      fontSize: 24,
      fontWeight: 'bold',
      color: isDark ? '#f9fafb' : '#1f2937',
      marginBottom: 4,
    },
    age: {
      fontSize: 16,
      color: isDark ? '#9ca3af' : '#6b7280',
      marginBottom: 20,
    },
    card: {
      backgroundColor: isDark ? '#2d2d2d' : 'white',
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    detailLabel: {
      fontSize: 16,
      color: isDark ? '#9ca3af' : '#6b7280',
      fontWeight: 'bold',
    },
    detailValueContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 1,
      justifyContent: 'flex-end',
      marginLeft: 'auto',
      paddingLeft: 16,
    },
    detailValue: {
      fontSize: 16,
      color: isDark ? '#e5e7eb' : '#374151',
    },
    genderOption: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark ? '#374151' : '#e5e7eb',
      marginRight: 6,
      marginBottom: 8,
    },
    genderOptionSelected: {
      backgroundColor: '#8b5cf6',
      borderColor: '#8b5cf6',
    },
    genderOptionText: {
      fontSize: 14,
      color: isDark ? '#e5e7eb' : '#374151',
    },
    genderOptionTextSelected: {
      color: 'white',
    },
    input: {
      backgroundColor: isDark ? '#374151' : '#f9fafb',
      borderRadius: 10,
      padding: 15,
      fontSize: 16,
      color: isDark ? '#e5e7eb' : '#1f2937',
      borderWidth: 1,
      borderColor: isDark ? '#374151' : '#e5e7eb',
      minHeight: 100,
    },
    heightInput: {
      backgroundColor: isDark ? '#374151' : '#f9fafb',
      borderRadius: 10,
      padding: 15,
      fontSize: 18,
      color: isDark ? '#e5e7eb' : '#1f2937',
      borderWidth: 1,
      borderColor: isDark ? '#374151' : '#e5e7eb',
      height: 50,
      marginTop: 8,
    },
    heightUnitButton: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark ? '#374151' : '#e5e7eb',
      marginHorizontal: 4,
    },
    heightUnitButtonSelected: {
      backgroundColor: '#8b5cf6',
      borderColor: '#8b5cf6',
    },
    heightUnitButtonText: {
      fontSize: 14,
      color: isDark ? '#e5e7eb' : '#374151',
      fontWeight: '500',
    },
    heightUnitButtonTextSelected: {
      color: 'white',
    },
    uploadOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 16,
    },
    saveButton: {
      backgroundColor: '#8b5cf6',
      paddingVertical: 12,
      paddingHorizontal: 25,
      borderRadius: 10,
      marginLeft: 10,
    },
    saveButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
    },
    cancelButton: {
      backgroundColor: '#6b7280',
      paddingVertical: 12,
      paddingHorizontal: 25,
      borderRadius: 10,
      marginLeft: 10,
    },
    cancelButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
    },
    interestsModalContainer: {
      maxHeight: 250,
      paddingBottom: 10,
    },
    interestsSection: {
      marginBottom: 15,
    },
    interestsSectionHeader: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 10,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#374151' : '#e5e7eb',
    },
    toggleIcon: {
      fontSize: 18,
      color: isDark ? '#9ca3af' : '#6b7280',
    },
    interestOption: {
      paddingVertical: 10,
      paddingHorizontal: 15,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark ? '#374151' : '#e5e7eb',
      marginRight: 10,
      marginBottom: 8,
    },
    interestOptionSelected: {
      backgroundColor: '#8b5cf6',
      borderColor: '#8b5cf6',
    },
    interestOptionText: {
      fontSize: 14,
      color: isDark ? '#e5e7eb' : '#374151',
    },
    interestOptionTextSelected: {
      color: 'white',
    },
    interestChip: {
      backgroundColor: '#e0e7ff',
      borderRadius: 15,
      paddingVertical: 5,
      paddingHorizontal: 10,
      marginRight: 8,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: '#8b5cf6',
    },
    interestChipText: {
      fontSize: 12,
      color: '#4f46e5',
      fontWeight: 'bold',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDark ? '#1f2937' : '#f9fafb',
    },
    loadingText: {
      fontSize: 18,
      color: isDark ? '#9ca3af' : '#6b7280',
      marginTop: 10,
      textAlign: 'center',
    },
    reportButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 15,
      paddingHorizontal: 20,
      borderRadius: 12,
      marginBottom: 10,
      backgroundColor: '#f59e0b',
    },
    reportButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
      marginLeft: 8,
    },
    infoCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    infoCardTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: isDark ? '#f9fafb' : '#1f2937',
      marginLeft: 8,
    },
    infoCardText: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
      marginTop: 8,
      marginBottom: 10,
    },
    infoCardBullets: {
      marginLeft: 15,
    },
    bulletPoint: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 4,
    },
    bullet: {
      fontSize: 10,
      color: '#8b5cf6',
      marginRight: 4,
    },
    bulletText: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
    },
    actionsSection: {
      marginTop: 20,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 15,
      paddingHorizontal: 20,
      borderRadius: 12,
      marginBottom: 10,
    },
    actionText: {
      fontSize: 16,
      fontWeight: 'bold',
      marginLeft: 10,
    },
    logoutButton: {
      backgroundColor: '#ef4444',
    },
    logoutText: {
      color: 'white',
    },
    navButton: {
      alignItems: 'center',
    },
    navButtonActive: {},
    navButtonText: {
      fontSize: 12,
      color: isDark ? '#9ca3af' : '#9ca3af',
      marginTop: 4,
    },
    navButtonTextActive: {
      fontWeight: '600',
      color: '#8b5cf6',
    },
    userListItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#374151' : '#e5e7eb',
    },
    userListPhoto: {
      width: 40,
      height: 40,
      borderRadius: 20,
      overflow: 'hidden',
      marginRight: 10,
    },
    userListPhotoImage: {
      width: '100%',
      height: '100%',
    },
    userListPhotoFallback: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    userListPhotoFallbackText: {
      fontSize: 20,
      color: 'white',
    },
    userListInfo: {
      flex: 1,
    },
    userListName: {
      fontSize: 16,
      fontWeight: 'bold',
      color: isDark ? '#f9fafb' : '#1f2937',
    },
    userListAge: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalScrollContainer: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 20,
    },
    modalCard: {
      backgroundColor: isDark ? '#263238' : '#ffffff',
      borderRadius: 15,
      padding: 25,
      width: Math.min(Dimensions.get('window').width * 0.9, 400), // Responsive width: 90% of screen width, max 400px
      minHeight: 300, // Add minimum height to prevent shrinking
      maxHeight: '80%', // Limit maximum height
      borderWidth: 1,
      borderColor: isDark ? '#374151' : '#e5e7eb',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: isDark ? '#f9fafb' : '#1f2937',
      textAlign: 'center',
      marginBottom: 15,
    },
    sectionHeader: {
      fontSize: 14,
      fontWeight: '600',
      marginTop: 8,
      marginBottom: 8,
      textAlign: 'center',
    },
    reportUserInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 15,
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 20,
    },
    submitButton: {
      backgroundColor: '#8b5cf6',
      paddingVertical: 12,
      paddingHorizontal: 25,
      borderRadius: 10,
    },
    submitButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
    },
    interestsModalGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
      gap: 8,
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
    
    // Image Preview Modal Styles
    imagePreviewOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    imagePreviewCloseArea: {
      flex: 1,
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    imagePreviewContainer: {
      width: '90%',
      alignItems: 'center',
    },
    imagePreviewPhoto: {
      width: '100%',
      aspectRatio: 1, // Square aspect ratio like profile photos
      maxHeight: 400,
      borderRadius: 12,
    },
    imagePreviewButtons: {
      marginTop: 20,
      alignItems: 'center',
    },
    imagePreviewEditButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#8b5cf6',
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 25,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    imagePreviewEditText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },

  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Your Profile</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Photo Section */}
        <View style={styles.photoSection}>
          <TouchableOpacity
            style={styles.photoContainer}
            onPress={() => {
              console.log('Profile photo clicked:', {
                hasProfilePhoto: !!profile?.profile_photo_url,
                profilePhotoUrl: profile?.profile_photo_url,
                cachedImageUri: cachedProfileImageUri
              });
              if (profile?.profile_photo_url || cachedProfileImageUri) {
                setShowImagePreview(true);
              } else {
                handlePhotoUpload();
              }
            }}
            disabled={isUploadingPhoto}
            accessibilityLabel={profile?.profile_photo_url ? "View Profile Photo" : "Add Profile Photo"}
            accessibilityHint={profile?.profile_photo_url ? "Tap to view and edit your profile photo" : "Tap to add your profile photo"}
          >
            {isUploadingPhoto ? (
              <>
                {tempPhotoUri ? (
                  <Image
                    source={{ uri: tempPhotoUri }}
                    onError={() => {}}
                    style={styles.profilePhoto}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.fallbackAvatar, { backgroundColor: profile?.profile_color || '#cccccc' }]}>
                    <ActivityIndicator size="large" color="white" />
                  </View>
                )}
                {/* Upload indicator overlay */}
                <View style={styles.uploadOverlay}>
                  <ActivityIndicator size="small" color="white" />
                </View>
              </>
            
            ) : profile?.profile_photo_url ? (
              <Image
                source={{ uri: cachedProfileImageUri || profile.profile_photo_url }}
                onError={() => {}}
                style={styles.profilePhoto}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.fallbackAvatar, { backgroundColor: profile?.profile_color || '#cccccc' }]}>
                <Text style={styles.fallbackText}>{profile?.first_name?.[0] || '?'}</Text>
              </View>
            )}
          </TouchableOpacity>
          
          <Text style={styles.name}>{profile?.first_name || 'Loading...'}</Text>
          <Text style={styles.age}>{profile?.age ? `${profile.age} years old` : ''}</Text>
        </View>

        {/* Profile Details */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 16, color: isDark ? '#ffffff' : '#1f2937' }}>Basic Profile</Text>
            <TouchableOpacity 
              onPress={() => setEditingBasicProfile(!editingBasicProfile)}
              accessibilityLabel="Edit Basic Profile"
              accessibilityHint="Tap to edit your basic profile information"
            >
              <Edit size={18} color={isDark ? '#9ca3af' : '#6b7280'} />
            </TouchableOpacity>
          </View>
          
          {editingBasicProfile ? (
            <View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Gender</Text>
                <View style={styles.detailValueContainer}>
                  <TouchableOpacity
                    style={[
                      styles.genderOption,
                      profile.gender_identity === 'man' && styles.genderOptionSelected
                    ]}
                    onPress={() => handleUpdateGender('man')}
                  >
                    <Text style={[
                      styles.genderOptionText,
                      profile.gender_identity === 'man' && styles.genderOptionTextSelected
                    ]}>Man</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.genderOption,
                      profile.gender_identity === 'woman' && styles.genderOptionSelected
                    ]}
                    onPress={() => handleUpdateGender('woman')}
                  >
                    <Text style={[
                      styles.genderOptionText,
                      profile.gender_identity === 'woman' && styles.genderOptionTextSelected
                    ]}>Woman</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Interested in</Text>
                <View style={styles.detailValueContainer}>
                  <TouchableOpacity
                    style={[
                      styles.genderOption,
                      profile.interested_in === 'men' && styles.genderOptionSelected
                    ]}
                    onPress={() => handleUpdateInterestedIn('men')}
                  >
                    <Text style={[
                      styles.genderOptionText,
                      profile.interested_in === 'men' && styles.genderOptionTextSelected
                    ]}>Men</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.genderOption,
                      profile.interested_in === 'women' && styles.genderOptionSelected
                    ]}
                    onPress={() => handleUpdateInterestedIn('women')}
                  >
                    <Text style={[
                      styles.genderOptionText,
                      profile.interested_in === 'women' && styles.genderOptionTextSelected
                    ]}>Women</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.genderOption,
                      profile.interested_in === 'everybody' && styles.genderOptionSelected
                    ]}
                    onPress={() => handleUpdateInterestedIn('everybody')}
                  >
                    <Text style={[
                      styles.genderOptionText,
                      profile.interested_in === 'everybody' && styles.genderOptionTextSelected
                    ]}>Everybody</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            <View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Gender</Text>
                <Text style={styles.detailValue}>
                  {profile?.gender_identity === 'man' ? 'Man' : profile?.gender_identity === 'woman' ? 'Woman' : 'Not set'}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Interested in</Text>
                <Text style={styles.detailValue}>
                  {profile?.interested_in === 'men' ? 'Men' : 
                   profile?.interested_in === 'women' ? 'Women' : 
                   profile?.interested_in === 'everybody' ? 'Everybody' : 'Not set'}
                </Text>
              </View>
            </View>
          )}
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Event</Text>
            <Text style={styles.detailValue}>{currentEvent?.name}</Text>
          </View>
        </View>

        {/* Event Visibility Toggle */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <User size={20} color={eventVisible ? '#22c55e' : '#9ca3af'} />
            <Text style={{ fontWeight: 'bold', fontSize: 16, marginLeft: 8, color: isDark ? '#ffffff' : '#1f2937' }}>Event Visibility</Text>
            <View style={{ flex: 1 }} />
            <Switch value={eventVisible} onValueChange={handleToggleVisibility} />
          </View>
          <Text style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
            {eventVisible 
              ? 'Your profile is visible to others at the current event. You can see and be seen by other users.' 
              : 'Your profile is hidden from others at the current event. You cannot see other users, but you can still access your matches and chat with them.'
            }
          </Text>
        </View>
        {/* About Me */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontWeight: 'bold', fontSize: 16, color: isDark ? '#ffffff' : '#1f2937' }}>About Me</Text>
            <TouchableOpacity onPress={() => setEditingAboutMe(true)}>
              <Edit size={18} color={isDark ? '#9ca3af' : '#6b7280'} />
            </TouchableOpacity>
          </View>
          {editingAboutMe ? (
            <View>
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                value={aboutMe}
                onChangeText={setAboutMe}
                placeholder=""
                multiline
              />
              <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8 }}>
                <TouchableOpacity onPress={handleSaveAboutMe} disabled={saving} style={styles.saveButton}><Text style={styles.saveButtonText}>Save</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => { setEditingAboutMe(false); setAboutMe(profile?.about_me || ''); }} style={styles.cancelButton}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
              </View>
            </View>
          ) : (
            <Text style={{ color: isDark ? '#9ca3af' : '#6b7280', marginTop: 4 }}>{profile?.about_me || ''}</Text>
          )}
        </View>
        {/* Interests */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontWeight: 'bold', fontSize: 16, color: isDark ? '#ffffff' : '#1f2937' }}>Interests</Text>
            <TouchableOpacity onPress={() => setShowInterests(true)}>
              <Edit size={18} color={isDark ? '#9ca3af' : '#6b7280'} />
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
            {(profile?.interests && profile.interests.length > 0) ? profile.interests.map((i: string) => (
              <View key={i} style={styles.interestChip}><Text style={styles.interestChipText}>{i}</Text></View>
            )) : <Text style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>No interests added yet.</Text>}
          </View>
        </View>
        <Modal visible={showInterests} transparent animationType="slide" onRequestClose={() => setShowInterests(false)}>
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowInterests(false)}
          >
            <TouchableOpacity 
              style={styles.modalCard}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={styles.modalTitle}>Select up to 3 interests</Text>
              
              <ScrollView 
                style={styles.interestsModalContainer} 
                showsVerticalScrollIndicator={false}
                horizontal={false}
                showsHorizontalScrollIndicator={false}
              >
                {/* All Interests - Always Visible */}
                <View style={styles.interestsSection}>
                  <View style={styles.interestsModalGrid}>
                    {ALL_INTERESTS.map((interest) => (
                      <TouchableOpacity
                        key={interest}
                        style={[styles.interestOption, interests.includes(interest) && styles.interestOptionSelected]}
                        onPress={() => handleToggleInterest(interest)}
                        disabled={!interests.includes(interest) && interests.length >= 3}
                      >
                        <Text style={[styles.interestOptionText, interests.includes(interest) && styles.interestOptionTextSelected]}>
                          {interest.charAt(0).toUpperCase() + interest.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </ScrollView>
              
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
                <TouchableOpacity onPress={handleSaveInterests} disabled={saving} style={styles.saveButton}><Text style={styles.saveButtonText}>Save</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => { setShowInterests(false); setInterests(profile?.interests || []); }} style={styles.cancelButton}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
        {/* Height */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontWeight: 'bold', fontSize: 16, color: isDark ? '#ffffff' : '#1f2937' }}>Height</Text>
            <TouchableOpacity onPress={() => setEditingHeight(true)}>
              <Edit size={18} color={isDark ? '#9ca3af' : '#6b7280'} />
            </TouchableOpacity>
          </View>
          {editingHeight ? (
            <View>
              {/* Height Unit Toggle */}
              <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 12 }}>
                <TouchableOpacity
                  style={[
                    styles.heightUnitButton,
                    heightUnit === 'cm' && styles.heightUnitButtonSelected
                  ]}
                  onPress={() => setHeightUnit('cm')}
                >
                  <Text style={[
                    styles.heightUnitButtonText,
                    heightUnit === 'cm' && styles.heightUnitButtonTextSelected
                  ]}>CM</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.heightUnitButton,
                    heightUnit === 'feet' && styles.heightUnitButtonSelected
                  ]}
                  onPress={() => setHeightUnit('feet')}
                >
                  <Text style={[
                    styles.heightUnitButtonText,
                    heightUnit === 'feet' && styles.heightUnitButtonTextSelected
                  ]}>Feet/Inch</Text>
                </TouchableOpacity>
              </View>
              
              {heightUnit === 'cm' ? (
                <TextInput
                  style={styles.heightInput}
                  value={height}
                  onChangeText={setHeight}
                  placeholder=""
                  keyboardType="numeric"
                  maxLength={3}
                  textAlign="center"
                />
              ) : (
                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                  <TextInput
                    style={[styles.heightInput, { flex: 1, maxWidth: 80 }]}
                    value={feet}
                    onChangeText={setFeet}
                    placeholder=""
                    keyboardType="numeric"
                    maxLength={2}
                    textAlign="center"
                  />
                  <Text style={{ alignSelf: 'center', fontSize: 18, color: isDark ? '#e5e7eb' : '#374151' }}>ft</Text>
                  <TextInput
                    style={[styles.heightInput, { flex: 1, maxWidth: 80 }]}
                    value={inches}
                    onChangeText={setInches}
                    placeholder=""
                    keyboardType="numeric"
                    maxLength={2}
                    textAlign="center"
                  />
                  <Text style={{ alignSelf: 'center', fontSize: 18, color: isDark ? '#e5e7eb' : '#374151' }}>in</Text>
                </View>
              )}
              
              <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8 }}>
                <TouchableOpacity onPress={handleSaveHeight} disabled={saving} style={styles.saveButton}><Text style={styles.saveButtonText}>Save</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => { 
                  setEditingHeight(false); 
                  setHeight(profile?.height_cm ? String(profile.height_cm) : ''); 
                  setHeightUnit('cm');
                  setFeet('');
                  setInches('');
                }} style={styles.cancelButton}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
              </View>
            </View>
          ) : (
            <Text style={{ color: isDark ? '#9ca3af' : '#6b7280', marginTop: 8 }}>{profile?.height_cm ? `${profile.height_cm} cm` : 'Height not defined yet'}</Text>
          )}
        </View>

        {/* Info Cards */}
        <View style={styles.card}>
          <View style={styles.infoCardHeader}>
            <Clock size={20} color="#8b5cf6" />
            <Text style={styles.infoCardTitle}>Automatic Data Expiration</Text>
          </View>
          <Text style={styles.infoCardText}>
            Your profile, matches, and chat messages will be automatically deleted when this event ends. No data is stored permanently.
          </Text>
          <View style={styles.infoCardBullets}>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Profile expires automatically</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Matches and messages are deleted</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>No permanent account created</Text>
            </View>
          </View>
        </View>

        {/* Report User Button */}
        <TouchableOpacity style={styles.reportButton} onPress={handleReportUser}>
          <AlertCircle size={20} color="white" />
          <Text style={styles.reportButtonText}>Report a User</Text>
        </TouchableOpacity>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.logoutButton]}
            onPress={handleLogout}
          >
            <LogOut size={20} color="#ef4444" />
            <Text style={[styles.actionText, styles.logoutText]}>Leave Event & Delete Profile</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Report User Modal */}
      <Modal visible={showReportModal} transparent animationType="slide" onRequestClose={() => setShowReportModal(false)}>
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowReportModal(false)}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <TouchableOpacity 
              style={styles.modalCard}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              {reportStep === 'select' ? (
                <>
                  <Text style={styles.modalTitle}>Select User to Report</Text>
                  {matchedUserIds.size > 0 && (
                    <Text style={[styles.sectionHeader, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                      Your Matches ({matchedUserIds.size})
                    </Text>
                  )}
                  <FlatList
                    data={allUsers}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={true}
                    style={{ maxHeight: 250 }}
                    showsVerticalScrollIndicator={true}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.userListItem}
                        onPress={() => handleSelectUserToReport(item)}
                      >
                        <View style={styles.userListPhoto}>
                          {item.profile_photo_url ? (
                            <Image source={{ uri: cachedUserImageUris.get(item.session_id) || item.profile_photo_url }}
                              onError={() => {}} style={styles.userListPhotoImage} />
                          ) : (
                            <View style={[styles.userListPhotoFallback, { backgroundColor: item.profile_color || '#cccccc' }]}>
                              <Text style={styles.userListPhotoFallbackText}>{item.first_name[0]}</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.userListInfo}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.userListName}>{item.first_name}</Text>
                            {matchedUserIds.has(item.session_id) && (
                              <MessageCircle size={16} color="#10b981" style={{ marginLeft: 6 }} />
                            )}
                          </View>
                          <Text style={styles.userListAge}>{item.age} years old</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                  />
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowReportModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.modalTitle}>Report {selectedUserToReport?.first_name}</Text>
                  <View style={styles.reportUserInfo}>
                    <View style={styles.userListPhoto}>
                      {selectedUserToReport?.profile_photo_url ? (
                        <Image source={{ uri: cachedUserImageUris.get(selectedUserToReport.session_id) || selectedUserToReport.profile_photo_url }}
                          onError={() => {}} style={styles.userListPhotoImage} />
                      ) : (
                        <View style={[styles.userListPhotoFallback, { backgroundColor: selectedUserToReport?.profile_color || '#cccccc' }]}>
                          <Text style={styles.userListPhotoFallbackText}>{selectedUserToReport?.first_name[0]}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.userListInfo}>
                      <Text style={styles.userListName}>{selectedUserToReport?.first_name}</Text>
                      <Text style={styles.userListAge}>{selectedUserToReport?.age} years old</Text>
                    </View>
                  </View>
                  <TextInput
                    style={[styles.input, { minHeight: 120, maxHeight: 150 }]} // Limit input height
                    value={reportExplanation}
                    onChangeText={setReportExplanation}
                    placeholder="Please explain why you are reporting this user..."
                    multiline
                    textAlignVertical="top"
                    onFocus={() => {
                      // Add a small delay to ensure keyboard is shown before scrolling
                      setTimeout(() => {
                        // This will be handled by the ScrollView automatically
                      }, 100);
                    }}
                    onBlur={() => {
                      // Optional: dismiss keyboard when user finishes typing
                    }}
                  />
                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={styles.submitButton}
                      onPress={handleSubmitReport}
                      disabled={submittingReport}
                    >
                      <Text style={styles.submitButtonText}>
                        {submittingReport ? 'Submitting...' : 'Submit Report'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        setReportStep('select');
                        setSelectedUserToReport(null);
                        setReportExplanation('');
                        Keyboard.dismiss();
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
      
      {/* Image Preview Modal */}
      <Modal 
        visible={showImagePreview} 
        transparent 
        animationType="fade" 
        onRequestClose={() => setShowImagePreview(false)}
        onShow={() => {
          console.log('Image preview modal opened:', {
            cachedImageUri: cachedProfileImageUri,
            profilePhotoUrl: profile?.profile_photo_url
          });
        }}
      >
        <View style={styles.imagePreviewOverlay}>
          <TouchableOpacity 
            style={styles.imagePreviewCloseArea}
            onPress={() => setShowImagePreview(false)}
            activeOpacity={1}
          >
            <View style={styles.imagePreviewContainer}>
              <TouchableOpacity 
                activeOpacity={1}
                onPress={(e) => e.stopPropagation()}
              >
                {(cachedProfileImageUri || profile?.profile_photo_url) ? (
                  <Image
                    source={{ uri: cachedProfileImageUri || profile?.profile_photo_url }}
                    style={styles.imagePreviewPhoto}
                    resizeMode="cover"
                    onError={(error) => {
                      console.log('Image preview load error:', error);
                    }}
                    onLoad={() => {
                      console.log('Image preview loaded successfully');
                    }}
                  />
                ) : (
                  <View style={[styles.imagePreviewPhoto, { backgroundColor: profile?.profile_color || '#cccccc', justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ color: 'white', fontSize: 48, fontWeight: 'bold' }}>
                      {profile?.first_name?.[0] || 'U'}
                    </Text>
                  </View>
                )}
                <View style={styles.imagePreviewButtons}>
                  <TouchableOpacity 
                    style={styles.imagePreviewEditButton}
                    onPress={() => {
                      setShowImagePreview(false);
                      handlePhotoUpload();
                    }}
                  >
                    <Edit size={20} color="white" />
                    <Text style={styles.imagePreviewEditText}>Edit</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
      
      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push('/discovery')}
        >
          <Users size={24} color="#9ca3af" />
          <Text style={styles.navButtonText}>Discover</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push('/matches')}
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
          style={[styles.navButton, styles.navButtonActive]}
          onPress={() => {}} // Already on profile page
        >
          <User size={24} color="#8b5cf6" />
          <Text style={[styles.navButtonText, styles.navButtonTextActive]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
} 