import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Heart, QrCode, Hash, Shield, Clock, Users } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Event } from '../lib/firebaseApi';

const { width } = Dimensions.get('window');

export default function Home() {
  const [activeModal, setActiveModal] = useState<string | null>(null);

  useEffect(() => {
    checkActiveEventSession();
  }, []);

  const checkActiveEventSession = async () => {
    try {
      const eventId = await AsyncStorage.getItem('currentEventId');
      const sessionId = await AsyncStorage.getItem('currentSessionId');
      
      if (!eventId || !sessionId) return;

      // Verify the event still exists and is currently active
      const events = await Event.filter({ id: eventId });
      if (events.length > 0) {
        const event = events[0];
        const nowISO = new Date().toISOString();
        
        // If event is currently active, auto-resume to Discovery
        if (event.starts_at && event.expires_at && nowISO >= event.starts_at && nowISO <= event.expires_at) {
          router.replace('/discovery');
          return;
        }
      }
      
      // If event is expired, not started, or not found, clear session data
      await AsyncStorage.multiRemove([
        'currentEventId',
        'currentSessionId',
        'currentEventCode',
        'currentProfileColor',
        'currentProfilePhotoUrl'
      ]);
    } catch (error) {
      console.error("Error checking active session:", error);
      // Clear potentially corrupted session data on any error
      await AsyncStorage.multiRemove([
        'currentEventId',
        'currentSessionId',
        'currentEventCode',
        'currentProfileColor',
        'currentProfilePhotoUrl'
      ]);
    }
  };

  const handleScanSuccess = (scannedUrl: string) => {
    try {
      const url = new URL(scannedUrl);
      const eventCode = url.searchParams.get("code");
      if (eventCode) {
        closeModal();
        router.push(`/join?code=${eventCode.toUpperCase()}`);
      } else {
        Alert.alert("Invalid QR Code", "No event code found in URL.");
      }
    } catch (error) {
      // If it's not a URL, it might be the code itself.
      if (typeof scannedUrl === 'string' && scannedUrl.trim().length > 3) {
        closeModal();
        router.push(`/join?code=${scannedUrl.toUpperCase()}`);
      } else {
        Alert.alert("Invalid QR Code", "Invalid QR code format.");
      }
    }
  };

  const handleEventAccess = (eventCode: string) => {
    // The join page will handle all validation logic.
    closeModal();
    router.push(`/join?code=${eventCode.toUpperCase()}`);
  };

  const openModal = (modalName: string) => {
    setActiveModal(modalName);
  };

  const closeModal = () => {
    setActiveModal(null);
  };
  
  const switchToManualEntry = () => {
    setActiveModal('manualCodeEntry');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.logoContainer}>
          <Heart size={40} color="white" />
        </View>
        <Text style={styles.title}>
          Meet Singles at{'\n'}
          <Text style={styles.gradientText}>This Event</Text>
        </Text>
        <Text style={styles.subtitle}>
          Connect with other singles privately and safely — only at this specific event
        </Text>
      </View>

      {/* Access Methods */}
      <View style={styles.accessMethods}>
        {/* QR Code Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <QrCode size={24} color="white" />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>Scan QR Code</Text>
              <Text style={styles.cardSubtitle}>Quick access with your camera</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => openModal('qrScanner')}
          >
            <Text style={styles.primaryButtonText}>Scan QR Code</Text>
          </TouchableOpacity>
        </View>

        {/* Manual Entry Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, styles.purpleGradient]}>
              <Hash size={24} color="white" />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>Enter Event Code</Text>
              <Text style={styles.cardSubtitle}>Manual entry option</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => openModal('manualCodeEntry')}
          >
            <Text style={styles.secondaryButtonText}>Enter Code Manually</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Features */}
      <View style={styles.featuresContainer}>
        <View style={styles.featureCard}>
          <Shield size={32} color="#10b981" />
          <Text style={styles.featureTitle}>Private</Text>
          <Text style={styles.featureSubtitle}>Your data stays secure</Text>
        </View>
        <View style={styles.featureCard}>
          <Clock size={32} color="#3b82f6" />
          <Text style={styles.featureTitle}>Temporary</Text>
          <Text style={styles.featureSubtitle}>Expires after event</Text>
        </View>
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.infoContent}>
          <Users size={20} color="#ec4899" style={styles.infoIcon} />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>How it works</Text>
            <Text style={styles.infoText}>• Scan the event's unique QR code{'\n'}
              • Create a temporary profile (first name only){'\n'}
              • Discover other singles at this event{'\n'}
              • Match and chat privately{'\n'}
              • Everything expires when the event ends</Text>
          </View>
        </View>
      </View>

      {/* TODO: Add QR Scanner and Event Code Entry modals */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 32,
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#ec4899',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#ec4899',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 40,
  },
  gradientText: {
    color: '#ec4899',
  },
  subtitle: {
    fontSize: 18,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 26,
  },
  accessMethods: {
    marginBottom: 32,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  purpleGradient: {
    backgroundColor: '#8b5cf6',
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#8b5cf6',
    fontSize: 16,
    fontWeight: '500',
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  featureCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 12,
    marginBottom: 4,
  },
  featureSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginTop: 2,
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
}); 