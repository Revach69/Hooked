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
  Dimensions,
  AppState,
  Modal,
  FlatList,
  useColorScheme,
} from 'react-native';
import { router } from 'expo-router';
import { Heart, Filter, Users, User, MessageCircle, X } from 'lucide-react-native';
import { EventProfile, Like, Event } from '../lib/firebaseApi';
import { sendMatchNotification } from '../lib/notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';

const { width } = Dimensions.get('window');
const cardSize = (width - 48) / 3; // 3 columns with padding

const BASIC_INTERESTS = [
  'music', 'tech', 'food', 'books', 'travel', 'art', 'fitness', 'nature', 'movies', 'business', 'photography', 'dancing'
];

const EXTENDED_INTERESTS = [
  'yoga', 'gaming', 'comedy', 'startups', 'fashion', 'spirituality', 'volunteering', 'crypto', 'cocktails', 'politics', 'hiking', 'design', 'podcasts', 'pets', 'wellness'
];

const ALL_INTERESTS = [...BASIC_INTERESTS, ...EXTENDED_INTERESTS];

export default function Discovery() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [profiles, setProfiles] = useState<any[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [filteredProfiles, setFilteredProfiles] = useState<any[]>([]);
  const [currentEvent, setCurrentEvent] = useState<any>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    age_min: 18,
    age_max: 99,
    interests: [] as string[]
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showExtendedInterests, setShowExtendedInterests] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [likedProfiles, setLikedProfiles] = useState(new Set<string>());
  const [selectedProfileForDetail, setSelectedProfileForDetail] = useState<any>(null);
  const [isAppActive, setIsAppActive] = useState(true);

  useEffect(() => {
    initializeSession();
  }, []);

  useEffect(() => {
    if (currentUserProfile && profiles.length >= 0) {
      applyFilters();
    }
  }, [profiles, filters, currentUserProfile]);

  // App state detection
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      setIsAppActive(nextAppState === 'active');
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription?.remove();
    };
  }, []);

  // Real-time polling for updates
  useEffect(() => {
    if (!currentSessionId || !currentEvent) return;

    const pollInterval = setInterval(() => {
      if (isAppActive) {
        loadProfiles(currentEvent.id, currentSessionId);
        loadLikes(currentEvent.id, currentSessionId);
      }
    }, 60000); // 60 seconds

    return () => clearInterval(pollInterval);
  }, [currentSessionId, currentEvent, isAppActive]);

  const initializeSession = async () => {
    const eventId = await AsyncStorage.getItem('currentEventId');
    const sessionId = await AsyncStorage.getItem('currentSessionId');
    
    if (!eventId || !sessionId) {
      router.replace('/home');
      return;
    }

    setCurrentSessionId(sessionId);


    
    try {
      const events = await Event.filter({ id: eventId });
      if (events.length > 0) {
        setCurrentEvent(events[0]);
      } else {
        router.replace('/home');
        return;
      }

      await Promise.all([loadProfiles(eventId, sessionId), loadLikes(eventId, sessionId)]);
    } catch (error) {
      console.error("Error initializing session:", error);
    }
    setIsLoading(false);
  };

  const loadProfiles = async (eventId: string, sessionId: string) => {
    try {
      const allVisibleProfiles = await EventProfile.filter({ 
        event_id: eventId,
        is_visible: true 
      });
      
      const userProfile = allVisibleProfiles.find(p => p.session_id === sessionId);
      setCurrentUserProfile(userProfile);

      const otherUsersProfiles = allVisibleProfiles.filter(p => p.session_id !== sessionId);
      setProfiles(otherUsersProfiles);
      
      if (!userProfile) {
        console.warn("Current user profile not found for session, clearing session data and redirecting.");
        // Clear all session data to prevent infinite redirect loop
        await AsyncStorage.multiRemove([
          'currentEventId',
          'currentSessionId',
          'currentEventCode',
          'currentProfileColor',
          'currentProfilePhotoUrl'
        ]);
        router.replace('/home');
      }

    } catch (error) {
      console.error("Error loading profiles:", error);
      // Also clear session data on error to prevent loops
      await AsyncStorage.multiRemove([
        'currentEventId',
        'currentSessionId',
        'currentEventCode',
        'currentProfileColor',
        'currentProfilePhotoUrl'
      ]);
      router.replace('/home');
    }
  };

  const loadLikes = async (eventId: string, sessionId: string) => {
    try {
      const likes = await Like.filter({ 
        liker_session_id: sessionId,
        event_id: eventId 
      });
      setLikedProfiles(new Set(likes.map(like => like.liked_session_id)));
    } catch (error) {
      console.error("Error loading likes:", error);
    }
  };

  const applyFilters = () => {
    if (!currentUserProfile) {
      setFilteredProfiles([]);
      return;
    }

    let tempFiltered = profiles.filter(otherUser => {
      // Mutual Gender Interest Check - based on user's profile preferences
      const iAmInterestedInOther =
        (currentUserProfile.interested_in === 'everybody') ||
        (currentUserProfile.interested_in === 'men' && otherUser.gender_identity === 'man') ||
        (currentUserProfile.interested_in === 'women' && otherUser.gender_identity === 'woman');

      const otherIsInterestedInMe =
        (otherUser.interested_in === 'everybody') ||
        (otherUser.interested_in === 'men' && currentUserProfile.gender_identity === 'man') ||
        (otherUser.interested_in === 'women' && currentUserProfile.gender_identity === 'woman');
      
      if (!iAmInterestedInOther || !otherIsInterestedInMe) {
        return false;
      }

      // Age Range Filter
      if (!(otherUser.age >= filters.age_min && otherUser.age <= filters.age_max)) {
        return false;
      }

      // Shared Interests Filter
      if (filters.interests.length > 0) {
        if (!otherUser.interests?.some((interest: any) => filters.interests.includes(interest))) {
          return false;
        }
      }
      
      return true;
    });

    setFilteredProfiles(tempFiltered);
  };

  const handleLike = async (likedProfile: any) => {
    if (likedProfiles.has(likedProfile.session_id) || !currentUserProfile) return;

    const eventId = await AsyncStorage.getItem('currentEventId');
    const likerSessionId = currentUserProfile.session_id;

    if (!eventId) return;

    try {
      // Optimistically update UI
      setLikedProfiles(prev => new Set([...prev, likedProfile.session_id]));

      const newLike = await Like.create({
        event_id: eventId,
        from_profile_id: likerSessionId,
        to_profile_id: likedProfile.session_id,
        liker_session_id: likerSessionId,
        liked_session_id: likedProfile.session_id,
        is_mutual: false,
        liker_notified_of_match: false,
        liked_notified_of_match: false
      });

      // Check for mutual match
      const theirLikesToMe = await Like.filter({
        event_id: eventId,
        liker_session_id: likedProfile.session_id,
        liked_session_id: likerSessionId,
      });

      if (theirLikesToMe.length > 0) {
        const theirLikeRecord = theirLikesToMe[0];

        // Update both records for mutual match
        await Like.update(newLike.id, { 
          is_mutual: true,
          liker_notified_of_match: true
        });
        await Like.update(theirLikeRecord.id, { 
          is_mutual: true,
          liked_notified_of_match: true 
        });
        
        // 🎉 SEND MATCH NOTIFICATIONS TO BOTH USERS
        try {
          await Promise.all([
            sendMatchNotification(likerSessionId, likedProfile.first_name),
            sendMatchNotification(likedProfile.session_id, currentUserProfile.first_name)
          ]);
          console.log('Match notifications sent successfully!');
        } catch (notificationError) {
          console.error('Error sending match notifications:', notificationError);
        }
        
        Alert.alert(
          "🎉 It's a Match!", 
          `You and ${likedProfile.first_name} liked each other.`,
          [
            {
              text: "View Matches",
              onPress: () => router.push('/matches')
            },
            {
              text: "Continue Browsing",
              style: "cancel"
            }
          ]
        );
      }
    } catch (error) {
      console.error("Error liking profile:", error);
      // Revert optimistic update on error
      setLikedProfiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(likedProfile.session_id);
        return newSet;
      });
    }
  };
  
  const handleProfileTap = (profile: any) => {
    setSelectedProfileForDetail(profile);
  };



  const handleToggleInterest = (interest: string) => {
    let newInterests = [...filters.interests];
    if (newInterests.includes(interest)) {
      newInterests = newInterests.filter(i => i !== interest);
    } else if (newInterests.length < 3) {
      newInterests.push(interest);
    }
    setFilters(prev => ({ ...prev, interests: newInterests }));
  };

  const handleApplyFilters = () => {
    setShowFilters(false);
    setShowExtendedInterests(false);
  };

  const handleResetFilters = () => {
    setFilters({
      age_min: 18,
      age_max: 99,
      interests: []
    });
    setShowExtendedInterests(false);
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
    subtitle: {
      fontSize: 16,
      color: isDark ? '#9ca3af' : '#6b7280',
    },
    filterButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark ? '#404040' : '#d1d5db',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#2d2d2d' : 'white',
    },
    profilesContainer: {
      flex: 1,
      paddingHorizontal: 16,
    },
    profilesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
      gap: 12,
    },
    profileCard: {
      width: cardSize,
      backgroundColor: isDark ? '#2d2d2d' : 'white',
      borderRadius: 16,
      padding: 12,
      margin: 4,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    profileImageContainer: {
      width: cardSize - 24,
      height: cardSize - 24,
      borderRadius: (cardSize - 24) / 2,
      overflow: 'hidden',
      marginBottom: 8,
      backgroundColor: isDark ? '#404040' : '#e5e7eb',
      alignItems: 'center',
      justifyContent: 'center',
    },
    profileImage: {
      width: '100%',
      height: '100%',
      borderRadius: (cardSize - 24) / 2,
    },
    fallbackAvatar: {
      width: cardSize - 24,
      height: cardSize - 24,
      borderRadius: (cardSize - 24) / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#404040' : '#cccccc',
    },
    fallbackText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: 'white',
    },
    likeButton: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    likeButtonActive: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
    },
    nameOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      padding: 8,
    },
    profileName: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#ffffff' : '#1f2937',
    },
    emptyState: {
      alignItems: 'center',
      padding: 32,
      marginTop: 32,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: isDark ? '#ffffff' : '#1f2937',
      marginTop: 16,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
      textAlign: 'center',
      marginBottom: 16,
      lineHeight: 20,
    },
    adjustFiltersButton: {
      borderWidth: 1,
      borderColor: isDark ? '#404040' : '#d1d5db',
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 24,
      backgroundColor: isDark ? '#2d2d2d' : 'white',
    },
    adjustFiltersButtonText: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
      fontWeight: '500',
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
    navButton: {
      alignItems: 'center',
    },
    navButtonText: {
      fontSize: 12,
      color: isDark ? '#9ca3af' : '#9ca3af',
      marginTop: 4,
    },
    navButtonActive: {},
    navButtonTextActive: {
      fontWeight: '600',
      color: isDark ? '#ffffff' : '#1f2937',
    },
    // Filter Modal Styles
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalCard: {
      backgroundColor: isDark ? '#2d2d2d' : 'white',
      borderRadius: 20,
      padding: 24,
      width: '90%',
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: isDark ? '#ffffff' : '#1f2937',
    },
    filterSection: {
      marginBottom: 24,
    },
    filterSectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#ffffff' : '#1f2937',
      marginBottom: 12,
    },
    ageRangeContainer: {
      marginBottom: 16,
    },
    ageRangeText: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
      textAlign: 'center',
      marginBottom: 12,
    },
    sliderContainer: {
      gap: 16,
    },
    slider: {
      width: '100%',
      height: 40,
    },

    interestsContainer: {
      maxHeight: 200,
    },
    interestsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
      gap: 8,
    },
    interestOption: {
      backgroundColor: isDark ? '#404040' : '#f3f4f6',
      borderRadius: 20,
      paddingVertical: 10,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: '30%',
    },
    interestOptionSelected: {
      backgroundColor: '#8b5cf6',
    },
    interestOptionText: {
      fontSize: 14,
      color: isDark ? '#ffffff' : '#374151',
      textAlign: 'center',
    },
    interestOptionTextSelected: {
      color: 'white',
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      marginTop: 16,
    },
    resetButton: {
      flex: 1,
      backgroundColor: isDark ? '#404040' : '#f3f4f6',
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    resetButtonText: {
      fontSize: 16,
      color: isDark ? '#9ca3af' : '#6b7280',
      fontWeight: '600',
    },
    applyButton: {
      flex: 1,
      backgroundColor: '#8b5cf6',
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    applyButtonText: {
      fontSize: 16,
      color: 'white',
      fontWeight: '600',
    },
    interestsSection: {
      marginBottom: 16,
    },
    interestsSectionHeader: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: isDark ? '#404040' : '#f3f4f6',
      borderRadius: 12,
      marginBottom: 8,
    },
    interestsSectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#ffffff' : '#1f2937',
    },
    toggleIcon: {
      fontSize: 16,
      color: isDark ? '#9ca3af' : '#6b7280',
    },
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading singles at this event...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>
            Singles at {currentEvent?.name}
          </Text>
          <Text style={styles.subtitle}>{filteredProfiles.length} people discovered</Text>
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Filter size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Profiles Grid */}
      <ScrollView style={styles.profilesContainer}>
        <View style={styles.profilesGrid}>
          {filteredProfiles.map((profile) => (
            <TouchableOpacity
              key={profile.id}
              style={styles.profileCard}
              onPress={() => handleProfileTap(profile)}
            >
              <View style={styles.profileImageContainer}>
                {profile.profile_photo_url ? (
                  <Image
                    source={{ uri: profile.profile_photo_url }}
                    style={styles.profileImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.fallbackAvatar, { backgroundColor: profile.profile_color || '#cccccc' }]}>
                    <Text style={styles.fallbackText}>{profile.first_name[0]}</Text>
                  </View>
                )}
                
                {/* Like Button Overlay */}
                <TouchableOpacity
                  style={[
                    styles.likeButton,
                    likedProfiles.has(profile.session_id) && styles.likeButtonActive
                  ]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleLike(profile);
                  }}
                  disabled={likedProfiles.has(profile.session_id)}
                >
                  <Heart 
                    size={16} 
                    color={likedProfiles.has(profile.session_id) ? '#ec4899' : '#9ca3af'} 
                    fill={likedProfiles.has(profile.session_id) ? '#ec4899' : 'none'}
                  />
                </TouchableOpacity>

                {/* Name Overlay */}
                <View style={styles.nameOverlay}>
                  <Text style={styles.profileName}>{profile.first_name}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {filteredProfiles.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <Users size={48} color="#9ca3af" />
            <Text style={styles.emptyTitle}>No singles found</Text>
            <Text style={styles.emptyText}>
              Try adjusting your filters or check back later as more people join the event.
            </Text>
            <TouchableOpacity
              style={styles.adjustFiltersButton}
              onPress={() => setShowFilters(true)}
            >
              <Text style={styles.adjustFiltersButtonText}>Adjust Filters</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push('/profile')}
        >
          <User size={24} color="#9ca3af" />
          <Text style={styles.navButtonText}>Profile</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.navButton, styles.navButtonActive]}
          onPress={() => {}} // Already on discovery page
        >
          <Users size={24} color="#8b5cf6" />
          <Text style={[styles.navButtonText, styles.navButtonTextActive]}>Discover</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push('/matches')}
        >
          <MessageCircle size={24} color="#9ca3af" />
          <Text style={styles.navButtonText}>Matches</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Modal */}
      <Modal visible={showFilters} transparent animationType="slide" onRequestClose={() => setShowFilters(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Age Range */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Age Range</Text>
              <View style={styles.ageRangeContainer}>
                <Text style={styles.ageRangeText}>
                  {filters.age_min} - {filters.age_max} years
                </Text>
                <View style={styles.sliderContainer}>
                  <Slider
                    style={styles.slider}
                    minimumValue={18}
                    maximumValue={99}
                    value={filters.age_min}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, age_min: Math.round(value) }))}
                    minimumTrackTintColor="#8b5cf6"
                    maximumTrackTintColor="#d1d5db"
                    thumbTintColor="#8b5cf6"
                  />
                  <Slider
                    style={styles.slider}
                    minimumValue={18}
                    maximumValue={99}
                    value={filters.age_max}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, age_max: Math.round(value) }))}
                    minimumTrackTintColor="#8b5cf6"
                    maximumTrackTintColor="#d1d5db"
                    thumbTintColor="#8b5cf6"
                  />
                </View>
              </View>
            </View>



            {/* Interests Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Interests (up to 3)</Text>
              <ScrollView 
                style={styles.interestsContainer} 
                showsVerticalScrollIndicator={false}
                horizontal={false}
                showsHorizontalScrollIndicator={false}
              >
                {/* Basic Interests - Always Visible */}
                <View style={styles.interestsSection}>
                  <View style={styles.interestsGrid}>
                    {BASIC_INTERESTS.map((interest) => (
                      <TouchableOpacity
                        key={interest}
                        style={[
                          styles.interestOption,
                          filters.interests.includes(interest) && styles.interestOptionSelected
                        ]}
                        onPress={() => handleToggleInterest(interest)}
                        disabled={!filters.interests.includes(interest) && filters.interests.length >= 3}
                      >
                        <Text style={[
                          styles.interestOptionText,
                          filters.interests.includes(interest) && styles.interestOptionTextSelected
                        ]}>
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
                    <View style={styles.interestsGrid}>
                      {EXTENDED_INTERESTS.map((interest) => (
                        <TouchableOpacity
                          key={interest}
                          style={[
                            styles.interestOption,
                            filters.interests.includes(interest) && styles.interestOptionSelected
                          ]}
                          onPress={() => handleToggleInterest(interest)}
                          disabled={!filters.interests.includes(interest) && filters.interests.length >= 3}
                        >
                          <Text style={[
                            styles.interestOptionText,
                            filters.interests.includes(interest) && styles.interestOptionTextSelected
                          ]}>
                            {interest.charAt(0).toUpperCase() + interest.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </ScrollView>
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.resetButton} onPress={handleResetFilters}>
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={handleApplyFilters}>
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* TODO: Add Profile Detail Modal */}

    </SafeAreaView>
  );
} 