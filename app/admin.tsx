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
} from 'react-native';
import { router } from 'expo-router';
import { BarChart3, Users, Heart, MessageCircle, Settings, LogOut, AlertTriangle } from 'lucide-react-native';
import { Event, EventProfile, Like, Message } from '../lib/firebaseApi';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Admin() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [currentEvent, setCurrentEvent] = useState<any>(null);
  const [stats, setStats] = useState({
    totalProfiles: 0,
    totalLikes: 0,
    totalMatches: 0,
    totalMessages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeSession();
  }, []);

  const initializeSession = async () => {
    // Check if user has admin access
    const isAdmin = await AsyncStorage.getItem('isAdmin');
    const adminAccessTime = await AsyncStorage.getItem('adminAccessTime');
    
    if (!isAdmin || !adminAccessTime) {
      router.replace('/home');
      return;
    }
    
    // Check if admin session is still valid (24 hours)
    const accessTime = new Date(adminAccessTime);
    const now = new Date();
    const hoursDiff = (now.getTime() - accessTime.getTime()) / (1000 * 60 * 60);
    
    if (hoursDiff > 24) {
      // Admin session expired, clear and redirect
      await AsyncStorage.multiRemove(['isAdmin', 'adminAccessTime']);
      router.replace('/home');
      return;
    }
    
    // For admin access, we don't need a specific event
    // Admin can view all events or select one
    setCurrentEvent({ 
      name: 'Admin Dashboard', 
      event_code: 'ADMIN',
      is_active: true 
    });
    
    // Load overall stats or allow event selection
    await loadAdminStats();
    setIsLoading(false);
  };

  const loadStats = async (eventId: string) => {
    try {
      const [profiles, likes, messages] = await Promise.all([
        EventProfile.filter({ event_id: eventId }),
        Like.filter({ event_id: eventId }),
        Message.filter({ event_id: eventId })
      ]);

      const mutualLikes = likes.filter(like => like.is_mutual);

      setStats({
        totalProfiles: profiles.length,
        totalLikes: likes.length,
        totalMatches: mutualLikes.length,
        totalMessages: messages.length,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
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

      setStats({
        totalProfiles: allProfiles.length,
        totalLikes: allLikes.length,
        totalMatches: mutualLikes.length,
        totalMessages: allMessages.length,
      });
    } catch (error) {
      console.error("Error loading admin stats:", error);
    }
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
            await AsyncStorage.multiRemove([
              'currentEventId',
              'currentSessionId',
              'currentEventCode',
              'currentProfileColor',
              'currentProfilePhotoUrl',
              'isAdmin',
              'adminAccessTime'
            ]);
            router.replace('/home');
          }
        }
      ]
    );
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
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: isDark ? '#ffffff' : '#1f2937',
    },
    settingsButton: {
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
    eventSection: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: isDark ? '#ffffff' : '#1f2937',
      marginBottom: 12,
    },
    eventCard: {
      backgroundColor: isDark ? '#2d2d2d' : 'white',
      borderRadius: 12,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    eventName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: isDark ? '#ffffff' : '#1f2937',
      marginBottom: 4,
    },
    eventCode: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
      marginBottom: 4,
    },
    eventStatus: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
    },
    statsSection: {
      marginBottom: 24,
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
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading admin dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <TouchableOpacity style={styles.settingsButton}>
          <Settings size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Event Info */}
        <View style={styles.eventSection}>
          <Text style={styles.sectionTitle}>Event Information</Text>
          <View style={styles.eventCard}>
            <Text style={styles.eventName}>{currentEvent?.name}</Text>
            <Text style={styles.eventCode}>Code: {currentEvent?.event_code}</Text>
            <Text style={styles.eventStatus}>
              Status: {currentEvent?.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Event Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Users size={24} color="#3b82f6" />
              </View>
              <Text style={styles.statNumber}>{stats.totalProfiles}</Text>
              <Text style={styles.statLabel}>Total Profiles</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Heart size={24} color="#ec4899" />
              </View>
              <Text style={styles.statNumber}>{stats.totalLikes}</Text>
              <Text style={styles.statLabel}>Total Likes</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <BarChart3 size={24} color="#10b981" />
              </View>
              <Text style={styles.statNumber}>{stats.totalMatches}</Text>
              <Text style={styles.statLabel}>Total Matches</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <MessageCircle size={24} color="#8b5cf6" />
              </View>
              <Text style={styles.statNumber}>{stats.totalMessages}</Text>
              <Text style={styles.statLabel}>Total Messages</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Admin Actions</Text>
          
          <TouchableOpacity style={styles.actionButton}>
            <BarChart3 size={20} color="#6b7280" />
            <Text style={styles.actionText}>View Analytics</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Users size={20} color="#6b7280" />
            <Text style={styles.actionText}>Manage Users</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Settings size={20} color="#6b7280" />
            <Text style={styles.actionText}>Event Settings</Text>
          </TouchableOpacity>
          
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
    </View>
  );
} 