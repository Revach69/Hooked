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
  TextInput,
  FlatList,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { router } from 'expo-router';
import { 
  Users, 
  Plus, 
  LogOut, 
  Calendar, 
  MapPin, 
  Home, 
  ChevronDown, 
  QrCode, 
  Edit, 
  Flag,
  Search,
  User,
  Phone,
  Mail,
  Globe,
  Users as UsersIcon,
  Trash2
} from 'lucide-react-native';
import { 
  EventAPI, 
  AuthAPI, 
  AdminClientAPI,
  type Event,
  type AdminClient 
} from '../lib/firebaseApi';
import { AsyncStorageUtils } from '../lib/asyncStorageUtils';
import QRCodeGenerator from '../lib/QRCodeGenerator';
import { AdminUtils } from '../lib/adminUtils';
import ReportsModal from './admin/ReportsModal';
import ClientFormModal from './admin/ClientFormModal';


type TabType = 'events' | 'clients';

export default function Admin() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [activeTab, setActiveTab] = useState<TabType>('events');
  
  // Events state
  const [events, setEvents] = useState<Event[]>([]);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [showQRCodeModal, setShowQRCodeModal] = useState(false);
  const [selectedEventForQR, setSelectedEventForQR] = useState<Event | null>(null);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [selectedEventForReports, setSelectedEventForReports] = useState<Event | null>(null);
  
  // Clients state
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showClientForm, setShowClientForm] = useState(false);
  const [editingClient, setEditingClient] = useState<AdminClient | null>(null);
  
  // General state
  const [isLoading, setIsLoading] = useState(true);
  const [adminEmail, setAdminEmail] = useState<string>('');

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
    
    // Load data
    await loadEvents();
    await loadClients();
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

  const loadClients = async () => {
    try {
      const allClients = await AdminClientAPI.filter({});
      setClients(allClients);
    } catch {
      // Handle error silently
    }
  };

  // Events handlers
  const handleCreateEvent = () => {
    router.push('/admin/create-event');
  };

  const handleEventPress = (event: Event) => {
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

  // Clients handlers
  const handleCreateClient = () => {
    setEditingClient(null);
    setShowClientForm(true);
  };

  const handleEditClient = (client: AdminClient) => {
    setEditingClient(client);
    setShowClientForm(true);
  };

  const handleDeleteClient = async (clientId: string) => {
    Alert.alert(
      'Delete Client',
      'Are you sure you want to delete this client?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await AdminClientAPI.delete(clientId);
              await loadClients();
            } catch {
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to delete client',
                position: 'top',
                visibilityTime: 3500,
                autoHide: true,
                topOffset: 0,
              });
            }
          }
        }
      ]
    );
  };

  const handleClientFormSuccess = () => {
    setShowClientForm(false);
    setEditingClient(null);
    loadClients();
  };

  // Filter and sort clients
  const filteredClients = clients.filter((client) => {
    // Search filter only
    return !searchQuery || 
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.pocName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (client.email && client.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (client.description && client.description.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  const sortedClients = [...filteredClients].sort((a, b) => {
    // Simple alphabetical sort by name
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });

  // General handlers
  const handleBackToHome = () => {
    router.replace('/home');
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear all admin-related storage
              await AsyncStorageUtils.multiRemove([
                'adminUid',
                'adminEmail',
                'adminSavedEmail',
                'adminSavedPassword',
                'adminRememberMe'
              ]);
              
              // Clear admin session
              await AdminUtils.clearAdminSession();
              
              // Sign out from Firebase
              await AuthAPI.signOut();
              
              // Navigate to home
              router.replace('/home');
            } catch {
              // Silent logout error - still redirect to home
              router.replace('/home');
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string, timezone?: string) => {
    if (timezone) {
      try {
        // Convert UTC time to the event's timezone for display
        const utcDate = new Date(dateString);
        return utcDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: timezone
        });
      } catch {
        console.warn('Timezone formatting failed, using fallback');
      }
    }
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const getEventStatus = (event: Event) => {
    const now = new Date();
    const eventDate = event.starts_at.toDate();
    const eventEndDate = event.expires_at.toDate();

    if (now < eventDate) {
      return { status: 'Upcoming', color: '#3b82f6' };
    } else if (now >= eventDate && now <= eventEndDate) {
      return { status: 'Live', color: '#10b981' };
    } else {
      return { status: 'Past', color: '#6b7280' };
    }
  };

  const categorizeEvents = () => {
    const now = new Date();
    const active: Event[] = [];
    const future: Event[] = [];
    const past: Event[] = [];

    events.forEach(event => {
      const eventDate = event.starts_at.toDate();
      const eventEndDate = event.expires_at.toDate();

      if (now >= eventDate && now <= eventEndDate) {
        active.push(event);
      } else if (now < eventDate) {
        future.push(event);
      } else {
        past.push(event);
      }
    });

    return { active, future, past };
  };

  const renderEventCard = (event: Event) => {
    const status = getEventStatus(event);
    const isExpanded = expandedEvents.has(event.id);

    return (
      <View key={event.id} style={[styles.eventCard, { backgroundColor: isDark ? '#1f2937' : '#ffffff' }]}>
        <TouchableOpacity
          style={styles.eventHeader}
          onPress={() => toggleEventExpansion(event.id)}
        >
          <View style={styles.eventInfo}>
            <Text style={[styles.eventName, { color: isDark ? '#ffffff' : '#000000' }]}>
              {event.name}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
              <Text style={[styles.statusText, { color: status.color }]}>
                {status.status}
              </Text>
            </View>
          </View>
          <View style={styles.eventMeta}>
            <View style={styles.eventMetaItem}>
              <Calendar size={16} color={isDark ? '#9ca3af' : '#6b7280'} />
              <Text style={[styles.eventMetaText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                {formatDate(event.starts_at.toDate().toISOString(), event.timezone)}
              </Text>
            </View>
            {event.location && (
              <View style={styles.eventMetaItem}>
                <MapPin size={16} color={isDark ? '#9ca3af' : '#6b7280'} />
                <Text style={[styles.eventMetaText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                  {event.location}
                </Text>
              </View>
            )}
          </View>
          <ChevronDown size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.eventActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleEventPress(event)}
              >
                <Edit size={16} color="#6b7280" />
                <Text style={styles.actionText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleQRCodePress(event)}
              >
                <QrCode size={16} color="#6b7280" />
                <Text style={styles.actionText}>QR Code</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleReportsPress(event)}
              >
                <Flag size={16} color="#6b7280" />
                <Text style={styles.actionText}>Reports</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderEventCategory = (title: string, events: Event[], color: string) => {
    if (events.length === 0) return null;

    return (
      <View style={styles.categorySection}>
        <Text style={[styles.categoryTitle, { color }]}>{title} ({events.length})</Text>
        {events.map(renderEventCard)}
      </View>
    );
  };

  const renderClientCard = ({ item: client }: { item: AdminClient }) => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'Initial Discussion': return '#6b7280';
        case 'Negotiation': return '#f59e0b';
        case 'Won': return '#10b981';
        case 'Lost': return '#ef4444';
        default: return '#6b7280';
      }
    };

    return (
      <TouchableOpacity
        style={[styles.clientCard, { backgroundColor: isDark ? '#1f2937' : '#ffffff' }]}
        onPress={() => handleEditClient(client)}
      >
        <View style={styles.clientHeader}>
          <Text style={[styles.clientName, { color: isDark ? '#ffffff' : '#000000' }]}>
            {client.name}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(client.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(client.status) }]}>
              {client.status}
            </Text>
          </View>
        </View>
        
        <View style={styles.clientInfo}>
          <View style={styles.clientInfoRow}>
            <User size={16} color={isDark ? '#9ca3af' : '#6b7280'} />
            <Text style={[styles.clientInfoText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
              {client.pocName}
            </Text>
          </View>
          
          {client.phone && (
            <View style={styles.clientInfoRow}>
              <Phone size={16} color={isDark ? '#9ca3af' : '#6b7280'} />
              <Text style={[styles.clientInfoText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                {client.phone}
              </Text>
            </View>
          )}
          
          {client.email && (
            <View style={styles.clientInfoRow}>
              <Mail size={16} color={isDark ? '#9ca3af' : '#6b7280'} />
              <Text style={[styles.clientInfoText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                {client.email}
              </Text>
            </View>
          )}
          
          <View style={styles.clientInfoRow}>
            <Globe size={16} color={isDark ? '#9ca3af' : '#6b7280'} />
            <Text style={[styles.clientInfoText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
              {client.type} • {client.eventKind}
            </Text>
          </View>
          
          {client.expectedAttendees && (
            <View style={styles.clientInfoRow}>
              <UsersIcon size={16} color={isDark ? '#9ca3af' : '#6b7280'} />
              <Text style={[styles.clientInfoText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                {client.expectedAttendees} attendees
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.clientActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditClient(client)}
          >
            <Edit size={16} color="#6b7280" />
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteClient(client.id)}
          >
            <Trash2 size={16} color="#ef4444" />
            <Text style={[styles.actionText, { color: '#ef4444' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEventsTab = () => (
    <ScrollView style={styles.content}>
      {events.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyStateText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
            No events created yet
          </Text>
          <TouchableOpacity style={styles.mainActionButton} onPress={handleCreateEvent}>
            <Plus size={20} color="#6b7280" />
            <Text style={styles.actionText}>Create Your First Event</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {renderEventCategory('Active Events', categorizeEvents().active, '#10b981')}
          {renderEventCategory('Future Events', categorizeEvents().future, '#3b82f6')}
          {renderEventCategory('Past Events', categorizeEvents().past, '#6b7280')}
        </>
      )}
    </ScrollView>
  );

  const renderClientsTab = () => (
    <View style={styles.content}>
      {/* Search and Filters */}
      <View style={[styles.searchSection, { backgroundColor: isDark ? '#1f2937' : '#ffffff' }]}>
        <View style={styles.searchContainer}>
          <Search size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
          <TextInput
            style={[styles.searchInput, { color: isDark ? '#ffffff' : '#000000' }]}
            placeholder="Search clients..."
            placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Clients List */}
      <FlatList
        data={sortedClients}
        renderItem={renderClientCard}
        keyExtractor={(item) => item.id}
        style={styles.clientsList}
        contentContainerStyle={styles.clientsListContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyStateText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
              No clients found
            </Text>
            <TouchableOpacity style={styles.mainActionButton} onPress={handleCreateClient}>
              <Plus size={20} color="#6b7280" />
              <Text style={styles.actionText}>Add Your First Client</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: isDark ? '#ffffff' : '#000000' }]}>Admin Dashboard</Text>
          {adminEmail && (
            <Text style={[styles.adminEmail, { color: isDark ? '#9ca3af' : '#6b7280' }]}>{adminEmail}</Text>
          )}
        </View>
        <TouchableOpacity 
          style={styles.createButton} 
          onPress={activeTab === 'events' ? handleCreateEvent : handleCreateClient}
        >
          <Plus size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'events' && styles.activeTabButton,
            { backgroundColor: isDark ? '#1f2937' : '#f3f4f6' }
          ]}
          onPress={() => setActiveTab('events')}
        >
          <Calendar size={20} color={activeTab === 'events' ? '#8b5cf6' : (isDark ? '#9ca3af' : '#6b7280')} />
          <Text style={[
            styles.tabText,
            { color: activeTab === 'events' ? '#8b5cf6' : (isDark ? '#9ca3af' : '#6b7280') }
          ]}>
            Events
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'clients' && styles.activeTabButton,
            { backgroundColor: isDark ? '#1f2937' : '#f3f4f6' }
          ]}
          onPress={() => setActiveTab('clients')}
        >
          <Users size={20} color={activeTab === 'clients' ? '#8b5cf6' : (isDark ? '#9ca3af' : '#6b7280')} />
          <Text style={[
            styles.tabText,
            { color: activeTab === 'clients' ? '#8b5cf6' : (isDark ? '#9ca3af' : '#6b7280') }
          ]}>
            Clients
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'events' ? renderEventsTab() : renderClientsTab()}

      {/* Actions */}
      <View style={styles.actionsSection}>
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

      {/* Client Form Modal */}
      <ClientFormModal
        visible={showClientForm}
        onClose={() => setShowClientForm(false)}
        onSuccess={handleClientFormSuccess}
        editingClient={editingClient}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  adminEmail: {
    fontSize: 14,
    marginTop: 4,
  },
  createButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  activeTabButton: {
    backgroundColor: '#8b5cf6',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  searchSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  clientsList: {
    flex: 1,
  },
  clientsListContent: {
    padding: 16,
  },
  eventCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  eventMeta: {
    flex: 1,
    marginLeft: 12,
  },
  eventMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventMetaText: {
    fontSize: 14,
    marginLeft: 4,
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  eventActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    color: '#6b7280',
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
  },
  clientCard: {
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  clientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  clientInfo: {
    marginBottom: 12,
  },
  clientInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  clientInfoText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  clientActions: {
    flexDirection: 'row',
    gap: 8,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 24,
  },
  mainActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    gap: 8,
  },
  logoutButton: {
    backgroundColor: '#fef2f2',
  },
  logoutText: {
    color: '#dc2626',
  },
  actionsSection: {
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 