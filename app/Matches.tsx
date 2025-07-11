import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { auth, db  } from '../lib/firebaseConfig';
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { Heart, MessageCircle, Users, Sparkles } from 'lucide-react-native';
import ChatModal from '../components/modals/ChatModal';
console.log('ChatModal', ChatModal); // should log a function

type Like = {
  id: string;
  liker_session_id: string;
  liked_session_id: string;
  is_mutual: boolean;
  liker_notified_of_match?: boolean;
  liked_notified_of_match?: boolean;
};


export default function MatchesScreen() {
  console.log('Rendering MatchesScreen'); // Debugging line to check if the component is rendering
  const navigation = useNavigation();
  const [matches, setMatches] = useState<any[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const markMatchesAsNotified = useCallback(async (profiles: any[]) => {
    const sessionId = await AsyncStorage.getItem('currentSessionId');
    const eventId = await AsyncStorage.getItem('currentEventId');
    if (!sessionId || !eventId || profiles.length === 0) return;
    const allSnap = await getDocs(
      query(collection(db, 'events', eventId, 'likes'), where('is_mutual', '==', true))
    );
    const all: Like[] = allSnap.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        liker_session_id: data.liker_session_id,
        liked_session_id: data.liked_session_id,
        is_mutual: data.is_mutual,
        liker_notified_of_match: data.liker_notified_of_match,
        liked_notified_of_match: data.liked_notified_of_match,
      };
    });
  }, []);

  const loadMatches = useCallback(async () => {
    const sessionId = await AsyncStorage.getItem('currentSessionId');
    const eventId = await AsyncStorage.getItem('currentEventId');
    if (!sessionId || !eventId) { setIsLoading(false); return; }
    try {
      const myLikesSnap = await getDocs(
        query(
          collection(db, 'events', eventId, 'likes'),
          where('liker_session_id', '==', sessionId),
          where('is_mutual', '==', true)
        )
      );
      const myLikes = myLikesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const likesToMeSnap = await getDocs(
        query(
          collection(db, 'events', eventId, 'likes'),
          where('liked_session_id', '==', sessionId),
          where('is_mutual', '==', true)
        )
      );
      const likesToMe = likesToMeSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const ids = new Set([
        ...myLikes.map((l: any) => l.liked_session_id),
        ...likesToMe.map((l: any) => l.liker_session_id),
      ]);
      if (ids.size === 0) { setMatches([]); setIsLoading(false); return; }

      const profileSnap = await getDocs(collection(db, 'events', eventId, 'profiles'));
      const profiles = profileSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((p: any) => ids.has(p.session_id));

      const withCounts = await Promise.all(profiles.map(async (p: any) => {
        const participants = [sessionId, p.session_id].sort();
        const matchId = `${participants[0]}_${participants[1]}`;
        const unreadSnap = await getDocs(
          query(
            collection(db, 'events', eventId, 'messages'),
            where('match_id', '==', matchId),
            where('receiver_session_id', '==', sessionId),
            where('is_read', '==', false)
          )
        );
        return { ...p, unreadCount: unreadSnap.size };
      }));
      setMatches(withCounts.filter(Boolean));
      if (profiles.length > 0) markMatchesAsNotified(profiles);
    } catch (e) { console.log('Error loading matches', e); }
    setIsLoading(false);
  }, [markMatchesAsNotified]);

  useEffect(() => {
    loadMatches();
    const id = setInterval(loadMatches, 45000);
    return () => clearInterval(id);
  }, [loadMatches]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ec4899" />
        <Text style={styles.loadingText}>Loading your matches...</Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <View style={styles.cardLeft}>
          <View style={styles.avatarWrapper}>
            {item.profile_photo_url ? (
              <Image source={{ uri: item.profile_photo_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.placeholder, { backgroundColor: item.profile_color }]}>
                <Text style={styles.placeholderText}>{item.first_name[0]}</Text>
              </View>
            )}
            <View style={styles.sparkles}>
              <Sparkles size={12} color="#fff" />
            </View>
          </View>
          <View>
            <Text style={styles.name}>{item.first_name}</Text>
            <Text style={styles.age}>{item.age} years old</Text>
            <View style={styles.interestsRow}>
              {item.interests?.slice(0,2).map((i: string) => (
                <View key={i} style={styles.badge}><Text style={styles.badgeText}>{i}</Text></View>
              ))}
              {item.interests?.length > 2 && (
                <View style={styles.badge}><Text style={styles.badgeText}>+{item.interests.length - 2}</Text></View>
              )}
            </View>
          </View>
        </View>
        <View style={styles.cardRight}>
          <TouchableOpacity style={styles.msgBtn} onPress={() => setSelectedMatch(item)}>
            <MessageCircle size={20} color="#fff" />
          </TouchableOpacity>
          {item.unreadCount > 0 && (
            <View style={styles.unread}><Text style={styles.unreadText}>{item.unreadCount}</Text></View>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIcon}><Heart size={32} color="#fff" /></View>
        <Text style={styles.headerTitle}>Your Matches</Text>
        <Text style={styles.headerSubtitle}>
          {matches.length} mutual {matches.length === 1 ? 'connection' : 'connections'} at this event
        </Text>
      </View>
      <FlatList
        data={matches}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
      {matches.length === 0 && (
        <View style={styles.emptyCard}>
          <Users size={64} color="#9ca3af" />
          <Text style={styles.emptyTitle}>No matches yet</Text>
          <Text style={styles.emptyText}>
            Start liking profiles to find your matches! When someone likes you back, they'll appear here.
          </Text>
          <TouchableOpacity style={styles.discoverBtn} onPress={() => navigation.navigate('Discovery' as never)}>
            <Text style={styles.discoverText}>Discover Singles</Text>
          </TouchableOpacity>
        </View>
      )}
      {selectedMatch && (
        <ChatModal
          match={selectedMatch}
          onClose={() => { setSelectedMatch(null); loadMatches(); }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f5f8ff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f8ff' },
  loadingText: { marginTop: 8, color: '#6b7280' },
  header: { alignItems: 'center', marginBottom: 16 },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#ec4899',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111' },
  headerSubtitle: { color: '#6b7280', marginTop: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  cardContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLeft: { flexDirection: 'row', alignItems: 'center' },
  avatarWrapper: { marginRight: 12 },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  placeholder: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  sparkles: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ec4899',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontWeight: '600', color: '#111', fontSize: 16 },
  age: { color: '#6b7280', fontSize: 12 },
  interestsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  badge: { backgroundColor: '#f5f3ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginRight: 4, marginTop: 2 },
  badgeText: { fontSize: 10, color: '#6b21a8' },
  cardRight: { alignItems: 'center' },
  msgBtn: {
    backgroundColor: '#ec4899',
    padding: 8,
    borderRadius: 24,
  },
  unread: {
    marginTop: 4,
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  unreadText: { color: '#fff', fontSize: 10 },
  emptyCard: { marginTop: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginVertical: 8, color: '#111' },
  emptyText: { color: '#6b7280', textAlign: 'center', marginBottom: 12 },
  discoverBtn: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  discoverText: { color: '#fff', fontWeight: '600' },
});
