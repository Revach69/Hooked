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
import { useNotifications } from '../lib/contexts/NotificationContext';
import { router } from 'expo-router';
import { EventProfileAPI, EventAPI, StorageAPI } from '../lib/firebaseApi';
import { AsyncStorageUtils } from '../lib/asyncStorageUtils';
import { Upload, ArrowLeft } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SurveyService } from '../lib/surveyService';
import { ensureFirebaseReady } from '../lib/firebaseReady';
import * as Sentry from '@sentry/react-native';
import InAppAlert from '../lib/components/InAppAlert';


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
  const notifications = useNotifications();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [event, setEvent] = useState<any>(null);
  const [step, setStep] = useState('manual');
  const [formData, setFormData] = useState({
    first_name: '',
    age: '25',
    gender_identity: '',
    interested_in: '',
    profile_photo_url: ''
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




  // Helper function to re-upload saved photo for new event
  const reuploadSavedPhoto = async (photoUrl: string): Promise<string> => {
    // Create a file object for the remote URL
    const fileObject = {
      uri: photoUrl,
      name: `saved-profile-photo-${Date.now()}.jpg`,
      type: 'image/jpeg'
    };

    // Add timeout to prevent hanging indefinitely
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Photo upload timeout')), 30000); // 30 second timeout
    });

    // Upload to Firebase Storage for the new event with timeout
    const uploadPromise = StorageAPI.uploadFile(fileObject);
    
    try {
      const { file_url } = await Promise.race([uploadPromise, timeoutPromise]);
      return file_url;
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          operation: 'profile_photo_reupload',
          type: 'timeout_or_upload_error'
        },
        extra: {
          photoUrl: photoUrl,
          error: error instanceof Error ? error.message : String(error)
        }
      });
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
    const fetchEvent = async () => {
      const firebaseReady = await ensureFirebaseReady();
      if (!firebaseReady) {
        notifications.error("Connection Error", "Unable to connect to the server. Please check your internet connection and try again.");
        router.replace('/home');
        return;
      }
      const eventId = await AsyncStorageUtils.getItem<string>('currentEventId');
      
      if (!eventId) {
        Sentry.captureException(new Error('No event ID found in AsyncStorage'));
        router.replace('/home');
        return;
      }
      
      try {
        const foundEvent = await EventAPI.get(eventId);
        
        if (foundEvent) {
          setEvent(foundEvent);
        } else {
          Sentry.captureException(new Error(`No event found with ID: ${eventId}`));
          notifications.error("Error", "Event not found. Please try again.");
          router.replace('/home');
        }
      } catch (error) {
        Sentry.captureException(error);
        notifications.error("Error", "Failed to load event information. Please try again.");
        router.replace('/home');
      }
    };
    fetchEvent();
  }, []);

  // Load saved profile data if available
  useEffect(() => {
    const loadSavedProfile = async () => {
      try {
        const savedProfile = await AsyncStorageUtils.getItem<string>('savedProfileData');
        const savedPhotoUrl = await AsyncStorageUtils.getItem<string>('savedProfilePhotoUrl');
        
        if (savedProfile) {
          const parsedProfile = JSON.parse(savedProfile);
          
          // If we have a saved photo URL, re-upload it for the new event
          if (savedPhotoUrl) {
            setIsReuploadingPhoto(true);
            try {
              const newPhotoUrl = await reuploadSavedPhoto(savedPhotoUrl);
              setFormData({
                ...parsedProfile,
                profile_photo_url: newPhotoUrl
              });
            } catch {
              // If photo re-upload fails, load data without photo
              setFormData({
                ...parsedProfile,
                profile_photo_url: ''
              });
            } finally {
              setIsReuploadingPhoto(false);
            }
          } else {
            // No saved photo, just load the other data
            setFormData({
              ...parsedProfile,
              profile_photo_url: ''
            });
          }
          
          // Set the remember profile toggle to true if we have saved data
          setRememberProfile(true);
        }
      } catch (error) {
        // Error loading saved profile
        Sentry.captureException(error);
      }
    };
    loadSavedProfile();
  }, []);

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
      notifications.error("Error", "Failed to open photo options. Please try again.");
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

      // Add timeout to prevent hanging in simulator
      const pickerPromise = ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.4, // Further reduced quality for simulator
        allowsMultipleSelection: false,
        base64: false,
        exif: false,
      });
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Image picker timeout')), 15000)
      );
      
      const result = await Promise.race([pickerPromise, timeoutPromise]) as any;

      if (!result.canceled && result.assets && result.assets[0]) {
        await processImageAsset(result.assets[0]);
      }
    } catch (error) {
      Sentry.captureException(error);
      let errorMessage = "Failed to capture photo. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes('Image picker timeout')) {
          errorMessage = "Camera took too long to respond. Please try again.";
        }
      }
      
      Alert.alert("Error", errorMessage);
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

      // Add timeout to prevent hanging in simulator
      const pickerPromise = ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.4, // Further reduced quality for simulator
        allowsMultipleSelection: false,
        base64: false,
        exif: false,
      });
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Image picker timeout')), 15000)
      );
      
      const result = await Promise.race([pickerPromise, timeoutPromise]) as any;

      if (!result.canceled && result.assets && result.assets[0]) {
        await processImageAsset(result.assets[0]);
      }
    } catch (error) {
      Sentry.captureException(error);
      let errorMessage = "Failed to pick image. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes('Image picker timeout')) {
          errorMessage = "Gallery took too long to respond. Please try again.";
        }
      }
      
      Alert.alert("Error", errorMessage);
    }
  };

  const processImageAsset = async (asset: any) => {
    // Validate file size (stricter limit for simulator)
    const maxFileSize = Platform.OS === 'ios' && __DEV__ ? 5 * 1024 * 1024 : 10 * 1024 * 1024; // 5MB for simulator, 10MB for device
    if (asset.fileSize && asset.fileSize > maxFileSize) {
      Sentry.captureException(new Error(`File too large: ${asset.fileSize}`));
      const sizeLimit = Platform.OS === 'ios' && __DEV__ ? '5MB' : '10MB';
      Alert.alert("File Too Large", `Image must be smaller than ${sizeLimit}.`);
      return;
    }

    // Show thumbnail immediately
    setTempPhotoUri(asset.uri);
    
    setIsUploadingPhoto(true);
    
    try {
      // Add timeout to prevent hanging in simulator
      const uploadPromise = async () => {
        // Check network connectivity before upload
        const { checkNetworkConnectivityWithTimeout } = await import('../lib/utils');
        const isConnected = await checkNetworkConnectivityWithTimeout(5000);
        
        if (!isConnected) {
          throw new Error('No internet connection. Please check your network and try again.');
        }

        // Create file object for upload
        const fileObject = {
          uri: asset.uri,
          name: `profile-photo-${Date.now()}.jpg`,
          type: 'image/jpeg',
          fileSize: asset.fileSize
        };

        // Upload to Firebase Storage with retry logic
        let uploadAttempts = 0;
        const maxAttempts = 3;
        
        while (uploadAttempts < maxAttempts) {
          try {
            const { file_url } = await StorageAPI.uploadFile(fileObject);
            
            // Update form data with the uploaded photo URL
            setFormData(prev => ({
              ...prev,
              profile_photo_url: file_url
            }));

            // Save photo URL locally if "remember profile" is checked
            if (rememberProfile) {
              try {
                await AsyncStorageUtils.setItem('savedProfilePhotoUrl', file_url);
              } catch (storageError) {
                Sentry.captureException(storageError);
              }
            }
            
            // Clear temp photo and success - break out of retry loop
            setTempPhotoUri(null);
            return;
          } catch (uploadError) {
            uploadAttempts++;
            
            if (uploadAttempts >= maxAttempts) {
              throw uploadError;
            }
            
            // Wait before retrying (exponential backoff)
            const waitTime = 1000 * uploadAttempts;
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      };

      // Add timeout to prevent hanging - longer timeout for simulator
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Upload timeout - please try again')), 60000)
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
          
          // Save placeholder URL locally if "remember profile" is checked
          if (rememberProfile) {
            try {
              await AsyncStorageUtils.setItem('savedProfilePhotoUrl', placeholderUrl);
            } catch (storageError) {
              Sentry.captureException(storageError);
            }
          }
          
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
      Sentry.captureException(new Error(`Event data is missing or invalid: ${JSON.stringify(event)}`));
      notifications.error("Error", "Event information is missing. Please try again.");
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
          // Save profile data (without photo URL)
          const profileDataToSave = {
            first_name: formData.first_name,
            age: formData.age,
            gender_identity: formData.gender_identity,
            interested_in: formData.interested_in
          };
          
          // Validate that we have the required data before saving
          if (profileDataToSave.first_name && profileDataToSave.age && 
              profileDataToSave.gender_identity && profileDataToSave.interested_in) {
            await AsyncStorageUtils.setItem('savedProfileData', JSON.stringify(profileDataToSave));
          }
        } catch (error) {
          Sentry.captureException(error);
        }
      } else {
        // Clear saved profile data if not checked
        try {
          await AsyncStorageUtils.removeItem('savedProfileData');
          await AsyncStorageUtils.removeItem('savedProfilePhotoUrl');
        } catch (error) {
          Sentry.captureException(error);
        }
      }

      // Create event profile with photo
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
      };
      
      // Add timeout to prevent hanging
      const profileCreationPromise = EventProfileAPI.create(profileData);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile creation timeout')), 15000)
      );
      
      await Promise.race([profileCreationPromise, timeoutPromise]);

      // Save session and profile data to AsyncStorage
      await AsyncStorageUtils.setItem('currentSessionId', sessionId);
      await AsyncStorageUtils.setItem('currentProfilePhotoUrl', formData.profile_photo_url);
      await AsyncStorageUtils.setItem('currentProfileColor', validColor);
      
      // Add event to user's history for survey purposes
      try {
        await SurveyService.addEventToHistory(
          event.id,
          event.name,
          sessionId,
          event.expires_at.toDate().toISOString()
        );
      } catch (error) {
        Sentry.captureException(error);
        // Don't fail the entire process for this
      }
      
      // Navigate to discovery page
      router.replace('/discovery');
    } catch (error) {
      Sentry.captureException(error);
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
      borderRadius: 60,
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
      borderRadius: 50,
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
            onPress={() => router.replace('/home')}
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
            onPress={() => router.replace('/home')}
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
              onPress={() => router.replace('/home')}
              accessibilityLabel="Back to Home"
              accessibilityHint="Tap to return to the home screen"
            >
              <ArrowLeft size={20} color={isDark ? '#e5e7eb' : '#374151'} />
            </TouchableOpacity>
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Image 
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
              <TextInput
                style={styles.input}
                placeholder="First Name *"
                placeholderTextColor="#9ca3af"
                value={formData.first_name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, first_name: text }))}
                returnKeyType="next"
                accessibilityLabel="First Name Input"
                accessibilityHint="Enter your first name"
              />
              
              {/* Age Selection */}
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowAgePicker(true)}
                accessibilityLabel="Age Selection"
                accessibilityHint="Tap to select your age"
              >
                <Text style={formData.age ? styles.inputText : styles.placeholderText}>
                  {formData.age ? `Age: ${formData.age}` : 'Age *'}
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