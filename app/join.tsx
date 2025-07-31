import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Alert,
  useColorScheme,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AlertCircle } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Event } from '../lib/firebaseApi';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMobileAsyncOperation } from '../lib/hooks/useMobileErrorHandling';
import MobileOfflineStatusBar from '../lib/components/MobileOfflineStatusBar';

export default function JoinPage() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { executeOperationWithOfflineFallback, showErrorAlert } = useMobileAsyncOperation();

  useEffect(() => {
    handleEventJoin();
  }, []);

  const handleEventJoin = async () => {
    try {
      if (!code) {
        setError("No event code provided.");
        setIsLoading(false);
        return;
      }

      // Check for admin code first
      if (code.toUpperCase() === 'ADMIN') {
        // Redirect to admin login page
        router.replace('/adminLogin');
        return;
      }

      // Use enhanced error handling for event validation
      const result = await executeOperationWithOfflineFallback(
        async () => {
          const events = await Event.filter({ event_code: code.toUpperCase() });
          return events;
        },
        { operation: 'Validate event code' }
      );

      if (result.queued) {
        setError("Event validation will be completed when you're back online.");
        setIsLoading(false);
        return;
      }

      if (!result.success || result.result.length === 0) {
        setError("Invalid event code.");
        setIsLoading(false);
        return;
      }

      const events = result.result;

      const foundEvent = events[0];
      const nowUTC = new Date().toISOString(); // Current UTC time as ISO string

      if (!foundEvent.starts_at || !foundEvent.expires_at) {
        setError("This event is not configured correctly. Please contact the organizer.");
        setIsLoading(false);
        return;
      }
      
      // Check if event is active using UTC time comparison
      const isActive = foundEvent.starts_at <= nowUTC && nowUTC < foundEvent.expires_at;
      
      if (nowUTC < foundEvent.starts_at) {
        setError("This event hasn't started yet. Try again soon!");
        setIsLoading(false);
        return;
      }
      
      if (nowUTC >= foundEvent.expires_at) {
        setError("This event has ended.");
        setIsLoading(false);
        return;
      }

      // Store event data in AsyncStorage for the session
      await AsyncStorage.setItem('currentEventId', foundEvent.id);
      await AsyncStorage.setItem('currentEventCode', foundEvent.event_code);

      // Check if user already has a session for this event
      const existingSessionId = await AsyncStorage.getItem('currentSessionId');
      
      if (existingSessionId) {
        // User might be returning - verify their profile still exists
        try {
          const { EventProfile } = await import('../lib/firebaseApi');
          const profileResult = await executeOperationWithOfflineFallback(
            async () => {
              const existingProfiles = await EventProfile.filter({
                session_id: existingSessionId,
                event_id: foundEvent.id
              });
              return existingProfiles;
            },
            { operation: 'Check existing profile' }
          );

          if (profileResult.success && profileResult.result.length > 0) {
            // User has an existing profile, redirect to Discovery
            router.replace('/discovery');
            return;
          }
        } catch (profileError) {
          console.warn("Error checking existing profile:", profileError);
          // Continue to consent page if profile check fails
        }
      }

      // New user or no existing profile - redirect to consent/profile creation
      router.replace('/consent');

    } catch (error) {
      console.error("Error processing event join:", error);
      showErrorAlert(error, () => handleEventJoin());
      setError("Unable to process event access. Please try again.");
      setIsLoading(false);
    }
  };

  const handleGoHome = () => {
    router.replace('/home');
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#1a1a1a' : '#f8fafc',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    card: {
      backgroundColor: isDark ? '#2d2d2d' : 'white',
      borderRadius: 16,
      padding: 32,
      maxWidth: 400,
      width: '100%',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 12,
      elevation: 4,
    },
    spinner: {
      marginBottom: 24,
    },
    title: {
      fontSize: 20,
      fontWeight: '600',
      color: isDark ? '#ffffff' : '#1f2937',
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      color: isDark ? '#9ca3af' : '#6b7280',
      textAlign: 'center',
      lineHeight: 24,
    },
    errorIconContainer: {
      width: 64,
      height: 64,
      backgroundColor: isDark ? '#dc2626' : '#fef2f2',
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    errorText: {
      fontSize: 16,
      color: isDark ? '#9ca3af' : '#6b7280',
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 24,
    },
    button: {
      backgroundColor: '#8b5cf6',
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 24,
      width: '100%',
      alignItems: 'center',
    },
    buttonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '500',
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color="#8b5cf6" style={styles.spinner} />
          <Text style={styles.title}>Joining Event...</Text>
          <Text style={styles.subtitle}>
            Please wait while we verify your event access.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.card}>
          <View style={styles.errorIconContainer}>
            <AlertCircle size={32} color="#dc2626" />
          </View>
          <Text style={styles.title}>Unable to Join Event</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.button} onPress={handleGoHome}>
            <Text style={styles.buttonText}>Return to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // This should not be reached due to redirects, but just in case
  return (
    <SafeAreaView style={styles.container}>
      <MobileOfflineStatusBar />
      <View style={styles.card}>
        <Text style={styles.title}>Processing...</Text>
        <Text style={styles.subtitle}>
          Redirecting you to the event.
        </Text>
      </View>
    </SafeAreaView>
  );
} 