import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ScrollView, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Event, EventProfile, User } from '../lib/api/entities';
import { UploadFile } from '../lib/api/integrations';
import { Heart, Instagram, Facebook } from 'lucide-react-native';

const COLORS = [
  '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57',
  '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43'
];

export default function ConsentScreen() {
  const navigation = useNavigation();
  const [currentEvent, setCurrentEvent] = useState<any>(null);
  const [profilePhoto, setProfilePhoto] = useState<any>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    email: '',
    age: '',
    gender_identity: '',
    interested_in: '',
    interests: [],
    consent: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadEventAndUser();
  }, []);

  const loadEventAndUser = async () => {
    const eventId = await AsyncStorage.getItem('currentEventId');
    if (!eventId) {
      navigation.navigate('Home' as never);
      return;
    }
    try {
      const [events, currentUser] = await Promise.all([
        Event.filter({ id: eventId }),
        User.me().catch(() => null),
      ]);
      if (events.length > 0) {
        setCurrentEvent(events[0]);
      } else {
        navigation.navigate('Home' as never);
        return;
      }
      if (currentUser) {
        setFormData(prev => ({
          ...prev,
          first_name: currentUser.full_name || '',
          email: currentUser.email || '',
          age: currentUser.age?.toString() || '',
          gender_identity: currentUser.gender_identity || '',
          interested_in: currentUser.interested_in || '',
          interests: currentUser.interests || [],
        }));
        if (currentUser.profile_photo_url) {
          setProfilePhotoPreview(currentUser.profile_photo_url);
        }
      }
    } catch (e) {
      console.log('Error loading data', e);
      navigation.navigate('Home' as never);
    }
    setIsLoading(false);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Camera roll permissions are required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setProfilePhoto(asset);
      setProfilePhotoPreview(asset.uri);
    }
  };

  const handleSubmit = async () => {
    if (!formData.consent) {
      Alert.alert('Consent required', 'You must consent to join.');
      return;
    }
    const missing: string[] = [];
    if (!profilePhotoPreview) missing.push('Profile Photo');
    if (!formData.first_name) missing.push('First Name');
    if (!formData.age) missing.push('Age');
    if (!formData.gender_identity) missing.push('Gender Identity');
    if (!formData.interested_in) missing.push('Interested In');

    if (missing.length > 0) {
      Alert.alert('Missing fields', `Please complete: ${missing.join(', ')}`);
      return;
    }

    setIsSubmitting(true);
    let uploadedPhotoUrl = profilePhotoPreview;
    try {
      if (profilePhoto && profilePhoto.uri) {
        const { file_url } = await UploadFile({
          file: {
            uri: profilePhoto.uri,
            name: profilePhoto.fileName || 'photo.jpg',
            type: profilePhoto.mimeType || 'image/jpeg',
          },
        });
        uploadedPhotoUrl = file_url;
      }
      const profileColor = COLORS[Math.floor(Math.random() * COLORS.length)];
      await User.updateMe({
        full_name: formData.first_name,
        email: formData.email,
        age: parseInt(formData.age, 10),
        gender_identity: formData.gender_identity,
        interested_in: formData.interested_in,
        interests: formData.interests || [],
        profile_photo_url: uploadedPhotoUrl,
        profile_color: profileColor,
      });
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await EventProfile.create({
        event_id: currentEvent.id,
        session_id: sessionId,
        profile_photo_url: uploadedPhotoUrl,
        first_name: formData.first_name,
        email: formData.email,
        age: parseInt(formData.age, 10),
        gender_identity: formData.gender_identity,
        interested_in: formData.interested_in,
        interests: formData.interests || [],
        profile_color: profileColor,
      });
      await AsyncStorage.multiSet([
        ['currentSessionId', sessionId],
        ['currentProfileColor', profileColor],
        ['currentProfilePhotoUrl', uploadedPhotoUrl || ''],
      ]);
      Alert.alert('Profile saved', 'Taking you to the event...');
      navigation.navigate('Discovery' as never);
    } catch (e) {
      console.log('Error creating profile', e);
      Alert.alert('Error', 'Error creating profile. Please try again.');
    }
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerCard}>
        <View style={styles.headerIcon}>
          <Heart size={32} color="#fff" />
        </View>
        <Text style={styles.headerTitle}>{currentEvent?.name}</Text>
        <Text style={styles.headerSubtitle}>{currentEvent?.location}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Create Your Event Profile</Text>
        <Text style={styles.cardSubtitle}>This information will only be visible to other singles at this event</Text>

        <TouchableOpacity style={styles.socialButton} onPress={() => Alert.alert('Coming soon')}> 
          <Instagram size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.socialButtonText}>Continue with Instagram</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.socialButton, { backgroundColor: '#1877F2', marginTop: 8 }]} onPress={() => Alert.alert('Coming soon')}> 
          <Facebook size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.socialButtonText}>Continue with Facebook</Text>
        </TouchableOpacity>

        <View style={styles.dividerContainer}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>Or</Text>
          <View style={styles.divider} />
        </View>

        <TouchableOpacity onPress={pickImage} style={styles.photoPicker}>
          {profilePhotoPreview ? (
            <Image source={{ uri: profilePhotoPreview }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={{ color: '#6b7280' }}>Add Photo*</Text>
            </View>
          )}
        </TouchableOpacity>
        {!profilePhotoPreview && <Text style={styles.errorText}>Profile photo is required.</Text>}

        <TextInput
          style={styles.input}
          placeholder="First Name*"
          value={formData.first_name}
          onChangeText={(t) => setFormData(prev => ({ ...prev, first_name: t }))}
        />
        <TextInput
          style={styles.input}
          placeholder="Age*"
          value={formData.age}
          keyboardType="numeric"
          onChangeText={(t) => setFormData(prev => ({ ...prev, age: t }))}
        />
        <TextInput
          style={styles.input}
          placeholder="Gender Identity*"
          value={formData.gender_identity}
          onChangeText={(t) => setFormData(prev => ({ ...prev, gender_identity: t }))}
        />
        <TextInput
          style={styles.input}
          placeholder="Interested In*"
          value={formData.interested_in}
          onChangeText={(t) => setFormData(prev => ({ ...prev, interested_in: t }))}
        />

        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => setFormData(prev => ({ ...prev, consent: !prev.consent }))}
        >
          <View style={[styles.checkbox, formData.consent && styles.checkboxChecked]} />
          <Text style={styles.checkboxLabel}>I agree to appear to other singles who opted in at this event*</Text>
        </TouchableOpacity>
        <Text style={styles.checkboxDesc}>Your profile will automatically be deleted when this event ends. Your email will only be used for feedback requests after the event and will not be visible to other users.</Text>

        <TouchableOpacity
          style={[styles.submitButton, (isSubmitting) && { opacity: 0.6 }]}
          disabled={isSubmitting}
          onPress={handleSubmit}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Join the Singles List</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f8ff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f8ff',
  },
  headerCard: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#ec4899',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111',
  },
  headerSubtitle: {
    color: '#6b7280',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 4,
  },
  cardSubtitle: {
    color: '#6b7280',
    marginBottom: 12,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E1306C',
    padding: 12,
    borderRadius: 8,
  },
  socialButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#d1d5db',
  },
  dividerText: {
    marginHorizontal: 8,
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '600',
  },
  photoPicker: {
    alignSelf: 'center',
    marginBottom: 12,
  },
  photo: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  photoPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
    color: '#111',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#000',
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: '#000',
  },
  checkboxLabel: {
    flex: 1,
    color: '#111',
  },
  checkboxDesc: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: '#a855f7',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
