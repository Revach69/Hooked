import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  useColorScheme,
  SafeAreaView,
  TextInput,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { 
  ArrowLeft, 
  Save,
  Calendar,
  MapPin,
  Hash,
  Camera,
  X
} from 'lucide-react-native';
import { EventAPI, AuthAPI } from '../../lib/firebaseApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebaseConfig';

export default function CreateEvent() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    event_code: '',
    event_link: '',
    starts_at: new Date(),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    is_private: false,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const generateEventCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, event_code: result }));
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
              // Error picking image
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const uploadImage = async (imageUri: string): Promise<string | null> => {
    try {
      setUploadingImage(true);
      
      // Convert image URI to blob
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      // Create unique filename
      const filename = `events/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const storageRef = ref(storage, filename);
      
      // Upload to Firebase Storage
      await uploadBytes(storageRef, blob);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
              // Error uploading image
      Alert.alert('Error', 'Failed to upload image. Please try again.');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
  };

  const handleSave = async () => {
    // Validation
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Event name is required');
      return;
    }
    
    if (!formData.event_code.trim()) {
      Alert.alert('Error', 'Event code is required');
      return;
    }
    
    if (formData.starts_at >= formData.expires_at) {
      Alert.alert('Error', 'End time must be after start time');
      return;
    }

    try {
      setIsLoading(true);
      
      // Check if event code already exists
      const existingEvents = await EventAPI.filter({ event_code: formData.event_code });
      if (existingEvents.length > 0) {
        Alert.alert('Error', 'Event code already exists. Please generate a new one.');
        return;
      }

      // Upload image if selected
      let imageUrl: string | undefined = undefined;
      if (selectedImage) {
        const uploadedUrl = await uploadImage(selectedImage);
        if (!uploadedUrl) {
          Alert.alert('Error', 'Failed to upload image. Please try again.');
          return;
        }
        imageUrl = uploadedUrl;
      }

      // Create the event
      await EventAPI.create({
        name: formData.name.trim(),
        description: formData.description.trim(),
        location: formData.location.trim(),
        event_code: formData.event_code.trim(),
        event_link: formData.event_link.trim(),
        starts_at: formData.starts_at.toISOString(),
        expires_at: formData.expires_at.toISOString(),
        organizer_email: AuthAPI.getCurrentUser()?.email || '',
        is_active: true, // Set events as active by default
        image_url: imageUrl, // Add image URL if uploaded
        is_private: formData.is_private, // Add is_private field
      });

      Alert.alert('Success', 'Event created successfully!', [
        {
          text: 'OK',
          onPress: () => router.back()
        }
      ]);
    } catch (error) {
              // Error creating event
      Alert.alert('Error', 'Failed to create event. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartPicker(false);
    if (selectedDate) {
      setFormData(prev => ({ ...prev, starts_at: selectedDate }));
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndPicker(false);
    if (selectedDate) {
      setFormData(prev => ({ ...prev, expires_at: selectedDate }));
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#1a1a1a' : '#f8fafc',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      paddingTop: 60,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#404040' : '#e5e7eb',
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark ? '#404040' : '#d1d5db',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#2d2d2d' : 'white',
      marginRight: 12,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: isDark ? '#ffffff' : '#1f2937',
      flex: 1,
    },
    saveButton: {
      backgroundColor: '#10b981',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    saveButtonText: {
      color: 'white',
      fontWeight: '600',
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
    },
    formSection: {
      backgroundColor: isDark ? '#2d2d2d' : 'white',
      borderRadius: 12,
      padding: 16,
      marginVertical: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: isDark ? '#ffffff' : '#1f2937',
      marginBottom: 16,
    },
    inputGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: isDark ? '#ffffff' : '#1f2937',
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: isDark ? '#404040' : '#d1d5db',
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: isDark ? '#ffffff' : '#1f2937',
      backgroundColor: isDark ? '#404040' : 'white',
    },
    textArea: {
      borderWidth: 1,
      borderColor: isDark ? '#404040' : '#d1d5db',
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: isDark ? '#ffffff' : '#1f2937',
      backgroundColor: isDark ? '#404040' : 'white',
      height: 80,
      textAlignVertical: 'top',
    },
    dateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDark ? '#404040' : '#d1d5db',
      borderRadius: 8,
      padding: 12,
      backgroundColor: isDark ? '#404040' : 'white',
    },
    dateButtonText: {
      fontSize: 16,
      color: isDark ? '#ffffff' : '#1f2937',
      marginLeft: 8,
    },
    generateButton: {
      backgroundColor: '#8b5cf6',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 6,
      marginTop: 8,
    },
    generateButtonText: {
      color: 'white',
      fontSize: 14,
      fontWeight: '500',
    },
    eventCodeDisplay: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDark ? '#404040' : '#d1d5db',
      borderRadius: 8,
      padding: 12,
      backgroundColor: isDark ? '#404040' : 'white',
    },
    eventCodeText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: isDark ? '#ffffff' : '#1f2937',
      flex: 1,
      textAlign: 'center',
    },
    required: {
      color: '#ef4444',
    },
    imageContainer: {
      position: 'relative',
      width: '100%',
      height: 150,
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: isDark ? '#404040' : '#e0e0e0',
    },
    selectedImage: {
      width: '100%',
      height: '100%',
      borderRadius: 8,
    },
    removeImageButton: {
      position: 'absolute',
      top: 5,
      right: 5,
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderRadius: 10,
      width: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    imageUploadButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: isDark ? '#404040' : '#d1d5db',
      borderRadius: 8,
      padding: 12,
      backgroundColor: isDark ? '#404040' : 'white',
    },
    imageUploadText: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
      marginLeft: 8,
    },
    uploadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 10,
    },
    uploadingText: {
      fontSize: 14,
      color: '#8b5cf6',
      marginLeft: 5,
    },
    checkboxContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: isDark ? '#404040' : '#d1d5db',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDark ? '#404040' : 'white',
      marginRight: 10,
    },
    checkboxChecked: {
      backgroundColor: '#8b5cf6',
      borderColor: '#8b5cf6',
    },
    checkboxText: {
      color: 'white',
      fontSize: 14,
      fontWeight: 'bold',
    },
    checkboxLabel: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
      flex: 1,
    },
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
          disabled={isLoading}
        >
          <ArrowLeft size={20} color={isDark ? '#ffffff' : '#1f2937'} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Event</Text>
        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Event Details</Text>
          
          {/* Event Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Event Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
              placeholder="Enter event name"
              placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
            />
          </View>

          {/* Event Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={styles.textArea}
              value={formData.description}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
              placeholder="Enter event description"
              placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
              multiline
            />
          </View>

          {/* Event Image */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Event Image (Optional)</Text>
            {selectedImage ? (
              <View style={styles.imageContainer}>
                <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                <TouchableOpacity style={styles.removeImageButton} onPress={removeImage}>
                  <X size={16} color="white" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.imageUploadButton} onPress={pickImage}>
                <Camera size={24} color={isDark ? '#9ca3af' : '#6b7280'} />
                <Text style={styles.imageUploadText}>Select Event Image</Text>
              </TouchableOpacity>
            )}
            {uploadingImage && (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator size="small" color="#8b5cf6" />
                <Text style={styles.uploadingText}>Uploading image...</Text>
              </View>
            )}
          </View>

          {/* Location */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              value={formData.location}
              onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
              placeholder="Enter event location"
              placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
            />
          </View>

          {/* Event Link */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Event Link</Text>
            <TextInput
              style={styles.input}
              value={formData.event_link}
              onChangeText={(text) => setFormData(prev => ({ ...prev, event_link: text }))}
              placeholder="Enter event link (optional)"
              placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <Text style={[styles.label, { fontSize: 12, color: isDark ? '#9ca3af' : '#6b7280', marginTop: 4 }]}>
              This link will be used for the "Join Event" button on the website
            </Text>
          </View>

          {/* Event Code */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Event Code <Text style={styles.required}>*</Text>
            </Text>
            {formData.event_code ? (
              <View style={styles.eventCodeDisplay}>
                <Hash size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
                <Text style={styles.eventCodeText}>{formData.event_code}</Text>
              </View>
            ) : (
              <TextInput
                style={styles.input}
                value={formData.event_code}
                onChangeText={(text) => setFormData(prev => ({ ...prev, event_code: text.toUpperCase() }))}
                placeholder="Enter event code or generate one"
                placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                autoCapitalize="characters"
                maxLength={6}
              />
            )}
            <TouchableOpacity style={styles.generateButton} onPress={generateEventCode}>
              <Text style={styles.generateButtonText}>Generate Code</Text>
            </TouchableOpacity>
          </View>

          {/* Start Date/Time */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Start Date & Time <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowStartPicker(true)}
            >
              <Calendar size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
              <Text style={styles.dateButtonText}>{formatDate(formData.starts_at)}</Text>
            </TouchableOpacity>
          </View>

          {/* End Date/Time */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              End Date & Time <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowEndPicker(true)}
            >
              <Calendar size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
              <Text style={styles.dateButtonText}>{formatDate(formData.expires_at)}</Text>
            </TouchableOpacity>
          </View>

          {/* Private Event Checkbox */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Private Event</Text>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setFormData(prev => ({ ...prev, is_private: !prev.is_private }))}
            >
              <View style={[styles.checkbox, formData.is_private && styles.checkboxChecked]}>
                {formData.is_private && (
                  <Text style={styles.checkboxText}>✓</Text>
                )}
              </View>
              <Text style={styles.checkboxLabel}>
                Make this event private (won't be displayed on the IRL page)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Date Pickers */}
      {showStartPicker && (
        <DateTimePicker
          value={formData.starts_at}
          mode="datetime"
          display="default"
          onChange={handleStartDateChange}
          minimumDate={new Date()}
        />
      )}
      
      {showEndPicker && (
        <DateTimePicker
          value={formData.expires_at}
          mode="datetime"
          display="default"
          onChange={handleEndDateChange}
          minimumDate={formData.starts_at}
        />
      )}
    </SafeAreaView>
  );
} 