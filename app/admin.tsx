import React, { useState, useEffect, useCallback } from 'react';
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
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { BarChart3, Users, Plus, LogOut, Calendar, MapPin, Home, ChevronDown, ChevronUp, QrCode, Edit, Download, Flag } from 'lucide-react-native';
import { EventAPI, EventProfileAPI, LikeAPI, MessageAPI, AuthAPI, type Event } from '../lib/firebaseApi';
import { AsyncStorageUtils } from '../lib/asyncStorageUtils';
import QRCodeGenerator from '../lib/QRCodeGenerator';
import { AdminUtils } from '../lib/adminUtils';
import ReportsModal from './admin/ReportsModal';

export default function Admin() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState({
    totalEvents: 0,
    activeEvents: 0,
    futureEvents: 0,
    pastEvents: 0,
    totalProfiles: 0,
    totalLikes: 0,
    totalMatches: 0,
    totalMessages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [showQRCodeModal, setShowQRCodeModal] = useState(false);
  const [selectedEventForQR, setSelectedEventForQR] = useState<Event | null>(null);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [selectedEventForReports, setSelectedEventForReports] = useState<Event | null>(null);

  const initializeSession = useCallback(async () => {
    // Check if user is authenticated with Firebase
    const currentUser = AuthAPI.getCurrentUser();
    
    if (!currentUser) {
      // No authenticated user, redirect to home
      router.replace('/home');
      return;
    }
    
    // Check if user is admin
    const isAdmin = await AdminUtils.isAdmin();
    
    if (!isAdmin) {
      // User is not admin, sign out and redirect
      await AuthAPI.signOut();
      await AdminUtils.clearAdminSession();
      router.replace('/home');
      return;
    }
    
    // Set admin email for display
    setAdminEmail(currentUser.email || '');
    
    // Load events first, then stats
    await loadEvents();
    await loadAdminStats();
    setIsLoading(false);
  }, []);

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  const loadEvents = async () => {
    try {
      const allEvents = await EventAPI.filter({});
      setEvents(allEvents);
    } catch {
      // Handle error silently
    }
  };

  const loadAdminStats = async () => {
    try {
      // Load overall stats across all events
      const [allProfiles, allLikes, allMessages] = await Promise.all([
        EventProfileAPI.filter({}),
        LikeAPI.filter({}),
        MessageAPI.filter({})
      ]);

      const mutualLikes = allLikes.filter((like: any) => like.is_mutual);
      const now = new Date();
      
      // Calculate event stats after events are loaded
      const activeEvents = events.filter(event => {
        const startDate = new Date(event.starts_at);
        const endDate = new Date(event.expires_at);
        return now >= startDate && now <= endDate;
      });

      const futureEvents = events.filter(event => {
        const startDate = new Date(event.starts_at);
        return now < startDate;
      });

      const pastEvents = events.filter(event => {
        const endDate = new Date(event.expires_at);
        return now > endDate;
      });

      setStats({
        totalEvents: events.length,
        activeEvents: activeEvents.length,
        futureEvents: futureEvents.length,
        pastEvents: pastEvents.length,
        totalProfiles: allProfiles.length,
        totalLikes: allLikes.length,
        totalMatches: mutualLikes.length,
        totalMessages: allMessages.length,
      });
    } catch {
      // Handle error silently
    }
  };

  const handleCreateEvent = () => {
    // Navigate to event creation page
    router.push('/admin/create-event');
  };

  const handleEventPress = (event: Event) => {
    // Navigate to specific event details page
    router.push(`/admin/event-details?eventId=${event.id}`);
  };

  const handleQRCodePress = (event: Event) => {
    setSelectedEventForQR(event);
    setShowQRCodeModal(true);
  };

  const handleCloseQRModal = () => {
    setShowQRCodeModal(false);
    setSelectedEventForQR(null);
  };

  const handleReportsPress = (event: Event) => {
    setSelectedEventForReports(event);
    setShowReportsModal(true);
  };

  const handleCloseReportsModal = () => {
    setShowReportsModal(false);
    setSelectedEventForReports(null);
  };

  const toggleEventExpansion = (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  const handleBackToHome = () => {
    // Navigate back to home without logging out
    // This preserves the admin session and auto-login functionality
    router.replace('/home');
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
              await AuthAPI.signOut();
              
              // Clear all admin-related storage
              await AsyncStorageUtils.multiRemove([
                'currentEventId',
                'currentSessionId',
                'currentEventCode',
                'currentProfileColor',
                'currentProfilePhotoUrl',
                'adminSavedEmail',
                'adminSavedPassword',
                'adminRememberMe'
              ]);
              
              // Clear admin session
              await AdminUtils.clearAdminSession();
              
              router.replace('/home');
            } catch {
              // Handle error silently
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
      minute: '2-digit',
      hour12: false
    });
  };

  const getEventStatus = (event: Event) => {
    const now = new Date();
    const startTime = new Date(event.starts_at);
    const endTime = new Date(event.expires_at);
    
    if (now < startTime) return { text: 'Upcoming', color: '#3b82f6' };
    if (now >= startTime && now < endTime) return { text: 'Active', color: '#10b981' };
    return { text: 'Ended', color: '#6b7280' };
  };

  const categorizeEvents = () => {
    const now = new Date();
    const categorized = {
      active: [] as Event[],
      future: [] as Event[],
      past: [] as Event[]
    };

    events.forEach(event => {
      const startDate = new Date(event.starts_at);
      const endDate = new Date(event.expires_at);
      
      if (now >= startDate && now < endDate) {
        categorized.active.push(event);
      } else if (now < startDate) {
        categorized.future.push(event);
      } else {
        categorized.past.push(event);
      }
    });

    return categorized;
  };

  const renderEventCard = (event: Event) => {
    const status = getEventStatus(event);
    const isExpanded = expandedEvents.has(event.id);

    return (
      <View key={event.id} style={styles.eventCard}>
        {/* Event Header - Always Visible */}
        <TouchableOpacity 
          style={styles.eventHeader}
          onPress={() => toggleEventExpansion(event.id)}
        >
          <View style={styles.eventHeaderContent}>
            <Text style={styles.eventName}>{event.name}</Text>
            <View style={[styles.eventStatus, { backgroundColor: status.color + '20' }]}>
              <Text style={[styles.eventDetailText, { color: status.color }]}>
                {status.text}
              </Text>
            </View>
          </View>
          
          <View style={styles.eventHeaderDetails}>
            <View style={styles.eventDetails}>
              <Text style={styles.eventDetailText}>Code: #{event.event_code}</Text>
            </View>
            
            {event.location && (
              <View style={styles.eventDetails}>
                <MapPin size={14} color={isDark ? '#9ca3af' : '#6b7280'} />
                <Text style={styles.eventDetailText}>{event.location}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.expandIcon}>
            {isExpanded ? (
              <ChevronUp size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
            ) : (
              <ChevronDown size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
            )}
          </View>
        </TouchableOpacity>

        {/* Expanded Content */}
        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.eventSchedule}>
              <Text style={styles.sectionTitle}>Schedule</Text>
              <View style={styles.scheduleItem}>
                <Calendar size={16} color={isDark ? '#9ca3af' : '#6b7280'} />
                <Text style={styles.eventDetailText}>
                  Starts: {formatDate(event.starts_at)}
                </Text>
              </View>
              <View style={styles.scheduleItem}>
                <Calendar size={16} color={isDark ? '#9ca3af' : '#6b7280'} />
                <Text style={styles.eventDetailText}>
                  Expires: {formatDate(event.expires_at)}
                </Text>
              </View>
            </View>

            {event.event_link && (
              <View style={styles.eventSchedule}>
                <Text style={styles.sectionTitle}>Event Link</Text>
                <View style={styles.scheduleItem}>
                  <Text style={[styles.eventDetailText, { color: '#3b82f6' }]} numberOfLines={1}>
                    {event.event_link}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.eventActions}>
              <Text style={styles.sectionTitle}>Actions</Text>
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleEventPress(event)}
                >
                  <BarChart3 size={16} color="#3b82f6" />
                  <Text style={styles.actionButtonText}>Analytics</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleReportsPress(event)}
                >
                  <Flag size={16} color="#f97316" />
                  <Text style={styles.actionButtonText}>Reports</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => router.push(`/admin/edit-event?eventId=${event.id}`)}
                >
                  <Edit size={16} color="#6b7280" />
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleQRCodePress(event)}
                >
                  <QrCode size={16} color="#10b981" />
                  <Text style={styles.actionButtonText}>QR Code</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleEventPress(event)}
                >
                  <Download size={16} color="#8b5cf6" />
                  <Text style={styles.actionButtonText}>Download</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderEventCategory = (title: string, events: Event[], color: string) => {
    if (events.length === 0) return null;

    return (
      <View style={styles.eventCategory}>
        <View style={styles.categoryHeader}>
          <View style={[styles.categoryIndicator, { backgroundColor: color }]} />
          <Text style={styles.categoryTitle}>{title}</Text>
          <Text style={styles.categoryCount}>({events.length})</Text>
        </View>
        {events.map(renderEventCard)}
      </View>
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
    eventCategory: {
      marginBottom: 24,
    },
    categoryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    categoryIndicator: {
      width: 4,
      height: 20,
      borderRadius: 2,
      marginRight: 8,
    },
    categoryTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: isDark ? '#ffffff' : '#1f2937',
      flex: 1,
    },
    categoryCount: {
      fontSize: 16,
      color: isDark ? '#9ca3af' : '#6b7280',
      fontWeight: '500',
    },
    eventCard: {
      backgroundColor: isDark ? '#2d2d2d' : 'white',
      borderRadius: 12,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 3,
      overflow: 'hidden',
    },
    eventHeader: {
      padding: 16,
    },
    eventHeaderContent: {
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
    eventHeaderDetails: {
      flex: 1,
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
    expandIcon: {
      position: 'absolute',
      top: 16,
      right: 16,
    },
    expandedContent: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      borderTopWidth: 1,
      borderTopColor: isDark ? '#404040' : '#e5e7eb',
    },
    eventSchedule: {
      marginBottom: 16,
    },
    scheduleItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    eventActions: {
      marginBottom: 8,
    },
    actionButtons: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#404040' : '#f3f4f6',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 6,
    },
    actionButtonText: {
      fontSize: 14,
      color: isDark ? '#ffffff' : '#1f2937',
      fontWeight: '500',
    },
    actionsSection: {
      marginBottom: 24,
    },
    mainActionButton: {
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
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading admin dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const categorizedEvents = categorizeEvents();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
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
              <Text style={styles.statNumber}>{stats.pastEvents}</Text>
              <Text style={styles.statLabel}>Past Events</Text>
            </View>
          </View>
        </View>

        {/* Categorized Events */}
        {events.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No events created yet</Text>
            <TouchableOpacity style={styles.mainActionButton} onPress={handleCreateEvent}>
              <Plus size={20} color="#6b7280" />
              <Text style={styles.actionText}>Create Your First Event</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {renderEventCategory('Active Events', categorizedEvents.active, '#10b981')}
            {renderEventCategory('Future Events', categorizedEvents.future, '#3b82f6')}
            {renderEventCategory('Past Events', categorizedEvents.past, '#6b7280')}
          </>
        )}

        {/* Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Admin Actions</Text>
          

          
          <TouchableOpacity 
            style={styles.mainActionButton}
            onPress={handleBackToHome}
          >
            <Home size={20} color="#6b7280" />
            <Text style={styles.actionText}>Back to Home</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.mainActionButton, styles.logoutButton]}
            onPress={handleLogout}
          >
            <LogOut size={20} color="#dc2626" />
            <Text style={[styles.actionText, styles.logoutText]}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* QR Code Modal */}
      <Modal
        visible={showQRCodeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseQRModal}
      >
        <View style={styles.modalOverlay}>
          {selectedEventForQR && (
            <QRCodeGenerator
              eventCode={selectedEventForQR.event_code}
              eventName={selectedEventForQR.name}
              onClose={handleCloseQRModal}
            />
          )}
        </View>
      </Modal>

      {/* Reports Modal */}
      {selectedEventForReports && (
        <ReportsModal
          visible={showReportsModal}
          onClose={handleCloseReportsModal}
          eventId={selectedEventForReports.id}
          eventName={selectedEventForReports.name}
        />
      )}
    </SafeAreaView>
  );
} 