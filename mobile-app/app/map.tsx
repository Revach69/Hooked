import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  useColorScheme,
  StatusBar,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, User, Users, MessageCircle, ArrowLeft } from 'lucide-react-native';
import { AsyncStorageUtils } from '../lib/asyncStorageUtils';
import Mapbox, { MapView, Camera } from '@rnmapbox/maps';

// Set Mapbox access token from environment variable
if (process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN) {
  Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN);
} else {
  console.warn('Mapbox access token not found in environment variables');
}

export default function MapScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [isLoading, setIsLoading] = useState(true);
  const [currentEvent, setCurrentEvent] = useState<any>(null);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapboxTokenAvailable, setMapboxTokenAvailable] = useState(false);
  
  useEffect(() => {
    initializeMapScreen();
  }, []);
  
  const initializeMapScreen = useCallback(async () => {
    try {
      // Check if Mapbox token is available
      const tokenAvailable = !!process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
      setMapboxTokenAvailable(tokenAvailable);
      
      // For venue discovery, we don't need event/session validation
      // Users can browse venues without being in an event
      setCurrentEvent({ name: 'Venue Discovery' });
      setIsLoading(false);
    } catch (error) {
      console.error('Error initializing map screen:', error);
      setIsLoading(false);
    }
  }, []);
  
  const handleGoBack = () => {
    router.back();
  };

  const handleMapReady = () => {
    setIsMapReady(true);
    console.log('Mapbox map is ready');
  };
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#000' : '#fff',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDark ? '#2d2d2d' : 'white',
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: isDark ? '#9ca3af' : '#6b7280',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      paddingTop: 8,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#404040' : '#e5e7eb',
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isDark ? '#2d2d2d' : 'white',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: isDark ? '#404040' : '#d1d5db',
    },
    headerText: {
      flex: 1,
      marginLeft: 16,
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold',
      color: isDark ? '#ffffff' : '#1f2937',
    },
    subtitle: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
    },
    mapContainer: {
      flex: 1,
      backgroundColor: isDark ? '#1f2937' : '#f3f4f6',
      margin: 16,
      borderRadius: 12,
      overflow: 'hidden',
    },
    mapView: {
      flex: 1,
    },
    placeholderContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    mapLoadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: isDark ? '#1f2937' : '#f3f4f6',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
    placeholderText: {
      fontSize: 18,
      fontWeight: '600',
      color: isDark ? '#9ca3af' : '#6b7280',
      textAlign: 'center',
      marginTop: 16,
    },
    placeholderSubtext: {
      fontSize: 14,
      color: isDark ? '#6b7280' : '#9ca3af',
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 20,
    },
    bottomNavigation: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 20,
      backgroundColor: isDark ? '#2d2d2d' : 'white',
      borderTopWidth: 1,
      borderTopColor: isDark ? '#404040' : '#e5e7eb',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: isDark ? 0.1 : 0.05,
      shadowRadius: 4,
      elevation: 3,
    },
    navButton: {
      alignItems: 'center',
    },
    navButtonText: {
      fontSize: 12,
      color: isDark ? '#9ca3af' : '#9ca3af',
      marginTop: 4,
    },
    navButtonActive: {},
    navButtonTextActive: {
      fontWeight: '600',
      color: isDark ? '#ffffff' : '#1f2937',
    },
  });
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}
          accessibilityRole="button"
          accessibilityLabel="Go Back"
          accessibilityHint="Navigate back to previous screen"
        >
          <ArrowLeft size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Find Venues</Text>
          <Text style={styles.subtitle}>Discover Hooked-integrated locations</Text>
        </View>
      </View>
      
      {/* Map Container */}
      <View style={styles.mapContainer}>
        {mapboxTokenAvailable ? (
          <>
            {!isMapReady && (
              <View style={styles.mapLoadingOverlay}>
                <ActivityIndicator size="large" color="#8b5cf6" />
                <Text style={styles.loadingText}>Loading map...</Text>
              </View>
            )}
            <MapView
              style={styles.mapView}
              onDidFinishLoadingMap={handleMapReady}
              styleURL={isDark ? Mapbox.StyleURL.Dark : Mapbox.StyleURL.Street}
              compassEnabled={true}
              compassPosition={{ top: 100, right: 20 }}
              scaleBarEnabled={false}
              logoEnabled={true}
              attributionEnabled={true}
              attributionPosition={{ bottom: 8, right: 8 }}
            >
              <Camera
                zoomLevel={12}
                centerCoordinate={[-122.4194, 37.7749]} // San Francisco as default
                animationDuration={1000}
              />
            </MapView>
          </>
        ) : (
          <View style={styles.placeholderContainer}>
            <MapPin size={64} color={isDark ? '#9ca3af' : '#6b7280'} />
            <Text style={styles.placeholderText}>Map Unavailable</Text>
            <Text style={styles.placeholderSubtext}>
              Mapbox access token is not configured. Please contact support to enable the map feature.
            </Text>
          </View>
        )}
      </View>
      
      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push('/profile')}
          accessibilityRole="button"
          accessibilityLabel="Profile"
          accessibilityHint="Navigate to your profile page"
        >
          <User size={24} color="#9ca3af" />
          <Text style={styles.navButtonText}>Profile</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push('/discovery')}
          accessibilityRole="button"
          accessibilityLabel="Discover"
          accessibilityHint="Navigate to discovery page"
        >
          <Users size={24} color="#9ca3af" />
          <Text style={styles.navButtonText}>Discover</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.navButton, styles.navButtonActive]}
          onPress={() => {}} // Already on map page
          accessibilityRole="button"
          accessibilityLabel="Map"
          accessibilityHint="Currently on map page"
          accessibilityState={{ selected: true }}
        >
          <MapPin size={24} color="#8b5cf6" />
          <Text style={[styles.navButtonText, styles.navButtonTextActive]}>Map</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push('/matches')}
          accessibilityRole="button"
          accessibilityLabel="Matches"
          accessibilityHint="Navigate to your matches page"
        >
          <View style={{ position: 'relative' }}>
            <MessageCircle size={24} color="#9ca3af" />
            {hasUnreadMessages && (
              <View style={{
                position: 'absolute',
                top: -2,
                right: -2,
                backgroundColor: '#ef4444',
                borderRadius: 6,
                width: 12,
                height: 12,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <View style={{
                  width: 6,
                  height: 6,
                  backgroundColor: '#ffffff',
                  borderRadius: 3,
                }} />
              </View>
            )}
          </View>
          <Text style={styles.navButtonText}>Matches</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}