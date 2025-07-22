import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { 
  ArrowLeft, 
  Users, 
  UserMinus, 
  Heart, 
  MessageCircle,
  Calendar,
  MapPin
} from 'lucide-react-native';
import { Event, EventProfile, Like, Message, User } from '../../lib/firebaseApi';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserWithStats extends EventProfile {
  likesGiven: number;
  likesReceived: number;
  messagesSent: number;
  messagesReceived: number;
  location?: string;
}

export default function ManageUsers() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { eventId, eventName } = useLocalSearchParams<{ eventId: string; eventName: string }>();
  
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);

  useEffect(() => {
    if (eventId) {
      loadUsers();
    }
  }, [eventId]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      
      // Load event details
      const eventData = await Event.get(eventId);
      if (!eventData) {
        Alert.alert('Error', 'Event not found');
        router.back();
        return;
      }
      setEvent(eventData);
      
      // Load all profiles for this event
      const profiles = await EventProfile.filter({ event_id: eventId });
      
      // Load likes and messages for stats
      const [likes, messages] = await Promise.all([
        Like.filter({ event_id: eventId }),
        Message.filter({ event_id: eventId })
      ]);

      // Calculate stats for each user
      const usersWithStats: UserWithStats[] = profiles.map(profile => {
        const likesGiven = likes.filter(like => like.from_profile_id === profile.id).length;
        const likesReceived = likes.filter(like => like.to_profile_id === profile.id).length;
        const messagesSent = messages.filter(msg => msg.from_profile_id === profile.id).length;
        const messagesReceived = messages.filter(msg => msg.to_profile_id === profile.id).length;

        return {
          ...profile,
          likesGiven,
          likesReceived,
          messagesSent,
          messagesReceived,
        };
      });

      setUsers(usersWithStats);
    } catch (error) {
      console.error("Error loading users:", error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    Alert.alert(
      "Delete User",
      `Are you sure you want to delete ${userName}? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Delete user profile
              await EventProfile.delete(userId);
              
              // Delete associated likes
              const userLikes = await Like.filter({ 
                event_id: eventId,
                from_profile_id: userId 
              });
              for (const like of userLikes) {
                await Like.delete(like.id);
              }
              
              // Delete associated messages
              const userMessages = await Message.filter({ 
                event_id: eventId,
                from_profile_id: userId 
              });
              for (const message of userMessages) {
                await Message.delete(message.id);
              }
              
              Alert.alert('Success', 'User deleted successfully');
              loadUsers(); // Reload the list
            } catch (error) {
              console.error('Error deleting user:', error);
              Alert.alert('Error', 'Failed to delete user');
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
    eventName: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
      marginTop: 4,
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
    },
    statsHeader: {
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
    statsTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: isDark ? '#ffffff' : '#1f2937',
      marginBottom: 12,
    },
    statsText: {
      fontSize: 16,
      color: isDark ? '#9ca3af' : '#6b7280',
    },
    usersSection: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: isDark ? '#ffffff' : '#1f2937',
      marginBottom: 12,
    },
    userCard: {
      backgroundColor: isDark ? '#2d2d2d' : 'white',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    userHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    userInfo: {
      flex: 1,
      marginRight: 12,
    },
    userName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: isDark ? '#ffffff' : '#1f2937',
      marginBottom: 4,
    },
    userEmail: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
      marginBottom: 4,
    },
    userDetails: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    userDetailText: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
      marginLeft: 4,
    },
    deleteButton: {
      backgroundColor: isDark ? '#dc2626' : '#fef2f2',
      borderColor: isDark ? '#dc2626' : '#fecaca',
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    deleteButtonText: {
      color: isDark ? '#ffffff' : '#dc2626',
      fontSize: 12,
      fontWeight: '600',
    },
    userStats: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 12,
    },
    statItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#404040' : '#f3f4f6',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    statText: {
      fontSize: 12,
      color: isDark ? '#9ca3af' : '#6b7280',
      marginLeft: 4,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyStateText: {
      fontSize: 16,
      color: isDark ? '#9ca3af' : '#6b7280',
      textAlign: 'center',
      marginTop: 12,
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={20} color={isDark ? '#ffffff' : '#1f2937'} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Manage Users</Text>
          {eventName && (
            <Text style={styles.eventName}>{eventName}</Text>
          )}
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Stats Header */}
        <View style={styles.statsHeader}>
          <Text style={styles.statsTitle}>Event Overview</Text>
          <Text style={styles.statsText}>Total Users: {users.length}</Text>
        </View>

        {/* Users List */}
        <View style={styles.usersSection}>
          <Text style={styles.sectionTitle}>Users</Text>
          {users.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No users found for this event</Text>
            </View>
          ) : (
            users.map((user) => (
              <View key={user.id} style={styles.userCard}>
                <View style={styles.userHeader}>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.first_name}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                    
                    <View style={styles.userDetails}>
                      <Text style={styles.userDetailText}>
                        Age: {user.age} • {user.gender_identity}
                      </Text>
                    </View>
                    
                    {user.location && (
                      <View style={styles.userDetails}>
                        <MapPin size={14} color={isDark ? '#9ca3af' : '#6b7280'} />
                        <Text style={styles.userDetailText}>{user.location}</Text>
                      </View>
                    )}
                    
                    <View style={styles.userDetails}>
                      <Calendar size={14} color={isDark ? '#9ca3af' : '#6b7280'} />
                      <Text style={styles.userDetailText}>
                        Joined: {formatDate(user.created_at)}
                      </Text>
                    </View>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => handleDeleteUser(user.id, user.first_name)}
                  >
                    <UserMinus size={16} color={isDark ? '#ffffff' : '#dc2626'} />
                  </TouchableOpacity>
                </View>
                
                {/* User Stats */}
                <View style={styles.userStats}>
                  <View style={styles.statItem}>
                    <Heart size={12} color="#ec4899" />
                    <Text style={styles.statText}>{user.likesGiven} given</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Heart size={12} color="#10b981" />
                    <Text style={styles.statText}>{user.likesReceived} received</Text>
                  </View>
                  <View style={styles.statItem}>
                    <MessageCircle size={12} color="#8b5cf6" />
                    <Text style={styles.statText}>{user.messagesSent} sent</Text>
                  </View>
                  <View style={styles.statItem}>
                    <MessageCircle size={12} color="#3b82f6" />
                    <Text style={styles.statText}>{user.messagesReceived} received</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 