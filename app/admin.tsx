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
import { router } from 'expo-router';
import { BarChart3, Users, Heart, MessageCircle, Plus, LogOut, AlertTriangle, Calendar, MapPin } from 'lucide-react-native';
import { Event, EventProfile, Like, Message, User } from '../lib/firebaseApi';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Admin() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState({
    totalEvents: 0,
    activeEvents: 0,
    futureEvents: 0,
    totalProfiles: 0,
    totalLikes: 0,
    totalMatches: 0,
    totalMessages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [adminEmail, setAdminEmail] = useState<string>('');

  useEffect(() => {
    initializeSession();
  }, []);

  const initializeSession = async () => {
    // Check if user is authenticated with Firebase
    const currentUser = User.getCurrentUser();
    
    if (!currentUser) {
      // No authenticated user, redirect to home
      router.replace('/home');
      return;
    }
    
    // Check if admin session is still valid (24 hours)
    const adminAccessTime = await AsyncStorage.getItem('adminAccessTime');
    if (adminAccessTime) {
      const accessTime = new Date(adminAccessTime);
      const now = new Date();
      const hoursDiff = (now.getTime() - accessTime.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff > 24) {
        // Admin session expired, sign out and redirect
        await User.signOut();
        await AsyncStorage.multiRemove(['isAdmin', 'adminAccessTime', 'adminEmail', 'adminUid']);
        router.replace('/home');
        return;
      }
    }
    
    // Set admin email for display
    setAdminEmail(currentUser.email || '');
    
    // Load events and stats
    await loadEvents();
    await loadAdminStats();
    setIsLoading(false);
  };

  const loadEvents = async () => {
    try {
      const allEvents = await Event.filter({});
      setEvents(allEvents);
    } catch (error) {
      console.error("Error loading events:", error);
    }
  };

  const loadAdminStats = async () => {
    try {
      // Load overall stats across all events
      const [allProfiles, allLikes, allMessages] = await Promise.all([
        EventProfile.filter({}),
        Like.filter({}),
        Message.filter({})
      ]);

      const mutualLikes = allLikes.filter((like: any) => like.is_mutual);
      const now = new Date();
      
      const activeEvents = events.filter(event => {
        const startDate = new Date(event.starts_at);
        const endDate = new Date(event.expires_at);
        return now >= startDate && now <= endDate;
      });

      const futureEvents = events.filter(event => {
        const startDate = new Date(event.starts_at);
        return now < startDate;
      });

      setStats({
        totalEvents: events.length,
        activeEvents: activeEvents.length,
        futureEvents: futureEvents.length,
        totalProfiles: allProfiles.length,
        totalLikes: allLikes.length,
        totalMatches: mutualLikes.length,
        totalMessages: allMessages.length,
      });
    } catch (error) {
      console.error("Error loading admin stats:", error);
    }
  };

  const handleCreateEvent = () => {
    // Navigate to event creation page
    router.push('/admin/create-event');
  };

  const handleEventPress = (event: Event) => {
    // Navigate to specific event details page
    router.push({
      pathname: '/admin/event-details',
      params: { eventId: event.id }
    });
  };

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              // Sign out from Firebase
              await User.signOut();
              
              // Clear all admin-related storage
              await AsyncStorage.multiRemove([
                'currentEventId',
                'currentSessionId',
                'currentEventCode',
                'currentProfileColor',
                'currentProfilePhotoUrl',
                'isAdmin',
                'adminAccessTime',
                'adminEmail',
                'adminUid',
                'adminSavedEmail',
                'adminSavedPassword',
                'adminRememberMe'
              ]);
              
              router.replace('/home');
            } catch (error) {
              console.error('Error during logout:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
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

  const getEventStatus = (event: Event) => {
    const now = new Date();
    const startDate = new Date(event.starts_at);
    const endDate = new Date(event.expires_at);
    
    if (now < startDate) return { text: 'Upcoming', color: '#3b82f6' };
    if (now >= startDate && now <= endDate) return { text: 'Active', color: '#10b981' };
    return { text: 'Ended', color: '#6b7280' };
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
      paddingTop: 60, // Extra padding for iPhone camera holder
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: isDark ? '#ffffff' : '#1f2937',
    },
    adminEmail: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
      marginTop: 4,
    },
    createButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark ? '#404040' : '#d1d5db',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#2d2d2d' : 'white',
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
    },
    statsSection: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: isDark ? '#ffffff' : '#1f2937',
      marginBottom: 12,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    statCard: {
      flex: 1,
      minWidth: '45%',
      backgroundColor: isDark ? '#2d2d2d' : 'white',
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    statIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: isDark ? '#404040' : '#f3f4f6',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    statNumber: {
      fontSize: 24,
      fontWeight: 'bold',
      color: isDark ? '#ffffff' : '#1f2937',
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
      textAlign: 'center',
    },
    eventsSection: {
      marginBottom: 24,
    },
    eventCard: {
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
    eventHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    eventName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: isDark ? '#ffffff' : '#1f2937',
      flex: 1,
      marginRight: 8,
    },
    eventStatus: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      fontSize: 12,
      fontWeight: '600',
    },
    eventDetails: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    eventDetailText: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
      marginLeft: 4,
    },
    actionsSection: {
      marginBottom: 24,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#2d2d2d' : 'white',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 3,
      gap: 12,
    },
    actionText: {
      fontSize: 16,
      color: isDark ? '#ffffff' : '#1f2937',
      fontWeight: '500',
    },
    logoutButton: {
      backgroundColor: isDark ? '#dc2626' : '#fef2f2',
      borderColor: isDark ? '#dc2626' : '#fecaca',
      borderWidth: 1,
    },
    logoutText: {
      color: isDark ? '#ffffff' : '#dc2626',
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
          <Text style={styles.loadingText}>Loading admin dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Admin Dashboard</Text>
          {adminEmail && (
            <Text style={styles.adminEmail}>{adminEmail}</Text>
          )}
        </View>
        <TouchableOpacity style={styles.createButton} onPress={handleCreateEvent}>
          <Plus size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* General Analytics */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>General Analytics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Calendar size={24} color="#3b82f6" />
              </View>
              <Text style={styles.statNumber}>{stats.totalEvents}</Text>
              <Text style={styles.statLabel}>Total Events</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <BarChart3 size={24} color="#10b981" />
              </View>
              <Text style={styles.statNumber}>{stats.activeEvents}</Text>
              <Text style={styles.statLabel}>Active Events</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Calendar size={24} color="#8b5cf6" />
              </View>
              <Text style={styles.statNumber}>{stats.futureEvents}</Text>
              <Text style={styles.statLabel}>Future Events</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Users size={24} color="#ec4899" />
              </View>
              <Text style={styles.statNumber}>{stats.totalProfiles}</Text>
              <Text style={styles.statLabel}>Total Profiles</Text>
            </View>
          </View>
        </View>

        {/* Events List */}
        <View style={styles.eventsSection}>
          <Text style={styles.sectionTitle}>Events</Text>
          {events.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No events created yet</Text>
              <TouchableOpacity style={styles.actionButton} onPress={handleCreateEvent}>
                <Plus size={20} color="#6b7280" />
                <Text style={styles.actionText}>Create Your First Event</Text>
              </TouchableOpacity>
            </View>
          ) : (
            events.map((event) => {
              const status = getEventStatus(event);
              return (
                <TouchableOpacity
                  key={event.id}
                  style={styles.eventCard}
                  onPress={() => handleEventPress(event)}
                >
                  <View style={styles.eventHeader}>
                    <Text style={styles.eventName}>{event.name}</Text>
                    <View style={[styles.eventStatus, { backgroundColor: status.color + '20' }]}>
                      <Text style={[styles.eventDetailText, { color: status.color }]}>
                        {status.text}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.eventDetails}>
                    <Text style={styles.eventDetailText}>Code: #{event.event_code}</Text>
                  </View>
                  
                  {event.location && (
                    <View style={styles.eventDetails}>
                      <MapPin size={14} color={isDark ? '#9ca3af' : '#6b7280'} />
                      <Text style={styles.eventDetailText}>{event.location}</Text>
                    </View>
                  )}
                  
                  <View style={styles.eventDetails}>
                    <Calendar size={14} color={isDark ? '#9ca3af' : '#6b7280'} />
                    <Text style={styles.eventDetailText}>
                      {formatDate(event.starts_at)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Admin Actions</Text>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/errorInsights')}
          >
            <AlertTriangle size={20} color="#ef4444" />
            <Text style={styles.actionText}>Error Insights</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.logoutButton]}
            onPress={handleLogout}
          >
            <LogOut size={20} color="#dc2626" />
            <Text style={[styles.actionText, styles.logoutText]}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 