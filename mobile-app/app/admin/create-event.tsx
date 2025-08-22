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
  Modal,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { 
  ArrowLeft, 
  Calendar,
  Hash,
  Camera,
  X
} from 'lucide-react-native';
import { EventAPI, AuthAPI } from '../../lib/firebaseApi';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { storage } from '../../lib/firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Timestamp } from 'firebase/firestore';
import { 
  getAvailableCountries, 
  getPrimaryTimezoneForCountry, 
  getTimezonesForCountry,
  getUserTimezone,
  convertTimezone
} from '../../lib/timezoneUtils';

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
    start_date: new Date(), // Real event start time
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    is_private: false,
    timezone: getUserTimezone(), // Default to user's timezone
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showRealStartPicker, setShowRealStartPicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showTimezonePicker, setShowTimezonePicker] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [availableTimezones, setAvailableTimezones] = useState<string[]>([]);

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
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.5, // Optimized for admin uploads
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const uploadImage = async (imageUri: string): Promise<string | null> => {
    try {
      setUploadingImage(true);
      
      // Optimize image for event banners
      const { ImageOptimizationService } = await import('../../lib/services/ImageOptimizationService');
      const optimizedUri = await ImageOptimizationService.optimizeEventBanner(imageUri);
      
      // Convert optimized image URI to blob
      const response = await fetch(optimizedUri);
      const blob = await response.blob();
      
      // Create unique filename
      const filename = `events/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const storageRef = ref(storage, filename);
      
      // Upload to Firebase Storage with timeout
      const uploadPromise = uploadBytes(storageRef, blob);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Upload timeout')), 25000)
      );
      
      await Promise.race([uploadPromise, timeoutPromise]);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Upload Failed', `Failed to upload image: ${message}. Please try again.`);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
  };

  // Convert admin's local time to event timezone, then to UTC for storage
  const convertTimeToEventTimezone = (localDate: Date, eventTimezone: string): string => {
    try {
      // First convert from admin's local timezone to the event's timezone
      const adminTimezone = getUserTimezone();
      const eventTimezoneDate = convertTimezone(localDate, adminTimezone, eventTimezone);
      
      // Then convert from event timezone to UTC for storage
      const utcDate = convertTimezone(eventTimezoneDate, eventTimezone, 'UTC');
      
      return utcDate.toISOString();
    } catch (error) {
      console.error('Timezone conversion error:', error);
      // Fallback to direct UTC conversion
      return localDate.toISOString();
    }
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

    if (formData.start_date < formData.starts_at) {
      Alert.alert('Error', 'Real event start time cannot be before access start time');
      return;
    }

    if (!formData.timezone) {
      Alert.alert('Error', 'Please select an event timezone');
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

      // Convert times to event timezone, then to UTC for storage
      const startsAtUTC = convertTimeToEventTimezone(formData.starts_at, formData.timezone);
      const startDateUTC = convertTimeToEventTimezone(formData.start_date, formData.timezone);
      const expiresAtUTC = convertTimeToEventTimezone(formData.expires_at, formData.timezone);

      // Create the event
      await EventAPI.create({
        name: formData.name.trim(),
        description: formData.description.trim(),
        location: formData.location.trim(),
        event_code: formData.event_code.trim(),
        event_link: formData.event_link.trim(),
        starts_at: Timestamp.fromDate(new Date(startsAtUTC)),
        start_date: Timestamp.fromDate(new Date(startDateUTC)),
        expires_at: Timestamp.fromDate(new Date(expiresAtUTC)),
        organizer_email: AuthAPI.getCurrentUser()?.email || '',
        is_active: true, // Set events as active by default
        image_url: imageUrl, // Add image URL if uploaded
        is_private: formData.is_private, // Add is_private field
        timezone: formData.timezone, // Add timezone field
      });

      Alert.alert('Success', 'Event created successfully!', [
        {
          text: 'OK',
          onPress: () => router.back()
        }
      ]);
    } catch {
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

  const handleRealStartDateChange = (event: any, selectedDate?: Date) => {
    setShowRealStartPicker(false);
    if (selectedDate) {
      setFormData(prev => ({ ...prev, start_date: selectedDate }));
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
    helpText: {
      fontSize: 12,
      color: isDark ? '#9ca3af' : '#6b7280',
      marginTop: 4,
      marginBottom: 8,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: isDark ? '#2d2d2d' : 'white',
      borderRadius: 12,
      width: '90%',
      maxHeight: '80%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 5,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#404040' : '#e5e7eb',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: isDark ? '#ffffff' : '#1f2937',
    },
    modalItem: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#404040' : '#e5e7eb',
    },
    modalItemText: {
      fontSize: 16,
      color: isDark ? '#ffffff' : '#1f2937',
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
              This link will be used for the &quot;Join Event&quot; button on the website
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

          {/* Access Start Date/Time */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Access Start Date & Time <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.helpText}>
              When users can start joining the event (early access)
            </Text>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowStartPicker(true)}
            >
              <Calendar size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
              <Text style={styles.dateButtonText}>{formatDate(formData.starts_at)}</Text>
            </TouchableOpacity>
          </View>

          {/* Real Event Start Date/Time */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Real Event Start Date & Time <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.helpText}>
              When the actual event starts (displayed to users)
            </Text>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowRealStartPicker(true)}
            >
              <Calendar size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
              <Text style={styles.dateButtonText}>{formatDate(formData.start_date)}</Text>
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

          {/* Timezone Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Event Timezone</Text>
            <Text style={styles.helpText}>
              Select the timezone where this event will take place
            </Text>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowCountryPicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {selectedCountry || 'Select Country'}
              </Text>
            </TouchableOpacity>
            {selectedCountry && (
              <TouchableOpacity 
                style={[styles.dateButton, { marginTop: 8 }]}
                onPress={() => setShowTimezonePicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  {formData.timezone || 'Select Timezone'}
                </Text>
              </TouchableOpacity>
            )}
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
                Make this event private (won&apos;t be displayed on the IRL page)
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

      {showRealStartPicker && (
        <DateTimePicker
          value={formData.start_date}
          mode="datetime"
          display="default"
          onChange={handleRealStartDateChange}
          minimumDate={formData.starts_at}
        />
      )}

      {/* Country Picker Modal */}
      {showCountryPicker && (
        <Modal
          visible={showCountryPicker}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Country</Text>
                <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                  <X size={24} color={isDark ? '#ffffff' : '#1f2937'} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={getAvailableCountries()}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      setSelectedCountry(item);
                      const primaryTimezone = getPrimaryTimezoneForCountry(item);
                      setFormData(prev => ({ ...prev, timezone: primaryTimezone }));
                      setAvailableTimezones(getTimezonesForCountry(item));
                      setShowCountryPicker(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Timezone Picker Modal */}
      {showTimezonePicker && (
        <Modal
          visible={showTimezonePicker}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Timezone</Text>
                <TouchableOpacity onPress={() => setShowTimezonePicker(false)}>
                  <X size={24} color={isDark ? '#ffffff' : '#1f2937'} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={availableTimezones}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      setFormData(prev => ({ ...prev, timezone: item }));
                      setShowTimezonePicker(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
} 