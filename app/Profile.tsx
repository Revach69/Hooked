import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { User, EventProfile } from '../lib/api/entities';
import { UploadFile } from '../lib/api/integrations';

const ALL_INTERESTS = [
  'music', 'tech', 'food', 'books', 'travel', 'art', 'fitness', 'nature',
  'movies', 'business', 'photography', 'dancing', 'yoga', 'gaming', 'comedy',
  'startups', 'fashion', 'spirituality', 'volunteering', 'crypto', 'cocktails',
  'politics', 'hiking', 'design', 'podcasts', 'pets', 'wellness'
];

export default function ProfileScreen() {
  console.log('Rendering ProfileScreen'); // Debugging line to check if the component is rendering
  const navigation = useNavigation();
  const [user, setUser] = useState<any>(null);
  const [eventProfile, setEventProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState<{ bio: boolean; interests: boolean; height: boolean }>({
    bio: false,
    interests: false,
    height: false,
  });
  const [formData, setFormData] = useState<{ bio: string; interests: string[]; height: string }>(
    { bio: '', interests: [], height: '' },
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const currentUser = await User.me();
      if (!currentUser) {
        navigation.navigate('Home' as never);
        return;
      }
      setUser(currentUser);
      setFormData({
        bio: currentUser.bio || '',
        interests: currentUser.interests || [],
        height: currentUser.height || ''
      });
      const eventId = await AsyncStorage.getItem('currentEventId');
      const sessionId = await AsyncStorage.getItem('currentSessionId');
      if (eventId && sessionId) {
        const profiles = await EventProfile.filter({ event_id: eventId, session_id: sessionId });
        if (profiles.length > 0) setEventProfile(profiles[0]);
      }
    } catch (e) {
      console.log('Error loading profile data', e);
    }
    setIsLoading(false);
  }, [navigation]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEditToggle = (field: 'bio' | 'interests' | 'height') =>
    setIsEditing(prev => ({ ...prev, [field]: !prev[field] }));

  const handleInterestToggle = (interest: string) => {
    setFormData(prev => {
      const exists = prev.interests.includes(interest);
      let newInterests = exists ? prev.interests.filter(i => i !== interest) : [...prev.interests, interest];
      if (newInterests.length > 3) {
        Alert.alert('Limit reached', 'You can select up to 3 interests.');
        return prev;
      }
      return { ...prev, interests: newInterests };
    });
  };

  const handleSave = async (field: 'bio' | 'interests' | 'height') => {
    try {
      await User.updateMe({ [field]: formData[field] });
      handleEditToggle(field);
      await loadData();
    } catch (e) {
      console.log('Error updating', field, e);
      Alert.alert('Error', 'Failed to update profile.');
    }
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
      setIsUploading(true);
      try {
        const { file_url } = await UploadFile({
          file: { uri: asset.uri, name: asset.fileName || 'photo.jpg', type: asset.mimeType || 'image/jpeg' }
        });
        await User.updateMe({ profile_photo_url: file_url });
        await loadData();
      } catch (e) {
        console.log('Error uploading photo', e);
        Alert.alert('Error', 'Failed to upload photo.');
      }
      setIsUploading(false);
    }
  };

  const toggleVisibility = async () => {
    if (!eventProfile) return;
    try {
      const newVisibility = !eventProfile.is_visible;
      await EventProfile.update(eventProfile.id, { is_visible: newVisibility });
      setEventProfile((prev: typeof formData) => ({ ...prev, is_visible: newVisibility }));
    } catch (e) {
      console.log('Error updating visibility', e);
      Alert.alert('Error', 'Failed to update visibility.');
    }
  };

  const leaveEvent = async () => {
    if (!eventProfile) return;
    Alert.alert('Leave Event', 'This will delete your profile for this event. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: async () => {
        try {
          await EventProfile.delete(eventProfile.id);
          await AsyncStorage.multiRemove([
            'currentEventId',
            'currentSessionId',
            'currentEventCode',
            'currentProfileColor',
            'currentProfilePhotoUrl'
          ]);
          navigation.navigate('Home' as never);
        } catch (e) {
          console.log('Error leaving event', e);
          Alert.alert('Error', 'Failed to leave event.');
        }
      }}
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.loader}> <ActivityIndicator size="large" color="#8b5cf6" /> </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={pickImage} style={styles.photoWrapper}>
          {user?.profile_photo_url ? (
            <Image source={{ uri: user.profile_photo_url }} style={styles.photo} />
          ) : (
            <View style={[styles.photoPlaceholder, { backgroundColor: user?.profile_color || '#ccc' }]}> 
              <Text style={{ color: '#fff', fontSize: 32 }}>{user?.full_name ? user.full_name[0] : '?'}</Text>
            </View>
          )}
          {isUploading && <View style={styles.uploadOverlay}><ActivityIndicator color="#fff" /></View>}
        </TouchableOpacity>
        <Text style={styles.name}>{user?.full_name}</Text>
        {user?.age && <Text style={styles.age}>{user.age} years old</Text>}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>About Me</Text>
          <TouchableOpacity onPress={() => handleEditToggle('bio')}><Text style={styles.edit}>{isEditing.bio ? 'Cancel' : 'Edit'}</Text></TouchableOpacity>
        </View>
        {isEditing.bio ? (
          <View>
            <TextInput
              style={styles.input}
              value={formData.bio}
              onChangeText={t => setFormData(prev => ({ ...prev, bio: t }))}
              placeholder="Tell us about yourself"
              multiline
            />
            <TouchableOpacity style={styles.saveButton} onPress={() => handleSave('bio')}><Text style={styles.saveText}>Save Bio</Text></TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.text}>{user?.bio || 'No bio yet.'}</Text>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Interests</Text>
          <TouchableOpacity onPress={() => handleEditToggle('interests')}><Text style={styles.edit}>{isEditing.interests ? 'Cancel' : 'Edit'}</Text></TouchableOpacity>
        </View>
        {isEditing.interests ? (
          <View>
            <View style={styles.chips}> 
              {ALL_INTERESTS.map(i => (
                <TouchableOpacity
                  key={i}
                  style={[styles.chip, formData.interests.includes(i) && styles.chipSelected]}
                  onPress={() => handleInterestToggle(i)}
                >
                  <Text style={[styles.chipText, formData.interests.includes(i) && { color: '#fff' }]}>{i}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.helper}>{formData.interests.length} / 3 selected</Text>
            <TouchableOpacity style={styles.saveButton} onPress={() => handleSave('interests')}><Text style={styles.saveText}>Save Interests</Text></TouchableOpacity>
          </View>
        ) : (
          <View style={styles.chips}> 
            {user?.interests?.length ? (
              user.interests.map((i: string) => (
                <View key={i} style={[styles.chip, styles.chipSelected]}><Text style={[styles.chipText, { color: '#fff' }]}>{i}</Text></View>
              ))
            ) : (
              <Text style={styles.text}>No interests added.</Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Height</Text>
          <TouchableOpacity onPress={() => handleEditToggle('height')}><Text style={styles.edit}>{isEditing.height ? 'Cancel' : 'Edit'}</Text></TouchableOpacity>
        </View>
        {isEditing.height ? (
          <View>
            <TextInput
              style={styles.input}
              value={formData.height}
              onChangeText={t => setFormData(prev => ({ ...prev, height: t }))}
              placeholder="Height in cm"
              keyboardType="numeric"
            />
            <TouchableOpacity style={styles.saveButton} onPress={() => handleSave('height')}><Text style={styles.saveText}>Save Height</Text></TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.text}>{user?.height ? `${user.height} cm` : 'Not specified'}</Text>
        )}
      </View>

      {eventProfile && (
        <View>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Event Visibility</Text>
              <TouchableOpacity onPress={toggleVisibility} style={[styles.visibilityToggle, eventProfile.is_visible && styles.visibilityOn]}>
                <Text style={{ color: '#fff' }}>{eventProfile.is_visible ? 'Visible' : 'Hidden'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.text}>{eventProfile.is_visible ? 'Your profile is visible to others.' : 'You are hidden from other attendees.'}</Text>
          </View>

          <View style={[styles.section, { borderColor: '#fca5a5' }]}> 
            <Text style={[styles.sectionTitle, { color: '#dc2626', marginBottom: 8 }]}>Leave Event</Text>
            <TouchableOpacity style={styles.leaveButton} onPress={leaveEvent}><Text style={styles.leaveText}>Leave Event & Delete Profile</Text></TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#f5f8ff' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f8ff' },
  header: { alignItems: 'center', marginBottom: 24 },
  photoWrapper: { position: 'relative', marginBottom: 12 },
  photo: { width: 96, height: 96, borderRadius: 48 },
  uploadOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', borderRadius: 48 },
  photoPlaceholder: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 20, fontWeight: 'bold', color: '#111' },
  age: { color: '#6b7280' },
  section: { backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontWeight: '600', color: '#111', fontSize: 16 },
  edit: { color: '#8b5cf6' },
  text: { color: '#111' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 8, backgroundColor: '#fff', color: '#111', marginBottom: 8 },
  saveButton: { backgroundColor: '#8b5cf6', padding: 10, alignItems: 'center', borderRadius: 8 },
  saveText: { color: '#fff', fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  chip: { borderWidth: 1, borderColor: '#d1d5db', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 16, margin: 2 },
  chipSelected: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },
  chipText: { color: '#111', fontSize: 12 },
  helper: { fontSize: 12, color: '#6b7280', marginBottom: 8 },
  visibilityToggle: { padding: 8, borderRadius: 8, backgroundColor: '#6b7280' },
  visibilityOn: { backgroundColor: '#10b981' },
  leaveButton: { backgroundColor: '#dc2626', padding: 12, alignItems: 'center', borderRadius: 8 },
  leaveText: { color: '#fff', fontWeight: '600' }
});
