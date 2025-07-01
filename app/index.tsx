import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackNavigationProp,} from '@react-navigation/native-stack';
import CameraKitCameraScreen from 'react-native-camera-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, QrCode, Hash, Shield, Clock, Users } from 'lucide-react-native';
import { Event } from '../lib/api/entities';
import { db } from '../lib/firebaseConfig';
import { getDoc, doc } from 'firebase/firestore';
import ConsentScreen from './Consent';
console.log('ConsentScreen:', ConsentScreen);
import DiscoveryScreen from './Discovery';
console.log('DiscoveryScreen', DiscoveryScreen);
import MatchesScreen from './Matches';
console.log('MatchesScreen', MatchesScreen);
import ProfileScreen from './Profile';
console.log('ProfileScreen', ProfileScreen);
import JoinScreen from './join';
console.log('JoinScreen', JoinScreen);
import { getClient } from '../lib/api/base44Client';

export type RootStackParamList = {
  Home: undefined;
  Join: { code: string };
  Consent: undefined;
  Discovery: undefined;
  Matches: undefined;
  Profile: undefined;
};



function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Home'>>();
  const insets = useSafeAreaInsets();
  const [activeModal, setActiveModal] = useState<null | 'qrScanner' | 'manualCodeEntry'>(null);
  const [manualCode, setManualCode] = useState('');
 
  useEffect(() => {
    // During local development we bypass Base44 auth entirely.
    // Re-enable this when integrating with the real backend.
    getClient().auth.useSession();
  }, []);
  
  

  useEffect(() => {
    checkActiveEventSession();
  }, []);

  const checkActiveEventSession = async () => {
    const eventId = await AsyncStorage.getItem('currentEventId');
    const sessionId = await AsyncStorage.getItem('currentSessionId');
    if (!eventId || !sessionId) return;

    try {
      const events = await Event.filter({ id: eventId });
      if (events.length > 0) {
        const event = events[0];
        const nowISO = new Date().toISOString();
        if (
          event.starts_at &&
          event.expires_at &&
          nowISO >= event.starts_at &&
          nowISO <= event.expires_at
        ) {
          navigation.navigate('Discovery');
          return;
        }
      }
      await AsyncStorage.multiRemove([
        'currentEventId',
        'currentSessionId',
        'currentEventCode',
        'currentProfileColor',
        'currentProfilePhotoUrl',
      ]);
    } catch (e) {
      console.error('Error checking active session:', e);
      await AsyncStorage.multiRemove([
        'currentEventId',
        'currentSessionId',
        'currentEventCode',
        'currentProfileColor',
        'currentProfilePhotoUrl',
      ]);
    }
  };

  const openModal = (name: 'qrScanner' | 'manualCodeEntry') => setActiveModal(name);
  const closeModal = () => { setActiveModal(null); setManualCode(''); };

  const handleEventAccess = async (code: string) => {
    closeModal();
    const eventCode = code.toUpperCase().trim();
    try {
      const snapshot = await getDoc(doc(db, 'events', eventCode));
      if (!snapshot.exists()) {
        Alert.alert('Invalid Event Code', 'No event found for that code.');
        return;
      }

      const data = snapshot.data() as any;
      const startsAt: Date | undefined = data.starts_at?.toDate
        ? data.starts_at.toDate()
        : data.starts_at
        ? new Date(data.starts_at)
        : undefined;
      const expiresAt: Date | undefined = data.expires_at?.toDate
        ? data.expires_at.toDate()
        : data.expires_at
        ? new Date(data.expires_at)
        : undefined;

      if (
        startsAt &&
        expiresAt &&
        new Date() >= startsAt &&
        new Date() <= expiresAt
      ) {
        navigation.navigate('Join', { code: eventCode });
      } else {
        Alert.alert('Event Inactive');
      }
    } catch (err) {
      console.error('Error fetching event from Firestore:', err);
      Alert.alert('Error', 'Unable to verify event code. Please try again.');
    }
  };


  const handleScanSuccess = ({ data }: { data: string }) => {
    try {
      const url = new URL(data);
      const eventCode = url.searchParams.get('code');
      if (eventCode) {
        handleEventAccess(eventCode);
      } else {
        Alert.alert('Invalid QR code', 'No event code found in URL.');
      }
    } catch {
      if (data.trim().length > 3) {
        handleEventAccess(data);
      } else {
        Alert.alert('Invalid QR code format');
      }
    }
  };


  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 1 }]}>
      <View style={styles.hero}>
        <LinearGradient colors={['#ec4899', '#8b5cf6']} style={styles.heroIcon}>
          <Heart size={40} color="#fff" />
        </LinearGradient>
        <Text style={styles.title}>Meet Singles at</Text>
        <Text style={[styles.title, styles.gradientText]}>This Event</Text>
        <Text style={styles.subtitle}>
          Connect with other singles privately and safely — only at this specific event
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <LinearGradient colors={['#3b82f6', '#6366f1']} style={styles.cardIcon}>
            <QrCode size={24} color="#fff" />
          </LinearGradient>
          <View>
            <Text style={styles.cardTitle}>Scan QR Code</Text>
            <Text style={styles.cardDesc}>Quick access with your camera</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.buttonPrimary} onPress={() => openModal('qrScanner')}>
          <Text style={styles.buttonPrimaryText}>Scan QR Code</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <LinearGradient colors={['#a855f7', '#ec4899']} style={styles.cardIcon}>
            <Hash size={24} color="#fff" />
          </LinearGradient>
          <View>
            <Text style={styles.cardTitle}>Enter Event Code</Text>
            <Text style={styles.cardDesc}>Manual entry option</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.buttonOutline} onPress={() => openModal('manualCodeEntry')}>
          <Text style={styles.buttonOutlineText}>Enter Code Manually</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.features}>
        <View style={styles.feature}>
          <Shield size={32} color="#10b981" />
          <Text style={styles.featureTitle}>Private</Text>
          <Text style={styles.featureDesc}>Your data stays secure</Text>
        </View>
        <View style={styles.feature}>
          <Clock size={32} color="#3b82f6" />
          <Text style={styles.featureTitle}>Temporary</Text>
          <Text style={styles.featureDesc}>Expires after event</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Users size={20} color="#ec4899" style={{ marginRight: 8 }} />
        <View>
          <Text style={styles.infoTitle}>How it works</Text>
          <Text style={styles.infoText}>• Scan the event's unique QR code</Text>
          <Text style={styles.infoText}>• Create a temporary profile (first name only)</Text>
          <Text style={styles.infoText}>• Discover other singles at this event</Text>
          <Text style={styles.infoText}>• Match and chat privately</Text>
          <Text style={styles.infoText}>• Everything expires when the event ends</Text>
        </View>
      </View>

        <Modal visible={activeModal === 'qrScanner'} animationType="slide" onRequestClose={closeModal}>
        <View style={styles.modalContainer}>
          <CameraKitCameraScreen
            style={StyleSheet.absoluteFillObject}
            onReadCode={(event: { nativeEvent: { codeStringValue: string } }) =>
              handleScanSuccess({ data: event.nativeEvent.codeStringValue })
            }            
          />
          <TouchableOpacity style={styles.modalClose} onPress={closeModal}>
            <Text style={styles.modalCloseText}>Close</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalSwitch} onPress={() => openModal('manualCodeEntry')}>
            <Text style={styles.modalCloseText}>Enter Code Manually</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal visible={activeModal === 'manualCodeEntry'} animationType="slide" onRequestClose={closeModal}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Enter Event Code</Text>
          <TextInput
            value={manualCode}
            onChangeText={setManualCode}
            autoCapitalize="characters"
            placeholder="e.g., WED2025"
            style={styles.input}
          />
          <View style={{ flexDirection: 'row', marginTop: 12 }}>
            <TouchableOpacity style={styles.modalButtonOutline} onPress={closeModal}>
              <Text style={styles.modalOutlineText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButtonPrimary, { marginLeft: 8 }]}
              disabled={!manualCode.trim()}
              onPress={() => handleEventAccess(manualCode)}
            >
              <Text style={styles.modalPrimaryText}>Join Event</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Join" component={JoinScreen} />
        <Stack.Screen name="Consent" component={ConsentScreen} />
        <Stack.Screen name="Discovery" component={DiscoveryScreen} />
        <Stack.Screen name="Matches" component={MatchesScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f8ff',
  },
  hero: {
    alignItems: 'center',
    marginBottom: 32,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111',
    textAlign: 'center',
  },
  gradientText: {
    color: '#ec4899',
  },
  subtitle: {
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 8,
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontWeight: '600',
    color: '#111',
    fontSize: 16,
  },
  cardDesc: {
    fontSize: 12,
    color: '#6b7280',
  },
  buttonPrimary: {
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#3b82f6',
  },
  buttonPrimaryText: {
    color: '#fff',
    fontWeight: '500',
  },
  buttonOutline: {
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#a855f7',
  },
  buttonOutlineText: {
    color: '#a855f7',
    fontWeight: '500',
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  feature: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    marginHorizontal: 4,
  },
  featureTitle: {
    marginTop: 8,
    fontWeight: '600',
    color: '#111',
  },
  featureDesc: {
    fontSize: 12,
    color: '#6b7280',
  },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
    alignItems: 'flex-start',
  },
  infoTitle: {
    fontWeight: '600',
    color: '#111',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#6b7280',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    width: '100%',
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#111',
  },
  modalClose: {
    position: 'absolute',
    top: 40,
    right: 20,
  },
  modalSwitch: {
    position: 'absolute',
    bottom: 40,
  },
  modalCloseText: {
    color: '#fff',
    fontWeight: '600',
  },
  modalText: {
    color: '#111',
  },
  modalButtonPrimary: {
    flex: 1,
    backgroundColor: '#a855f7',
    padding: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  modalButtonOutline: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    padding: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  modalPrimaryText: {
    color: '#fff',
    fontWeight: '600',
  },
  modalOutlineText: {
    color: '#111',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

