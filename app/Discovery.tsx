import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { EventProfile, Like, Event } from '../lib/api/entities';
import { Heart } from 'lucide-react-native';

interface Filters {
  age_min: number;
  age_max: number;
  gender: string;
  interests: string[];
}

export default function DiscoveryScreen() {
  console.log('Rendering DiscoveryScreen'); // Debugging line to check if the component is rendering
  const navigation = useNavigation();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<any | null>(null);
  const [filteredProfiles, setFilteredProfiles] = useState<any[]>([]);
  const [currentEvent, setCurrentEvent] = useState<any | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    age_min: 18,
    age_max: 99,
    gender: 'all',
    interests: [],
  });
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [likedProfiles, setLikedProfiles] = useState<Set<string>>(new Set());
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);

  useEffect(() => {
    initializeSession();
  }, []);

  useEffect(() => {
    if (currentUserProfile) {
      applyFilters();
    }
  }, [profiles, filters, currentUserProfile]);

  useEffect(() => {
    if (!currentSessionId || !currentEvent) return;

    const interval = setInterval(() => {
      loadProfiles(currentEvent.id, currentSessionId);
      loadLikes(currentEvent.id, currentSessionId);
    }, 60000);

    return () => clearInterval(interval);
  }, [currentSessionId, currentEvent]);

  const initializeSession = async () => {
    const eventId = await AsyncStorage.getItem('currentEventId');
    const sessionId = await AsyncStorage.getItem('currentSessionId');

    if (!eventId || !sessionId) {
      navigation.navigate('Home' as never);
      return;
    }

    setCurrentSessionId(sessionId);

    try {
      const events = await Event.filter({ id: eventId });
      if (events.length > 0) {
        setCurrentEvent(events[0]);
      } else {
        navigation.navigate('Home' as never);
        return;
      }

      await Promise.all([
        loadProfiles(eventId, sessionId),
        loadLikes(eventId, sessionId),
      ]);
    } catch (e) {
      console.log('Error initializing session', e);
    }
    setIsLoading(false);
  };

  const loadProfiles = async (eventId: string, sessionId: string) => {
    try {
      const visible = await EventProfile.filter({ event_id: eventId, is_visible: true });
      const me = visible.find((p: any) => p.session_id === sessionId);
      setCurrentUserProfile(me);
      setProfiles(visible.filter((p: any) => p.session_id !== sessionId));
      if (!me) {
        navigation.navigate('Home' as never);
      }
    } catch (e) {
      console.log('Error loading profiles', e);
    }
  };

  const loadLikes = async (eventId: string, sessionId: string) => {
    try {
      const likes = await Like.filter({ liker_session_id: sessionId, event_id: eventId });
      setLikedProfiles(new Set(likes.map((l: any) => l.liked_session_id)));
    } catch (e) {
      console.log('Error loading likes', e);
    }
  };

  const applyFilters = () => {
    if (!currentUserProfile) return;

    const temp = profiles.filter((p) => {
      const iAmInterestedInOther =
        currentUserProfile.interested_in === 'everyone' ||
        (currentUserProfile.interested_in === 'men' && p.gender_identity === 'man') ||
        (currentUserProfile.interested_in === 'women' && p.gender_identity === 'woman') ||
        (currentUserProfile.interested_in === 'non-binary' && p.gender_identity === 'non-binary');

      const otherInterestedInMe =
        p.interested_in === 'everyone' ||
        (p.interested_in === 'men' && currentUserProfile.gender_identity === 'man') ||
        (p.interested_in === 'women' && currentUserProfile.gender_identity === 'woman') ||
        (p.interested_in === 'non-binary' && currentUserProfile.gender_identity === 'non-binary');

      if (!iAmInterestedInOther || !otherInterestedInMe) return false;
      if (!(p.age >= filters.age_min && p.age <= filters.age_max)) return false;
      if (filters.gender !== 'all' && p.gender_identity !== filters.gender) return false;
      if (filters.interests.length > 0) {
        if (!p.interests?.some((i: string) => filters.interests.includes(i))) return false;
      }
      return true;
    });

    setFilteredProfiles(temp);
  };

  const handleLike = async (profile: any) => {
    if (likedProfiles.has(profile.session_id) || !currentUserProfile) return;

    const eventId = await AsyncStorage.getItem('currentEventId');
    const likerSessionId = currentUserProfile.session_id;

    try {
      setLikedProfiles((prev) => new Set([...Array.from(prev), profile.session_id]));
      const newLike = await Like.create({
        event_id: eventId,
        liker_session_id: likerSessionId,
        liked_session_id: profile.session_id,
        is_mutual: false,
        liker_notified_of_match: false,
        liked_notified_of_match: false,
      });

      const theirLikes = await Like.filter({
        event_id: eventId,
        liker_session_id: profile.session_id,
        liked_session_id: likerSessionId,
      });

      if (theirLikes.length > 0) {
        const theirLike = theirLikes[0];
        await Like.update(newLike.id, {
          is_mutual: true,
          liker_notified_of_match: true,
        });
        await Like.update(theirLike.id, {
          is_mutual: true,
          liked_notified_of_match: true,
        });
        alert(`\uD83C\uDF89 It's a Match! You and ${profile.first_name} liked each other.`);
        navigation.navigate('Matches' as never);
      }
    } catch (e) {
      console.log('Error liking profile', e);
      setLikedProfiles((prev) => {
        const newSet = new Set(prev);
        newSet.delete(profile.session_id);
        return newSet;
      });
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.profileWrapper}>
      <TouchableOpacity style={styles.profileCard} onPress={() => setSelectedProfile(item)}>
        {item.profile_photo_url ? (
          <Image source={{ uri: item.profile_photo_url }} style={styles.profileImage} />
        ) : (
          <View style={[styles.profilePlaceholder, { backgroundColor: item.profile_color || '#ccc' }]}>
            <Text style={styles.placeholderText}>{item.first_name[0]}</Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.likeButton, likedProfiles.has(item.session_id) && styles.likeButtonDisabled]}
          disabled={likedProfiles.has(item.session_id)}
          onPress={() => handleLike(item)}
        >
          <Heart
            size={16}
            color={likedProfiles.has(item.session_id) ? '#aaa' : '#ec4899'}
            fill={likedProfiles.has(item.session_id) ? '#aaa' : 'none'}
          />
        </TouchableOpacity>
        <View style={styles.nameOverlay}>
          <Text style={styles.nameText}>{item.first_name}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Singles at {currentEvent?.name}</Text>
          <Text style={styles.headerSubtitle}>{filteredProfiles.length} people discovered</Text>
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(true)}>
          <Text style={styles.filterButtonText}>Filters</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={filteredProfiles}
        keyExtractor={(item) => String(item.id)}
        numColumns={3}
        renderItem={renderItem}
        columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 12 }}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
      {filteredProfiles.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No singles found</Text>
          <Text style={styles.emptyText}>Try adjusting your filters or check back later.</Text>
        </View>
      )}

      <Modal visible={!!selectedProfile} transparent animationType="slide" onRequestClose={() => setSelectedProfile(null)}>
        {selectedProfile && (
          <View style={styles.modalContainer}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              {selectedProfile.profile_photo_url ? (
                <Image source={{ uri: selectedProfile.profile_photo_url }} style={styles.modalPhoto} />
              ) : (
                <View style={[styles.modalPhoto, { backgroundColor: selectedProfile.profile_color || '#ccc', alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ color: '#fff', fontSize: 48 }}>{selectedProfile.first_name[0]}</Text>
                </View>
              )}
              <Text style={styles.modalName}>{selectedProfile.first_name}</Text>
              {selectedProfile.age && <Text style={styles.modalMeta}>{selectedProfile.age} years old</Text>}
              <TouchableOpacity
                style={[styles.modalLikeButton, likedProfiles.has(selectedProfile.session_id) && { opacity: 0.5 }]}
                disabled={likedProfiles.has(selectedProfile.session_id)}
                onPress={() => handleLike(selectedProfile)}
              >
                <Heart
                  size={20}
                  color={likedProfiles.has(selectedProfile.session_id) ? '#aaa' : '#fff'}
                  fill={likedProfiles.has(selectedProfile.session_id) ? '#aaa' : 'none'}
                  style={{ marginRight: 6 }}
                />
                <Text style={{ color: '#fff', fontWeight: '600' }}>
                  {likedProfiles.has(selectedProfile.session_id) ? 'Liked' : `Like ${selectedProfile.first_name}`}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedProfile(null)}>
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
      </Modal>

      <Modal visible={showFilters} animationType="slide" onRequestClose={() => setShowFilters(false)}>
        <View style={styles.filterModal}>
          <Text style={styles.filterTitle}>Filters</Text>
          <TouchableOpacity style={styles.filterClose} onPress={() => setShowFilters(false)}>
            <Text style={styles.filterCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f5f8ff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f8ff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111' },
  headerSubtitle: { color: '#6b7280', marginTop: 4 },
  filterButton: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#a855f7', borderRadius: 8 },
  filterButtonText: { color: '#fff', fontWeight: '600' },
  profileWrapper: { width: '32%' },
  profileCard: { aspectRatio: 1, borderRadius: 12, overflow: 'hidden' },
  profileImage: { width: '100%', height: '100%' },
  profilePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholderText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  likeButton: { position: 'absolute', top: 6, right: 6, padding: 4, backgroundColor: '#fff', borderRadius: 12 },
  likeButtonDisabled: { backgroundColor: '#e5e7eb' },
  nameOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', padding: 4 },
  nameText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  emptyCard: { marginTop: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4, color: '#111' },
  emptyText: { color: '#6b7280', textAlign: 'center' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { backgroundColor: '#fff', padding: 24, borderRadius: 16, alignItems: 'center' },
  modalPhoto: { width: 200, height: 200, borderRadius: 100, marginBottom: 16 },
  modalName: { fontSize: 22, fontWeight: 'bold', color: '#111', marginBottom: 8 },
  modalMeta: { color: '#6b7280', marginBottom: 16 },
  modalLikeButton: { flexDirection: 'row', backgroundColor: '#a855f7', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  modalClose: { marginTop: 8 },
  modalCloseText: { color: '#111' },
  filterModal: { flex: 1, padding: 16, backgroundColor: '#fff' },
  filterTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, color: '#111' },
  filterClose: { marginTop: 12, padding: 12, backgroundColor: '#a855f7', borderRadius: 8, alignItems: 'center' },
  filterCloseText: { color: '#fff', fontWeight: '600' },
});
