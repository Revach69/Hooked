import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AlertCircle } from 'lucide-react-native';
import { AsyncStorageUtils } from '../lib/asyncStorageUtils';
import { EventAPI, type Event } from '../lib/firebaseApi';
import { app } from '../lib/firebaseConfig';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMobileAsyncOperation } from '../lib/hooks/useMobileErrorHandling';
import MobileOfflineStatusBar from '../lib/components/MobileOfflineStatusBar';
import { Timestamp } from 'firebase/firestore';

export default function JoinPage() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { executeOperationWithOfflineFallback } = useMobileAsyncOperation();

  const handleEventJoin = useCallback(async () => {
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

      // Use Cloud Function to search for events across all regional databases
      const result = await executeOperationWithOfflineFallback(
        async () => {
          console.log(`Searching for event with code: ${code}`);
          
          // Get the appropriate regional functions instance
          // Use automatic region selection for optimal performance
          const functions = getFunctions(app);
          const searchEventByCode = httpsCallable(functions, 'searchEventByCode');
          
          try {
            const response = await searchEventByCode({ eventCode: code });
            const data = response.data as any;
            
            if (data.success && data.event) {
              console.log(`Found event in database: ${data.event._database}`);
              // Convert Firestore timestamps if needed
              const event = data.event;
              if (event.starts_at && typeof event.starts_at === 'object') {
                event.starts_at = new Timestamp(event.starts_at.seconds || event.starts_at._seconds, event.starts_at.nanoseconds || event.starts_at._nanoseconds || 0);
              }
              if (event.expires_at && typeof event.expires_at === 'object') {
                event.expires_at = new Timestamp(event.expires_at.seconds || event.expires_at._seconds, event.expires_at.nanoseconds || event.expires_at._nanoseconds || 0);
              }
              if (event.start_date && typeof event.start_date === 'object') {
                event.start_date = new Timestamp(event.start_date.seconds || event.start_date._seconds, event.start_date.nanoseconds || event.start_date._nanoseconds || 0);
              }
              if (event.created_at && typeof event.created_at === 'object') {
                event.created_at = new Timestamp(event.created_at.seconds || event.created_at._seconds, event.created_at.nanoseconds || event.created_at._nanoseconds || 0);
              }
              if (event.updated_at && typeof event.updated_at === 'object') {
                event.updated_at = new Timestamp(event.updated_at.seconds || event.updated_at._seconds, event.updated_at.nanoseconds || event.updated_at._nanoseconds || 0);
              }
              return [event];
            } else {
              console.log('Event not found in any database');
              return [];
            }
          } catch (functionError: any) {
            console.error('Cloud Function error:', functionError);
            // If it's a network error, throw it to trigger offline mode
            if (functionError.code === 'unavailable' || functionError.code === 'deadline-exceeded') {
              throw functionError;
            }
            // Otherwise, event not found
            return [];
          }
        },
        { operation: 'Search for event code' }
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
      // Use Firebase Timestamp for platform-agnostic comparison
      const nowTimestamp = Timestamp.now();

      if (!foundEvent.starts_at || !foundEvent.expires_at) {
        setError("This event is not configured correctly. Please contact the organizer.");
        setIsLoading(false);
        return;
      }
      
      // Compare using Timestamp seconds to avoid platform-specific timezone issues
      if (nowTimestamp.seconds < foundEvent.starts_at.seconds) {
        // Use toDate() only for display purposes in error messages
        const accessTime = foundEvent.starts_at.toDate();
        const realStartTime = foundEvent.start_date ? foundEvent.start_date.toDate() : accessTime;
        
        if (foundEvent.start_date && realStartTime > accessTime) {
          setError("This event hasn't opened for early access yet. Try again soon!");
        } else {
          setError("This event hasn't started yet. Try again soon!");
        }
        setIsLoading(false);
        return;
      }

      // Use seconds comparison for expires_at to ensure consistency across platforms
      if (nowTimestamp.seconds >= foundEvent.expires_at.seconds || foundEvent.expired) {
        setError("This event has ended.");
        setIsLoading(false);
        return;
      }

      // Event is valid and active, proceed to create profile
      await createEventProfile(foundEvent);
    } catch (error: any) {
      // Event join failed
      const errorMessage = error.message || 'Failed to join event. Please try again.';
      setError(errorMessage);
      setIsLoading(false);
    }
  }, [code, executeOperationWithOfflineFallback]);

  useEffect(() => {
    handleEventJoin();
  }, [handleEventJoin]);

  const createEventProfile = async (event: any) => {
    try {
      // Generate session ID
      const sessionId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      
      // Store event and session info
      await AsyncStorageUtils.setItem('currentEventId', event.id);
      await AsyncStorageUtils.setItem('currentSessionId', sessionId);
      await AsyncStorageUtils.setItem('currentEventCode', event.event_code);
      
      // Store the event country for regional database access
      if (event.country) {
        await AsyncStorageUtils.setItem('currentEventCountry', event.country);
      }
      
      // Store the full event data with properly converted timestamps
      const eventToStore = {
        ...event,
        starts_at: event.starts_at?.toDate ? event.starts_at.toDate() : event.starts_at,
        expires_at: event.expires_at?.toDate ? event.expires_at.toDate() : event.expires_at,
        start_date: event.start_date?.toDate ? event.start_date.toDate() : event.start_date,
        created_at: event.created_at?.toDate ? event.created_at.toDate() : event.created_at,
        updated_at: event.updated_at?.toDate ? event.updated_at.toDate() : event.updated_at,
      };
      await AsyncStorageUtils.setItem('currentEventData', eventToStore);

      // Update NotificationRouter with new session ID
      try {
        const { setCurrentSessionIdForDedup } = await import('../lib/notifications/NotificationRouter');
        setCurrentSessionIdForDedup(sessionId);
        console.log('NotificationRouter updated with new session ID');
      } catch (error) {
        console.error('Failed to update NotificationRouter:', error);
        // Don't fail the join process for this
      }

      // Navigate to consent page
      router.replace('/consent');
    } catch {
      // Failed to create event profile
      setError("Failed to set up your event session. Please try again.");
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    // Navigate back to homepage instead of retrying the same code
    router.replace('/');
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
              accessibilityRole="button"
              accessibilityLabel="Back to Home"
              accessibilityHint="Navigate back to the home screen"
            >
              <Text style={[styles.retryButtonText, { color: isDark ? '#fff' : '#000' }]}>
                Back to Home
              </Text>
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
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
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