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
} from 'react-native';
import { router } from 'expo-router';
import { AuthAPI, EventProfileAPI, EventAPI, StorageAPI } from '../lib/firebaseApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User as UserIcon, Camera, Upload } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { SurveyNotificationService } from '../lib/surveyNotificationService';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    age: '25',
    gender_identity: '',
    interested_in: '',
    profile_photo_url: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isReuploadingPhoto, setIsReuploadingPhoto] = useState(false);
  const [showAgePicker, setShowAgePicker] = useState(false);
  const [rememberProfile, setRememberProfile] = useState(false);



  // Helper function to re-upload saved photo for new event
  const reuploadSavedPhoto = async (photoUrl: string): Promise<string> => {
    try {
      // Create a file object for the remote URL
      const fileObject = {
        uri: photoUrl,
        name: `saved-profile-photo-${Date.now()}.jpg`,
        type: 'image/jpeg'
      };

      // Upload to Firebase Storage for the new event
      const { file_url } = await StorageAPI.uploadFile(fileObject);
      return file_url;
    } catch (error) {
      console.error('Error re-uploading photo:', error);
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
      const eventId = await AsyncStorage.getItem('currentEventId');
      if (!eventId) {
        router.replace('/home');
        return;
      }
      try {
        const events = await EventAPI.filter({ id: eventId });
        if (events.length > 0) {
          const foundEvent = events[0];
          setEvent(foundEvent);
        }
      } catch (err) {
        // Handle error silently
      }
    };
    fetchEvent();
  }, []);

  // Load saved profile data if available
  useEffect(() => {
    const loadSavedProfile = async () => {
      try {
        const savedProfile = await AsyncStorage.getItem('savedProfileData');
        const savedPhotoUrl = await AsyncStorage.getItem('savedProfilePhotoUrl');
        
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
            } catch (photoError) {
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
        console.error('Error loading saved profile:', error);
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
    } catch (error) {
      Alert.alert("Error", "Failed to open photo options. Please try again.");
    }
  };

  const handleCameraCapture = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert("Permission Required", "Camera permission is required to take a photo!");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6, // Reduced quality for faster upload
        allowsMultipleSelection: false,
        base64: false,
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        await processImageAsset(result.assets[0]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to capture photo. Please try again.");
    }
  };

  const handleGalleryPick = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert("Permission Required", "Permission to access camera roll is required!");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6, // Reduced quality for faster upload
        allowsMultipleSelection: false,
        base64: false,
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        await processImageAsset(result.assets[0]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const processImageAsset = async (asset: any) => {
    // Validate file size (10MB limit)
    if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
      Alert.alert("File Too Large", "Image must be smaller than 10MB.");
      return;
    }

    setIsUploadingPhoto(true);
    
    try {
      // Create file object for upload
      const fileObject = {
        uri: asset.uri,
        name: `profile-photo-${Date.now()}.jpg`,
        type: 'image/jpeg'
      };

      // Upload to Firebase Storage
      const { file_url } = await StorageAPI.uploadFile(fileObject);
      
      // Update form data with the uploaded photo URL
      setFormData(prev => ({
        ...prev,
        profile_photo_url: file_url
      }));

      // Save photo URL locally if "remember profile" is checked
      if (rememberProfile) {
        await AsyncStorage.setItem('savedProfilePhotoUrl', file_url);
      }
    } catch (err) {
      // Enhanced error logging
      console.error('Photo upload error details:', {
        error: err,
        assetInfo: {
          uri: asset.uri,
          fileSize: asset.fileSize,
          width: asset.width,
          height: asset.height,
          type: asset.type
        },
        timestamp: new Date().toISOString(),
        userAgent: 'iOS App'
      });
      
      // Use the existing error handling system
      const errorMessage = err instanceof Error ? err.message : 'Unknown upload error';
      Alert.alert("Upload Failed", `Failed to upload photo: ${errorMessage}. Please try again.`);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSubmit = async () => {
    // Validate all required fields including photo
    if (!formData.first_name || !formData.age || !formData.gender_identity || !formData.interested_in) {
      Alert.alert("Missing Information", "Please fill in all fields.");
      return;
    }

    if (!formData.profile_photo_url) {
      Alert.alert("Missing Photo", "Please upload a profile photo.");
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
            await AsyncStorage.setItem('savedProfileData', JSON.stringify(profileDataToSave));
          }
        } catch (error) {
          console.error('Error saving profile data:', error);
        }
      } else {
        // Clear saved profile data if not checked
        try {
          await AsyncStorage.removeItem('savedProfileData');
          await AsyncStorage.removeItem('savedProfilePhotoUrl');
        } catch (error) {
          console.error('Error clearing profile data:', error);
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
      
      await EventProfileAPI.create(profileData);

      // Save session and profile data to AsyncStorage
      await AsyncStorage.setItem('currentSessionId', sessionId);
      await AsyncStorage.setItem('currentProfilePhotoUrl', formData.profile_photo_url);
      await AsyncStorage.setItem('currentProfileColor', validColor);
      
      // Schedule survey notification for after event ends
      await SurveyNotificationService.scheduleSurveyNotification(
        event.id,
        event.name,
        event.expires_at,
        sessionId,
        2 // 2 hours after event ends
      );
      
      // Debug: Log scheduled notifications to help troubleshoot
      await SurveyNotificationService.debugScheduledNotifications();
      
      router.replace('/discovery');
    } catch (err) {
      setError("Failed to create profile. Please try again.");
      setIsSubmitting(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#1a1a1a' : '#f8fafc',
    },
    contentContainer: {
      padding: 16,
      alignItems: 'center',
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
    },
    header: {
      alignItems: 'center',
      marginBottom: 20,
    },
    logoContainer: {
      width: 80,
      height: 80,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
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
    },
    eventName: {
      fontSize: 18,
      color: isDark ? '#9ca3af' : '#6b7280',
      textAlign: 'center',
      marginTop: 2,
    },
    subtitle: {
      fontSize: 16,
      color: isDark ? '#9ca3af' : '#6b7280',
      textAlign: 'center',
      lineHeight: 24,
    },
    form: {
      gap: 12,
    },
    photoSection: {
      alignItems: 'center',
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#e5e7eb' : '#374151',
      marginBottom: 8,
      textAlign: 'left',
      width: '100%',
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
    },
    profilePhoto: {
      width: '100%',
      height: '100%',
    },

    uploadPlaceholder: {
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingBottom: 8,
    },
    uploadText: {
      fontSize: 12,
      color: isDark ? '#9ca3af' : '#6b7280',
      marginTop: 8,
    },
    photoRequirements: {
      fontSize: 12,
      color: isDark ? '#9ca3af' : '#6b7280',
      textAlign: 'center',
      marginTop: 8,
    },
    formSection: {
      gap: 8,
      width: '100%',
    },
    input: {
      borderWidth: 1,
      borderColor: isDark ? '#404040' : '#d1d5db',
      borderRadius: 8,
      padding: 10,
      fontSize: 16,
      backgroundColor: isDark ? '#374151' : 'white',
      color: isDark ? '#e5e7eb' : '#1f2937',
    },
    selectContainer: {
      gap: 8,
    },
    selectLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: isDark ? '#e5e7eb' : '#374151',
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
    },
    selectButtonTextActive: {
      color: 'white',
    },
    selectionSection: {
      marginTop: 20,
      width: '100%',
    },
    selectionButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    selectionButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: isDark ? '#404040' : '#d1d5db',
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: isDark ? '#374151' : 'white',
    },
    selectionButtonActive: {
      borderColor: '#8b5cf6',
      backgroundColor: '#8b5cf6',
    },
    selectionButtonText: {
      fontSize: 17,
      fontWeight: '500',
      color: isDark ? '#e5e7eb' : '#374151',
    },
    selectionButtonTextActive: {
      color: 'white',
    },
    submitButton: {
      backgroundColor: '#8b5cf6',
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 20,
    },
    submitButtonDisabled: {
      backgroundColor: '#9ca3af',
    },
    submitButtonText: {
      color: 'white',
      fontSize: 17,
      fontWeight: '500',
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
    },
    errorText: {
      fontSize: 16,
      color: isDark ? '#9ca3af' : '#6b7280',
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 24,
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
    },
    inputText: {
      fontSize: 16,
      color: isDark ? '#e5e7eb' : '#1f2937',
    },
    placeholderText: {
      fontSize: 16,
      color: isDark ? '#9ca3af' : '#9ca3af',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    agePickerContainer: {
      backgroundColor: isDark ? '#2d2d2d' : 'white',
      borderRadius: 16,
      padding: 20,
      width: '80%',
      maxHeight: '70%',
    },
    agePickerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: isDark ? '#ffffff' : '#1f2937',
      textAlign: 'center',
      marginBottom: 16,
    },
    agePickerScroll: {
      maxHeight: 300,
    },
    ageOption: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#404040' : '#e5e7eb',
    },
    ageOptionSelected: {
      backgroundColor: '#8b5cf6',
    },
    ageOptionText: {
      fontSize: 16,
      color: isDark ? '#e5e7eb' : '#1f2937',
      textAlign: 'center',
    },
    ageOptionTextSelected: {
      color: 'white',
      fontWeight: '600',
    },
    cancelButton: {
      marginTop: 16,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: isDark ? '#374151' : '#f3f4f6',
      borderRadius: 8,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: 16,
      color: isDark ? '#9ca3af' : '#6b7280',
      fontWeight: '500',
    },
    rememberSection: {
      marginTop: 20,
      width: '100%',
    },
    checkboxContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    checkboxText: {
      fontSize: 14,
      color: isDark ? '#e5e7eb' : '#374151',
      marginLeft: 12,
      flex: 1,
    },
    checkboxDescription: {
      fontSize: 12,
      color: isDark ? '#9ca3af' : '#6b7280',
      marginLeft: 44,
      lineHeight: 16,
      textAlign: 'center',
    },


    legalSection: {
      marginTop: 16,
      marginBottom: 8,
      width: '100%',
    },
    legalText: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
      textAlign: 'center',
      lineHeight: 20,
    },
    legalLink: {
      color: '#8b5cf6',
      textDecorationLine: 'underline',
    },
  });

  if (step === 'processing') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.card}>
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
      <SafeAreaView style={styles.container}>
        <View style={styles.card}>
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
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.contentContainer}>
          <View style={styles.card}>
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
                {formData.profile_photo_url ? (
                  <Image
                    source={{ uri: formData.profile_photo_url }}
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
            <Text style={styles.sectionTitle}>I'm interested in... *</Text>
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
    </SafeAreaView>
  );
}