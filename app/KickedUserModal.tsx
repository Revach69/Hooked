import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  useColorScheme,
} from 'react-native';
import { X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface KickedUserModalProps {
  isVisible: boolean;
  onClose: () => void;
  eventName: string;
  adminNotes: string;
}

export default function KickedUserModal({ 
  isVisible, 
  onClose, 
  eventName, 
  adminNotes 
}: KickedUserModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
        <View style={[
          styles.modal,
          { 
            backgroundColor: isDark ? '#1f2937' : '#ffffff',
            borderColor: isDark ? '#374151' : '#e5e7eb'
          }
        ]}>
          <SafeAreaView>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <View style={[styles.iconContainer, { backgroundColor: '#ef4444' }]}>
                  <X size={24} color="#ffffff" />
                </View>
                <View style={styles.headerText}>
                  <Text style={[
                    styles.title,
                    { color: isDark ? '#ffffff' : '#111827' }
                  ]}>
                    You&apos;ve been removed from the event
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={[
                  styles.closeButton,
                  { backgroundColor: isDark ? '#374151' : '#f3f4f6' }
                ]}
              >
                <X size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.content}>
              <Text style={[
                styles.message,
                { color: isDark ? '#d1d5db' : '#374151' }
              ]}>
                You have been removed from <Text style={styles.eventName}>{eventName}</Text> by an administrator.
              </Text>
              
              {adminNotes && (
                <View style={[
                  styles.notesContainer,
                  { backgroundColor: isDark ? '#374151' : '#f9fafb' }
                ]}>
                  <Text style={[
                    styles.notesLabel,
                    { color: isDark ? '#9ca3af' : '#6b7280' }
                  ]}>
                    Reason:
                  </Text>
                  <Text style={[
                    styles.notesText,
                    { color: isDark ? '#d1d5db' : '#374151' }
                  ]}>
                    {adminNotes}
                  </Text>
                </View>
              )}

              <Text style={[
                styles.footerText,
                { color: isDark ? '#9ca3af' : '#6b7280' }
              ]}>
                You can join other events or create a new profile for future events.
              </Text>
            </View>

            {/* Action Button */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                onPress={onClose}
                style={[styles.button, { backgroundColor: '#3b82f6' }]}
              >
                <Text style={styles.buttonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  eventName: {
    fontWeight: '600',
    color: '#ef4444',
  },
  notesContainer: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  footerText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 