import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme, Platform, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { unifiedNavigator } from '../lib/navigation/UnifiedNavigator';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Smartphone, Download, QrCode, ExternalLink } from 'lucide-react-native';

export default function JoinInstantPage() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const [userAgent, setUserAgent] = useState('');
  const [isNativeApp, setIsNativeApp] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    // This is a mobile-only app, no web support
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      setIsNativeApp(true);
      setUserAgent(''); // Not applicable for mobile
      
      // Handle deep linking for mobile
      if (code) {
        // In mobile app, navigate directly using UnifiedNavigator
        unifiedNavigator.navigate('join', { code });
        
        // Fallback after short delay to show platform-specific UI
        setTimeout(() => {
          console.log('Deep-link redirect attempted, showing fallback UI');
        }, 1000);
      }
    } else {
      setIsNativeApp(true);
      // Running in native app - redirect to join page immediately
      if (code) {
        unifiedNavigator.navigate('join', { code }, true); // replace: true
      } else {
        // No code provided, go back to home
        unifiedNavigator.navigate('home', {}, true); // replace: true
      }
    }
  }, [code]);

  const detectPlatform = () => {
    if (Platform.OS !== 'web') return Platform.OS;
    
    const ua = userAgent.toLowerCase();
    if (ua.includes('iphone') || ua.includes('ipad')) return 'ios';
    if (ua.includes('android')) return 'android';
    return 'desktop';
  };

  const platform = detectPlatform();

  const handleAppStoreRedirect = () => {
    if (platform === 'ios') {
      // iOS App Store
      window.open('https://apps.apple.com/app/hooked/id6446851377', '_blank');
    } else if (platform === 'android') {
      // Show beta group instructions
      showAndroidBetaInstructions();
    } else {
      // Desktop - show mobile prompt
      showMobilePrompt();
    }
  };

  const showAndroidBetaInstructions = () => {
    Alert.alert(
      'Join Android Beta',
      'To access Hooked on Android:\n\n1. Join our beta testing group\n2. Download from Google Play Store\n3. Scan the QR code again',
      [
        {
          text: 'Join Beta Group',
          onPress: () => window.open('https://groups.google.com/g/hooked-beta', '_blank')
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const showMobilePrompt = () => {
    Alert.alert(
      'Mobile Device Required',
      'Hooked is designed for mobile devices. Please scan this QR code with your phone to continue.',
      [{ text: 'Got it', style: 'default' }]
    );
  };

  const handleRetryDeepLink = () => {
    if (code) {
      // Mobile-only app - navigate directly using UnifiedNavigator
      unifiedNavigator.navigate('join', { code });
    }
  };

  // If running in native app, this component shouldn't render
  // The useEffect will redirect to /join
  if (isNativeApp) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>
            Redirecting...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Smartphone size={48} color={isDark ? '#fff' : '#000'} />
          <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>
            Join Event: {code?.toUpperCase()}
          </Text>
          <Text style={[styles.subtitle, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
            Get the Hooked app to join this event
          </Text>
        </View>

        <View style={styles.instructionsContainer}>
          {platform === 'ios' && (
            <View style={styles.platformSection}>
              <Text style={[styles.platformTitle, { color: isDark ? '#fff' : '#000' }]}>
                iOS Instructions
              </Text>
              <Text style={[styles.instructionText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                1. Download Hooked from the App Store
              </Text>
              <Text style={[styles.instructionText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                2. Open the app and scan the QR code again
              </Text>
            </View>
          )}

          {platform === 'android' && (
            <View style={styles.platformSection}>
              <Text style={[styles.platformTitle, { color: isDark ? '#fff' : '#000' }]}>
                Android Beta Access
              </Text>
              <Text style={[styles.instructionText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                1. Join our beta testing group
              </Text>
              <Text style={[styles.instructionText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                2. Download from Google Play Store
              </Text>
              <Text style={[styles.instructionText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                3. Scan the QR code again to join
              </Text>
            </View>
          )}

          {platform === 'desktop' && (
            <View style={styles.platformSection}>
              <Text style={[styles.platformTitle, { color: isDark ? '#fff' : '#000' }]}>
                Mobile Device Required
              </Text>
              <Text style={[styles.instructionText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                Hooked is designed for mobile devices
              </Text>
              <Text style={[styles.instructionText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                Please scan this QR code with your phone
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actionButtons}>
          {platform === 'ios' && (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: '#007AFF' }]}
              onPress={handleAppStoreRedirect}
              accessibilityRole="button"
              accessibilityLabel="Download from App Store"
            >
              <Download size={20} color="#fff" />
              <Text style={styles.buttonText}>
                Download from App Store
              </Text>
            </TouchableOpacity>
          )}

          {platform === 'android' && (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: '#34A853' }]}
              onPress={handleAppStoreRedirect}
              accessibilityRole="button"
              accessibilityLabel="Join Android Beta"
            >
              <ExternalLink size={20} color="#fff" />
              <Text style={styles.buttonText}>
                Join Android Beta
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.secondaryButton, { 
              backgroundColor: isDark ? '#374151' : '#e5e7eb',
              borderColor: isDark ? '#6b7280' : '#d1d5db'
            }]}
            onPress={handleRetryDeepLink}
            accessibilityRole="button"
            accessibilityLabel="Try opening in app"
          >
            <QrCode size={20} color={isDark ? '#fff' : '#000'} />
            <Text style={[styles.secondaryButtonText, { color: isDark ? '#fff' : '#000' }]}>
              I have the app
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: isDark ? '#6b7280' : '#9ca3af' }]}>
            Event code will be automatically applied when you open the app
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: 400,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  instructionsContainer: {
    width: '100%',
    marginBottom: 40,
  },
  platformSection: {
    marginBottom: 20,
  },
  platformTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  actionButtons: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: 30,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});