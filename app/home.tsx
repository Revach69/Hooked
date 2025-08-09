import React, { useState, useEffect, useRef } from 'react';
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
  Linking,
  Keyboard,
} from 'react-native';
import { router } from 'expo-router';
import { Heart, QrCode, Hash, Shield, Clock, Users, X, Camera } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EventAPI } from '../lib/firebaseApi';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useMobileAsyncOperation } from '../lib/hooks/useMobileErrorHandling';
import MobileOfflineStatusBar from '../lib/components/MobileOfflineStatusBar';
import { SurveyService } from '../lib/surveyService';
import { MemoryManager } from '../lib/utils';
import { useKickedUserCheck } from '../lib/hooks/useKickedUserCheck';
import KickedUserModal from './KickedUserModal';

const { width } = Dimensions.get('window');

export default function Home() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const { executeOperationWithOfflineFallback, showErrorAlert } = useMobileAsyncOperation();
  const { kickedUser, isChecking, handleKickedUserClose } = useKickedUserCheck();
  const componentId = useRef('Home-' + Date.now()).current;
  const initializationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualCodeInputRef = useRef<TextInput>(null);

  useEffect(() => {
    MemoryManager.registerComponent(componentId);
    
    // Initialize with a delay to prevent immediate crashes
    initializationTimeoutRef.current = setTimeout(() => {
      if (MemoryManager.isComponentMounted(componentId)) {
        initializeApp();
      }
    }, 1000);

    return () => {
      MemoryManager.unregisterComponent(componentId);
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
    };
  }, []);

  // Effect to handle keyboard focus when manual code entry modal opens
  useEffect(() => {
    if (activeModal === 'manualCodeEntry') {
      // Delay focus to ensure modal animation completes
      const focusTimer = setTimeout(() => {
        if (manualCodeInputRef.current) {
          manualCodeInputRef.current.focus();
        }
      }, 300); // 300ms delay to allow modal animation to complete

      return () => clearTimeout(focusTimer);
    }
  }, [activeModal]);

  const initializeApp = async () => {
    if (!MemoryManager.isComponentMounted(componentId) || isInitialized) {
      return;
    }

    try {
      // Check for existing session first
      const eventId = await AsyncStorage.getItem('currentEventId');
      const sessionId = await AsyncStorage.getItem('currentSessionId');
      
      if (eventId && sessionId) {
        // User has an active session, redirect to discovery
        router.replace('/discovery');
        return;
      }
      
      // Simple initialization without complex async operations
      setIsInitialized(true);
      
      // Check for survey with delay (only shows if within survey visibility timeframe)
      setTimeout(async () => {
        if (MemoryManager.isComponentMounted(componentId)) {
          await checkForSurvey();
        }
      }, 2000);
      
    } catch (error) {
              // Error during app initialization
    }
  };

  const checkForSurvey = async () => {
    if (!MemoryManager.isComponentMounted(componentId)) return;
    
    try {
      const surveyData = await SurveyService.shouldShowSurvey();
      if (surveyData && MemoryManager.isComponentMounted(componentId)) {
        // Add delay to avoid interrupting immediate user actions
        setTimeout(() => {
          if (MemoryManager.isComponentMounted(componentId)) {
            router.push({
              pathname: '/survey',
              params: {
                eventId: surveyData.eventId,
                eventName: surveyData.eventName,
                sessionId: surveyData.sessionId,
                source: 'app_load'
              }
            });
          }
        }, 3000);
      }
    } catch (error) {
              // Error checking for survey
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
    if (!MemoryManager.isComponentMounted(componentId)) return;
    
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
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
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
              // Camera access error
    } finally {
      if (MemoryManager.isComponentMounted(componentId)) {
        setIsProcessing(false);
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
      marginBottom: 40,
      marginTop: 20,
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
      backgroundColor: isDark ? '#2d2d2d' : '#ffffff',
      borderRadius: 20,
      padding: 24,
      width: Math.min(Dimensions.get('window').width * 0.9, 400), // Responsive width: 90% of screen width, max 400px
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
      color: isDark ? 'white' : '#1f2937',
    },
    modalCloseButton: {
      padding: 5,
    },
    infoCard: {
      backgroundColor: isDark ? '#1a1a1a' : 'white',
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
      color: isDark ? '#f9fafb' : '#1f2937',
      marginBottom: 8,
    },
    infoText: {
      fontSize: 18,
      color: isDark ? '#d1d5db' : '#6b7280',
      lineHeight: 26,
    },
    featureCard: {
      backgroundColor: isDark ? '#1a1a1a' : 'white',
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
      backgroundColor: isDark ? '#1a1a1a' : 'white',
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
      color: isDark ? '#f9fafb' : '#1f2937',
      marginTop: 12,
      marginBottom: 4,
    },
    featureSubtitle: {
      fontSize: 14,
      color: isDark ? '#d1d5db' : '#6b7280',
      textAlign: 'center',
    },
    manualCodeInput: {
      width: '100%',
      height: 50,
      borderColor: isDark ? '#404040' : '#d1d5db',
      borderWidth: 2,
      borderRadius: 12,
      paddingHorizontal: 16,
      fontSize: 16,
      color: isDark ? 'white' : '#1f2937',
      marginBottom: 20,
      backgroundColor: isDark ? '#1a1a1a' : '#f9fafb',
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
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
      <MobileOfflineStatusBar />
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
              source={require('../assets/round icon.png')} 
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
              accessibilityLabel="Scan QR Code"
              accessibilityHint="Opens camera to scan event QR code"
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
              accessibilityLabel="Enter Code Manually"
              accessibilityHint="Opens form to manually enter event code"
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
            <Text style={styles.legalLink} onPress={() => Linking.openURL('https://hooked-app.com/terms')}>
              Terms
            </Text>
            .{'\n'}
            See how we use your data in our{' '}
            <Text style={styles.legalLink} onPress={() => Linking.openURL('https://hooked-app.com/privacy')}>
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
                ref={manualCodeInputRef}
                style={styles.manualCodeInput}
                placeholder="Enter event code"
                placeholderTextColor={isDark ? "#9ca3af" : "#6b7280"}
                value={manualCode}
                onChangeText={setManualCode}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Event Code Input"
                accessibilityHint="Enter the event code to join"
                autoFocus={false}
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

        {/* Kicked User Modal */}
        <KickedUserModal
          isVisible={kickedUser !== null}
          onClose={handleKickedUserClose}
          eventName={kickedUser?.eventName || ''}
          adminNotes={kickedUser?.adminNotes || ''}
        />
      </LinearGradient>
    </SafeAreaView>
  );
} 