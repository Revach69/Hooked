import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Image,
  Keyboard,
  TouchableWithoutFeedback,
  Modal,
  useColorScheme,
  Switch,
  Linking,
  Platform,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { unifiedNavigator } from '../lib/navigation/UnifiedNavigator';
import { EventProfileAPI, EventAPI, StorageAPI } from '../lib/firebaseApi';
import { AsyncStorageUtils } from '../lib/asyncStorageUtils';
import { Upload, ArrowLeft } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SurveyService } from '../lib/surveyService';
import { ensureFirebaseReady } from '../lib/firebaseReady';
// Sentry removed
import InAppAlert from '../lib/components/InAppAlert';
import { ImageOptimizationService } from '../lib/services/ImageOptimizationService';


// Simple UUID v4 generator function
function generateUUID() {
  // Generate a proper UUID v4 format
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function Consent() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [event, setEvent] = useState<any>(null);
  const [step, setStep] = useState('manual');
  const [formData, setFormData] = useState({
    first_name: '',
    age: '',
    gender_identity: '',
    interested_in: '',
    profile_photo_url: '',
    // Additional fields for saved profile data
    about_me: '',
    height_cm: null as number | null,
    interests: [] as string[],
    instagram_handle: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isReuploadingPhoto, setIsReuploadingPhoto] = useState(false);
  const [tempPhotoUri, setTempPhotoUri] = useState<string | null>(null);
  const [showAgePicker, setShowAgePicker] = useState(false);
  const [rememberProfile, setRememberProfile] = useState(false);
  const [showMissingPhotoAlert, setShowMissingPhotoAlert] = useState(false);
  const [showMissingInfoAlert, setShowMissingInfoAlert] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false); // Prevent duplicate navigation




  // Helper function to handle saved photo loading/caching for new events
  const loadSavedPhoto = async (savedPhotoUrl: string): Promise<string> => {
    try {
      // Don't try to re-upload the old photo URL as it might be expired
      // Instead, let the user select a new photo but keep it as a fallback
      // This approach is more reliable and user-friendly
      console.log('Saved photo URL found, but user should select new photo for reliability');
      
      // Return empty string so user can select a fresh photo
      // The UI will show upload placeholder instead of trying to use potentially expired URL
      throw new Error('Photo re-selection recommended for new event');
    } catch (error) {
      console.error('Error loading saved photo:', error);
      throw error;
    }
  };



  // Handle remember profile toggle change
  const handleRememberProfileChange = (value: boolean) => {
    setRememberProfile(value);
    
    // If turning off, just update the toggle state
    // Don't clear the current form - only affects future events
    if (!value) {
      // No additional action needed
    }
  };

  useEffect(() => {
    const initializeConsent = async () => {
      // Set flag to prevent switching to persistent navigation while on consent page
      await AsyncStorageUtils.setItem('isOnConsentPage', true);
      
      const firebaseReady = await ensureFirebaseReady();
      if (!firebaseReady) {
        Toast.show({
          type: 'error',
          text1: 'Connection Error',
          text2: 'Check internet and try again',
          position: 'top',
          visibilityTime: 3500,
          autoHide: true,
          topOffset: 0,
        });
        // Firebase connection error - must go home to avoid loop
        if (!hasNavigated) {
          setHasNavigated(true);
          await AsyncStorageUtils.removeItem('isOnConsentPage');
          unifiedNavigator.navigate('home', {}, true);
        }
        return;
      }
      
      // First try to get the stored event data
      const storedEventData = await AsyncStorageUtils.getItem<any>('currentEventData');
      if (storedEventData) {
        // Convert date strings back to Date objects
        const eventWithDates = {
          ...storedEventData,
          starts_at: storedEventData.starts_at ? new Date(storedEventData.starts_at) : null,
          expires_at: storedEventData.expires_at ? new Date(storedEventData.expires_at) : null,
          start_date: storedEventData.start_date ? new Date(storedEventData.start_date) : null,
          created_at: storedEventData.created_at ? new Date(storedEventData.created_at) : null,
          updated_at: storedEventData.updated_at ? new Date(storedEventData.updated_at) : null,
        };
        setEvent(eventWithDates);
        
        // Cache event data for Discovery to use instantly
        const { GlobalDataCache, CacheKeys } = await import('../lib/cache/GlobalDataCache');
        GlobalDataCache.set(CacheKeys.DISCOVERY_EVENT, eventWithDates, 10 * 60 * 1000);
        console.log('Consent: Cached event data for instant discovery access');
        
        // Initialize services now that we have event context
        await initializeEventServices();
        return;
      }
      
      // Fallback to fetching from database if no stored data
      const eventId = await AsyncStorageUtils.getItem<string>('currentEventId');
      const eventCountry = await AsyncStorageUtils.getItem<string>('currentEventCountry');
      
      if (!eventId) {
        // No event ID in storage - this is expected if coming from QR code or direct navigation
        // Don't log as error, just silently redirect to home
        if (!hasNavigated) {
          console.log('Consent: No event ID found, redirecting to home');
          setHasNavigated(true);
          await AsyncStorageUtils.removeItem('isOnConsentPage'); // Clean up before navigating
          unifiedNavigator.navigate('home', {}, true);
        }
        return;
      }
      
      try {
        const foundEvent = await EventAPI.get(eventId, eventCountry || undefined);
        
        if (foundEvent) {
          setEvent(foundEvent);
          
          // Cache event data for Discovery to use instantly
          const { GlobalDataCache, CacheKeys } = await import('../lib/cache/GlobalDataCache');
          GlobalDataCache.set(CacheKeys.DISCOVERY_EVENT, foundEvent, 10 * 60 * 1000);
          console.log('Consent: Cached event data from database for instant discovery access');
          
          // Initialize services now that we have event context
          await initializeEventServices();
        } else {
          console.error('Consent error:', new Error(`No event found with ID: ${eventId}`));
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Event not found',
            position: 'top',
            visibilityTime: 3500,
            autoHide: true,
            topOffset: 0,
          });
          // Event not found in database - must go home to avoid loop
          if (!hasNavigated) {
            setHasNavigated(true);
            await AsyncStorageUtils.removeItem('isOnConsentPage');
            unifiedNavigator.navigate('home', {}, true);
          }
        }
      } catch (error) {
        console.error('Consent error:', error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to load event',
          position: 'top',
          visibilityTime: 3500,
          autoHide: true,
          topOffset: 0,
        });
        // General error loading event - must go home to avoid loop
        if (!hasNavigated) {
          setHasNavigated(true);
          await AsyncStorageUtils.removeItem('isOnConsentPage');
          unifiedNavigator.navigate('home', {}, true);
        }
      }
    };
    
    initializeConsent();
    
    // Cleanup function to clear the flag when leaving consent page
    return () => {
      AsyncStorageUtils.removeItem('isOnConsentPage');
    };
  }, []);

  // Initialize services when event is loaded
  const initializeEventServices = async () => {
    try {
      console.log('Consent: Initializing event services...');
      
      // Initialize ImageCacheService
      const { ImageCacheService } = await import('../lib/services/ImageCacheService');
      ImageCacheService.initialize();
      
      // Initialize BackgroundDataPreloader for event data
      const { BackgroundDataPreloader } = await import('../lib/services/BackgroundDataPreloader');
      BackgroundDataPreloader.preloadEventData().catch(error => {
        console.warn('Consent: Background preloading failed:', error);
      });
      
      console.log('Consent: Event services initialized successfully');
    } catch (error) {
      console.error('Consent: Failed to initialize event services:', error);
      // Don't fail consent process for this
    }
  };

  // Load saved profile data if available - but only after event is loaded
  useEffect(() => {
    // Only load saved profile if we have an event loaded
    if (!event) {
      return;
    }
    
    const loadSavedProfile = async () => {
      try {
        const savedProfile = await AsyncStorageUtils.getItem<string>('savedProfileData');
        
        if (savedProfile) {
          const parsedProfile = JSON.parse(savedProfile);
          
          // Also load any additional data that was saved from profile page
          let additionalData = {};
          try {
            const savedAdditionalData = await AsyncStorageUtils.getItem<any>('savedAdditionalProfileData');
            if (savedAdditionalData) {
              additionalData = savedAdditionalData;
            }
          } catch (error) {
            console.warn('No additional profile data found:', error);
          }
          
          // Load basic profile data + additional data including photo for re-upload
          setFormData({
            first_name: parsedProfile.first_name || '',
            age: parsedProfile.age || '',
            gender_identity: parsedProfile.gender_identity || '',
            interested_in: parsedProfile.interested_in || '',
            profile_photo_url: parsedProfile.profile_photo_url || '',
            // Load additional data from profile page if available
            about_me: (additionalData as any).about_me || '',
            height_cm: (additionalData as any).height_cm || null,
            interests: (additionalData as any).interests || [],
            instagram_handle: (additionalData as any).instagram_handle || ''
          });
          
          console.log('Loaded complete profile data including additional fields:', {
            hasPhoto: !!parsedProfile.profile_photo_url,
            hasAboutMe: !!(additionalData as any).about_me,
            hasHeight: !!(additionalData as any).height_cm,
            hasInterests: Array.isArray((additionalData as any).interests) && (additionalData as any).interests.length > 0,
            hasInstagram: !!(additionalData as any).instagram_handle
          });
          
          // Set the remember profile toggle to true if we have saved data
          setRememberProfile(true);
        }
      } catch (error) {
        // Error loading saved profile
        console.error('Consent error:', error);
      }
    };
    loadSavedProfile();
  }, [event]); // Depend on event being loaded

  // Handler for profile photo upload
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
        text2: 'Failed to open photo options',
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

      // Launch camera without timeout - let users take their time
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
    } catch (error) {
      console.error('Consent error:', error);
      Alert.alert("Error", "Failed to capture photo. Please try again.");
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

      // Launch gallery without timeout - let users browse as long as they need
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
    } catch (error) {
      console.error('Consent error:', error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const processImageAsset = async (asset: any) => {
    // Consistent 5MB file size limit across all platforms
    const maxFileSize = 5 * 1024 * 1024; // 5MB limit
    if (asset.fileSize && asset.fileSize > maxFileSize) {
      console.error('Consent error:', new Error(`File too large: ${asset.fileSize}`));
      Alert.alert("File Too Large", "Image must be smaller than 5MB. Please choose a smaller image or take a new photo.");
      return;
    }

    // Show thumbnail immediately
    setTempPhotoUri(asset.uri);
    
    setIsUploadingPhoto(true);
    
    try {
      // Add timeout to prevent hanging - reduced from 60s to 25s
      const uploadPromise = async () => {
        // Optimize image for faster upload
        const optimizedUri = await ImageOptimizationService.optimizeProfilePhoto(asset.uri);

        // Create file object for upload with optimized image
        const fileObject = {
          uri: optimizedUri,
          name: `profile-photo-${Date.now()}.jpg`,
          type: 'image/jpeg',
          fileSize: asset.fileSize // Note: This is original size, optimized will be smaller
        };

        // Upload to Firebase Storage with simplified retry logic
        let uploadAttempts = 0;
        const maxAttempts = 2; // Reduced from 3 to 2 attempts
        
        while (uploadAttempts < maxAttempts) {
          try {
            const { file_url } = await StorageAPI.uploadFile(fileObject);
            
            // Update form data with the uploaded photo URL
            setFormData(prev => ({
              ...prev,
              profile_photo_url: file_url
            }));

            // Photo URL will be saved with complete profile data when form is submitted
            
            // Clear temp photo and success - break out of retry loop
            setTempPhotoUri(null);
            return;
          } catch (uploadError) {
            uploadAttempts++;
            
            if (uploadAttempts >= maxAttempts) {
              throw uploadError;
            }
            
            // Wait before retrying (shorter delay)
            const waitTime = 2000; // Fixed 2 second delay instead of exponential backoff
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      };

      // Add timeout to prevent hanging - reduced from 60s to 25s
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Upload timeout - please try again in a few moments')), 25000)
      );
      
      try {
        await Promise.race([uploadPromise(), timeoutPromise]);
      } catch (timeoutError) {
        // In simulator, if upload times out, use a placeholder image
        if (Platform.OS === 'ios' && __DEV__ && timeoutError instanceof Error && timeoutError.message.includes('Upload timeout')) {
          const placeholderUrl = 'https://via.placeholder.com/400x400/cccccc/999999?text=Profile+Photo';
          
          setFormData(prev => ({
            ...prev,
            profile_photo_url: placeholderUrl
          }));
          
          // Placeholder URL will be saved with complete profile data when form is submitted
          
          // Clear temp photo
          setTempPhotoUri(null);
          
          // Show success message
          Alert.alert(
            "Simulator Mode", 
            "Upload timed out in simulator. Using placeholder image. Test on a physical device for full functionality.",
            [{ text: "OK" }]
          );
          return;
        }
        throw timeoutError;
      }
      
    } catch (err) {
      console.error('Consent error:', err);
      
      // Enhanced error logging
      let errorMessage = 'Unknown upload error';
      
      if (err instanceof Error) {
        if (err.message.includes('Network request failed')) {
          errorMessage = 'Network connection failed. Please check your internet connection and try again.';
        } else if (err.message.includes('No internet connection')) {
          errorMessage = 'No internet connection. Please check your network and try again.';
        } else if (err.message.includes('Failed to upload local file')) {
          errorMessage = 'Failed to process image. Please try selecting a different photo.';
        } else if (err.message.includes('Upload timeout')) {
          if (Platform.OS === 'ios' && __DEV__) {
            errorMessage = 'Upload timeout in simulator. Try using a smaller image or test on a physical device.';
          } else {
            errorMessage = 'Upload took too long. Please try again with a smaller image.';
          }
        } else {
          errorMessage = err.message;
        }
      }
      
      Alert.alert("Upload Failed", `Failed to upload photo: ${errorMessage}. Please try again.`);
      // Clear temp photo on error
      setTempPhotoUri(null);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSubmit = async () => {
    // Validate all required fields including photo
    if (!formData.first_name || !formData.age || !formData.gender_identity || !formData.interested_in) {
      setShowMissingInfoAlert(true);
      return;
    }

    if (!formData.profile_photo_url) {
      setShowMissingPhotoAlert(true);
      return;
    }
    
    // Validate that we have the event data
    if (!event || !event.id || !event.expires_at) {
      console.error('Consent error:', new Error(`Event data is missing or invalid: ${JSON.stringify(event)}`));
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Event information is missing',
        position: 'top',
        visibilityTime: 3500,
        autoHide: true,
        topOffset: 0,
      });
      return;
    }
    
    setIsSubmitting(true);
    setStep('processing');
    
    try {
      const sessionId = generateUUID();
      const profileColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
      
      // Ensure the color is a valid 6-digit hex
      const validColor = profileColor.length === 7 ? profileColor : '#000000';

      // Save profile data locally if "remember profile" is checked
      if (rememberProfile) {
        try {
          // Save basic profile data from consent page + photo
          const basicProfileDataToSave = {
            first_name: formData.first_name,
            age: formData.age,
            gender_identity: formData.gender_identity,
            interested_in: formData.interested_in,
            profile_photo_url: formData.profile_photo_url || ''
          };
          
          // Validate that we have the required data before saving
          if (basicProfileDataToSave.first_name && basicProfileDataToSave.age && 
              basicProfileDataToSave.gender_identity && basicProfileDataToSave.interested_in) {
            await AsyncStorageUtils.setItem('savedProfileData', JSON.stringify(basicProfileDataToSave));
            console.log('Saved basic profile data from consent:', {
              hasPhoto: !!basicProfileDataToSave.profile_photo_url
            });
          }
          
          // Save flag that user wants profile remembered for future use by profile page
          await AsyncStorageUtils.setItem('rememberProfileForFutureEvents', 'true');
        } catch (error) {
          console.error('Consent error:', error);
        }
      } else {
        // Clear saved profile data if not checked
        try {
          await AsyncStorageUtils.removeItem('savedProfileData');
          await AsyncStorageUtils.removeItem('rememberProfileForFutureEvents');
          await AsyncStorageUtils.removeItem('savedAdditionalProfileData');
        } catch (error) {
          console.error('Consent error:', error);
        }
      }

      // Create event profile with photo and additional data
      const profileData = {
        event_id: event.id,
        session_id: sessionId,
        first_name: formData.first_name,
        age: parseInt(formData.age),
        gender_identity: formData.gender_identity,
        interested_in: formData.interested_in,
        profile_color: validColor,
        profile_photo_url: formData.profile_photo_url,
        is_visible: true,
        expires_at: event.expires_at,
        // Include additional data if available
        ...(formData.about_me && { about_me: formData.about_me }),
        ...(formData.height_cm && { height_cm: formData.height_cm }),
        ...(formData.interests && formData.interests.length > 0 && { interests: formData.interests }),
        ...(formData.instagram_handle && { instagram_handle: formData.instagram_handle }),
      };
      
      // Add timeout to prevent hanging
      const profileCreationPromise = EventProfileAPI.create(profileData);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile creation timeout')), 15000)
      );
      
      await Promise.race([profileCreationPromise, timeoutPromise]);

      // Save session and profile data to AsyncStorage
      await AsyncStorageUtils.setItem('currentSessionId', sessionId);
      await AsyncStorageUtils.setItem('currentEventId', event.id);
      await AsyncStorageUtils.setItem('currentProfilePhotoUrl', formData.profile_photo_url);
      await AsyncStorageUtils.setItem('currentProfileColor', validColor);
      
      // Add event to user's history for survey purposes
      try {
        await SurveyService.addEventToHistory(
          event.id,
          event.name,
          sessionId,
          event.expires_at?.toDate ? event.expires_at.toDate().toISOString() : event.expires_at
        );
      } catch (error) {
        console.error('Consent error:', error);
        // Don't fail the entire process for this
      }
      
      // Refresh GlobalNotificationService and register push token now that session exists
      try {
        console.log('Profile created, refreshing notification services');
        
        // Register push token for new session
        const { registerPushToken } = await import('../lib/notifications/registerPushToken');
        await registerPushToken(sessionId);
        
        // Refresh GlobalNotificationService to set up listeners with new session
        const { GlobalNotificationService } = await import('../lib/services/GlobalNotificationService');
        await GlobalNotificationService.refreshSession();
        
        console.log('Notification services refreshed successfully');
      } catch (error) {
        console.error('Failed to refresh notification services:', error);
        console.error('Consent error:', error);
        // Don't fail the profile creation for this
      }
      
      // DIRECT APPROACH: Fetch all profiles immediately for instant discovery display
      // CRITICAL: This must complete BEFORE navigation to ensure Discovery has the data
      try {
        console.log('Consent: Fetching all profiles directly for instant discovery access...');
        const allProfiles = await EventProfileAPI.filter({
          event_id: event.id,
          is_visible: true
        });
        
        const otherUsersProfiles = allProfiles.filter(p => p.session_id !== sessionId);
        console.log(`Consent: Fetched ${otherUsersProfiles.length} profiles directly, storing in cache for instant discovery access`);
        
        // Store profiles in GlobalDataCache for immediate discovery access
        const { GlobalDataCache, CacheKeys } = await import('../lib/cache/GlobalDataCache');
        GlobalDataCache.set(CacheKeys.DISCOVERY_PROFILES, otherUsersProfiles, 10 * 60 * 1000); // Cache for 10 minutes
        
        // Set flag to indicate we have fresh consent-fetched profiles
        GlobalDataCache.set('discovery_has_consent_profiles', true, 2 * 60 * 1000);
        
        // Start image preloading but don't wait for it (fire and forget)
        if (otherUsersProfiles.length > 0) {
          const { ImageCacheService } = await import('../lib/services/ImageCacheService');
          const profileImageUrls = otherUsersProfiles
            .map(p => p.profile_photo_url)
            .filter(Boolean);
          
          if (profileImageUrls.length > 0) {
            console.log(`Consent: Pre-caching ${profileImageUrls.length} profile images for instant display`);
            // Fire and forget image preloading - don't wait for this
            Promise.all(
              profileImageUrls.slice(0, 15).map(async (url) => { // Limit to first 15 for performance
                const imageUrl = url as string;
                try {
                  const profile = otherUsersProfiles.find(p => p.profile_photo_url === imageUrl);
                  if (profile?.session_id && event?.id) {
                    await ImageCacheService.getCachedImageUri(imageUrl, event.id!, profile.session_id!);
                  }
                } catch (error) {
                  // Ignore individual image cache errors
                }
              })
            ).catch(() => {});
          }
        }
        
        console.log('Consent: Successfully cached profiles for instant discovery access');
      } catch (directFetchError) {
        console.error('Consent: Direct profile fetching failed:', directFetchError);
        // Don't fail the entire consent process for this - discovery will fallback to its own loading
      }
      
      // Clear consent page flag before navigating to allow persistent navigation
      await AsyncStorageUtils.removeItem('isOnConsentPage');
      
      // Navigate to discovery page (profiles are now cached and ready)
      console.log('Consent: Navigating to discovery with profiles cached');
      unifiedNavigator.navigate('discovery', {}, true);
    } catch (error) {
      console.error('Consent error:', error);
      setError("Failed to create profile. Please try again.");
      setIsSubmitting(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#1f2937' : '#f9fafb',
      direction: 'ltr',
    },
    backButton: {
      position: 'absolute',
      top: 16,
      left: 16,
      padding: 8,
      borderRadius: 20,
      backgroundColor: isDark ? '#374151' : '#ffffff',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 2,
      elevation: 2,
      zIndex: 1,
    },
    contentContainer: {
      padding: 16,
      alignItems: 'center',
      direction: 'ltr',
    },
    card: {
      backgroundColor: isDark ? '#2d2d2d' : 'white',
      borderRadius: 16,
      padding: 24,
      maxWidth: 450,
      width: '100%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 12,
      elevation: 4,
      direction: 'ltr',
    },
    header: {
      alignItems: 'center',
      marginBottom: 20,
      direction: 'ltr',
    },
    logoContainer: {
      width: 80,
      height: 80,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      direction: 'ltr',
    },
    logoImage: {
      width: '100%',
      height: '100%',
      borderRadius: 20,
    },
    title: {
      fontSize: 22,
      fontWeight: 'bold',
      color: isDark ? '#ffffff' : '#1f2937',
      textAlign: 'center',
      marginBottom: 2,
      writingDirection: 'ltr',
    },
    eventName: {
      fontSize: 18,
      color: isDark ? '#9ca3af' : '#6b7280',
      textAlign: 'center',
      marginTop: 2,
      writingDirection: 'ltr',
    },
    subtitle: {
      fontSize: 16,
      color: isDark ? '#9ca3af' : '#6b7280',
      textAlign: 'center',
      lineHeight: 24,
      writingDirection: 'ltr',
    },
    form: {
      gap: 12,
      direction: 'ltr',
    },
    photoSection: {
      alignItems: 'center',
      marginBottom: 16,
      direction: 'ltr',
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#e5e7eb' : '#374151',
      marginBottom: 8,
      textAlign: 'left',
      width: '100%',
      writingDirection: 'ltr',
      direction: 'ltr',
    },
    photoContainer: {
      width: 120,
      height: 120,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: isDark ? '#404040' : '#d1d5db',
      borderStyle: 'dashed',
      backgroundColor: isDark ? '#374151' : '#f9fafb',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
      position: 'relative',
      overflow: 'hidden',
      direction: 'ltr',
    },
    profilePhoto: {
      width: '100%',
      height: '100%',
    },

    uploadPlaceholder: {
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingBottom: 8,
      direction: 'ltr',
    },
    uploadText: {
      fontSize: 12,
      color: isDark ? '#9ca3af' : '#6b7280',
      marginTop: 8,
      writingDirection: 'ltr',
      textAlign: 'center',
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
      borderRadius: 20,
    },
    photoRequirements: {
      fontSize: 12,
      color: isDark ? '#9ca3af' : '#6b7280',
      textAlign: 'center',
      marginTop: 8,
      writingDirection: 'ltr',
    },
    formSection: {
      gap: 8,
      width: '100%',
      direction: 'ltr',
    },
    input: {
      borderWidth: 1,
      borderColor: isDark ? '#404040' : '#d1d5db',
      borderRadius: 8,
      padding: 10,
      fontSize: 16,
      backgroundColor: isDark ? '#374151' : 'white',
      color: isDark ? '#e5e7eb' : '#1f2937',
      writingDirection: 'ltr',
      textAlign: 'left',
    },
    selectContainer: {
      gap: 8,
    },
    selectLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: isDark ? '#e5e7eb' : '#374151',
      writingDirection: 'ltr',
      textAlign: 'left',
    },
    selectButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    selectButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: isDark ? '#404040' : '#d1d5db',
      borderRadius: 8,
      padding: 12,
      alignItems: 'center',
      backgroundColor: isDark ? '#374151' : 'white',
    },
    selectButtonActive: {
      borderColor: '#8b5cf6',
      backgroundColor: '#8b5cf6',
    },
    selectButtonText: {
      fontSize: 14,
      color: isDark ? '#e5e7eb' : '#374151',
      writingDirection: 'ltr',
      textAlign: 'center',
    },
    selectButtonTextActive: {
      color: 'white',
      writingDirection: 'ltr',
      textAlign: 'center',
    },
    selectionSection: {
      marginTop: 20,
      width: '100%',
      direction: 'ltr',
    },
    selectionButtons: {
      flexDirection: 'row',
      gap: 12,
      direction: 'ltr',
    },
    selectionButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: isDark ? '#404040' : '#d1d5db',
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: isDark ? '#374151' : 'white',
      direction: 'ltr',
    },
    selectionButtonActive: {
      borderColor: '#8b5cf6',
      backgroundColor: '#8b5cf6',
    },
    selectionButtonText: {
      fontSize: 17,
      fontWeight: '500',
      color: isDark ? '#e5e7eb' : '#374151',
      writingDirection: 'ltr',
      textAlign: 'center',
    },
    selectionButtonTextActive: {
      color: 'white',
      writingDirection: 'ltr',
      textAlign: 'center',
    },
    submitButton: {
      backgroundColor: '#8b5cf6',
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 20,
      direction: 'ltr',
    },
    submitButtonDisabled: {
      backgroundColor: '#9ca3af',
    },
    submitButtonText: {
      color: 'white',
      fontSize: 17,
      fontWeight: '500',
      writingDirection: 'ltr',
      textAlign: 'center',
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    spinner: {
      marginBottom: 24,
    },
    errorTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: '#dc2626',
      marginBottom: 8,
      textAlign: 'center',
      writingDirection: 'ltr',
    },
    errorText: {
      fontSize: 16,
      color: isDark ? '#9ca3af' : '#6b7280',
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 24,
      writingDirection: 'ltr',
    },
    button: {
      backgroundColor: '#8b5cf6',
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 24,
      alignItems: 'center',
    },
    buttonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '500',
      writingDirection: 'ltr',
      textAlign: 'center',
    },
    inputText: {
      fontSize: 16,
      color: isDark ? '#e5e7eb' : '#1f2937',
      writingDirection: 'ltr',
      textAlign: 'left',
    },
    placeholderText: {
      fontSize: 16,
      color: isDark ? '#9ca3af' : '#9ca3af',
      writingDirection: 'ltr',
      textAlign: 'left',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      direction: 'ltr',
    },
    agePickerContainer: {
      backgroundColor: isDark ? '#2d2d2d' : 'white',
      borderRadius: 16,
      padding: 20,
      width: '80%',
      maxHeight: '70%',
      direction: 'ltr',
    },
    agePickerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: isDark ? '#ffffff' : '#1f2937',
      textAlign: 'center',
      marginBottom: 16,
      writingDirection: 'ltr',
    },
    agePickerScroll: {
      maxHeight: 300,
      direction: 'ltr',
    },
    ageOption: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#404040' : '#e5e7eb',
      direction: 'ltr',
    },
    ageOptionSelected: {
      backgroundColor: '#8b5cf6',
    },
    ageOptionText: {
      fontSize: 16,
      color: isDark ? '#e5e7eb' : '#1f2937',
      textAlign: 'center',
      writingDirection: 'ltr',
    },
    ageOptionTextSelected: {
      color: 'white',
      fontWeight: '600',
      writingDirection: 'ltr',
      textAlign: 'center',
    },
    cancelButton: {
      marginTop: 16,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: isDark ? '#374151' : '#f3f4f6',
      borderRadius: 8,
      alignItems: 'center',
      direction: 'ltr',
    },
    cancelButtonText: {
      fontSize: 16,
      color: isDark ? '#9ca3af' : '#6b7280',
      fontWeight: '500',
      writingDirection: 'ltr',
      textAlign: 'center',
    },
    rememberSection: {
      marginTop: 20,
      width: '100%',
      direction: 'ltr',
    },
    checkboxContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      direction: 'ltr',
    },
    checkboxText: {
      fontSize: 14,
      color: isDark ? '#e5e7eb' : '#374151',
      marginLeft: 12,
      flex: 1,
      writingDirection: 'ltr',
      textAlign: 'left',
    },
    checkboxDescription: {
      fontSize: 12,
      color: isDark ? '#9ca3af' : '#6b7280',
      marginLeft: 44,
      lineHeight: 16,
      textAlign: 'center',
      writingDirection: 'ltr',
    },


    legalSection: {
      marginTop: 16,
      marginBottom: 8,
      width: '100%',
      direction: 'ltr',
    },
    legalText: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
      textAlign: 'center',
      lineHeight: 20,
      writingDirection: 'ltr',
    },
    legalLink: {
      color: '#8b5cf6',
      textDecorationLine: 'underline',
      writingDirection: 'ltr',
    },
  });

  if (step === 'processing') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
        <View style={styles.card}>
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => unifiedNavigator.navigate('home', {}, true)} // Processing step back button - home to avoid loop
            accessibilityLabel="Back to Home"
            accessibilityHint="Tap to return to the home screen"
          >
            <ArrowLeft size={20} color={isDark ? '#e5e7eb' : '#374151'} />
          </TouchableOpacity>
          
          <ActivityIndicator size="large" color="#8b5cf6" style={styles.spinner} />
          <Text style={styles.title}>Creating Your Profile...</Text>
          <Text style={styles.subtitle}>
            Just a moment while we get you into the event.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'error') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
        <View style={styles.card}>
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => unifiedNavigator.navigate('home', {}, true)} // Error step back button - home to avoid loop
            accessibilityLabel="Back to Home"
            accessibilityHint="Tap to return to the home screen"
          >
            <ArrowLeft size={20} color={isDark ? '#e5e7eb' : '#374151'} />
          </TouchableOpacity>
          
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.button} onPress={() => setStep('manual')}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.contentContainer}>
          <View style={styles.card}>
            {/* Back Button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => unifiedNavigator.navigate('home', {}, true)} // Main consent form back button - home to avoid loop
              accessibilityLabel="Back to Home"
              accessibilityHint="Tap to return to the home screen"
            >
              <ArrowLeft size={20} color={isDark ? '#e5e7eb' : '#374151'} />
            </TouchableOpacity>
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Image 
                  // eslint-disable-next-line @typescript-eslint/no-require-imports
                  source={require('../assets/round icon.png')} 
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.title}>
                Create Your Event Profile For:
              </Text>
              <Text style={styles.eventName}>{event?.name}</Text>
            </View>

            {/* Profile Photo Section */}
            <View style={styles.photoSection}>
              <Text style={styles.sectionTitle}>Profile Photo *</Text>
              <TouchableOpacity
                style={styles.photoContainer}
                onPress={handlePhotoUpload}
                disabled={isUploadingPhoto || isReuploadingPhoto}
                accessibilityLabel="Upload Profile Photo"
                accessibilityHint="Tap to upload a profile photo from camera or gallery"
              >
                {isUploadingPhoto && tempPhotoUri ? (
                  <>
                    <Image
                      source={{ uri: tempPhotoUri }}
                      onError={() => {}}
                      style={styles.profilePhoto}
                      resizeMode="cover"
                    />
                    {/* Upload indicator overlay */}
                    <View style={styles.uploadOverlay}>
                      <ActivityIndicator size="small" color="white" />
                    </View>
                  </>
                ) : formData.profile_photo_url ? (
                  <Image
                    source={{ uri: formData.profile_photo_url }}
                    onError={() => {}}
                    style={styles.profilePhoto}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    {isReuploadingPhoto ? (
                      <ActivityIndicator size="small" color="#9ca3af" />
                    ) : (
                      <Upload size={32} color="#9ca3af" />
                    )}
                    <Text style={styles.uploadText}>
                      {isReuploadingPhoto ? 'Loading saved photo...' : 'Upload Photo'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <Text style={styles.photoRequirements}>
                Required • Max 10MB
              </Text>
            </View>

            {/* Form Fields */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your first name"
                value={formData.first_name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, first_name: text }))}
                returnKeyType="next"
                accessibilityLabel="First Name Input"
                accessibilityHint="Enter your first name"
              />
              
              <Text style={styles.sectionTitle}>Age *</Text>
              {/* Age Selection */}
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowAgePicker(true)}
                accessibilityLabel="Age Selection"
                accessibilityHint="Tap to select your age"
              >
                <Text style={formData.age ? styles.inputText : styles.placeholderText}>
                  {formData.age ? formData.age : 'Select your age'}
                </Text>
              </TouchableOpacity>
            </View>

          {/* Gender Selection */}
          <View style={styles.selectionSection}>
            <Text style={styles.sectionTitle}>I am a... *</Text>
            <View style={styles.selectionButtons}>
              <TouchableOpacity
                style={[
                  styles.selectionButton,
                  formData.gender_identity === 'man' && styles.selectionButtonActive
                ]}
                onPress={() => setFormData(prev => ({ ...prev, gender_identity: 'man' }))}
                accessibilityLabel="Select Man"
                accessibilityHint="Select if you identify as a man"
              >
                <Text style={[
                  styles.selectionButtonText,
                  formData.gender_identity === 'man' && styles.selectionButtonTextActive
                ]}>
                  Man
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.selectionButton,
                  formData.gender_identity === 'woman' && styles.selectionButtonActive
                ]}
                onPress={() => setFormData(prev => ({ ...prev, gender_identity: 'woman' }))}
                accessibilityLabel="Select Woman"
                accessibilityHint="Select if you identify as a woman"
              >
                <Text style={[
                  styles.selectionButtonText,
                  formData.gender_identity === 'woman' && styles.selectionButtonTextActive
                ]}>
                  Woman
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Interest Selection */}
          <View style={styles.selectionSection}>
            <Text style={styles.sectionTitle}>I&apos;m interested in... *</Text>
            <View style={styles.selectionButtons}>
              <TouchableOpacity
                style={[
                  styles.selectionButton,
                  formData.interested_in === 'men' && styles.selectionButtonActive
                ]}
                onPress={() => setFormData(prev => ({ ...prev, interested_in: 'men' }))}
                accessibilityLabel="Interested in Men"
                accessibilityHint="Select if you're interested in men"
              >
                <Text style={[
                  styles.selectionButtonText,
                  formData.interested_in === 'men' && styles.selectionButtonTextActive
                ]}>
                  Men
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.selectionButton,
                  formData.interested_in === 'women' && styles.selectionButtonActive
                ]}
                onPress={() => setFormData(prev => ({ ...prev, interested_in: 'women' }))}
                accessibilityLabel="Interested in Women"
                accessibilityHint="Select if you're interested in women"
              >
                <Text style={[
                  styles.selectionButtonText,
                  formData.interested_in === 'women' && styles.selectionButtonTextActive
                ]}>
                  Women
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.selectionButton,
                  formData.interested_in === 'everyone' && styles.selectionButtonActive
                ]}
                onPress={() => setFormData(prev => ({ ...prev, interested_in: 'everyone' }))}
                accessibilityLabel="Interested in Everyone"
                accessibilityHint="Select if you're interested in everyone"
              >
                <Text style={[
                  styles.selectionButtonText,
                  formData.interested_in === 'everyone' && styles.selectionButtonTextActive
                ]}>
                  Everyone
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Remember Profile Checkbox */}
          <View style={styles.rememberSection}>
            <View style={styles.checkboxContainer}>
              <Switch
                value={rememberProfile}
                onValueChange={handleRememberProfileChange}
                trackColor={{ false: '#d1d5db', true: '#8b5cf6' }}
                thumbColor={rememberProfile ? '#ffffff' : '#ffffff'}
                accessibilityLabel="Remember Profile Toggle"
                accessibilityHint="Toggle to remember your profile for future events"
              />
              <Text style={styles.checkboxText}>
                Remember my profile for future events
              </Text>
            </View>
            {rememberProfile && (
              <Text style={styles.checkboxDescription}>
                Your form data and photo will be saved locally and auto-filled for future events
              </Text>
            )}
          </View>

          {/* Legal Links */}
          <View style={styles.legalSection}>
            <Text style={styles.legalText}>
              By creating a profile, you agree to our{' '}
              <Text style={styles.legalLink} onPress={() => Linking.openURL('https://hooked-app.com/terms')}>
                Terms
              </Text>
              {' '}and{' '}
              <Text style={styles.legalLink} onPress={() => Linking.openURL('https://hooked-app.com/privacy')}>
                Privacy Policy
              </Text>
              .
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            accessibilityLabel="Create Profile"
            accessibilityHint="Tap to create your event profile"
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>Join Event</Text>
          </TouchableOpacity>


        </View>
      </ScrollView>
    </TouchableWithoutFeedback>

    {/* Age Picker Modal */}
      <Modal
        visible={showAgePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAgePicker(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowAgePicker(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.agePickerContainer}>
              <Text style={styles.agePickerTitle}>Select Your Age</Text>
              <ScrollView style={styles.agePickerScroll}>
                {Array.from({ length: 83 }, (_, i) => i + 18).map((age) => (
                  <TouchableOpacity
                    key={age}
                    style={[
                      styles.ageOption,
                      formData.age === age.toString() && styles.ageOptionSelected
                    ]}
                    onPress={() => {
                      setFormData(prev => ({ ...prev, age: age.toString() }));
                      setShowAgePicker(false);
                    }}
                  >
                    <Text style={[
                      styles.ageOptionText,
                      formData.age === age.toString() && styles.ageOptionTextSelected
                    ]}>
                      {age}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAgePicker(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Missing Photo Alert */}
      <InAppAlert
        visible={showMissingPhotoAlert}
        title="Missing Photo"
        message="Please upload a profile photo to continue."
        type="warning"
        showCloseButton={false}
        onClose={() => setShowMissingPhotoAlert(false)}
        onConfirm={() => setShowMissingPhotoAlert(false)}
        confirmText="Dismiss"
      />

      {/* Missing Information Alert */}
      <InAppAlert
        visible={showMissingInfoAlert}
        title="Missing Information"
        message="Please fill in all fields."
        type="warning"
        showCloseButton={false}
        onClose={() => setShowMissingInfoAlert(false)}
        onConfirm={() => setShowMissingInfoAlert(false)}
        confirmText="Dismiss"
      />

    </SafeAreaView>
  );
}