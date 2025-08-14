import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { X, Save, Trash2 } from 'lucide-react-native';
import { AdminClientAPI, type AdminClient } from '../../lib/firebaseApi';

interface ClientFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingClient: AdminClient | null;
}

const CLIENT_TYPES = [
  'Company',
  'Wedding Organizer',
  'Club / Bar',
  'Restaurant',
  'Personal Host',
  'Other Organization'
] as const;

const EVENT_KINDS = [
  'House Party',
  'Club',
  'Wedding',
  'Meetup',
  'High Tech Event',
  'Retreat',
  'Party',
  'Conference'
] as const;

const STATUS_OPTIONS = [
  'Initial Discussion',
  'Negotiation',
  'Won',
  'Lost'
] as const;

const SOURCE_OPTIONS = [
  'Personal Connect',
  'Instagram Inbound',
  'Email',
  'Other',
  'Olim in TLV'
] as const;

export default function ClientFormModal({
  visible,
  onClose,
  onSuccess,
  editingClient
}: ClientFormModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'Company' as AdminClient['type'],
    eventKind: 'House Party' as AdminClient['eventKind'],
    pocName: '',
    phone: '',
    email: '',
    country: '',
    expectedAttendees: '',
    eventDate: '',
    organizerFormSent: 'No' as 'Yes' | 'No',
    status: 'Initial Discussion' as AdminClient['status'],
    source: 'Personal Connect' as AdminClient['source'],
    description: ''
  });

  useEffect(() => {
    if (editingClient) {
      setFormData({
        name: editingClient.name,
        type: editingClient.type,
        eventKind: editingClient.eventKind,
        pocName: editingClient.pocName,
        phone: editingClient.phone || '',
        email: editingClient.email || '',
        country: editingClient.country || '',
        expectedAttendees: editingClient.expectedAttendees?.toString() || '',
        eventDate: editingClient.eventDate || '',
        organizerFormSent: editingClient.organizerFormSent || 'No',
        status: editingClient.status,
        source: editingClient.source || 'Personal Connect',
        description: editingClient.description || ''
      });
    } else {
      // Reset form for new client
      setFormData({
        name: '',
        type: 'Company',
        eventKind: 'House Party',
        pocName: '',
        phone: '',
        email: '',
        country: '',
        expectedAttendees: '',
        eventDate: '',
        organizerFormSent: 'No',
        status: 'Initial Discussion',
        source: 'Personal Connect',
        description: ''
      });
    }
  }, [editingClient, visible]);

  const handleSave = async () => {
    // Validation
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Client name is required');
      return;
    }
    if (!formData.pocName.trim()) {
      Alert.alert('Error', 'POC name is required');
      return;
    }
    if (!formData.type) {
      Alert.alert('Error', 'Client type is required');
      return;
    }
    if (!formData.eventKind) {
      Alert.alert('Error', 'Event kind is required');
      return;
    }
    if (!formData.status) {
      Alert.alert('Error', 'Status is required');
      return;
    }

    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    // Expected attendees validation
    if (formData.expectedAttendees && parseInt(formData.expectedAttendees) < 0) {
      Alert.alert('Error', 'Expected attendees must be a positive number');
      return;
    }

    setIsLoading(true);
    try {
      const clientData = {
        ...formData,
        expectedAttendees: formData.expectedAttendees ? parseInt(formData.expectedAttendees) : null,
        eventDate: formData.eventDate || null,
        phone: formData.phone || null,
        email: formData.email || null,
        country: formData.country || null,
        source: formData.source || null,
        description: formData.description || null,
      };

      if (editingClient) {
        await AdminClientAPI.update(editingClient.id, clientData);
      } else {
        await AdminClientAPI.create(clientData);
      }

      onSuccess();
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to save client. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    if (!editingClient) return;

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
              await AdminClientAPI.delete(editingClient.id);
              onSuccess();
              onClose();
            } catch {
              Alert.alert('Error', 'Failed to delete client');
            }
          }
        }
      ]
    );
  };

  const updateFormData = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const renderSelectField = (
    label: string,
    value: string,
    options: readonly string[],
    field: keyof typeof formData
  ) => (
    <View style={styles.fieldContainer}>
      <Text style={[styles.label, { color: isDark ? '#ffffff' : '#000000' }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.optionButton,
              value === option && styles.selectedOptionButton,
              { backgroundColor: isDark ? '#374151' : '#f3f4f6' }
            ]}
            onPress={() => updateFormData(field, option)}
          >
            <Text style={[
              styles.optionText,
              value === option && styles.selectedOptionText,
              { color: isDark ? '#ffffff' : '#000000' }
            ]}>
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#ffffff' }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={isDark ? '#ffffff' : '#000000'} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: isDark ? '#ffffff' : '#000000' }]}>
            {editingClient ? 'Edit Client' : 'Add New Client'}
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isLoading}
            style={[styles.saveButton, isLoading && styles.disabledButton]}
          >
            <Save size={24} color={isDark ? '#ffffff' : '#000000'} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#ffffff' : '#000000' }]}>
              Basic Information
            </Text>
            
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: isDark ? '#ffffff' : '#000000' }]}>Client Name *</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: isDark ? '#374151' : '#f3f4f6',
                  color: isDark ? '#ffffff' : '#000000',
                  borderColor: isDark ? '#4b5563' : '#d1d5db'
                }]}
                value={formData.name}
                onChangeText={(value) => updateFormData('name', value)}
                placeholder="Enter client name"
                placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: isDark ? '#ffffff' : '#000000' }]}>POC Name *</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: isDark ? '#374151' : '#f3f4f6',
                  color: isDark ? '#ffffff' : '#000000',
                  borderColor: isDark ? '#4b5563' : '#d1d5db'
                }]}
                value={formData.pocName}
                onChangeText={(value) => updateFormData('pocName', value)}
                placeholder="Enter POC name"
                placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
              />
            </View>

            {renderSelectField('Client Type *', formData.type, CLIENT_TYPES, 'type')}
            {renderSelectField('Event Kind *', formData.eventKind, EVENT_KINDS, 'eventKind')}
            {renderSelectField('Status *', formData.status, STATUS_OPTIONS, 'status')}
            {renderSelectField('Source', formData.source || 'Personal Connect', SOURCE_OPTIONS, 'source')}
          </View>

          {/* Contact Information */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#ffffff' : '#000000' }]}>
              Contact Information
            </Text>
            
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: isDark ? '#ffffff' : '#000000' }]}>Phone</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: isDark ? '#374151' : '#f3f4f6',
                  color: isDark ? '#ffffff' : '#000000',
                  borderColor: isDark ? '#4b5563' : '#d1d5db'
                }]}
                value={formData.phone}
                onChangeText={(value) => updateFormData('phone', value)}
                placeholder="Enter phone number"
                placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: isDark ? '#ffffff' : '#000000' }]}>Email</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: isDark ? '#374151' : '#f3f4f6',
                  color: isDark ? '#ffffff' : '#000000',
                  borderColor: isDark ? '#4b5563' : '#d1d5db'
                }]}
                value={formData.email}
                onChangeText={(value) => updateFormData('email', value)}
                placeholder="Enter email address"
                placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: isDark ? '#ffffff' : '#000000' }]}>Country</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: isDark ? '#374151' : '#f3f4f6',
                  color: isDark ? '#ffffff' : '#000000',
                  borderColor: isDark ? '#4b5563' : '#d1d5db'
                }]}
                value={formData.country}
                onChangeText={(value) => updateFormData('country', value)}
                placeholder="Enter country"
                placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
              />
            </View>
          </View>

          {/* Event Details */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#ffffff' : '#000000' }]}>
              Event Details
            </Text>
            
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: isDark ? '#ffffff' : '#000000' }]}>Expected Attendees</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: isDark ? '#374151' : '#f3f4f6',
                  color: isDark ? '#ffffff' : '#000000',
                  borderColor: isDark ? '#4b5563' : '#d1d5db'
                }]}
                value={formData.expectedAttendees}
                onChangeText={(value) => updateFormData('expectedAttendees', value)}
                placeholder="Enter expected number of attendees"
                placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: isDark ? '#ffffff' : '#000000' }]}>Event Date</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: isDark ? '#374151' : '#f3f4f6',
                  color: isDark ? '#ffffff' : '#000000',
                  borderColor: isDark ? '#4b5563' : '#d1d5db'
                }]}
                value={formData.eventDate}
                onChangeText={(value) => updateFormData('eventDate', value)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
              />
            </View>

            {renderSelectField('Organizer Form Sent', formData.organizerFormSent, ['Yes', 'No'], 'organizerFormSent')}
          </View>

          {/* Additional Information */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#ffffff' : '#000000' }]}>
              Additional Information
            </Text>
            
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: isDark ? '#ffffff' : '#000000' }]}>Description</Text>
              <TextInput
                style={[styles.textArea, { 
                  backgroundColor: isDark ? '#374151' : '#f3f4f6',
                  color: isDark ? '#ffffff' : '#000000',
                  borderColor: isDark ? '#4b5563' : '#d1d5db'
                }]}
                value={formData.description}
                onChangeText={(value) => updateFormData('description', value)}
                placeholder="Enter additional notes or description"
                placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Delete Button for Editing */}
          {editingClient && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
              >
                <Trash2 size={20} color="#ffffff" />
                <Text style={styles.deleteButtonText}>Delete Client</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    padding: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 100,
  },
  optionsContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  optionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  selectedOptionButton: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectedOptionText: {
    color: '#ffffff',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
