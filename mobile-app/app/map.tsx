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
import { MapPin, User, Users, MessageCircle, ArrowLeft, Navigation } from 'lucide-react-native';
import { AsyncStorageUtils } from '../lib/asyncStorageUtils';
import Mapbox, { MapView, Camera, UserLocation, PointAnnotation, Callout } from '@rnmapbox/maps';
import * as Location from 'expo-location';

// Set Mapbox access token from environment variable
if (process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN) {
  Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN);
} else {
  console.warn('Mapbox access token not found in environment variables');
}

// Mock venue data for development
const MOCK_VENUES = [
  {
    id: 'venue-1',
    name: 'The Rooftop Lounge',
    type: 'Bar & Lounge',
    coordinates: [-122.4194, 37.7849],
    address: '123 Market St, San Francisco, CA',
    activeUsers: 12,
    description: 'Trendy rooftop bar with city views',
    image: null,
  },
  {
    id: 'venue-2', 
    name: 'Downtown Social',
    type: 'Restaurant & Bar',
    coordinates: [-122.4094, 37.7749],
    address: '456 Union Square, San Francisco, CA',
    activeUsers: 8,
    description: 'Modern social dining experience',
    image: null,
  },
  {
    id: 'venue-3',
    name: 'Sunset Café',
    type: 'Coffee & Light Bites',
    coordinates: [-122.4294, 37.7649],
    address: '789 Sunset Blvd, San Francisco, CA',
    activeUsers: 5,
    description: 'Cozy coffee shop perfect for meetings',
    image: null,
  },
  {
    id: 'venue-4',
    name: 'Marina Club',
    type: 'Nightclub',
    coordinates: [-122.4394, 37.7949],
    address: '321 Marina District, San Francisco, CA',
    activeUsers: 25,
    description: 'Premier nightlife destination',
    image: null,
  },
];

