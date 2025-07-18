import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { router } from 'expo-router';
import { Heart, MessageCircle, Users, User } from 'lucide-react-native';
import { EventProfile, Like, Event } from '../lib/firebaseApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Matches() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [matches, setMatches] = useState<any[]>([]);
  const [currentEvent, setCurrentEvent] = useState<any>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

    setCurrentSessionId(sessionId);
    
    try {
      const events = await Event.filter({ id: eventId });
      if (events.length > 0) {
        setCurrentEvent(events[0]);
      } else {
        router.replace('/home');
        return;
      }

      await loadMatches(eventId, sessionId);
    } catch (error) {
      console.error("Error initializing session:", error);
    }
    setIsLoading(false);
  };

  const loadMatches = async (eventId: string, sessionId: string) => {
    try {
      // Get all mutual likes for this user
      const mutualLikes = await Like.filter({ 
        event_id: eventId,
        is_mutual: true 
      });

      // Filter to only include likes where this user is involved
      const userMatches = mutualLikes.filter(like => 
        like.liker_session_id === sessionId || like.liked_session_id === sessionId
      );

      // Get the other person's session ID for each match
      const otherSessionIds = userMatches.map(like => 
        like.liker_session_id === sessionId ? like.liked_session_id : like.liker_session_id
      );

      // Get profiles for all matched users (Firebase doesn't support $in, so we need to fetch individually)
      const matchedProfiles = [];
      for (const sessionId of otherSessionIds) {
        const profiles = await EventProfile.filter({
          session_id: sessionId,
          event_id: eventId
        });
        if (profiles.length > 0) {
          matchedProfiles.push(profiles[0]);
        }
      }

      setMatches(matchedProfiles);
    } catch (error) {
      console.error("Error loading matches:", error);
    }
  };

  const handleProfileTap = (profile: any) => {
    // TODO: Navigate to chat or profile detail
    console.log('Profile tapped:', profile.first_name);
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
    headerIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: isDark ? '#2d2d2d' : '#fef2f2',
      alignItems: 'center',
      justifyContent: 'center',
    },
    matchesContainer: {
      flex: 1,
      paddingHorizontal: 16,
    },
    matchesList: {
      gap: 12,
    },
    matchCard: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#2d2d2d' : 'white',
      borderRadius: 16,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    matchImageContainer: {
      marginRight: 16,
    },
    matchImage: {
      width: 80,
      height: 80,
      borderRadius: 40,
    },
    fallbackAvatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#404040' : '#cccccc',
    },
    fallbackText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: 'white',
    },
    matchInfo: {
      flex: 1,
      justifyContent: 'center',
    },
    matchName: {
      fontSize: 18,
      fontWeight: '600',
      color: isDark ? '#ffffff' : '#1f2937',
      marginBottom: 4,
    },
    matchAge: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
      marginBottom: 12,
    },
    matchActions: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#404040' : '#f3f4f6',
      borderRadius: 20,
      paddingVertical: 8,
      paddingHorizontal: 12,
      gap: 6,
    },
    actionText: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
      fontWeight: '500',
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
    browseButton: {
      backgroundColor: '#8b5cf6',
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 24,
    },
    browseButtonText: {
      fontSize: 16,
      color: 'white',
      fontWeight: '600',
      textAlign: 'center',
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
      color: '#8b5cf6',
    },
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading your matches...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>
            Your Matches
          </Text>
          <Text style={styles.subtitle}>
            {matches.length} mutual connection{matches.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.headerIcon}>
          <Heart size={24} color="#ec4899" fill="#ec4899" />
        </View>
      </View>

      {/* Matches List */}
      <ScrollView style={styles.matchesContainer}>
        {matches.length > 0 ? (
          <View style={styles.matchesList}>
            {matches.map((match) => (
              <TouchableOpacity
                key={match.id}
                style={styles.matchCard}
                onPress={() => handleProfileTap(match)}
              >
                <View style={styles.matchImageContainer}>
                  {match.profile_photo_url ? (
                    <Image
                      source={{ uri: match.profile_photo_url }}
                      style={styles.matchImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.fallbackAvatar}>
                      <Text style={styles.fallbackText}>{match.first_name[0]}</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.matchInfo}>
                  <Text style={styles.matchName}>{match.first_name}</Text>
                  <Text style={styles.matchAge}>{match.age} years old</Text>
                  <View style={styles.matchActions}>
                    <TouchableOpacity style={styles.actionButton}>
                      <MessageCircle size={16} color="#6b7280" />
                      <Text style={styles.actionText}>Message</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Heart size={64} color="#9ca3af" />
            <Text style={styles.emptyTitle}>No matches yet</Text>
            <Text style={styles.emptyText}>
              Keep browsing and liking profiles to find your matches!
            </Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => router.push('/discovery')}
            >
              <Text style={styles.browseButtonText}>Browse Singles</Text>
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
          style={styles.navButton}
          onPress={() => router.push('/discovery')}
        >
          <Users size={24} color="#9ca3af" />
          <Text style={styles.navButtonText}>Discover</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.navButton, styles.navButtonActive]}
          onPress={() => {}} // Already on matches page
        >
          <MessageCircle size={24} color="#8b5cf6" />
          <Text style={[styles.navButtonText, styles.navButtonTextActive]}>Matches</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
} 