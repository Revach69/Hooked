import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  TextInput,
  ActivityIndicator,
  useColorScheme,
  Image,
  Linking,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { QrCode, X } from 'lucide-react-native';
import { AsyncStorageUtils } from '../lib/asyncStorageUtils';

import QRCodeScanner from '../lib/components/QRCodeScanner';
import { LinearGradient } from 'expo-linear-gradient';

import MobileOfflineStatusBar from '../lib/components/MobileOfflineStatusBar';
import { SurveyService } from '../lib/surveyService';
import { MemoryManager } from '../lib/utils';
import { useKickedUserCheck } from '../lib/hooks/useKickedUserCheck';
import KickedUserModal from './KickedUserModal';
import Toast from 'react-native-toast-message';
// Sentry removed




export default function Home() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);  
  const [manualCode, setManualCode] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);  
  const [isCheckingResume, setIsCheckingResume] = useState(true); // <-- NEW


  const { kickedUser, handleKickedUserClose } = useKickedUserCheck();
  const componentId = useRef('Home-' + Date.now()).current;
  const initializationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualCodeInputRef = useRef<TextInput>(null);

  useEffect(() => {
    MemoryManager.registerComponent(componentId);
    
    // Move functions inside useEffect to resolve dependency issues
    async function checkForSurvey() {
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
      } catch {
        // Error checking for survey
      }
    }

    async function initializeApp() {
      if (!MemoryManager.isComponentMounted(componentId)) {
        setIsCheckingResume(false);
        return;
      }

      try {
        // Check for existing session first
        const eventId = await AsyncStorageUtils.getItem<string>('currentEventId');
        const sessionId = await AsyncStorageUtils.getItem<string>('currentSessionId');
        
        if (eventId && sessionId) {
          // Check if the event has expired before allowing access
          try {
            const { EventAPI } = await import('../lib/firebaseApi');
            const eventData = await EventAPI.get(eventId);
            
            if (!eventData || eventData.expired) {
              // Event has expired or doesn't exist, clear session data
              console.log('Event has expired or no longer exists, clearing session data');
              await AsyncStorageUtils.removeItem('currentEventId');
              await AsyncStorageUtils.removeItem('currentSessionId');
              await AsyncStorageUtils.removeItem('currentEventCode');
              await AsyncStorageUtils.removeItem('currentEventCountry');
              await AsyncStorageUtils.removeItem('currentEventData');
              // Don't navigate to discovery, stay on home screen
              setIsCheckingResume(false);
              return;
            }
          } catch (error) {
            console.error('Error checking event expiration:', error);
            // If we can't check the event, clear session data to be safe
            await AsyncStorageUtils.removeItem('currentEventId');
            await AsyncStorageUtils.removeItem('currentSessionId');
            await AsyncStorageUtils.removeItem('currentEventCode');
            await AsyncStorageUtils.removeItem('currentEventCountry');
            await AsyncStorageUtils.removeItem('currentEventData');
            setIsCheckingResume(false);
            return;
          }
          
          router.replace('/discovery');
          return; // navigation will unmount, no need to set isCheckingResume
        }
        
        // Simple initialization without complex async operations
        setIsInitialized(true);
        
        // Check for survey with delay (only shows if within survey visibility timeframe)
        setTimeout(async () => {
          if (MemoryManager.isComponentMounted(componentId)) {
            await checkForSurvey();
          }
        }, 2000);

        // Check notification permissions after a delay
        setTimeout(async () => {
          if (MemoryManager.isComponentMounted(componentId)) {
            await checkNotificationPermissions();
          }
        }, 3000);
        
      } catch {
        // Error during app initialization
      } finally {
        setIsCheckingResume(false); // <-- NEW
      }
    }
    
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
  }, [componentId]);

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

  const checkNotificationPermissions = async () => {
    try {
      const { checkNotificationPermission, requestNotificationPermission } = await import('../lib/utils/notificationUtils');
      
      // Check if permission is already granted
      const currentPermission = await checkNotificationPermission();
      
      // Only request if not already granted
      if (!currentPermission.granted) {
        await requestNotificationPermission();
      }
    } catch (error) {
      console.error('Home page error:', error);
    }
  }



  const handleCameraAccess = () => {
    if (!MemoryManager.isComponentMounted(componentId)) return;
    setActiveModal('qrScanner');
  };

  const handleQRScan = (data: string) => {
    closeModal();
    handleEventAccess(data);
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
    if (manualCode.trim()) {
      handleEventAccess(manualCode.trim());
      closeModal();
    } else {
      Toast.show({
        type: 'warning',
        text1: 'Invalid Code',
        text2: 'Please enter a valid event code.',
        position: 'top',
        visibilityTime: 3500,
        autoHide: true,
        topOffset: 0,
      });
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
      paddingTop: 0,
      paddingBottom: 0,
    },
    headerSection: {
      alignItems: 'center',
      marginTop: 100,
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
      marginBottom: 40,
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
    <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
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
              accessibilityLabel="Scan Event QR"
              accessibilityHint="Opens camera to scan event QR code"
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="black" />
              ) : (
                <>
                  <QrCode size={24} color="black" />
                  <Text style={styles.buttonText}>Scan Event QR</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={() => openModal('manualCodeEntry')}
              accessibilityLabel="Enter Code Manually"
              accessibilityHint="Opens modal to manually enter event code"
            >
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
                  • See who&apos;s single{'\n'}
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

        {/* QR Code Scanner Modal */}
        <Modal
          visible={activeModal === 'qrScanner'}
          animationType="slide"
          transparent={false}
          onRequestClose={closeModal}
        >
          <QRCodeScanner
            onScan={handleQRScan}
            onClose={closeModal}
          />
        </Modal>

        {/* Kicked User Modal */}
        <KickedUserModal
          isVisible={kickedUser !== null}
          onClose={handleKickedUserClose}
          eventName={kickedUser?.eventName || ''}
          adminNotes={kickedUser?.adminNotes || ''}
        />
        {/* Subtle loading overlay for resume check */}
        {isCheckingResume && (
          <View style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}>
            <View style={{ alignItems: 'center' }}>
              <Image
                source={require('../assets/icon-rounded.png')}
                style={{ width: 120, height: 120, marginBottom: 24 }}
                resizeMode="contain"
              />
              <Text style={{
                fontSize: 28,
                fontWeight: '600',
                color: isDark ? '#fff' : '#000',
                textAlign: 'center',
                marginBottom: 16,
              }}>
                Hooked
              </Text>
              <ActivityIndicator size="large" color={isDark ? '#fff' : '#000'} />
            </View>
          </View>
        )}
      </LinearGradient>
    </View>
  );
} 