export default function MapScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [isLoading, setIsLoading] = useState(true);
  const [currentEvent, setCurrentEvent] = useState<any>(null);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapboxTokenAvailable, setMapboxTokenAvailable] = useState(false);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [userLocation, setUserLocation] = useState<{longitude: number, latitude: number} | null>(null);
  const [showUserLocation, setShowUserLocation] = useState(false);
  const [followUserLocation, setFollowUserLocation] = useState(false);
  const [venues, setVenues] = useState(MOCK_VENUES);
  const [selectedVenue, setSelectedVenue] = useState<any>(null);
  
  useEffect(() => {
    initializeMapScreen();
  }, []);
  
  const requestLocationPermission = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        setLocationPermissionGranted(true);
        setShowUserLocation(true);
        
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
            timeout: 10000,
          });
          
          setUserLocation({
            longitude: location.coords.longitude,
            latitude: location.coords.latitude,
          });
        } catch (locationError) {
          console.warn('Could not get current location:', locationError);
          // Still allow showing user location dot without centering
        }
        
        return true;
      } else {
        setLocationPermissionGranted(false);
        setShowUserLocation(false);
        
        Alert.alert(
          'Location Access',
          'Location access is needed to show your position on the map and help you find nearby venues. You can enable it later in Settings.',
          [
            { text: 'Settings', onPress: () => Location.requestForegroundPermissionsAsync() },
            { text: 'Continue', style: 'cancel' }
          ]
        );
        
        return false;
      }
    } catch (error) {
      console.error('Location permission error:', error);
      setLocationPermissionGranted(false);
      setShowUserLocation(false);
      return false;
    }
  }, []);

  const initializeMapScreen = useCallback(async () => {
    try {
      // Check if Mapbox token is available
      const tokenAvailable = !!process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
      setMapboxTokenAvailable(tokenAvailable);
      
      // Request location permission if Mapbox is available
      if (tokenAvailable) {
        await requestLocationPermission();
      }
      
      // For venue discovery, we don't need event/session validation
      // Users can browse venues without being in an event
      setCurrentEvent({ name: 'Venue Discovery' });
      setIsLoading(false);
    } catch (error) {
      console.error('Error initializing map screen:', error);
      setIsLoading(false);
    }
  }, [requestLocationPermission]);
  
  const handleGoBack = () => {
    router.back();
  };

  const handleMapReady = () => {
    setIsMapReady(true);
    console.log('Mapbox map is ready');
  };

  const handleCenterToUser = useCallback(async () => {
    if (!locationPermissionGranted) {
      const granted = await requestLocationPermission();
      if (!granted) return;
    }
    
    setFollowUserLocation(true);
    
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 10000,
      });
      
      setUserLocation({
        longitude: location.coords.longitude,
        latitude: location.coords.latitude,
      });
    } catch (error) {
      console.warn('Could not get current location for centering:', error);
      Alert.alert(
        'Location Unavailable',
        'Could not get your current location. Please check that location services are enabled.'
      );
    }
  }, [locationPermissionGranted, requestLocationPermission]);

  const handleVenuePress = useCallback((venue: any) => {
    setSelectedVenue(venue);
  }, []);

  const handleVenueCalloutPress = useCallback((venue: any) => {
    Alert.alert(
      venue.name,
      `${venue.description}\n\n📍 ${venue.address}\n👥 ${venue.activeUsers} active users\n\nWould you like to check in to this venue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Check In', 
          onPress: () => {
            // Future: Integration with backend API
            Alert.alert('Coming Soon', 'Check-in functionality will be available once backend integration is complete.');
          }
        }
      ]
    );
  }, []);
  
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
    locationButton: {
      position: 'absolute',
      top: 150,
      right: 20,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: isDark ? '#2d2d2d' : '#ffffff',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
      zIndex: 100,
    },
    venueMarker: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#8b5cf6',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: '#ffffff',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
    },
    venueMarkerActive: {
      backgroundColor: '#7c3aed',
      borderColor: '#fbbf24',
      transform: [{ scale: 1.2 }],
    },
    venueCallout: {
      backgroundColor: isDark ? '#2d2d2d' : '#ffffff',
      borderRadius: 8,
      padding: 12,
      minWidth: 200,
      maxWidth: 250,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 5,
    },
    calloutTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: isDark ? '#ffffff' : '#1f2937',
      marginBottom: 4,
    },
    calloutType: {
      fontSize: 12,
      color: '#8b5cf6',
      fontWeight: '600',
      marginBottom: 6,
    },
    calloutDescription: {
      fontSize: 14,
      color: isDark ? '#d1d5db' : '#6b7280',
      marginBottom: 8,
    },
    calloutUsers: {
      fontSize: 12,
      color: isDark ? '#9ca3af' : '#6b7280',
      fontWeight: '500',
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
                zoomLevel={userLocation && followUserLocation ? 15 : 12}
                centerCoordinate={
                  userLocation && followUserLocation 
                    ? [userLocation.longitude, userLocation.latitude]
                    : [-122.4194, 37.7749] // San Francisco as default
                }
                animationDuration={1000}
                followUserLocation={followUserLocation}
                onUserLocationUpdate={() => setFollowUserLocation(false)}
              />
              
              {showUserLocation && (
                <UserLocation
                  visible={true}
                  showsUserHeadingIndicator={true}
                  minDisplacement={10}
                />
              )}

              {/* Venue Markers */}
              {venues.map((venue) => (
                <PointAnnotation
                  key={venue.id}
                  id={venue.id}
                  coordinate={venue.coordinates}
                  onSelected={() => handleVenuePress(venue)}
                >
                  <View style={[
                    styles.venueMarker,
                    selectedVenue?.id === venue.id && styles.venueMarkerActive
                  ]}>
                    <MapPin size={20} color="#ffffff" />
                    {venue.activeUsers > 0 && (
                      <View style={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                        backgroundColor: '#ef4444',
                        borderRadius: 10,
                        minWidth: 20,
                        height: 20,
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderWidth: 2,
                        borderColor: '#ffffff',
                      }}>
                        <Text style={{
                          color: '#ffffff',
                          fontSize: 10,
                          fontWeight: 'bold',
                        }}>
                          {venue.activeUsers > 99 ? '99+' : venue.activeUsers}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Callout style={styles.venueCallout} onPress={() => handleVenueCalloutPress(venue)}>
                    <Text style={styles.calloutTitle}>{venue.name}</Text>
                    <Text style={styles.calloutType}>{venue.type}</Text>
                    <Text style={styles.calloutDescription}>{venue.description}</Text>
                    <Text style={styles.calloutUsers}>
                      👥 {venue.activeUsers} active user{venue.activeUsers !== 1 ? 's' : ''}
                    </Text>
                  </Callout>
                </PointAnnotation>
              ))}
            </MapView>
            
            {/* Location Button */}
            <TouchableOpacity
              style={styles.locationButton}
              onPress={handleCenterToUser}
              accessibilityRole="button"
              accessibilityLabel="Center to my location"
              accessibilityHint="Centers the map on your current location"
            >
              <Navigation 
                size={20} 
                color={followUserLocation ? '#8b5cf6' : (isDark ? '#9ca3af' : '#6b7280')} 
              />
            </TouchableOpacity>
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