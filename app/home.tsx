import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Dimensions,
  Modal,
  TextInput,
  ActivityIndicator,
  useColorScheme,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { Heart, QrCode, Hash, Shield, Clock, Users, X, Camera } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Event } from '../lib/firebaseApi';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function Home() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualCode, setManualCode] = useState('');

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

  const handleCameraAccess = async () => {
    try {
      setIsProcessing(true);
      
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is required to scan QR codes.');
        setIsProcessing(false);
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        // For now, we'll show a message that QR scanning is not fully implemented
        // In a real app, you would process the image to extract QR code data
        Alert.alert(
          'QR Code Detected',
          'Camera functionality is working! For now, please use the manual code entry option.',
          [
            { text: 'OK', onPress: () => closeModal() },
            { text: 'Enter Code Manually', onPress: () => openModal('manualCodeEntry') }
          ]
        );
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to access camera. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEventAccess = (eventCode: string) => {
    // The join page will handle all validation logic.
    closeModal();
    router.push(`/join?code=${eventCode.toUpperCase()}`);
  };

  const openModal = (modalName: string) => {
    setActiveModal(modalName);
    setManualCode('');
  };

  const closeModal = () => {
    setActiveModal(null);
    setManualCode('');
  };

  const handleManualSubmit = () => {
    if (manualCode.trim().length > 0) {
      handleEventAccess(manualCode.trim());
    } else {
      Alert.alert("Invalid Code", "Please enter a valid event code.");
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    gradientContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 40,
    },
    headerSection: {
      alignItems: 'center',
      marginTop: 60,
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: 20,
    },
    logo: {
      width: 100,
      height: 100,
      marginBottom: 15,
    },
    appTitle: {
      fontSize: 42,
      fontWeight: 'bold',
      color: 'white',
    },
    hookedImage: {
      height: 60,
      width: 180,
      marginBottom: 15,
    },
    subtitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: 'white',
      textAlign: 'center',
      marginBottom: 16,
    },
    bottomSection: {
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
    },
    howItWorksLink: {
      marginBottom: 20,
    },
    howItWorksText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: 'white',
      textDecorationLine: 'underline',
      textAlign: 'center',
    },
    buttonsContainer: {
      width: '100%',
      alignItems: 'center',
    },
    button: {
      backgroundColor: 'white',
      borderRadius: 25,
      paddingVertical: 16,
      paddingHorizontal: 24,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      width: 280,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    buttonText: {
      color: 'black',
      fontSize: 16,
      fontWeight: 'bold',
      marginLeft: 12,
      textAlign: 'center',
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.7)',
    },
    modalContent: {
      backgroundColor: '#2d2d2d',
      borderRadius: 20,
      padding: 24,
      width: '90%',
      maxHeight: '80%',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
      elevation: 10,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: 'white',
    },
    modalCloseButton: {
      padding: 5,
    },
    infoCard: {
      backgroundColor: 'white',
      borderRadius: 16,
      padding: 24,
      marginBottom: 16,
      width: '100%',
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
      fontSize: 18,
      color: '#6b7280',
      lineHeight: 26,
    },
    featureCard: {
      backgroundColor: 'white',
      borderRadius: 16,
      padding: 24,
      marginBottom: 16,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    featureCardsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      marginBottom: 16,
    },
    sideBySideFeatureCard: {
      flex: 1,
      backgroundColor: 'white',
      borderRadius: 16,
      padding: 20,
      alignItems: 'center',
      marginHorizontal: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    featureTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#1f2937',
      marginTop: 12,
      marginBottom: 4,
    },
    featureSubtitle: {
      fontSize: 14,
      color: '#6b7280',
      textAlign: 'center',
    },
    manualCodeInput: {
      width: '100%',
      height: 50,
      borderColor: '#404040',
      borderWidth: 2,
      borderRadius: 12,
      paddingHorizontal: 16,
      fontSize: 16,
      color: 'white',
      marginBottom: 20,
      backgroundColor: '#1a1a1a',
    },
    manualSubmitButton: {
      backgroundColor: '#ec4899',
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 24,
      alignItems: 'center',
    },
    manualSubmitButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '500',
    },
    legalDisclaimer: {
      alignItems: 'center',
      marginTop: 20,
    },
    legalText: {
      fontSize: 12,
      color: 'white',
      textAlign: 'center',
      lineHeight: 16,
    },
    legalLink: {
      textDecorationLine: 'underline',
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#FBA7D5', '#C187FD']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientContainer}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../assets/Home Icon.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
            <Image 
              source={require('../assets/Hooked.png')} 
              style={styles.hookedImage}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          {/* Subtitle */}
          <Text style={styles.subtitle}>Meet singles at this event.</Text>
          
          {/* How it works link */}
          <TouchableOpacity 
            style={styles.howItWorksLink}
            onPress={() => openModal('howItWorks')}
          >
            <Text style={styles.howItWorksText}>See how it works</Text>
          </TouchableOpacity>

          {/* Buttons */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={handleCameraAccess}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="black" />
              ) : (
                <>
                  <QrCode size={24} color="black" />
                  <Text style={styles.buttonText}>Scan QR Code</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={() => openModal('manualCodeEntry')}
            >
              <Hash size={24} color="black" />
              <Text style={styles.buttonText}>Enter Code Manually</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Legal Disclaimer */}
        <View style={styles.legalDisclaimer}>
          <Text style={styles.legalText}>
            By creating a temporary profile, you agree to our{' '}
            <Text style={styles.legalLink} onPress={() => console.log('Terms clicked')}>
              Terms
            </Text>
            .{'\n'}
            See how we use your data in our{' '}
            <Text style={styles.legalLink} onPress={() => console.log('Privacy Policy clicked')}>
              Privacy Policy
            </Text>
            .
          </Text>
        </View>

        {/* How it works Modal */}
        <Modal
          visible={activeModal === 'howItWorks'}
          animationType="slide"
          transparent={true}
          onRequestClose={closeModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>How it works</Text>
                <TouchableOpacity onPress={closeModal} style={styles.modalCloseButton}>
                  <X size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.infoCard}>
                <Text style={styles.infoText}>• Join the event via QR or Code{'\n'}
                  • Create a temporary profile{'\n'}
                  • See who's single{'\n'}
                  • Match, chat, and meet{'\n'}
                  • Profiles expires after event</Text>
              </View>
            </View>
          </View>
        </Modal>

        {/* Manual Code Entry Modal */}
        <Modal
          visible={activeModal === 'manualCodeEntry'}
          animationType="slide"
          transparent={true}
          onRequestClose={closeModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Enter Event Code</Text>
                <TouchableOpacity onPress={closeModal} style={styles.modalCloseButton}>
                  <X size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.manualCodeInput}
                placeholder="Enter event code"
                placeholderTextColor="#9ca3af"
                value={manualCode}
                onChangeText={setManualCode}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus={true}
                keyboardType="default"
              />
              <TouchableOpacity
                style={styles.manualSubmitButton}
                onPress={handleManualSubmit}
              >
                <Text style={styles.manualSubmitButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </SafeAreaView>
  );
} 