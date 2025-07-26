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
} from 'react-native';
import { router } from 'expo-router';
import { User, EventProfile, Event, UploadFile } from '../lib/firebaseApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User as UserIcon, Camera, Upload } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';

// Simple UUID v4 generator function
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
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
  const [showAgePicker, setShowAgePicker] = useState(false);
  const [rememberProfile, setRememberProfile] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      const eventId = await AsyncStorage.getItem('currentEventId');
      if (!eventId) {
        router.replace('/home');
        return;
      }
      try {
        const events = await Event.filter({ id: eventId });
        if (events.length > 0) {
          setEvent(events[0]);
        } else {
          router.replace('/home');
        }
      } catch (err) {
        console.error("Error fetching event details:", err);
        router.replace('/home');
      }
    };
    fetchEvent();
  }, []);

  // Load saved profile data if available
  useEffect(() => {
    const loadSavedProfile = async () => {
      try {
        const savedProfile = await AsyncStorage.getItem('savedProfileData');
        if (savedProfile) {
          const profileData = JSON.parse(savedProfile);
          setFormData(profileData);
          setRememberProfile(true);
        }
      } catch (error) {
        console.error("Error loading saved profile:", error);
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
      console.error("Error in photo upload:", error);
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
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        allowsMultipleSelection: false,
        base64: false,
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        await processImageAsset(result.assets[0]);
      }
    } catch (error) {
      console.error("Error capturing photo:", error);
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
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        allowsMultipleSelection: false,
        base64: false,
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        await processImageAsset(result.assets[0]);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const processImageAsset = async (asset: any) => {
    // Validate file size (10MB limit)
    if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
      Alert.alert("File Too Large", "Image must be smaller than 10MB.");
      return;
    }

    // Debug logging for image properties
    console.log('Processing image asset:', {
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      fileSize: asset.fileSize,
      type: asset.type,
      fileName: asset.fileName,
      aspectRatio: asset.width && asset.height ? asset.width / asset.height : 'unknown'
    });

    setIsUploadingPhoto(true);
    try {
      // Convert asset to file-like object for upload
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      
      // Force JPEG format for better compatibility with image picker and cropping
      // This helps ensure consistent behavior across different image formats
      let fileExtension = 'jpg';
      let mimeType = 'image/jpeg';
      
      // Create file with JPEG mime type regardless of original format
      // This helps the image picker handle the image properly
      const fileName = `profile-photo.${fileExtension}`;
      const file = new File([blob], fileName, { type: mimeType });
      
      const { file_url } = await UploadFile(file);
      setFormData(prev => ({ ...prev, profile_photo_url: file_url }));
      // Removed the success alert - photo upload is now silent
    } catch (err) {
      console.error("Error uploading photo:", err);
      Alert.alert("Upload Failed", "Failed to upload photo. Please try again.");
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

      // Save profile data locally if "remember profile" is checked
      if (rememberProfile) {
        try {
          await AsyncStorage.setItem('savedProfileData', JSON.stringify(formData));
        } catch (error) {
          console.error("Error saving profile data:", error);
        }
      } else {
        // Clear saved profile data if not checked
        try {
          await AsyncStorage.removeItem('savedProfileData');
        } catch (error) {
          console.error("Error clearing saved profile data:", error);
        }
      }

      // Create event profile with photo
      await EventProfile.create({
        event_id: event.id,
        session_id: sessionId,
        first_name: formData.first_name,
        age: parseInt(formData.age),
        gender_identity: formData.gender_identity,
        interested_in: formData.interested_in,
        profile_color: profileColor,
        profile_photo_url: formData.profile_photo_url,
        is_visible: true,
        expires_at: event.expires_at,
      });

      await AsyncStorage.setItem('currentSessionId', sessionId);
      await AsyncStorage.setItem('currentProfileColor', profileColor);
      await AsyncStorage.setItem('currentProfilePhotoUrl', formData.profile_photo_url);
      
      Alert.alert("Success", "Profile created! Welcome to the event.");
      router.replace('/discovery');
    } catch (err) {
      console.error("Error creating profile:", err);
      setError("Failed to create profile. Please try again.");
      setStep('error');
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
    photoUploadArea: {
      width: 100,
      height: 100,
      borderRadius: 50,
      borderWidth: 2,
      borderColor: isDark ? '#404040' : '#d1d5db',
      borderStyle: 'dashed',
      backgroundColor: isDark ? '#374151' : '#f9fafb',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    uploadedPhoto: {
      width: '100%',
      height: '100%',
      borderRadius: 60,
    },
    uploadPlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    uploadText: {
      fontSize: 14,
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
      fontSize: 17,
      color: isDark ? '#e5e7eb' : '#374151',
      marginLeft: 12,
      flex: 1,
    },
    checkboxDescription: {
      fontSize: 15,
      color: isDark ? '#9ca3af' : '#6b7280',
      marginLeft: 44,
      lineHeight: 20,
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
                  source={require('../assets/Home Icon.png')} 
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
                style={styles.photoUploadArea}
                onPress={handlePhotoUpload}
                disabled={isUploadingPhoto}
              >
                {formData.profile_photo_url ? (
                  <Image
                    source={{ uri: formData.profile_photo_url }}
                    style={styles.uploadedPhoto}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Upload size={32} color="#9ca3af" />
                    <Text style={styles.uploadText}>Upload Photo</Text>
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
              />
              
              {/* Age Selection */}
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowAgePicker(true)}
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
                onValueChange={setRememberProfile}
                trackColor={{ false: '#d1d5db', true: '#8b5cf6' }}
                thumbColor={rememberProfile ? '#ffffff' : '#ffffff'}
              />
              <Text style={styles.checkboxText}>
                Remember my profile for future events
              </Text>
            </View>
            <Text style={styles.checkboxDescription}>
              Your form data will be saved locally and auto-filled for future events
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
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