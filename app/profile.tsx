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
  useColorScheme,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { User, LogOut, Edit, Camera, Users, MessageCircle, Flag, AlertTriangle, Shield, Clock, Mail, AlertCircle } from 'lucide-react-native';
import { EventProfile, Event, User as UserAPI } from '../lib/firebaseApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LikeAPI, MessageAPI } from '../lib/firebaseApi';

export default function Profile() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
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
  const [showExtendedInterests, setShowExtendedInterests] = useState(false);
  const [eventVisible, setEventVisible] = useState(profile?.is_visible ?? true);
  const [saving, setSaving] = useState(false);
  const [editingBasicProfile, setEditingBasicProfile] = useState(false);
  const BASIC_INTERESTS = [
    'music', 'tech', 'food', 'books', 'travel', 'art', 'fitness', 'nature', 'movies', 'business', 'photography', 'dancing'
  ];
  
  const EXTENDED_INTERESTS = [
    'yoga', 'gaming', 'comedy', 'startups', 'fashion', 'spirituality', 'volunteering', 'crypto', 'cocktails', 'politics', 'hiking', 'design', 'podcasts', 'pets', 'wellness'
  ];
  
  const ALL_INTERESTS = [...BASIC_INTERESTS, ...EXTENDED_INTERESTS];
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportStep, setReportStep] = useState<'select' | 'form'>('select');
  const [selectedUserToReport, setSelectedUserToReport] = useState<any>(null);
  const [reportExplanation, setReportExplanation] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  useEffect(() => {
    initializeSession();
  }, []);

  // Synchronize eventVisible state with profile data
  useEffect(() => {
    if (profile) {
      const newVisibility = profile.is_visible ?? true;
      console.log('🔄 Syncing visibility state:', { 
        profileVisibility: profile.is_visible, 
        currentEventVisible: eventVisible, 
        newVisibility 
      });
      setEventVisible(newVisibility);
    }
  }, [profile]);

  // Refresh profile data when returning to this page
  useFocusEffect(
    React.useCallback(() => {
      if (profile?.id) {
        console.log('🔄 Refreshing profile data on focus for profile:', profile.id);
        // Refresh profile data to ensure toggle state is current
        EventProfile.get(profile.id).then((updatedProfile) => {
          if (updatedProfile) {
            console.log('✅ Profile refreshed:', { 
              oldVisibility: profile.is_visible, 
              newVisibility: updatedProfile.is_visible 
            });
            setProfile(updatedProfile);
          }
        }).catch((error) => {
          console.error("Error refreshing profile:", error);
        });
      }
    }, [profile?.id])
  );

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

      // Try with standard settings first
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'Images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        allowsMultipleSelection: false,
        base64: false,
        exif: false,
      });

      // If the first attempt fails or is canceled, try with different settings
      if (result.canceled) {
        console.log('First image picker attempt was canceled, trying alternative approach...');
        
        // Try without editing first, then we can handle cropping differently
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: 'Images',
          allowsEditing: false,
          quality: 0.8,
          allowsMultipleSelection: false,
          base64: false,
          exif: false,
        });
      }

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Debug logging for image properties
        console.log('Selected image asset:', {
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          fileSize: asset.fileSize,
          type: asset.type,
          fileName: asset.fileName,
          aspectRatio: asset.width && asset.height ? asset.width / asset.height : 'unknown'
        });
        
        if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
          Alert.alert("File Too Large", "Image must be smaller than 10MB.");
          return;
        }

        setIsUploadingPhoto(true);
        try {
          // Use the asset directly instead of creating a File object
          const fileObject = {
            uri: asset.uri,
            name: asset.fileName || `profile-photo-${Date.now()}.jpg`,
            type: asset.type || 'image/jpeg'
          };
          
          const { file_url } = await UserAPI.uploadFile(fileObject);
          
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
              const eventId = await AsyncStorage.getItem('currentEventId');
              const sessionId = await AsyncStorage.getItem('currentSessionId');
              
              if (eventId && sessionId) {
                // Delete all likes where this user is the liker
                const likesAsLiker = await LikeAPI.filter({
                  event_id: eventId,
                  liker_session_id: sessionId
                });
                for (const like of likesAsLiker) {
                  await LikeAPI.delete(like.id);
                }

                // Delete all likes where this user is the liked
                const likesAsLiked = await LikeAPI.filter({
                  event_id: eventId,
                  liked_session_id: sessionId
                });
                for (const like of likesAsLiked) {
                  await LikeAPI.delete(like.id);
                }

                // Delete all messages where this user is the sender
                const messagesAsSender = await MessageAPI.filter({
                  event_id: eventId,
                  from_profile_id: sessionId
                });
                for (const message of messagesAsSender) {
                  await MessageAPI.delete(message.id);
                }

                // Delete all messages where this user is the recipient
                const messagesAsRecipient = await MessageAPI.filter({
                  event_id: eventId,
                  to_profile_id: sessionId
                });
                for (const message of messagesAsRecipient) {
                  await MessageAPI.delete(message.id);
                }
              }

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
    try {
      console.log('🔄 Attempting to update visibility to', value, 'for profile:', profile.id);
      console.log('📊 Current state:', { 
        profileVisibility: profile?.is_visible, 
        eventVisible: eventVisible, 
        targetValue: value 
      });
      
      // Use the new toggleVisibility function
      await EventProfile.toggleVisibility(profile.id, value);
      
      console.log('✅ Visibility updated successfully to', value);
      setProfile((prev: any) => ({ ...prev, is_visible: value }));
      setEventVisible(value);
      
      // Show success message
      Alert.alert(
        value ? "Profile Visible" : "Profile Hidden",
        value 
          ? "Your profile is now visible to other users." 
          : "Your profile is now hidden. You won't see other users and they won't see you."
      );
      
    } catch (error) {
      console.error("❌ Error updating visibility:", error);
      Alert.alert("Error", "Failed to update visibility. Please try again.");
      // Revert the toggle if update failed
      setEventVisible(!value);
    }
  };

  const handleUpdateGender = async (gender: string) => {
    setSaving(true);
    await EventProfile.update(profile.id, { gender_identity: gender });
    setProfile((prev: any) => ({ ...prev, gender_identity: gender }));
    setSaving(false);
  };

  const handleUpdateInterestedIn = async (interestedIn: string) => {
    setSaving(true);
    await EventProfile.update(profile.id, { interested_in: interestedIn });
    setProfile((prev: any) => ({ ...prev, interested_in: interestedIn }));
    setSaving(false);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#1a1a1a' : '#f8fafc',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      paddingTop: 32,
    },
    headerText: {
      flex: 1,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: isDark ? '#ffffff' : '#1f2937',
      marginBottom: 4,
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
    },
    photoSection: {
      alignItems: 'center',
      marginBottom: 20,
    },
    photoContainer: {
      position: 'relative',
      width: 100,
      height: 100,
      borderRadius: 50,
      overflow: 'hidden',
      marginBottom: 10,
    },
    profilePhoto: {
      width: '100%',
      height: '100%',
    },
    fallbackAvatar: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    fallbackText: {
      fontSize: 40,
      color: 'white',
    },
    photoEditButton: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: '#8b5cf6',
      borderRadius: 15,
      width: 30,
      height: 30,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'white',
    },
    name: {
      fontSize: 24,
      fontWeight: 'bold',
      color: isDark ? '#f9fafb' : '#1f2937',
      marginBottom: 4,
    },
    age: {
      fontSize: 16,
      color: isDark ? '#9ca3af' : '#6b7280',
      marginBottom: 20,
    },
    card: {
      backgroundColor: isDark ? '#2d2d2d' : 'white',
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    detailLabel: {
      fontSize: 16,
      color: isDark ? '#9ca3af' : '#6b7280',
      fontWeight: 'bold',
    },
    detailValueContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    detailValue: {
      fontSize: 16,
      color: isDark ? '#e5e7eb' : '#374151',
    },
    genderOption: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark ? '#374151' : '#e5e7eb',
      marginRight: 10,
      marginBottom: 8,
    },
    genderOptionSelected: {
      backgroundColor: '#8b5cf6',
      borderColor: '#8b5cf6',
    },
    genderOptionText: {
      fontSize: 14,
      color: isDark ? '#e5e7eb' : '#374151',
    },
    genderOptionTextSelected: {
      color: 'white',
    },
    input: {
      backgroundColor: isDark ? '#374151' : '#f9fafb',
      borderRadius: 10,
      padding: 15,
      fontSize: 16,
      color: isDark ? '#e5e7eb' : '#1f2937',
      borderWidth: 1,
      borderColor: isDark ? '#374151' : '#e5e7eb',
      minHeight: 100,
    },
    heightInput: {
      backgroundColor: isDark ? '#374151' : '#f9fafb',
      borderRadius: 10,
      padding: 15,
      fontSize: 18,
      color: isDark ? '#e5e7eb' : '#1f2937',
      borderWidth: 1,
      borderColor: isDark ? '#374151' : '#e5e7eb',
      height: 50,
      marginTop: 8,
    },
    saveButton: {
      backgroundColor: '#8b5cf6',
      paddingVertical: 12,
      paddingHorizontal: 25,
      borderRadius: 10,
      marginLeft: 10,
    },
    saveButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
    },
    cancelButton: {
      backgroundColor: '#6b7280',
      paddingVertical: 12,
      paddingHorizontal: 25,
      borderRadius: 10,
      marginLeft: 10,
    },
    cancelButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
    },
    interestsModalContainer: {
      maxHeight: 250,
      paddingBottom: 10,
    },
    interestsSection: {
      marginBottom: 15,
    },
    interestsSectionHeader: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 10,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#374151' : '#e5e7eb',
    },
    toggleIcon: {
      fontSize: 18,
      color: isDark ? '#9ca3af' : '#6b7280',
    },
    interestOption: {
      paddingVertical: 10,
      paddingHorizontal: 15,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark ? '#374151' : '#e5e7eb',
      marginRight: 10,
      marginBottom: 8,
    },
    interestOptionSelected: {
      backgroundColor: '#8b5cf6',
      borderColor: '#8b5cf6',
    },
    interestOptionText: {
      fontSize: 14,
      color: isDark ? '#e5e7eb' : '#374151',
    },
    interestOptionTextSelected: {
      color: 'white',
    },
    interestChip: {
      backgroundColor: '#e0e7ff',
      borderRadius: 15,
      paddingVertical: 5,
      paddingHorizontal: 10,
      marginRight: 8,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: '#8b5cf6',
    },
    interestChipText: {
      fontSize: 12,
      color: '#4f46e5',
      fontWeight: 'bold',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDark ? '#1f2937' : '#f9fafb',
    },
    loadingText: {
      fontSize: 18,
      color: isDark ? '#9ca3af' : '#6b7280',
      marginTop: 10,
    },
    reportButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f59e0b',
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 10,
      marginTop: 10,
    },
    reportButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
      marginLeft: 8,
    },
    infoCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    infoCardTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: isDark ? '#f9fafb' : '#1f2937',
      marginLeft: 8,
    },
    infoCardText: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
      marginTop: 8,
      marginBottom: 10,
    },
    infoCardBullets: {
      marginLeft: 15,
    },
    bulletPoint: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 4,
    },
    bullet: {
      fontSize: 10,
      color: '#8b5cf6',
      marginRight: 4,
    },
    bulletText: {
      fontSize: 14,
      color: isDark ? '#e5e7eb' : '#374151',
    },
    actionsSection: {
      marginTop: 20,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 15,
      paddingHorizontal: 20,
      borderRadius: 12,
      marginBottom: 10,
    },
    actionText: {
      fontSize: 16,
      fontWeight: 'bold',
      marginLeft: 10,
    },
    logoutButton: {
      backgroundColor: '#ef4444',
    },
    logoutText: {
      color: 'white',
    },
    navButton: {
      alignItems: 'center',
    },
    navButtonActive: {},
    navButtonText: {
      fontSize: 12,
      color: isDark ? '#9ca3af' : '#9ca3af',
      marginTop: 4,
    },
    navButtonTextActive: {
      fontWeight: '600',
      color: '#8b5cf6',
    },
    userListItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#374151' : '#e5e7eb',
    },
    userListPhoto: {
      width: 40,
      height: 40,
      borderRadius: 20,
      overflow: 'hidden',
      marginRight: 10,
    },
    userListPhotoImage: {
      width: '100%',
      height: '100%',
    },
    userListPhotoFallback: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    userListPhotoFallbackText: {
      fontSize: 20,
      color: 'white',
    },
    userListInfo: {
      flex: 1,
    },
    userListName: {
      fontSize: 16,
      fontWeight: 'bold',
      color: isDark ? '#f9fafb' : '#1f2937',
    },
    userListAge: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalCard: {
      backgroundColor: isDark ? '#263238' : '#ffffff',
      borderRadius: 15,
      padding: 25,
      width: '90%',
      maxWidth: 400,
      borderWidth: 1,
      borderColor: isDark ? '#374151' : '#e5e7eb',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: isDark ? '#f9fafb' : '#1f2937',
      textAlign: 'center',
      marginBottom: 15,
    },
    reportUserInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 15,
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 20,
    },
    submitButton: {
      backgroundColor: '#8b5cf6',
      paddingVertical: 12,
      paddingHorizontal: 25,
      borderRadius: 10,
    },
    submitButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
    },
    interestsModalGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
      gap: 8,
    },
    bottomNavigation: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 20,
      backgroundColor: isDark ? '#2d2d2d' : 'white',
      borderTopWidth: 1,
      borderTopColor: isDark ? '#404040' : '#e5e7eb',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: isDark ? 0.1 : 0.05,
      shadowRadius: 4,
      elevation: 3,
    },

  });

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
        <View style={styles.headerText}>
          <Text style={styles.title}>Your Profile</Text>
        </View>
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
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 16, color: isDark ? '#ffffff' : '#1f2937' }}>Basic Profile</Text>
            <TouchableOpacity onPress={() => setEditingBasicProfile(!editingBasicProfile)}>
              <Edit size={18} color={isDark ? '#9ca3af' : '#6b7280'} />
            </TouchableOpacity>
          </View>
          
          {editingBasicProfile ? (
            <View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Gender</Text>
                <View style={styles.detailValueContainer}>
                  <TouchableOpacity
                    style={[
                      styles.genderOption,
                      profile.gender_identity === 'man' && styles.genderOptionSelected
                    ]}
                    onPress={() => handleUpdateGender('man')}
                  >
                    <Text style={[
                      styles.genderOptionText,
                      profile.gender_identity === 'man' && styles.genderOptionTextSelected
                    ]}>Man</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.genderOption,
                      profile.gender_identity === 'woman' && styles.genderOptionSelected
                    ]}
                    onPress={() => handleUpdateGender('woman')}
                  >
                    <Text style={[
                      styles.genderOptionText,
                      profile.gender_identity === 'woman' && styles.genderOptionTextSelected
                    ]}>Woman</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Interested in</Text>
                <View style={styles.detailValueContainer}>
                  <TouchableOpacity
                    style={[
                      styles.genderOption,
                      profile.interested_in === 'men' && styles.genderOptionSelected
                    ]}
                    onPress={() => handleUpdateInterestedIn('men')}
                  >
                    <Text style={[
                      styles.genderOptionText,
                      profile.interested_in === 'men' && styles.genderOptionTextSelected
                    ]}>Men</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.genderOption,
                      profile.interested_in === 'women' && styles.genderOptionSelected
                    ]}
                    onPress={() => handleUpdateInterestedIn('women')}
                  >
                    <Text style={[
                      styles.genderOptionText,
                      profile.interested_in === 'women' && styles.genderOptionTextSelected
                    ]}>Women</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.genderOption,
                      profile.interested_in === 'everybody' && styles.genderOptionSelected
                    ]}
                    onPress={() => handleUpdateInterestedIn('everybody')}
                  >
                    <Text style={[
                      styles.genderOptionText,
                      profile.interested_in === 'everybody' && styles.genderOptionTextSelected
                    ]}>Everybody</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            <View>
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
                   profile.interested_in === 'women' ? 'Women' : 'Everybody'}
                </Text>
              </View>
            </View>
          )}
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Event</Text>
            <Text style={styles.detailValue}>{currentEvent?.name}</Text>
          </View>
        </View>

        {/* Event Visibility Toggle */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <User size={20} color={eventVisible ? '#22c55e' : '#9ca3af'} />
            <Text style={{ fontWeight: 'bold', fontSize: 16, marginLeft: 8, color: isDark ? '#ffffff' : '#1f2937' }}>Event Visibility</Text>
            <View style={{ flex: 1 }} />
            <Switch value={eventVisible} onValueChange={handleToggleVisibility} />
          </View>
          <Text style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
            {eventVisible ? 'Your profile is visible to others at the current event.' : 'Your profile is hidden from others at the current event.'}
          </Text>
        </View>
        {/* About Me */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontWeight: 'bold', fontSize: 16, color: isDark ? '#ffffff' : '#1f2937' }}>About Me</Text>
            <TouchableOpacity onPress={() => setEditingAboutMe(true)}>
              <Edit size={18} color={isDark ? '#9ca3af' : '#6b7280'} />
            </TouchableOpacity>
          </View>
          {editingAboutMe ? (
            <View>
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
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
            <Text style={{ color: isDark ? '#9ca3af' : '#6b7280', marginTop: 4 }}>{profile.about_me || 'No bio yet. Add one!'}</Text>
          )}
        </View>
        {/* Interests */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontWeight: 'bold', fontSize: 16, color: isDark ? '#ffffff' : '#1f2937' }}>Interests</Text>
            <TouchableOpacity onPress={() => setShowInterests(true)}>
              <Edit size={18} color={isDark ? '#9ca3af' : '#6b7280'} />
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
            {(profile.interests && profile.interests.length > 0) ? profile.interests.map((i: string) => (
              <View key={i} style={styles.interestChip}><Text style={styles.interestChipText}>{i}</Text></View>
            )) : <Text style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>No interests added yet.</Text>}
          </View>
        </View>
        <Modal visible={showInterests} transparent animationType="slide" onRequestClose={() => setShowInterests(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 16 }}>Select up to 3 interests</Text>
              
              <ScrollView 
                style={styles.interestsModalContainer} 
                showsVerticalScrollIndicator={false}
                horizontal={false}
                showsHorizontalScrollIndicator={false}
              >
                {/* Basic Interests - Always Visible */}
                <View style={styles.interestsSection}>
                  <View style={styles.interestsModalGrid}>
                    {BASIC_INTERESTS.map((interest) => (
                      <TouchableOpacity
                        key={interest}
                        style={[styles.interestOption, interests.includes(interest) && styles.interestOptionSelected]}
                        onPress={() => handleToggleInterest(interest)}
                        disabled={!interests.includes(interest) && interests.length >= 3}
                      >
                        <Text style={[styles.interestOptionText, interests.includes(interest) && styles.interestOptionTextSelected]}>
                          {interest.charAt(0).toUpperCase() + interest.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Extended Interests - Collapsible */}
                <View style={styles.interestsSection}>
                  <TouchableOpacity 
                    style={styles.interestsSectionHeader}
                    onPress={() => setShowExtendedInterests(!showExtendedInterests)}
                  >
                    <Text style={styles.toggleIcon}>{showExtendedInterests ? '↑' : '↓'}</Text>
                  </TouchableOpacity>
                  
                  {showExtendedInterests && (
                    <View style={styles.interestsModalGrid}>
                      {EXTENDED_INTERESTS.map((interest) => (
                        <TouchableOpacity
                          key={interest}
                          style={[styles.interestOption, interests.includes(interest) && styles.interestOptionSelected]}
                          onPress={() => handleToggleInterest(interest)}
                          disabled={!interests.includes(interest) && interests.length >= 3}
                        >
                          <Text style={[styles.interestOptionText, interests.includes(interest) && styles.interestOptionTextSelected]}>
                            {interest.charAt(0).toUpperCase() + interest.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </ScrollView>
              
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
                <TouchableOpacity onPress={handleSaveInterests} disabled={saving} style={styles.saveButton}><Text style={styles.saveButtonText}>Save</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => { setShowInterests(false); setInterests(profile.interests || []); setShowExtendedInterests(false); }} style={styles.cancelButton}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        {/* Height */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontWeight: 'bold', fontSize: 16, color: isDark ? '#ffffff' : '#1f2937' }}>Height</Text>
            <TouchableOpacity onPress={() => setEditingHeight(true)}>
              <Edit size={18} color={isDark ? '#9ca3af' : '#6b7280'} />
            </TouchableOpacity>
          </View>
          {editingHeight ? (
            <View>
              <TextInput
                style={styles.heightInput}
                value={height}
                onChangeText={setHeight}
                placeholder="180"
                keyboardType="numeric"
                maxLength={3}
                textAlign="center"
              />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                <TouchableOpacity onPress={handleSaveHeight} disabled={saving} style={styles.saveButton}><Text style={styles.saveButtonText}>Save</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => { setEditingHeight(false); setHeight(profile.height_cm ? String(profile.height_cm) : ''); }} style={styles.cancelButton}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
              </View>
            </View>
          ) : (
            <Text style={{ color: isDark ? '#9ca3af' : '#6b7280', marginTop: 8 }}>{profile.height_cm ? `${profile.height_cm} cm` : 'Height not defined yet'}</Text>
          )}
        </View>
        {/* Report User Button */}
        <View style={styles.card}>
          <TouchableOpacity style={styles.reportButton} onPress={handleReportUser}>
            <AlertCircle size={20} color="white" />
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