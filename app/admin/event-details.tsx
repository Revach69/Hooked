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
  Share,
  Linking,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { 
  ArrowLeft, 
  BarChart3, 
  Users, 
  Heart, 
  MessageCircle, 
  Edit, 
  Download, 
  QrCode, 
  Trash2,
  MapPin,
  Calendar,
  Clock,
  Share2,
  Copy,
  UserMinus
} from 'lucide-react-native';
import { EventAPI, EventProfileAPI, LikeAPI, MessageAPI, type Event } from '../../lib/firebaseApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRCode from 'react-native-qrcode-svg';

export default function EventDetails() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [stats, setStats] = useState({
    totalProfiles: 0,
    totalLikes: 0,
    totalMatches: 0,
    totalMessages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [qrCodeValue, setQrCodeValue] = useState('');

  useEffect(() => {
    if (eventId) {
      loadEventDetails();
    }
  }, [eventId]);

  const loadEventDetails = async () => {
    try {
      setIsLoading(true);
      
      // Load event details
      const eventData = await EventAPI.get(eventId);
      if (!eventData) {
        Alert.alert('Error', 'Event not found');
        router.back();
        return;
      }
      
      setEvent(eventData);
      
      // Generate join URL and QR code
      const joinUrl = `https://www.hooked-app.com/join-instant?code=${eventData.event_code}`;
      setQrCodeValue(joinUrl);
      
      // Load event stats
      const [profiles, likes, messages] = await Promise.all([
        EventProfileAPI.filter({ event_id: eventId }),
        LikeAPI.filter({ event_id: eventId }),
        MessageAPI.filter({ event_id: eventId })
      ]);

      const mutualLikes = likes.filter((like: any) => like.is_mutual);

      setStats({
        totalProfiles: profiles.length,
        totalLikes: likes.length,
        totalMatches: mutualLikes.length,
        totalMessages: messages.length,
      });
    } catch (error) {
      console.error("Error loading event details:", error);
      Alert.alert('Error', 'Failed to load event details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleEditEvent = () => {
    router.push({
      pathname: '/admin/edit-event',
      params: { eventId: eventId }
    });
  };

  const handleAnalytics = () => {
    router.push({
      pathname: '/admin/event-analytics',
      params: { eventId: eventId, eventName: event?.name }
    });
  };

  const handleManageUsers = () => {
    router.push({
      pathname: '/admin/manage-users',
      params: { eventId: eventId, eventName: event?.name }
    });
  };

  const handleDeleteEvent = async () => {
    Alert.alert(
      "Delete Event",
      "Are you sure you want to delete this event? This action cannot be undone.",
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
              await EventAPI.delete(eventId);
              Alert.alert('Success', 'Event deleted successfully');
              router.back();
            } catch (error) {
              console.error('Error deleting event:', error);
              Alert.alert('Error', 'Failed to delete event');
            }
          }
        }
      ]
    );
  };

  const handleShareEvent = async () => {
    if (!event) return;
    
    const joinUrl = `https://www.hooked-app.com/join-instant?code=${event.event_code}`;
    
    try {
      await Share.share({
        message: `Join ${event.name} on Hooked!\n\nEvent Code: ${event.event_code}\nJoin Link: ${joinUrl}`,
        title: event.name,
      });
    } catch (error) {
      console.error('Error sharing event:', error);
    }
  };

  const handleCopyJoinUrl = async () => {
    if (!event) return;
    
    const joinUrl = `https://www.hooked-app.com/join-instant?code=${event.event_code}`;
    
    try {
      // For React Native, you might need to use a clipboard library
      // For now, we'll just show the URL
      Alert.alert('Join URL', joinUrl);
    } catch (error) {
      console.error('Error copying URL:', error);
    }
  };

  const handleDownloadQR = () => {
    // This would require additional setup for saving images
    Alert.alert('Download QR', 'QR code download feature will be implemented soon!');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
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
    content: {
      flex: 1,
      paddingHorizontal: 16,
    },
    eventHeader: {
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
    eventName: {
      fontSize: 24,
      fontWeight: 'bold',
      color: isDark ? '#ffffff' : '#1f2937',
      marginBottom: 8,
    },
    eventCode: {
      fontSize: 16,
      color: isDark ? '#9ca3af' : '#6b7280',
      marginBottom: 8,
    },
    eventStatus: {
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      marginBottom: 12,
    },
    eventStatusText: {
      fontSize: 14,
      fontWeight: '600',
    },
    eventDetails: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    eventDetailText: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
      marginLeft: 8,
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
    qrSection: {
      backgroundColor: isDark ? '#2d2d2d' : 'white',
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    qrContainer: {
      backgroundColor: 'white',
      padding: 16,
      borderRadius: 8,
      marginBottom: 16,
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
    deleteButton: {
      backgroundColor: isDark ? '#dc2626' : '#fef2f2',
      borderColor: isDark ? '#dc2626' : '#fecaca',
      borderWidth: 1,
    },
    deleteText: {
      color: isDark ? '#ffffff' : '#dc2626',
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading event details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Event not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const status = getEventStatus(event);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={20} color={isDark ? '#ffffff' : '#1f2937'} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Event Details</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Event Header */}
        <View style={styles.eventHeader}>
          <Text style={styles.eventName}>{event.name}</Text>
          <Text style={styles.eventCode}>Code: #{event.event_code}</Text>
          <View style={[styles.eventStatus, { backgroundColor: status.color + '20' }]}>
            <Text style={[styles.eventStatusText, { color: status.color }]}>
              {status.text}
            </Text>
          </View>
          
          {event.location && (
            <View style={styles.eventDetails}>
              <MapPin size={16} color={isDark ? '#9ca3af' : '#6b7280'} />
              <Text style={styles.eventDetailText}>{event.location}</Text>
            </View>
          )}
          
          <View style={styles.eventDetails}>
            <Calendar size={16} color={isDark ? '#9ca3af' : '#6b7280'} />
            <Text style={styles.eventDetailText}>
              Starts: {formatDate(event.starts_at)}
            </Text>
          </View>
          
          <View style={styles.eventDetails}>
            <Clock size={16} color={isDark ? '#9ca3af' : '#6b7280'} />
            <Text style={styles.eventDetailText}>
              Expires: {formatDate(event.expires_at)}
            </Text>
          </View>
        </View>

        {/* Event Statistics */}
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

        {/* QR Code Section */}
        <View style={styles.qrSection}>
          <Text style={styles.sectionTitle}>QR Code</Text>
          {qrCodeValue && (
            <View style={styles.qrContainer}>
              <QRCode
                value={qrCodeValue}
                size={200}
                color="black"
                backgroundColor="white"
              />
            </View>
          )}
          <TouchableOpacity style={styles.actionButton} onPress={handleDownloadQR}>
            <Download size={20} color="#6b7280" />
            <Text style={styles.actionText}>Download QR Code</Text>
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Event Actions</Text>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleAnalytics}>
            <BarChart3 size={20} color="#6b7280" />
            <Text style={styles.actionText}>View Analytics</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleManageUsers}>
            <Users size={20} color="#6b7280" />
            <Text style={styles.actionText}>Manage Users</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleShareEvent}>
            <Share2 size={20} color="#6b7280" />
            <Text style={styles.actionText}>Share Event</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleCopyJoinUrl}>
            <Copy size={20} color="#6b7280" />
            <Text style={styles.actionText}>Copy Join URL</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleEditEvent}>
            <Edit size={20} color="#6b7280" />
            <Text style={styles.actionText}>Edit Event</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]}
            onPress={handleDeleteEvent}
          >
            <Trash2 size={20} color="#dc2626" />
            <Text style={[styles.actionText, styles.deleteText]}>Delete Event</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 