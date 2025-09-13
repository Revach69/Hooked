import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { unifiedNavigator } from '../lib/navigation/UnifiedNavigator';
import { AlertCircle } from 'lucide-react-native';
import { AsyncStorageUtils } from '../lib/asyncStorageUtils';
import { type Event } from '../lib/firebaseApi';
import { httpsCallable } from 'firebase/functions';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMobileAsyncOperation } from '../lib/hooks/useMobileErrorHandling';
import MobileOfflineStatusBar from '../lib/components/MobileOfflineStatusBar';
import { Timestamp } from 'firebase/firestore';

export default function JoinPage() {
  const [code, setCode] = useState<string | null>(null);
  
  // Get code from unified navigator params - subscribe to navigation changes
  useEffect(() => {
    const getCodeFromNavigator = () => {
      const state = unifiedNavigator.getState();
      const codeParam = state.params.code as string;
      console.log('Join page: Extracting code from navigation params:', codeParam);
      return codeParam || null;
    };
    
    // Get initial code
    setCode(getCodeFromNavigator());
    
    // Subscribe to navigation changes to handle delayed parameter updates
    const unsubscribe = unifiedNavigator.subscribe((navigationState) => {
      if (navigationState.currentPage === 'join') {
        const newCode = navigationState.params.code as string;
        if (newCode && newCode !== code) {
          console.log('Join page: Code updated from navigation:', newCode);
          setCode(newCode);
        }
      }
    });
    
    return unsubscribe;
  }, [code]);
  const [isLoading, setIsLoading] = useState(false); // Start as false, only set true when validation begins
  const [isValidating, setIsValidating] = useState(false); // Track when validation actually starts
  const [error, setError] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { executeOperationWithOfflineFallback } = useMobileAsyncOperation();

  // Add timeout to prevent getting stuck on join page - only start when validation begins
  useEffect(() => {
    if (isValidating && code) {
      console.log('Join page: Starting validation timeout timer');
      const timeout = setTimeout(() => {
        if (isValidating) {
          console.log('Join page: Validation timeout, returning to home');
          setError("Event validation is taking too long. Please try again.");
          setIsLoading(false);
          setIsValidating(false);
          
          // Navigate to home after showing error briefly
          setTimeout(() => {
            unifiedNavigator.navigate('home', {}, true);
          }, 2000);
        }
      }, 30000); // 30 second timeout

      return () => clearTimeout(timeout);
    }
  }, [isValidating, code]);

  const handleEventJoin = useCallback(async () => {
    try {
      if (!code) {
        setError("No event code provided.");
        setIsLoading(false);
        setIsValidating(false);
        return;
      }

      // Start validation
      setIsLoading(true);
      setIsValidating(true);
      setError(null);

      // Check for admin code first
      if (code.toUpperCase() === 'ADMIN') {
        // Redirect to admin login page
        unifiedNavigator.navigate('adminLogin', {}, true); // replace: true
        return;
      }

      // Use Cloud Function to search for events across all regional databases
      const result = await executeOperationWithOfflineFallback(
        async () => {
          console.log(`Searching for event with code: ${code}`);
          
          // Get the appropriate regional functions instance
          // Use automatic region selection for optimal performance
          const { getEventSpecificFunctions } = await import('../lib/firebaseRegionConfig');
          
          // Use default region for event search since we don't know the event country yet
          const functions = getEventSpecificFunctions(null);
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
        setIsValidating(false);
        return;
      }

      if (!result.success) {
        throw result.error || new Error('Failed to validate event code');
      }

      const events: Event[] = result.result || [];

      if (!events || events.length === 0) {
        setError("Invalid event code. Please check the code and try again.");
        setIsLoading(false);
        setIsValidating(false);
        return;
      }

      const foundEvent = events[0];
      // Use Firebase Timestamp for platform-agnostic comparison
      const nowTimestamp = Timestamp.now();

      if (!foundEvent.starts_at || !foundEvent.expires_at) {
        setError("This event is not configured correctly. Please contact the organizer.");
        setIsLoading(false);
        setIsValidating(false);
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
        setIsValidating(false);
        return;
      }

      // Use seconds comparison for expires_at to ensure consistency across platforms
      if (nowTimestamp.seconds >= foundEvent.expires_at.seconds || foundEvent.expired) {
        setError("This event has ended.");
        setIsLoading(false);
        setIsValidating(false);
        return;
      }

      // Event is valid and active, proceed to create profile
      setError(null); // Clear any previous errors
      await createEventProfile(foundEvent);
    } catch (error: any) {
      // Event join failed
      console.error('Join page: Event validation failed:', error);
      
      let errorMessage = 'Failed to join event. Please try again.';
      
      // Handle specific error types
      if (error.code === 'unavailable' || error.code === 'deadline-exceeded') {
        errorMessage = "Can't reach the server. Please check your connection and try again.";
      } else if (error.code === 'permission-denied') {
        errorMessage = "Access denied. You may have been removed from this event.";
      } else if (error.code === 'not-found') {
        errorMessage = "Event not found. Please check the code and try again.";
      } else if (error.message && error.message.includes('timeout')) {
        errorMessage = "Connection timeout. Please try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setIsLoading(false);
      setIsValidating(false);
    }
  }, [code, executeOperationWithOfflineFallback]);

  useEffect(() => {
    // Reset states when code changes or component mounts
    setError(null);
    setIsLoading(false);
    setIsValidating(false);
    
    // Only run validation when we have a code
    if (code) {
      console.log('Join page: Starting validation for code:', code);
      handleEventJoin();
    }
  }, [code, handleEventJoin]);

  const createEventProfile = async (event: any) => {
    try {
      // Clear only essential session data, preserve cache for instant performance
      // ~43MB/month accumulation is negligible for modern devices (0.03% of 128GB)
      try {
        console.log('🚀 Join: Updating session data for new event (preserving cache for performance)');
        
        // Clear only current session data, not cache or preloaded data
        await AsyncStorageUtils.multiRemove([
          'currentEventId',
          'currentSessionId', 
          'currentEventCode',
          'currentProfileColor',
          'currentProfilePhotoUrl',
          'currentEventCountry',
          'currentEventData',
          'isOnConsentPage'
        ]);
        
        console.log('✅ Join: Session data updated successfully, cache preserved for instant app performance');
      } catch (clearError) {
        console.warn('Join: Failed to update session data:', clearError);
        // Continue with join process even if cleanup fails
      }
      
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

      // Clear loading states before navigation
      setIsLoading(false);
      setIsValidating(false);
      
      // Navigate to consent page
      unifiedNavigator.navigate('consent', {}, true); // replace: true
    } catch {
      // Failed to create event profile
      setError("Failed to set up your event session. Please try again.");
      setIsLoading(false);
      setIsValidating(false);
    }
  };

  const handleRetry = () => {
    // Navigate back to homepage instead of retrying the same code
    unifiedNavigator.navigate('home', {}, true); // replace: true
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