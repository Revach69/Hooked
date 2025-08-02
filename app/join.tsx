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
import { EventAPI, EventProfileAPI } from '../lib/firebaseApi';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMobileAsyncOperation } from '../lib/hooks/useMobileErrorHandling';
import MobileOfflineStatusBar from '../lib/components/MobileOfflineStatusBar';
import { SurveyNotificationService } from '../lib/surveyNotificationService';

export default function JoinPage() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
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
          const events = await EventAPI.filter({ event_code: code.toUpperCase() });
          return events;
        },
        { operation: 'Validate event code' }
      );

      if (result.queued) {
        setError("You're offline. This action will be completed when you're back online.");
        setIsLoading(false);
        return;
      }

      if (!result.success) {
        throw result.error || new Error('Failed to validate event code');
      }

      const events = result.result;

      if (!events || events.length === 0) {
        setError("Invalid event code. Please check the code and try again.");
        setIsLoading(false);
        return;
      }

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

      // Event is valid and active, proceed to create profile
      await createEventProfile(foundEvent);
    } catch (error: any) {
      console.error('Event join failed:', error);
      const errorMessage = error.message || 'Failed to join event. Please try again.';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const createEventProfile = async (event: any) => {
    try {
      // Generate session ID
      const sessionId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      
      // Store event and session info
      await AsyncStorage.setItem('currentEventId', event.id);
      await AsyncStorage.setItem('currentSessionId', sessionId);
      await AsyncStorage.setItem('currentEventCode', event.event_code);

      // Navigate to consent page
      router.replace('/consent');
    } catch (error) {
      console.error('Failed to create event profile:', error);
      setError("Failed to set up your event session. Please try again.");
      setIsLoading(false);
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    setError(null);
    
    try {
      await handleEventJoin();
    } catch (error) {
      console.error('Retry failed:', error);
      setError("Retry failed. Please check your connection and try again.");
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
      <MobileOfflineStatusBar />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>
            Joining Event
          </Text>
          <Text style={[styles.subtitle, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
            Code: {code?.toUpperCase()}
          </Text>
        </View>

        {/* Loading State */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={isDark ? '#fff' : '#000'} />
            <Text style={[styles.loadingText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
              Validating event code...
            </Text>
          </View>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <View style={styles.errorContainer}>
            <AlertCircle size={24} color="#ef4444" />
            <Text style={[styles.errorText, { color: isDark ? '#fca5a5' : '#dc2626' }]}>
              {error}
            </Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: isDark ? '#374151' : '#e5e7eb' }]}
              onPress={handleRetry}
              disabled={isRetrying}
            >
              {isRetrying ? (
                <ActivityIndicator size="small" color={isDark ? '#fff' : '#000'} />
              ) : (
                <Text style={[styles.retryButtonText, { color: isDark ? '#fff' : '#000' }]}>
                  Try Again
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
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
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    marginTop: 12,
    marginBottom: 20,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 