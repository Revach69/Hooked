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
} from 'react-native';
import { router } from 'expo-router';
import { Heart, Filter, Users } from 'lucide-react-native';
import { EventProfile, Like, Event } from '../lib/firebaseApi';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const cardSize = (width - 48) / 3; // 3 columns with padding

export default function Discovery() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [filteredProfiles, setFilteredProfiles] = useState<any[]>([]);
  const [currentEvent, setCurrentEvent] = useState<any>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    age_min: 18,
    age_max: 99,
    gender: "all",
    interests: [] as string[]
  });
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [likedProfiles, setLikedProfiles] = useState(new Set<string>());
  const [selectedProfileForDetail, setSelectedProfileForDetail] = useState<any>(null);
  const [isAppActive, setIsAppActive] = useState(true);
  const [showGuide, setShowGuide] = useState(false);

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

    // Check if the user has seen the guide for this event
    const hasSeenGuide = await AsyncStorage.getItem(`hasSeenGuide_${eventId}`);
    if (!hasSeenGuide) {
      setShowGuide(true);
    }
    
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
        console.warn("Current user profile not found for session, redirecting.");
        router.replace('/home');
      }

    } catch (error) {
      console.error("Error loading profiles:", error);
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
      // Mutual Gender Interest Check
      const iAmInterestedInOther =
        (currentUserProfile.interested_in === 'everyone') ||
        (currentUserProfile.interested_in === 'men' && otherUser.gender_identity === 'man') ||
        (currentUserProfile.interested_in === 'women' && otherUser.gender_identity === 'woman') ||
        (currentUserProfile.interested_in === 'non-binary' && otherUser.gender_identity === 'non-binary');

      const otherIsInterestedInMe =
        (otherUser.interested_in === 'everyone') ||
        (otherUser.interested_in === 'men' && currentUserProfile.gender_identity === 'man') ||
        (otherUser.interested_in === 'women' && currentUserProfile.gender_identity === 'woman') ||
        (otherUser.interested_in === 'non-binary' && currentUserProfile.gender_identity === 'non-binary');
      
      if (!iAmInterestedInOther || !otherIsInterestedInMe) {
        return false;
      }

      // Age Range Filter
      if (!(otherUser.age >= filters.age_min && otherUser.age <= filters.age_max)) {
        return false;
      }
      
      // Direct Gender Filter
      if (filters.gender !== "all" && otherUser.gender_identity !== filters.gender) {
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

  const handleCloseGuide = async () => {
    const eventId = await AsyncStorage.getItem('currentEventId');
    if (eventId) {
      await AsyncStorage.setItem(`hasSeenGuide_${eventId}`, 'true');
    }
    setShowGuide(false);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading singles at this event...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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

      {/* TODO: Add Filter Modal */}
      {/* TODO: Add Profile Detail Modal */}
      {/* TODO: Add First Time Guide Modal */}
    </View>
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
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  profilesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  profilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  profileCard: {
    width: cardSize,
    marginBottom: 12,
  },
  profileImageContainer: {
    position: 'relative',
    width: cardSize,
    height: cardSize,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  fallbackAvatar: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
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
    color: 'white',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    marginTop: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  adjustFiltersButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'white',
  },
  adjustFiltersButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
}); 