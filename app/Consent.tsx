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
} from 'react-native';
import { router } from 'expo-router';
import { User, EventProfile, Event, UploadFile } from '../lib/firebaseApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User as UserIcon, Camera, Upload } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

// Simple UUID v4 generator function
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function Consent() {
  const [event, setEvent] = useState<any>(null);
  const [step, setStep] = useState('manual');
  const [formData, setFormData] = useState({
    first_name: '',
    email: '',
    age: '',
    gender_identity: '',
    interested_in: '',
    profile_photo_url: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

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

  // Handler for profile photo upload
  const handlePhotoUpload = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert("Permission Required", "Permission to access camera roll is required!");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Validate file size (5MB limit)
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          Alert.alert("File Too Large", "Image must be smaller than 5MB.");
          return;
        }

        setIsUploadingPhoto(true);
        try {
          // Convert asset to file-like object for upload
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          const file = new File([blob], 'profile-photo.jpg', { type: 'image/jpeg' });
          
          const { file_url } = await UploadFile(file);
          setFormData(prev => ({ ...prev, profile_photo_url: file_url }));
          Alert.alert("Success", "Photo uploaded successfully!");
        } catch (err) {
          console.error("Error uploading photo:", err);
          Alert.alert("Upload Failed", "Failed to upload photo. Please try again.");
        } finally {
          setIsUploadingPhoto(false);
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const handleSubmit = async () => {
    // Validate all required fields including photo
    if (!formData.first_name || !formData.email || !formData.age || !formData.gender_identity || !formData.interested_in) {
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

      // Update user profile with photo URL
      await User.updateProfile({
        photoURL: formData.profile_photo_url
      });

      // Create event profile with photo
      await EventProfile.create({
        event_id: event.id,
        session_id: sessionId,
        first_name: formData.first_name,
        email: formData.email,
        age: parseInt(formData.age),
        gender_identity: formData.gender_identity,
        interested_in: formData.interested_in,
        profile_color: profileColor,
        profile_photo_url: formData.profile_photo_url,
        is_visible: true,
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

  if (step === 'processing') {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color="#8b5cf6" style={styles.spinner} />
          <Text style={styles.title}>Creating Your Profile...</Text>
          <Text style={styles.subtitle}>
            Just a moment while we get you into the event.
          </Text>
        </View>
      </View>
    );
  }

  if (step === 'error') {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.button} onPress={() => setStep('manual')}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <UserIcon size={32} color="white" />
          </View>
          <Text style={styles.title}>
            Create Your Event Profile For:
          </Text>
          <Text style={styles.title}>
            {event?.name || 'This Event'}
          </Text>
        </View>

        <View style={styles.form}>
          {/* Profile Photo Upload */}
          <View style={styles.photoSection}>
            <Text style={styles.label}>Profile Photo *</Text>
            <View style={styles.photoContainer}>
              {formData.profile_photo_url ? (
                <View style={styles.photoPreviewContainer}>
                  <Image
                    source={{ uri: formData.profile_photo_url }}
                    style={styles.photoPreview}
                  />
                  <TouchableOpacity
                    style={styles.photoOverlay}
                    onPress={handlePhotoUpload}
                  >
                    <Camera size={24} color="white" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.uploadArea}
                  onPress={handlePhotoUpload}
                  disabled={isUploadingPhoto}
                >
                  <Upload size={24} color="#9ca3af" />
                  <Text style={styles.uploadText}>Upload Photo</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.photoHint}>
              Required • Max 5MB • JPG, PNG, or GIF
            </Text>
          </View>

          <TextInput
            style={styles.input}
            placeholder="First Name *"
            value={formData.first_name}
            onChangeText={(text) => setFormData({...formData, first_name: text})}
          />

          <TextInput
            style={styles.input}
            placeholder="Email (private, for feedback only) *"
            value={formData.email}
            onChangeText={(text) => setFormData({...formData, email: text})}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Age *"
            value={formData.age}
            onChangeText={(text) => setFormData({...formData, age: text})}
            keyboardType="numeric"
          />

          <View style={styles.selectContainer}>
            <Text style={styles.selectLabel}>I am a... *</Text>
            <View style={styles.selectButtons}>
              {['man', 'woman'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.selectButton,
                    formData.gender_identity === option && styles.selectButtonActive
                  ]}
                  onPress={() => setFormData({...formData, gender_identity: option})}
                >
                  <Text style={[
                    styles.selectButtonText,
                    formData.gender_identity === option && styles.selectButtonTextActive
                  ]}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.selectContainer}>
            <Text style={styles.selectLabel}>I'm interested in... *</Text>
            <View style={styles.selectButtons}>
              {['men', 'women', 'everyone'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.selectButton,
                    formData.interested_in === option && styles.selectButtonActive
                  ]}
                  onPress={() => setFormData({...formData, interested_in: option})}
                >
                  <Text style={[
                    styles.selectButtonText,
                    formData.interested_in === option && styles.selectButtonTextActive
                  ]}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, (isSubmitting || isUploadingPhoto) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting || isUploadingPhoto}
          >
            {isSubmitting ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="white" />
                <Text style={styles.submitButtonText}>Creating Profile...</Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>Join Event</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    padding: 16,
    alignItems: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    width: 64,
    height: 64,
    backgroundColor: '#8b5cf6',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  form: {
    gap: 16,
  },
  photoSection: {
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  photoPreviewContainer: {
    position: 'relative',
  },
  photoPreview: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: '#e5e7eb',
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadArea: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  photoHint: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  selectContainer: {
    gap: 8,
  },
  selectLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  selectButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  selectButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  selectButtonActive: {
    borderColor: '#8b5cf6',
    backgroundColor: '#8b5cf6',
  },
  selectButtonText: {
    fontSize: 14,
    color: '#374151',
  },
  selectButtonTextActive: {
    color: 'white',
  },
  submitButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
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
    color: '#6b7280',
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
}); 