import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MapPin, AlertCircle, CheckCircle, Navigation } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VenueLocationService, LocationCoordinates } from '../lib/services/VenueLocationService';
import { VenuePingService, VenueEventSession } from '../lib/services/VenuePingService';
import { useMobileAsyncOperation } from '../lib/hooks/useMobileErrorHandling';
import { AsyncStorageUtils } from '../lib/asyncStorageUtils';
import { getFunctions, httpsCallable } from 'firebase/functions';
import MobileOfflineStatusBar from '../lib/components/MobileOfflineStatusBar';

export default function JoinVenuePage() {
  const { venueId, qrCodeId, eventName, venueName } = useLocalSearchParams<{
    venueId: string;
    qrCodeId: string;
    eventName: string;
    venueName: string;
  }>();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<'checking' | 'requesting' | 'verifying' | 'success' | 'failed'>('checking');
  const [userLocation, setUserLocation] = useState<LocationCoordinates | null>(null);
  const [locationTips, setLocationTips] = useState<string | null>(null);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { executeOperationWithOfflineFallback } = useMobileAsyncOperation();
  const venueLocationService = VenueLocationService.getInstance();
  const venuePingService = VenuePingService.getInstance();

  useEffect(() => {
    if (!venueId || !qrCodeId || !eventName || !venueName) {
      setError('Invalid venue event parameters');
      setIsLoading(false);
      return;
    }

    handleVenueEventJoin();
  }, [venueId, qrCodeId, eventName, venueName]);

  const handleVenueEventJoin = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Step 1: Request location permissions
      setLocationStatus('requesting');
      const permissionResult = await venueLocationService.requestVenueLocationPermissions(true);
      
      if (!permissionResult.granted) {
        if (permissionResult.showRationale) {
          setError('Location access is required to verify your presence at the venue. Please enable location permissions in Settings.');
        } else {
          setError('Location permissions denied. You need location access to join venue events.');
        }
        setIsLoading(false);
        return;
      }

      // Step 2: Get current location
      setLocationStatus('verifying');
      const location = await venueLocationService.getCurrentLocation(true);
      
      if (!location) {
        setError('Unable to get your current location. Please ensure location services are enabled and try again.');
        setIsLoading(false);
        return;
      }

      setUserLocation(location);

      // Step 3: Request event nonce from server
      const nonceResult = await executeOperationWithOfflineFallback(
        async () => {
          const functions = getFunctions();
          const requestEventNonce = httpsCallable(functions, 'venueRequestEventNonce');
          
          const result = await requestEventNonce({
            staticQRData: JSON.stringify({
              type: 'venue_event',
              venueId,
              qrCodeId,
              eventName,
              venueName
            }),
            location: {
              lat: location.lat,
              lng: location.lng,
              accuracy: location.accuracy
            },
            sessionId: await generateSessionId()
          });

          return result.data;
        },
        { operation: 'Request venue access' }
      );

      if (!nonceResult.success) {
        setError(nonceResult.message || 'Failed to verify venue access');
        if (nonceResult.locationTips) {
          setLocationTips(nonceResult.locationTips);
        }
        setIsLoading(false);
        return;
      }

      // Step 4: Verify tokenized entry
      const entryResult = await executeOperationWithOfflineFallback(
        async () => {
          const functions = getFunctions();
          const verifyTokenizedEntry = httpsCallable(functions, 'venueVerifyTokenizedEntry');
          
          const result = await verifyTokenizedEntry({
            nonce: nonceResult.nonce,
            location: {
              lat: location.lat,
              lng: location.lng,
              accuracy: location.accuracy
            }
          });

          return result.data;
        },
        { operation: 'Join venue event' }
      );

      if (entryResult.success) {
        setLocationStatus('success');
        
        // Create venue event session
        const venueSession: VenueEventSession = {
          eventId: entryResult.eventId,
          venueId,
          qrCodeId,
          eventName: decodeURIComponent(eventName || ''),
          venueName: decodeURIComponent(venueName || ''),
          joinedAt: new Date().toISOString(),
          sessionNonce: entryResult.sessionNonce,
          isActive: true
        };

        // Store venue event session data
        await storeVenueEventSession(venueSession);

        // Add venue session to ping service for monitoring
        await venuePingService.addVenueSession(venueSession);

        // Start background location monitoring if permissions available
        await venueLocationService.startVenueLocationMonitoring(entryResult.eventId, venueId);

        // Navigate to the event
        setTimeout(() => {
          router.replace(`/event/${entryResult.eventId}`);
        }, 2000);
      } else {
        setError(entryResult.message || 'Failed to join venue event');
        setLocationStatus('failed');
      }

    } catch (error) {
      console.error('Venue event join error:', error);
      setError('Failed to join venue event. Please try again.');
      setLocationStatus('failed');
    } finally {
      setIsLoading(false);
    }
  }, [venueId, qrCodeId, eventName, venueName]);

  const generateSessionId = async (): Promise<string> => {
    // Generate a unique session ID for this venue event attempt
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  };

  const storeVenueEventSession = async (sessionData: VenueEventSession) => {
    // Store venue event session data for later use
    try {
      await AsyncStorageUtils.setItem('current_venue_event_session', JSON.stringify(sessionData));
    } catch (error) {
      console.error('Failed to store venue event session:', error);
    }
  };

  const handleRetry = () => {
    setError(null);
    setLocationStatus('checking');
    handleVenueEventJoin();
  };

  const getStatusIcon = () => {
    switch (locationStatus) {
      case 'checking':
      case 'requesting':
      case 'verifying':
        return <ActivityIndicator size="large" color="#8b5cf6" />;
      case 'success':
        return <CheckCircle size={60} color="#10b981" />;
      case 'failed':
        return <AlertCircle size={60} color="#ef4444" />;
      default:
        return <MapPin size={60} color="#8b5cf6" />;
    }
  };

  const getStatusText = () => {
    switch (locationStatus) {
      case 'checking':
        return 'Preparing venue access...';
      case 'requesting':
        return 'Requesting location permissions...';
      case 'verifying':
        return 'Verifying your location...';
      case 'success':
        return 'Welcome to the venue!';
      case 'failed':
        return 'Unable to verify venue access';
      default:
        return 'Checking venue access...';
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#000' : '#fff',
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    venueInfo: {
      alignItems: 'center',
      marginBottom: 40,
    },
    venueName: {
      fontSize: 24,
      fontWeight: 'bold',
      color: isDark ? '#fff' : '#1f2937',
      textAlign: 'center',
      marginBottom: 8,
    },
    eventName: {
      fontSize: 18,
      color: '#8b5cf6',
      textAlign: 'center',
      fontWeight: '600',
    },
    statusContainer: {
      alignItems: 'center',
      marginVertical: 40,
    },
    statusText: {
      fontSize: 18,
      color: isDark ? '#e5e7eb' : '#374151',
      textAlign: 'center',
      marginTop: 20,
      fontWeight: '500',
    },
    locationInfo: {
      backgroundColor: isDark ? '#1f2937' : '#f9fafb',
      padding: 16,
      borderRadius: 12,
      marginTop: 20,
      maxWidth: '100%',
    },
    locationText: {
      fontSize: 14,
      color: isDark ? '#d1d5db' : '#6b7280',
      textAlign: 'center',
      lineHeight: 20,
    },
    errorContainer: {
      backgroundColor: isDark ? '#7f1d1d' : '#fef2f2',
      padding: 16,
      borderRadius: 12,
      marginVertical: 20,
      maxWidth: '100%',
    },
    errorText: {
      fontSize: 16,
      color: isDark ? '#fca5a5' : '#dc2626',
      textAlign: 'center',
      lineHeight: 22,
    },
    tipsContainer: {
      backgroundColor: isDark ? '#1e40af' : '#eff6ff',
      padding: 16,
      borderRadius: 12,
      marginTop: 16,
      maxWidth: '100%',
    },
    tipsText: {
      fontSize: 14,
      color: isDark ? '#bfdbfe' : '#1e40af',
      textAlign: 'center',
      lineHeight: 20,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 30,
    },
    button: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 25,
      minWidth: 120,
    },
    retryButton: {
      backgroundColor: '#8b5cf6',
    },
    cancelButton: {
      backgroundColor: isDark ? '#374151' : '#6b7280',
    },
    buttonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <MobileOfflineStatusBar />
      
      <View style={styles.content}>
        <View style={styles.venueInfo}>
          <Text style={styles.venueName}>{decodeURIComponent(venueName || '')}</Text>
          <Text style={styles.eventName}>{decodeURIComponent(eventName || '')}</Text>
        </View>

        <View style={styles.statusContainer}>
          {getStatusIcon()}
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>

        {userLocation && (
          <View style={styles.locationInfo}>
            <Text style={styles.locationText}>
              Location accuracy: ±{Math.round(userLocation.accuracy)}m
            </Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            
            {locationTips && (
              <View style={styles.tipsContainer}>
                <Text style={styles.tipsText}>{locationTips}</Text>
              </View>
            )}
          </View>
        )}

        {(error || locationStatus === 'failed') && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.retryButton]} 
              onPress={handleRetry}
            >
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton]} 
              onPress={() => router.back()}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}