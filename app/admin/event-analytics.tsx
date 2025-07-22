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
  BarChart3, 
  Users, 
  Heart, 
  MessageCircle,
  Calendar,
  TrendingUp,
  TrendingDown,
  Activity
} from 'lucide-react-native';
import { Event, EventProfile, Like, Message, User } from '../../lib/firebaseApi';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AnalyticsData {
  totalProfiles: number;
  totalLikes: number;
  totalMatches: number;
  totalMessages: number;
  activeUsers: number;
  engagementRate: number;
  averageLikesPerUser: number;
  averageMessagesPerUser: number;
  genderDistribution: {
    male: number;
    female: number;
    other: number;
  };
  ageDistribution: {
    '18-25': number;
    '26-35': number;
    '36-45': number;
    '45+': number;
  };
  hourlyActivity: { [key: string]: number };
  dailyActivity: { [key: string]: number };
}

export default function EventAnalytics() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { eventId, eventName } = useLocalSearchParams<{ eventId: string; eventName: string }>();
  
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);

  useEffect(() => {
    if (eventId) {
      loadAnalytics();
    }
  }, [eventId]);

  const loadAnalytics = async () => {
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
      
      // Load all data for this event
      const [profiles, likes, messages] = await Promise.all([
        EventProfile.filter({ event_id: eventId }),
        Like.filter({ event_id: eventId }),
        Message.filter({ event_id: eventId })
      ]);

      // Calculate analytics
      const mutualLikes = likes.filter(like => like.is_mutual);
      const activeUsers = profiles.filter(profile => {
        const userLikes = likes.filter(like => like.from_profile_id === profile.id || like.to_profile_id === profile.id);
        const userMessages = messages.filter(msg => msg.from_profile_id === profile.id || msg.to_profile_id === profile.id);
        return userLikes.length > 0 || userMessages.length > 0;
      }).length;

      // Gender distribution
      const genderDistribution = {
        male: profiles.filter(p => p.gender_identity.toLowerCase().includes('male')).length,
        female: profiles.filter(p => p.gender_identity.toLowerCase().includes('female')).length,
        other: profiles.filter(p => !p.gender_identity.toLowerCase().includes('male') && !p.gender_identity.toLowerCase().includes('female')).length,
      };

      // Age distribution
      const ageDistribution = {
        '18-25': profiles.filter(p => p.age >= 18 && p.age <= 25).length,
        '26-35': profiles.filter(p => p.age >= 26 && p.age <= 35).length,
        '36-45': profiles.filter(p => p.age >= 36 && p.age <= 45).length,
        '45+': profiles.filter(p => p.age > 45).length,
      };

      // Calculate engagement rate
      const engagementRate = profiles.length > 0 ? (activeUsers / profiles.length) * 100 : 0;
      const averageLikesPerUser = profiles.length > 0 ? likes.length / profiles.length : 0;
      const averageMessagesPerUser = profiles.length > 0 ? messages.length / profiles.length : 0;

      // Hourly activity (simplified - you can enhance this with actual timestamps)
      const hourlyActivity: { [key: string]: number } = {};
      for (let i = 0; i < 24; i++) {
        hourlyActivity[`${i}:00`] = Math.floor(Math.random() * 10); // Placeholder data
      }

      // Daily activity (simplified)
      const dailyActivity: { [key: string]: number } = {};
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      days.forEach(day => {
        dailyActivity[day] = Math.floor(Math.random() * 20); // Placeholder data
      });

      setAnalytics({
        totalProfiles: profiles.length,
        totalLikes: likes.length,
        totalMatches: mutualLikes.length,
        totalMessages: messages.length,
        activeUsers,
        engagementRate,
        averageLikesPerUser,
        averageMessagesPerUser,
        genderDistribution,
        ageDistribution,
        hourlyActivity,
        dailyActivity,
      });
    } catch (error) {
      console.error("Error loading analytics:", error);
      Alert.alert('Error', 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const formatNumber = (value: number) => {
    return value.toFixed(1);
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
    overviewSection: {
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
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: isDark ? '#ffffff' : '#1f2937',
      marginBottom: 16,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    statCard: {
      flex: 1,
      minWidth: '45%',
      backgroundColor: isDark ? '#404040' : '#f3f4f6',
      borderRadius: 8,
      padding: 12,
      alignItems: 'center',
    },
    statNumber: {
      fontSize: 20,
      fontWeight: 'bold',
      color: isDark ? '#ffffff' : '#1f2937',
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      color: isDark ? '#9ca3af' : '#6b7280',
      textAlign: 'center',
    },
    metricSection: {
      backgroundColor: isDark ? '#2d2d2d' : 'white',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    metricRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#404040' : '#e5e7eb',
    },
    metricLabel: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
    },
    metricValue: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#ffffff' : '#1f2937',
    },
    distributionSection: {
      backgroundColor: isDark ? '#2d2d2d' : 'white',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    distributionItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    distributionLabel: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
    },
    distributionValue: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#ffffff' : '#1f2937',
    },
    activitySection: {
      backgroundColor: isDark ? '#2d2d2d' : 'white',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    activityChart: {
      height: 100,
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      paddingTop: 16,
    },
    activityBar: {
      backgroundColor: '#8b5cf6',
      borderRadius: 2,
      minWidth: 8,
    },
    activityLabel: {
      fontSize: 10,
      color: isDark ? '#9ca3af' : '#6b7280',
      textAlign: 'center',
      marginTop: 4,
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!analytics) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>No analytics data available</Text>
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
          <Text style={styles.headerTitle}>Event Analytics</Text>
          {eventName && (
            <Text style={styles.eventName}>{eventName}</Text>
          )}
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Overview Stats */}
        <View style={styles.overviewSection}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{analytics.totalProfiles}</Text>
              <Text style={styles.statLabel}>Total Users</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{analytics.totalLikes}</Text>
              <Text style={styles.statLabel}>Total Likes</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{analytics.totalMatches}</Text>
              <Text style={styles.statLabel}>Total Matches</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{analytics.totalMessages}</Text>
              <Text style={styles.statLabel}>Total Messages</Text>
            </View>
          </View>
        </View>

        {/* Key Metrics */}
        <View style={styles.metricSection}>
          <Text style={styles.sectionTitle}>Key Metrics</Text>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Active Users</Text>
            <Text style={styles.metricValue}>{analytics.activeUsers}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Engagement Rate</Text>
            <Text style={styles.metricValue}>{formatPercentage(analytics.engagementRate)}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Avg Likes per User</Text>
            <Text style={styles.metricValue}>{formatNumber(analytics.averageLikesPerUser)}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Avg Messages per User</Text>
            <Text style={styles.metricValue}>{formatNumber(analytics.averageMessagesPerUser)}</Text>
          </View>
        </View>

        {/* Gender Distribution */}
        <View style={styles.distributionSection}>
          <Text style={styles.sectionTitle}>Gender Distribution</Text>
          <View style={styles.distributionItem}>
            <Text style={styles.distributionLabel}>Male</Text>
            <Text style={styles.distributionValue}>{analytics.genderDistribution.male}</Text>
          </View>
          <View style={styles.distributionItem}>
            <Text style={styles.distributionLabel}>Female</Text>
            <Text style={styles.distributionValue}>{analytics.genderDistribution.female}</Text>
          </View>
          <View style={styles.distributionItem}>
            <Text style={styles.distributionLabel}>Other</Text>
            <Text style={styles.distributionValue}>{analytics.genderDistribution.other}</Text>
          </View>
        </View>

        {/* Age Distribution */}
        <View style={styles.distributionSection}>
          <Text style={styles.sectionTitle}>Age Distribution</Text>
          <View style={styles.distributionItem}>
            <Text style={styles.distributionLabel}>18-25</Text>
            <Text style={styles.distributionValue}>{analytics.ageDistribution['18-25']}</Text>
          </View>
          <View style={styles.distributionItem}>
            <Text style={styles.distributionLabel}>26-35</Text>
            <Text style={styles.distributionValue}>{analytics.ageDistribution['26-35']}</Text>
          </View>
          <View style={styles.distributionItem}>
            <Text style={styles.distributionLabel}>36-45</Text>
            <Text style={styles.distributionValue}>{analytics.ageDistribution['36-45']}</Text>
          </View>
          <View style={styles.distributionItem}>
            <Text style={styles.distributionLabel}>45+</Text>
            <Text style={styles.distributionValue}>{analytics.ageDistribution['45+']}</Text>
          </View>
        </View>

        {/* Daily Activity */}
        <View style={styles.activitySection}>
          <Text style={styles.sectionTitle}>Daily Activity</Text>
          <View style={styles.activityChart}>
            {Object.entries(analytics.dailyActivity).map(([day, value]) => (
              <View key={day} style={{ alignItems: 'center', flex: 1 }}>
                <View 
                  style={[
                    styles.activityBar, 
                    { 
                      height: Math.max(10, (value / Math.max(...Object.values(analytics.dailyActivity))) * 60),
                      backgroundColor: value > 10 ? '#10b981' : '#8b5cf6'
                    }
                  ]} 
                />
                <Text style={styles.activityLabel}>{day}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 