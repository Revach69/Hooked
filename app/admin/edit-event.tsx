import React, { useState, useEffect, useCallback } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import { 
  ArrowLeft, 
  Calendar,
  Hash,
  Camera,
  X
} from 'lucide-react-native';
import { EventAPI } from '../../lib/firebaseApi';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { storage } from '../../lib/firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  getAvailableCountries, 
  getPrimaryTimezoneForCountry, 
  getTimezonesForCountry,
  getUserTimezone 
} from '../../lib/timezoneUtils';

export default function EditEvent() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    event_code: '',
    event_link: '',
    starts_at: new Date(),
    start_date: new Date(), // Real event start time
    expires_at: new Date(),
    is_private: false,
    timezone: getUserTimezone(), // Default to user's timezone
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showRealStartPicker, setShowRealStartPicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showTimezonePicker, setShowTimezonePicker] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [availableTimezones, setAvailableTimezones] = useState<string[]>([]);

  const loadEvent = useCallback(async () => {
    try {
      const eventData = await EventAPI.get(eventId);
      if (!eventData) {
        Alert.alert('Error', 'Event not found');
        router.back();
        return;
      }

      setFormData({
        name: eventData.name || '',
        description: eventData.description || '',
        location: eventData.location || '',
        event_code: eventData.event_code || '',
        event_link: eventData.event_link || '',
        starts_at: new Date(eventData.starts_at),
        start_date: eventData.start_date ? new Date(eventData.start_date) : new Date(eventData.starts_at),
        expires_at: new Date(eventData.expires_at),
        is_private: eventData.is_private || false,
        timezone: eventData.timezone || getUserTimezone(),
      });

      // Load existing image if available
      if (eventData.image_url) {
        setExistingImageUrl(eventData.image_url);
      }
    } catch {
      Alert.alert('Error', 'Failed to load event');
      router.back();
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (eventId) {
      loadEvent();
    }
  }, [eventId, loadEvent]);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
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
      
      // Convert image URI to blob
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      // Create unique filename
      const filename = `events/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const storageRef = ref(storage, filename);
      
      // Upload to Firebase Storage using Firebase v9+ API
      await uploadBytes(storageRef, blob);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch {
      Alert.alert('Error', 'Failed to upload image. Please try again.');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setExistingImageUrl(null);
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

    try {
      setIsSaving(true);
      
      // Check if event code already exists (excluding current event)
      const existingEvents = await EventAPI.filter({ event_code: formData.event_code });
      const otherEventsWithSameCode = existingEvents.filter((event: any) => event.id !== eventId);
      if (otherEventsWithSameCode.length > 0) {
        Alert.alert('Error', 'Event code already exists. Please generate a new one.');
        return;
      }

      // Handle image upload if new image selected
      let imageUrl: string | undefined = undefined;
      if (selectedImage) {
        const uploadedUrl = await uploadImage(selectedImage);
        if (!uploadedUrl) {
          Alert.alert('Error', 'Failed to upload image. Please try again.');
          return;
        }
        imageUrl = uploadedUrl;
      } else if (existingImageUrl) {
        // Keep existing image if no new image selected
        imageUrl = existingImageUrl;
      }

      // Update the event
      await EventAPI.update(eventId, {
        name: formData.name.trim(),
        description: formData.description.trim(),
        location: formData.location.trim(),
        event_code: formData.event_code.trim(),
        event_link: formData.event_link.trim(),
        starts_at: formData.starts_at.toISOString(),
        start_date: formData.start_date.toISOString(), // Update start_date
        expires_at: formData.expires_at.toISOString(),
        image_url: imageUrl, // Add image URL if uploaded or existing
        is_private: formData.is_private,
        timezone: formData.timezone, // Add timezone field
      });

      Alert.alert('Success', 'Event updated successfully!', [
        {
          text: 'OK',
          onPress: () => router.back()
        }
      ]);
    } catch {
      Alert.alert('Error', 'Failed to update event. Please try again.');
    } finally {
      setIsSaving(false);
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
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: isDark ? '#9ca3af' : '#6b7280',
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
      width: 24,
      height: 24,
      borderRadius: 6,
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
      fontSize: 16,
      fontWeight: 'bold',
    },
    checkboxLabel: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
      flex: 1,
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

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading event...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
          disabled={isSaving}
        >
          <ArrowLeft size={20} color={isDark ? '#ffffff' : '#1f2937'} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Event</Text>
        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
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
            {selectedImage || existingImageUrl ? (
              <View style={styles.imageContainer}>
                <Image 
                  source={{ uri: selectedImage || existingImageUrl || '' }} 
                  style={styles.selectedImage} 
                />
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
            <View style={styles.eventCodeDisplay}>
              <Hash size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
              <TextInput
                style={styles.eventCodeText}
                value={formData.event_code}
                onChangeText={(text) => setFormData(prev => ({ ...prev, event_code: text.toUpperCase() }))}
                placeholder="Enter event code"
                placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                autoCapitalize="characters"
                maxLength={6}
              />
            </View>
          </View>

          {/* Access Start Date/Time */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Access Start Date & Time <Text style={styles.required}>*</Text>
            </Text>
            <Text style={[styles.label, { fontSize: 12, color: isDark ? '#9ca3af' : '#6b7280', marginTop: 4 }]}>
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
            <Text style={[styles.label, { fontSize: 12, color: isDark ? '#9ca3af' : '#6b7280', marginTop: 4 }]}>
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
            <Text style={[styles.label, { fontSize: 12, color: isDark ? '#9ca3af' : '#6b7280', marginTop: 4 }]}>
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