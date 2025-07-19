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
} from 'react-native';
import { router } from 'expo-router';
import { User, EventProfile, Event, UploadFile } from '../lib/firebaseApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User as UserIcon, Camera, Upload, Facebook, Instagram } from 'lucide-react-native';
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
    email: '',
    age: '25',
    gender_identity: '',
    interested_in: '',
    profile_photo_url: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showAgePicker, setShowAgePicker] = useState(false);

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
          // Removed the success alert - photo upload is now silent
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

      // Removed User.updateProfile() call since we're not using Firebase Auth
      // This was causing the "No user logged in" error

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

  const handleFacebookLogin = async () => {
    try {
      // Facebook OAuth implementation
      // In a real app, you would use Facebook SDK or OAuth flow
      const facebookAuthUrl = 'https://www.facebook.com/dialog/oauth?' +
        'client_id=YOUR_FACEBOOK_APP_ID' +
        '&redirect_uri=YOUR_REDIRECT_URI' +
        '&scope=public_profile,email' +
        '&response_type=code';
      
      // For demo purposes, we'll simulate successful login with mock data
      Alert.alert(
        "Facebook Login",
        "Connecting to Facebook...",
        [{ text: "OK" }]
      );
      
      // Simulate API call delay
      setTimeout(() => {
        // Mock Facebook user data
        const mockFacebookData = {
          name: 'John Doe',
          email: 'john.doe@example.com',
          profile_picture: 'https://via.placeholder.com/150/1877f2/ffffff?text=FB',
          age: '28',
          gender: 'male'
        };
        
        // Pre-fill the form with Facebook data
        setFormData(prev => ({
          ...prev,
          first_name: mockFacebookData.name.split(' ')[0],
          email: mockFacebookData.email,
          age: mockFacebookData.age,
          gender_identity: mockFacebookData.gender === 'male' ? 'man' : 'woman',
          profile_photo_url: mockFacebookData.profile_picture
        }));
        
        Alert.alert(
          "Success!",
          "Facebook data imported successfully. Please complete the remaining fields and upload a photo.",
          [{ text: "OK" }]
        );
      }, 2000);
      
    } catch (error) {
      console.error("Facebook login error:", error);
      Alert.alert("Error", "Failed to connect with Facebook. Please try again.");
    }
  };

  const handleInstagramLogin = async () => {
    try {
      // Instagram Basic Display API implementation
      // In a real app, you would use Instagram's OAuth flow
      const instagramAuthUrl = 'https://api.instagram.com/oauth/authorize?' +
        'client_id=YOUR_INSTAGRAM_APP_ID' +
        '&redirect_uri=YOUR_REDIRECT_URI' +
        '&scope=user_profile,user_media' +
        '&response_type=code';
      
      // For demo purposes, we'll simulate successful login with mock data
      Alert.alert(
        "Instagram Login",
        "Connecting to Instagram...",
        [{ text: "OK" }]
      );
      
      // Simulate API call delay
      setTimeout(() => {
        // Mock Instagram user data
        const mockInstagramData = {
          username: 'jane_doe',
          full_name: 'Jane Doe',
          profile_picture: 'https://via.placeholder.com/150/e4405f/ffffff?text=IG',
          // Instagram doesn't provide age/gender by default
        };
        
        // Pre-fill the form with Instagram data
        setFormData(prev => ({
          ...prev,
          first_name: mockInstagramData.full_name.split(' ')[0],
          email: `${mockInstagramData.username}@instagram.com`, // Placeholder email
          profile_photo_url: mockInstagramData.profile_picture
        }));
        
        Alert.alert(
          "Success!",
          "Instagram data imported successfully. Please complete the remaining fields (age, gender, interests).",
          [{ text: "OK" }]
        );
      }, 2000);
      
    } catch (error) {
      console.error("Instagram login error:", error);
      Alert.alert("Error", "Failed to connect with Instagram. Please try again.");
    }
  };

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
                <UserIcon size={32} color="white" />
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
                Required • Max 5MB • JPG, PNG, or GIF
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
              
              <TextInput
                style={styles.input}
                placeholder="Email (private, for feedback only) *"
                placeholderTextColor="#9ca3af"
                value={formData.email}
                onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                keyboardType="email-address"
                autoCapitalize="none"
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

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>Join Event</Text>
          </TouchableOpacity>

          {/* Social Login Section */}
          <View style={styles.socialSection}>
            <Text style={styles.socialSectionTitle}>Or connect with social media</Text>
            <View style={styles.socialButtons}>
              <TouchableOpacity
                style={styles.facebookButton}
                onPress={handleFacebookLogin}
              >
                <Facebook size={20} color="white" style={styles.socialIcon} />
                <Text style={styles.facebookButtonText}>Continue with Facebook</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.instagramButton}
                onPress={handleInstagramLogin}
              >
                <Instagram size={20} color="white" style={styles.socialIcon} />
                <Text style={styles.instagramButtonText}>Continue with Instagram</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  eventName: {
    fontSize: 20,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
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
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    textAlign: 'left',
    width: '100%',
  },
  photoUploadArea: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
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
    color: '#6b7280',
    marginTop: 8,
  },
  photoRequirements: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
  },
  formSection: {
    gap: 12,
    width: '100%',
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
  selectionSection: {
    marginTop: 24,
    width: '100%',
  },
  selectionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  selectionButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  selectionButtonActive: {
    borderColor: '#8b5cf6',
    backgroundColor: '#8b5cf6',
  },
  selectionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  selectionButtonTextActive: {
    color: 'white',
  },
  submitButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
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
  inputText: {
    fontSize: 16,
    color: '#1f2937',
  },
  placeholderText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  agePickerContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxHeight: '70%',
  },
  agePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
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
    borderBottomColor: '#e5e7eb',
  },
  ageOptionSelected: {
    backgroundColor: '#8b5cf6',
  },
  ageOptionText: {
    fontSize: 16,
    color: '#1f2937',
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
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  socialSection: {
    marginTop: 32,
    width: '100%',
    alignItems: 'center',
  },
  socialSectionTitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  socialButtons: {
    width: '100%',
    gap: 12,
  },
  facebookButton: {
    backgroundColor: '#1877f2',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  facebookButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  instagramButton: {
    backgroundColor: '#e4405f',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  instagramButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  socialIcon: {
    marginRight: 8,
  },
}); 