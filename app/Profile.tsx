import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Switch,
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { User, Settings, LogOut, Edit, Camera, Users, MessageCircle, Flag, AlertTriangle, Shield, Clock, Mail } from 'lucide-react-native';
import { EventProfile, Event, UploadFile } from '../lib/firebaseApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Profile() {
  const [profile, setProfile] = useState<any>(null);
  const [currentEvent, setCurrentEvent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [aboutMe, setAboutMe] = useState(profile?.about_me || '');
  const [editingAboutMe, setEditingAboutMe] = useState(false);
  const [height, setHeight] = useState(profile?.height_cm ? String(profile.height_cm) : '');
  const [editingHeight, setEditingHeight] = useState(false);
  const [interests, setInterests] = useState(profile?.interests || []);
  const [showInterests, setShowInterests] = useState(false);
  const [eventVisible, setEventVisible] = useState(profile?.is_visible ?? true);
  const [saving, setSaving] = useState(false);
  const INTEREST_OPTIONS = [
    'Music', 'Sports', 'Travel', 'Food', 'Art', 'Tech', 'Outdoors', 'Fitness', 'Movies', 'Books', 'Dancing', 'Games', 'Fashion', 'Volunteering', 'Other'
  ];
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportStep, setReportStep] = useState<'select' | 'form'>('select');
  const [selectedUserToReport, setSelectedUserToReport] = useState<any>(null);
  const [reportExplanation, setReportExplanation] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  useEffect(() => {
    initializeSession();
  }, []);

  const initializeSession = async () => {
    const eventId = await AsyncStorage.getItem('currentEventId');
    const sessionId = await AsyncStorage.getItem('currentSessionId');
    
    if (!eventId || !sessionId) {
      router.replace('/home');
      return;
    }
    
    try {
      const events = await Event.filter({ id: eventId });
      if (events.length > 0) {
        setCurrentEvent(events[0]);
      } else {
        router.replace('/home');
        return;
      }

      const profiles = await EventProfile.filter({ 
        session_id: sessionId,
        event_id: eventId 
      });
      
      if (profiles.length > 0) {
        setProfile(profiles[0]);
      } else {
        router.replace('/home');
        return;
      }
    } catch (error) {
      console.error("Error initializing session:", error);
      router.replace('/home');
    }
    setIsLoading(false);
  };

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
        
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          Alert.alert("File Too Large", "Image must be smaller than 5MB.");
          return;
        }

        setIsUploadingPhoto(true);
        try {
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          const file = new File([blob], 'profile-photo.jpg', { type: 'image/jpeg' });
          
          const { file_url } = await UploadFile(file);
          
          // Update profile with new photo
          await EventProfile.update(profile.id, { profile_photo_url: file_url });
          setProfile((prev: any) => ({ ...prev, profile_photo_url: file_url }));
          await AsyncStorage.setItem('currentProfilePhotoUrl', file_url);
          
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

  const loadAllUsers = async () => {
    try {
      const eventId = await AsyncStorage.getItem('currentEventId');
      const sessionId = await AsyncStorage.getItem('currentSessionId');
      if (!eventId || !sessionId) return;

      const allVisibleProfiles = await EventProfile.filter({ 
        event_id: eventId,
        is_visible: true 
      });
      
      // Filter out current user
      const otherUsers = allVisibleProfiles.filter(p => p.session_id !== sessionId);
      setAllUsers(otherUsers);
    } catch (error) {
      console.error("Error loading users for report:", error);
    }
  };

  const handleReportUser = () => {
    setShowReportModal(true);
    setReportStep('select');
    setSelectedUserToReport(null);
    setReportExplanation('');
    loadAllUsers();
  };

  const handleSelectUserToReport = (user: any) => {
    setSelectedUserToReport(user);
    setReportStep('form');
  };

  const handleSubmitReport = async () => {
    if (!selectedUserToReport || !reportExplanation.trim()) {
      Alert.alert("Missing Information", "Please provide a report explanation.");
      return;
    }

    setSubmittingReport(true);
    try {
      // In a real app, you would create a Report entity in Firestore
      // For now, we'll just show a success message
      Alert.alert(
        "Report Submitted",
        `Thank you for your report. We will review the information about ${selectedUserToReport.first_name}.`,
        [
          {
            text: "OK",
            onPress: () => {
              setShowReportModal(false);
              setReportStep('select');
              setSelectedUserToReport(null);
              setReportExplanation('');
            }
          }
        ]
      );
    } catch (error) {
      console.error("Error submitting report:", error);
      Alert.alert("Error", "Failed to submit report. Please try again.");
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Leave Event & Delete Profile",
      "Are you sure you want to leave this event and delete your profile? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Leave Event",
          style: "destructive",
          onPress: async () => {
            try {
              // Delete profile from backend
              if (profile?.id) {
                await EventProfile.delete(profile.id);
              }
              
              // Clear all session data
            await AsyncStorage.multiRemove([
              'currentEventId',
              'currentSessionId',
              'currentEventCode',
              'currentProfileColor',
              'currentProfilePhotoUrl'
            ]);
              
            router.replace('/home');
            } catch (error) {
              console.error("Error deleting profile:", error);
              Alert.alert("Error", "Failed to delete profile. Please try again.");
            }
          }
        }
      ]
    );
  };

  const handleSaveAboutMe = async () => {
    setSaving(true);
    await EventProfile.update(profile.id, { about_me: aboutMe });
    setProfile((prev: any) => ({ ...prev, about_me: aboutMe }));
    setEditingAboutMe(false);
    setSaving(false);
  };
  const handleSaveHeight = async () => {
    setSaving(true);
    await EventProfile.update(profile.id, { height_cm: parseInt(height) });
    setProfile((prev: any) => ({ ...prev, height_cm: parseInt(height) }));
    setEditingHeight(false);
    setSaving(false);
  };
  const handleToggleInterest = (interest: string) => {
    let newInterests = [...interests];
    if (newInterests.includes(interest)) {
      newInterests = newInterests.filter(i => i !== interest);
    } else if (newInterests.length < 3) {
      newInterests.push(interest);
    }
    setInterests(newInterests);
  };
  const handleSaveInterests = async () => {
    setSaving(true);
    await EventProfile.update(profile.id, { interests });
    setProfile((prev: any) => ({ ...prev, interests }));
    setShowInterests(false);
    setSaving(false);
  };
  const handleToggleVisibility = async (value: boolean) => {
    setEventVisible(value);
    await EventProfile.update(profile.id, { is_visible: value });
    setProfile((prev: any) => ({ ...prev, is_visible: value }));
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Your Profile</Text>
        <TouchableOpacity style={styles.settingsButton}>
          <Settings size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Photo Section */}
        <View style={styles.photoSection}>
          <View style={styles.photoContainer}>
            {profile.profile_photo_url ? (
              <Image
                source={{ uri: profile.profile_photo_url }}
                style={styles.profilePhoto}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.fallbackAvatar, { backgroundColor: profile.profile_color || '#cccccc' }]}>
                <Text style={styles.fallbackText}>{profile.first_name[0]}</Text>
              </View>
            )}
            
            <TouchableOpacity
              style={styles.photoEditButton}
              onPress={handlePhotoUpload}
              disabled={isUploadingPhoto}
            >
              <Camera size={16} color="white" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.name}>{profile.first_name}</Text>
          <Text style={styles.age}>{profile.age} years old</Text>
        </View>

        {/* Profile Details */}
        <View style={styles.detailsSection}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Gender</Text>
            <Text style={styles.detailValue}>
              {profile.gender_identity === 'man' ? 'Man' : 'Woman'}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Interested in</Text>
            <Text style={styles.detailValue}>
              {profile.interested_in === 'men' ? 'Men' : 
               profile.interested_in === 'women' ? 'Women' : 'Everyone'}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Event</Text>
            <Text style={styles.detailValue}>{currentEvent?.name}</Text>
          </View>
        </View>

        {/* Event Visibility Toggle */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <User size={20} color={eventVisible ? '#22c55e' : '#9ca3af'} />
            <Text style={{ fontWeight: 'bold', fontSize: 16, marginLeft: 8 }}>Event Visibility</Text>
            <View style={{ flex: 1 }} />
            <Switch value={eventVisible} onValueChange={handleToggleVisibility} />
          </View>
          <Text style={{ color: '#6b7280' }}>
            {eventVisible ? 'Your profile is visible to others at the current event.' : 'Your profile is hidden from others at the current event.'}
          </Text>
        </View>
        {/* About Me */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontWeight: 'bold', fontSize: 16 }}>About Me</Text>
            <TouchableOpacity onPress={() => setEditingAboutMe(true)}>
              <Edit size={18} color="#6b7280" />
            </TouchableOpacity>
          </View>
          {editingAboutMe ? (
            <View>
              <TextInput
                style={styles.input}
                value={aboutMe}
                onChangeText={setAboutMe}
                placeholder="No bio yet. Add one!"
                multiline
              />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                <TouchableOpacity onPress={handleSaveAboutMe} disabled={saving} style={styles.saveButton}><Text style={styles.saveButtonText}>Save</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => { setEditingAboutMe(false); setAboutMe(profile.about_me || ''); }} style={styles.cancelButton}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
              </View>
            </View>
          ) : (
            <Text style={{ color: '#6b7280', marginTop: 4 }}>{profile.about_me || 'No bio yet. Add one!'}</Text>
          )}
        </View>
        {/* Interests */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontWeight: 'bold', fontSize: 16 }}>Interests</Text>
            <TouchableOpacity onPress={() => setShowInterests(true)}>
              <Edit size={18} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
            {(profile.interests && profile.interests.length > 0) ? profile.interests.map((i: string) => (
              <View key={i} style={styles.interestChip}><Text style={styles.interestChipText}>{i}</Text></View>
            )) : <Text style={{ color: '#6b7280' }}>No interests added yet.</Text>}
          </View>
        </View>
        <Modal visible={showInterests} transparent animationType="slide" onRequestClose={() => setShowInterests(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Select up to 3 interests</Text>
              <FlatList
                data={INTEREST_OPTIONS}
                numColumns={3}
                keyExtractor={item => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.interestOption, interests.includes(item) && styles.interestOptionSelected]}
                    onPress={() => handleToggleInterest(item)}
                    disabled={!interests.includes(item) && interests.length >= 3}
                  >
                    <Text style={{ color: interests.includes(item) ? 'white' : '#374151' }}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
                <TouchableOpacity onPress={handleSaveInterests} disabled={saving} style={styles.saveButton}><Text style={styles.saveButtonText}>Save</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => { setShowInterests(false); setInterests(profile.interests || []); }} style={styles.cancelButton}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        {/* Height */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontWeight: 'bold', fontSize: 16 }}>Height</Text>
            <TouchableOpacity onPress={() => setEditingHeight(true)}>
              <Edit size={18} color="#6b7280" />
            </TouchableOpacity>
          </View>
          {editingHeight ? (
            <View>
              <TextInput
                style={styles.input}
                value={height}
                onChangeText={setHeight}
                placeholder="Not specified"
                keyboardType="numeric"
                maxLength={3}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                <TouchableOpacity onPress={handleSaveHeight} disabled={saving} style={styles.saveButton}><Text style={styles.saveButtonText}>Save</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => { setEditingHeight(false); setHeight(profile.height_cm ? String(profile.height_cm) : ''); }} style={styles.cancelButton}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
              </View>
            </View>
          ) : (
            <Text style={{ color: '#6b7280', marginTop: 4 }}>{profile.height_cm ? `${profile.height_cm} cm` : 'Not specified'}</Text>
          )}
        </View>
        {/* Report User Button */}
        <View style={styles.card}>
          <TouchableOpacity style={styles.reportButton} onPress={handleReportUser}>
            <Flag size={20} color="#ef4444" />
            <Text style={styles.reportButtonText}>Report a User</Text>
          </TouchableOpacity>
        </View>

        {/* Info Cards */}
        <View style={styles.card}>
          <View style={styles.infoCardHeader}>
            <Clock size={20} color="#8b5cf6" />
            <Text style={styles.infoCardTitle}>Automatic Data Expiration</Text>
          </View>
          <Text style={styles.infoCardText}>
            Your profile, matches, and chat messages will be automatically deleted when this event ends. No data is stored permanently.
          </Text>
          <View style={styles.infoCardBullets}>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Profile expires automatically</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Messages deleted at midnight</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>No permanent account created</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.infoCardHeader}>
            <Mail size={20} color="#8b5cf6" />
            <Text style={styles.infoCardTitle}>Email Data Usage</Text>
          </View>
          <Text style={styles.infoCardText}>
            Your email address is only used for post-event feedback surveys and is never visible to other users at this event.
          </Text>
          <View style={styles.infoCardBullets}>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Only used for feedback requests</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Never shared with other users</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Not used for marketing purposes</Text>
            </View>
          </View>
        </View>
        {/* Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.actionButton}>
            <Edit size={20} color="#6b7280" />
            <Text style={styles.actionText}>Edit Profile</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.logoutButton]}
            onPress={handleLogout}
          >
            <LogOut size={20} color="#ef4444" />
            <Text style={[styles.actionText, styles.logoutText]}>Leave Event & Delete Profile</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Report User Modal */}
      <Modal visible={showReportModal} transparent animationType="slide" onRequestClose={() => setShowReportModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {reportStep === 'select' ? (
              <>
                <Text style={styles.modalTitle}>Select User to Report</Text>
                <FlatList
                  data={allUsers}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.userListItem}
                      onPress={() => handleSelectUserToReport(item)}
                    >
                      <View style={styles.userListPhoto}>
                        {item.profile_photo_url ? (
                          <Image source={{ uri: item.profile_photo_url }} style={styles.userListPhotoImage} />
                        ) : (
                          <View style={[styles.userListPhotoFallback, { backgroundColor: item.profile_color || '#cccccc' }]}>
                            <Text style={styles.userListPhotoFallbackText}>{item.first_name[0]}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.userListInfo}>
                        <Text style={styles.userListName}>{item.first_name}</Text>
                        <Text style={styles.userListAge}>{item.age} years old</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                />
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowReportModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>Report {selectedUserToReport?.first_name}</Text>
                <View style={styles.reportUserInfo}>
                  <View style={styles.userListPhoto}>
                    {selectedUserToReport?.profile_photo_url ? (
                      <Image source={{ uri: selectedUserToReport.profile_photo_url }} style={styles.userListPhotoImage} />
                    ) : (
                      <View style={[styles.userListPhotoFallback, { backgroundColor: selectedUserToReport?.profile_color || '#cccccc' }]}>
                        <Text style={styles.userListPhotoFallbackText}>{selectedUserToReport?.first_name[0]}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.userListInfo}>
                    <Text style={styles.userListName}>{selectedUserToReport?.first_name}</Text>
                    <Text style={styles.userListAge}>{selectedUserToReport?.age} years old</Text>
                  </View>
                </View>
                <TextInput
                  style={[styles.input, { minHeight: 120 }]}
                  value={reportExplanation}
                  onChangeText={setReportExplanation}
                  placeholder="Please explain why you are reporting this user..."
                  multiline
                  textAlignVertical="top"
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.submitButton}
                    onPress={handleSubmitReport}
                    disabled={submittingReport}
                  >
                    <Text style={styles.submitButtonText}>
                      {submittingReport ? 'Submitting...' : 'Submit Report'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setReportStep('select');
                      setSelectedUserToReport(null);
                      setReportExplanation('');
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity
          style={[styles.navButton, styles.navButtonActive]}
          onPress={() => {}} // Already on profile page
        >
          <User size={24} color="#8b5cf6" />
          <Text style={[styles.navButtonText, styles.navButtonTextActive]}>Profile</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push('/discovery')}
        >
          <Users size={24} color="#9ca3af" />
          <Text style={styles.navButtonText}>Discover</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push('/matches')}
        >
          <MessageCircle size={24} color="#9ca3af" />
          <Text style={styles.navButtonText}>Matches</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  photoContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#e5e7eb',
  },
  fallbackAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
  },
  photoEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  age: {
    fontSize: 16,
    color: '#6b7280',
  },
  detailsSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailLabel: {
    fontSize: 16,
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  actionsSection: {
    gap: 12,
    marginBottom: 32,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionText: {
    fontSize: 16,
    color: '#6b7280',
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  logoutText: {
    color: '#dc2626',
  },
  bottomNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  navButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  navButtonText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  navButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#8b5cf6',
  },
  navButtonTextActive: {
    color: '#8b5cf6',
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#374151',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginLeft: 10,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: 'bold',
  },
  interestChip: {
    backgroundColor: '#e0e7ff',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  interestChipText: {
    color: '#4f46e5',
    fontSize: 14,
    fontWeight: 'bold',
  },
  interestOption: {
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    margin: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  interestOptionSelected: {
    backgroundColor: '#8b5cf6',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  reportButtonText: {
    fontSize: 16,
    color: '#dc2626',
    fontWeight: '600',
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 8,
  },
  infoCardText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  infoCardBullets: {
    gap: 8,
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bullet: {
    fontSize: 14,
    color: '#8b5cf6',
    marginRight: 8,
    marginTop: 2,
  },
  bulletText: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  userListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  userListPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 12,
  },
  userListPhotoImage: {
    width: '100%',
    height: '100%',
  },
  userListPhotoFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userListPhotoFallbackText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  userListInfo: {
    flex: 1,
  },
  userListName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  userListAge: {
    fontSize: 14,
    color: '#6b7280',
  },
  reportUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  submitButton: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 