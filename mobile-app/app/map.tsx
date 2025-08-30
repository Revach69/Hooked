import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  ScrollView,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, ArrowLeft, Navigation } from 'lucide-react-native';
import { AsyncStorageUtils } from '../lib/asyncStorageUtils';
import { Image } from 'react-native';

// Conditional Mapbox import for Expo Go compatibility
let Mapbox: any, MapView: any, Camera: any, UserLocation: any, PointAnnotation: any;
try {
  const mapboxComponents = require('@rnmapbox/maps');
  Mapbox = mapboxComponents.default;
  MapView = mapboxComponents.MapView;
  Camera = mapboxComponents.Camera;
  UserLocation = mapboxComponents.UserLocation;
  PointAnnotation = mapboxComponents.PointAnnotation;
} catch (error) {
  console.warn('Mapbox not available, using fallback UI');
}
import * as Location from 'expo-location';
import VenueModal from '../components/VenueModal';
import QRCodeScanner, { QRScanResult } from '../lib/components/QRCodeScanner';
import { isVenueHookedHoursActive, getVenueActiveStatus } from '../lib/utils/venueHoursUtils';

// Set Mapbox access token from environment variable
const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
if (mapboxToken && mapboxToken.startsWith('pk.') && !mapboxToken.includes('placeholder')) {
  Mapbox.setAccessToken(mapboxToken);
} else {
  console.warn('Mapbox access token not configured or is placeholder');
}

// Generate more mock venue data for clustering testing
const generateMockVenues = () => {
  const baseVenues = [
    { name: 'The Rooftop Lounge', type: 'Bar & Lounge', desc: 'Trendy rooftop bar with city views' },
    { name: 'Downtown Social', type: 'Restaurant & Bar', desc: 'Modern social dining experience' },
    { name: 'Sunset Café', type: 'Coffee & Light Bites', desc: 'Cozy coffee shop perfect for meetings' },
    { name: 'Marina Club', type: 'Nightclub', desc: 'Premier nightlife destination' },
    { name: 'Golden Gate Bistro', type: 'Restaurant', desc: 'Fine dining with bay views' },
    { name: 'Tech Hub Lounge', type: 'Co-working & Bar', desc: 'Where startups meet and network' },
    { name: 'Artisan Coffee Co.', type: 'Coffee Shop', desc: 'Locally roasted specialty coffee' },
    { name: 'Nob Hill Tavern', type: 'Pub', desc: 'Classic neighborhood pub atmosphere' },
    { name: 'Waterfront Grill', type: 'Seafood Restaurant', desc: 'Fresh seafood by the bay' },
    { name: 'Mission Taphouse', type: 'Craft Beer Bar', desc: 'Local brews and live music' },
  ];

  const venues = [];
  
  // Generate 60 venues spread across San Francisco
  for (let i = 0; i < 60; i++) {
    const baseVenue = baseVenues[i % baseVenues.length];
    const lat = 37.7749 + (Math.random() - 0.5) * 0.1; // SF lat ± 0.05
    const lon = -122.4194 + (Math.random() - 0.5) * 0.1; // SF lon ± 0.05
    
    // Add mock social media links for some venues for testing
    const mockSocialMedia = i < 10 ? {
      phone: i % 4 === 0 ? `+1-555-${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}` : null,
      website: i % 3 === 0 ? `https://www.${baseVenue.name.toLowerCase().replace(/\s+/g, '')}.com` : null,
      socialMedia: {
        instagram: i % 5 === 0 ? `@${baseVenue.name.toLowerCase().replace(/\s+/g, '')}` : null,
        facebook: i % 6 === 0 ? `https://facebook.com/${baseVenue.name.toLowerCase().replace(/\s+/g, '')}` : null,
      },
    } : {
      phone: null,
      website: null,
      socialMedia: {
        instagram: null,
        facebook: null,
      },
    };
    
    // Generate mock Hooked Hours for some venues (every 3rd venue has Hooked Hours)
    const hasHookedHours = i % 3 === 0;
    let hookedHours = null;
    let openingHours = null;
    
    if (hasHookedHours) {
      // Create realistic Hooked Hours based on venue type
      const isNightlife = baseVenue.type.includes('Bar') || baseVenue.type.includes('Club');
      const isCafe = baseVenue.type.includes('Coffee') || baseVenue.type.includes('Café');
      
      if (isNightlife) {
        // Nightlife venues: evening hours
        hookedHours = {
          monday: { open: '19:00', close: '23:00', closed: false },
          tuesday: { open: '19:00', close: '23:00', closed: false },
          wednesday: { open: '19:00', close: '24:00', closed: false },
          thursday: { open: '19:00', close: '24:00', closed: false },
          friday: { open: '18:00', close: '24:00', closed: false },
          saturday: { open: '18:00', close: '24:00', closed: false },
          sunday: { open: '18:00', close: '22:00', closed: false },
        };
        openingHours = {
          monday: { open: '16:00', close: '02:00', closed: false },
          tuesday: { open: '16:00', close: '02:00', closed: false },
          wednesday: { open: '16:00', close: '02:00', closed: false },
          thursday: { open: '16:00', close: '02:00', closed: false },
          friday: { open: '16:00', close: '03:00', closed: false },
          saturday: { open: '14:00', close: '03:00', closed: false },
          sunday: { open: '14:00', close: '24:00', closed: false },
        };
      } else if (isCafe) {
        // Cafe venues: morning/afternoon hours
        hookedHours = {
          monday: { open: '08:00', close: '11:00', closed: false },
          tuesday: { open: '08:00', close: '11:00', closed: false },
          wednesday: { open: '08:00', close: '11:00', closed: false },
          thursday: { open: '08:00', close: '11:00', closed: false },
          friday: { open: '08:00', close: '12:00', closed: false },
          saturday: { open: '09:00', close: '13:00', closed: false },
          sunday: { open: '09:00', close: '12:00', closed: false },
        };
        openingHours = {
          monday: { open: '07:00', close: '19:00', closed: false },
          tuesday: { open: '07:00', close: '19:00', closed: false },
          wednesday: { open: '07:00', close: '19:00', closed: false },
          thursday: { open: '07:00', close: '19:00', closed: false },
          friday: { open: '07:00', close: '20:00', closed: false },
          saturday: { open: '08:00', close: '20:00', closed: false },
          sunday: { open: '08:00', close: '18:00', closed: false },
        };
      } else {
        // Restaurant/general venues: evening hours
        hookedHours = {
          monday: { open: '17:00', close: '21:00', closed: false },
          tuesday: { open: '17:00', close: '21:00', closed: false },
          wednesday: { open: '17:00', close: '22:00', closed: false },
          thursday: { open: '17:00', close: '22:00', closed: false },
          friday: { open: '17:00', close: '23:00', closed: false },
          saturday: { open: '16:00', close: '23:00', closed: false },
          sunday: { open: '16:00', close: '21:00', closed: false },
        };
        openingHours = {
          monday: { open: '11:00', close: '23:00', closed: false },
          tuesday: { open: '11:00', close: '23:00', closed: false },
          wednesday: { open: '11:00', close: '24:00', closed: false },
          thursday: { open: '11:00', close: '24:00', closed: false },
          friday: { open: '11:00', close: '24:00', closed: false },
          saturday: { open: '10:00', close: '24:00', closed: false },
          sunday: { open: '10:00', close: '23:00', closed: false },
        };
      }
    }
    
    venues.push({
      id: `venue-${i + 1}`,
      name: `${baseVenue.name} ${i > 9 ? Math.floor(i / 10) : ''}`.trim(),
      type: baseVenue.type,
      coordinates: [lon, lat],
      address: `${100 + i} Street Name, San Francisco, CA`,
      activeUsers: Math.floor(Math.random() * 30) + 1,
      description: baseVenue.desc,
      image: null, // Use default MapPin icon instead of failing placeholder images
      hookedHours,
      openingHours,
      ...mockSocialMedia,
    });
  }
  
  return venues;
};

const MOCK_VENUES = generateMockVenues();

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
  const [mapStyle, setMapStyle] = useState<'street' | 'satellite'>('street');
  const [currentZoom, setCurrentZoom] = useState(12);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [isVenueModalVisible, setIsVenueModalVisible] = useState(false);
  const [cameraCenter, setCameraCenter] = useState<[number, number] | null>(null);
  const [isQRScannerVisible, setIsQRScannerVisible] = useState(false);
  const [lastStatusUpdate, setLastStatusUpdate] = useState<Date>(new Date());
  
  // Filter options matching admin dashboard business types
  const filterOptions = [
    { id: 'all', label: 'All' },
    { id: 'restaurant', label: 'Restaurant' },
    { id: 'bar', label: 'Bar' },
    { id: 'club', label: 'Club' },
    { id: 'cafe', label: 'Cafe' },
    { id: 'venue', label: 'Venue' },
  ];
  
  // Filter venues based on selected filter
  const filteredVenues = useMemo(() => {
    if (selectedFilter === 'all') {
      return venues;
    }
    return venues.filter(venue => {
      // Simple mapping from venue types to filter categories
      const venueTypeMap = {
        'Restaurant': 'restaurant',
        'Bar & Lounge': 'bar', 
        'Coffee & Light Bites': 'cafe',
        'Nightclub': 'club',
        'Co-working & Bar': 'venue',
        'Coffee Shop': 'cafe',
        'Pub': 'bar',
        'Seafood Restaurant': 'restaurant',
        'Craft Beer Bar': 'bar',
      };
      const mappedType = venueTypeMap[venue.type as keyof typeof venueTypeMap] || 'venue';
      return mappedType === selectedFilter;
    });
  }, [venues, selectedFilter]);


  useEffect(() => {
    initializeMapScreen();
  }, []);
  
  // Update venue status every minute to reflect real-time Hooked Hours
  useEffect(() => {
    const interval = setInterval(() => {
      setLastStatusUpdate(new Date());
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
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
      // Check if Mapbox token is available and valid
      const token = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
      const tokenAvailable = !!(token && token.startsWith('pk.') && !token.includes('placeholder'));
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
    
    // If modal is already visible, just update the venue
    if (!isVenueModalVisible) {
      setIsVenueModalVisible(true);
    }
    
    // Center map on selected venue, but offset for top 50% positioning
    // Calculate offset to place venue in center of visible top area (accounting for buttons)
    const [venueLon, venueLat] = venue.coordinates;
    // Smaller offset to keep venue visible in top 50% but below buttons
    const offsetLat = venueLat - 0.001; // Small offset to position in visible top area
    setCameraCenter([venueLon, offsetLat]);
    setFollowUserLocation(false);
    setCurrentZoom(16); // Zoom in closer when venue is selected
  }, [isVenueModalVisible]);


  const toggleMapStyle = useCallback(() => {
    setMapStyle(prev => prev === 'street' ? 'satellite' : 'street');
  }, []);

  const handleZoomIn = useCallback(() => {
    setCurrentZoom(prev => Math.min(prev + 1, 20));
  }, []);

  const handleZoomOut = useCallback(() => {
    setCurrentZoom(prev => Math.max(prev - 1, 1));
  }, []);

  const handleQRScanPress = useCallback(() => {
    setIsQRScannerVisible(true);
  }, []);

  const handleQRScan = useCallback((result: QRScanResult) => {
    setIsQRScannerVisible(false);
    
    if (result.type === 'regular' && result.code) {
      // Navigate to join page with regular event code
      router.push(`/join?code=${result.code}`);
    } else if (result.type === 'venue_event' && result.venueData) {
      // Navigate to venue event join flow
      router.push(`/join-venue?venueId=${result.venueData.venueId}&qrCodeId=${result.venueData.qrCodeId}&eventName=${encodeURIComponent(result.venueData.eventName)}&venueName=${encodeURIComponent(result.venueData.venueName)}`);
    } else {
      Alert.alert('Invalid QR Code', 'The scanned QR code is not a valid event or venue code.');
    }
  }, []);

  const handleQRScanClose = useCallback(() => {
    setIsQRScannerVisible(false);
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
      backgroundColor: isDark ? '#000' : '#fff',
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
    backButtonOverlay: {
      position: 'absolute',
      top: 60,
      left: 20,
      height: 36,
      paddingHorizontal: 16,
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.9)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      borderWidth: 2,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
    },
    locationButton: {
      position: 'absolute',
      bottom: 100,
      right: 20,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
      zIndex: 100,
    },
    controlsContainer: {
      position: 'absolute',
      top: 200,
      right: 20,
      zIndex: 100,
    },
    mapControlButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: isDark ? '#2d2d2d' : '#ffffff',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    zoomControls: {
      position: 'absolute',
      bottom: 120,
      right: 20,
      zIndex: 100,
    },
    zoomButton: {
      width: 44,
      height: 44,
      backgroundColor: isDark ? '#2d2d2d' : '#ffffff',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    zoomButtonTop: {
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
    },
    zoomButtonBottom: {
      borderBottomLeftRadius: 22,
      borderBottomRightRadius: 22,
    },
    venueMarker: {
      width: 50,
      height: 50,
      borderRadius: 12,
      backgroundColor: '#8b5cf6',
      borderWidth: 3,
      borderColor: '#ffffff',
      overflow: 'hidden',
    },
    venueMarkerActive: {
      width: 50,
      height: 50,
      borderRadius: 12,
      backgroundColor: '#8b5cf6',
      borderWidth: 3,
      borderColor: '#22c55e', // Green border for active venues
      overflow: 'hidden',
      // Glow effect using shadow
      shadowColor: '#22c55e',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 8,
      elevation: 10, // Android shadow
    },
    venueMarkerGlow: {
      position: 'absolute',
      top: -8,
      left: -8,
      width: 66, // 50 + 16 for glow padding
      height: 66,
      borderRadius: 20,
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: 'rgba(34, 197, 94, 0.6)', // Semi-transparent green glow
    },
    activeVenueIndicator: {
      position: 'absolute',
      top: -4,
      right: -4,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: '#22c55e',
      borderWidth: 2,
      borderColor: '#ffffff',
      zIndex: 10,
    },
    venueImage: {
      width: '100%',
      height: '100%',
      borderRadius: 9, // Slightly smaller than container to account for border
    },
    venueImagePlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: '#8b5cf6',
      justifyContent: 'center',
      alignItems: 'center',
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
    filterContainer: {
      position: 'absolute',
      top: 60,
      left: 76,
      right: 20,
      zIndex: 1000,
    },
    filterScrollContent: {
      paddingHorizontal: 0,
    },
    filterButton: {
      alignItems: 'center',
      justifyContent: 'center',
      height: 36,
      paddingHorizontal: 16,
      marginHorizontal: 4,
      backgroundColor: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.9)',
      borderRadius: 20,
      borderWidth: 2,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
    },
    filterButtonActive: {
      backgroundColor: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.9)',
      borderColor: '#8b5cf6',
      borderWidth: 2,
    },
    filterLabel: {
      color: isDark ? '#ffffff' : '#1f2937',
      fontSize: 13,
      fontWeight: '500',
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    filterLabelActive: {
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
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
      
      {/* Back button overlay */}
      <TouchableOpacity
        style={styles.backButtonOverlay}
        onPress={handleGoBack}
        accessibilityRole="button"
        accessibilityLabel="Go Back"
        accessibilityHint="Navigate back to previous screen"
      >
        <ArrowLeft size={20} color={isDark ? "#ffffff" : "#1f2937"} />
      </TouchableOpacity>
      
      {/* Filter buttons overlay */}
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {filterOptions.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterButton,
                selectedFilter === filter.id && styles.filterButtonActive
              ]}
              onPress={() => setSelectedFilter(filter.id)}
            >
              <Text style={[
                styles.filterLabel,
                selectedFilter === filter.id && styles.filterLabelActive
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      {/* Map Container - Full Screen */}
      <View style={styles.mapContainer}>
        {mapboxTokenAvailable && MapView ? (
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
              styleURL={isDark ? Mapbox.StyleURL.Dark : Mapbox.StyleURL.Light}
              compassEnabled={false}
              scaleBarEnabled={false}
              logoEnabled={true}
              attributionEnabled={true}
              attributionPosition={{ bottom: 8, right: 8 }}
            >
              <Camera
                zoomLevel={currentZoom}
                centerCoordinate={
                  cameraCenter ? cameraCenter :
                  userLocation && followUserLocation 
                    ? [userLocation.longitude, userLocation.latitude]
                    : [-122.4194, 37.7749] // San Francisco as default
                }
                animationDuration={1000}
                followUserLocation={followUserLocation}
                onUserLocationUpdate={() => setFollowUserLocation(false)}
              />
              
              {showUserLocation && locationPermissionGranted && (
                <UserLocation
                  visible={true}
                  showsUserHeadingIndicator={false}
                  minDisplacement={10}
                  renderMode="native"
                />
              )}

              {/* Individual Venue Markers */}
              {filteredVenues.map((venue) => {
                // Re-evaluate status based on current time (triggered by lastStatusUpdate)
                const venueStatus = getVenueActiveStatus(venue);
                const isActive = venueStatus.shouldGlow;
                
                return (
                  <PointAnnotation
                    key={venue.id}
                    id={venue.id}
                    coordinate={venue.coordinates}
                    onSelected={() => handleVenuePress(venue)}
                  >
                    <View style={{ position: 'relative' }}>
                      {/* Glow effect for active venues */}
                      {isActive && <View style={styles.venueMarkerGlow} />}
                      
                      {/* Main venue marker */}
                      <View style={isActive ? styles.venueMarkerActive : styles.venueMarker}>
                        {venue.image ? (
                          <Image
                            source={{ uri: venue.image }}
                            style={styles.venueImage}
                            onError={() => {
                              // Fallback to default marker if image fails to load
                              console.log('Failed to load venue image:', venue.image);
                            }}
                          />
                        ) : (
                          <View style={styles.venueImagePlaceholder}>
                            <MapPin size={20} color="#ffffff" />
                          </View>
                        )}
                      </View>
                      
                      {/* Active indicator dot */}
                      {isActive && <View style={styles.activeVenueIndicator} />}
                    </View>
                  </PointAnnotation>
                );
              })}
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
                color={followUserLocation ? '#8b5cf6' : '#ffffff'} 
              />
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.placeholderContainer}>
            <MapPin size={64} color={isDark ? '#9ca3af' : '#6b7280'} />
            <Text style={styles.placeholderText}>Map Unavailable</Text>
            <Text style={styles.placeholderSubtext}>
              {!MapView 
                ? "Map requires development build. Use 'npx expo run:ios' or test on physical device with development build."
                : "Mapbox access token is not configured. Please contact support to enable the map feature."
              }
            </Text>
          </View>
        )}
      </View>

      {/* Venue Modal as positioned overlay instead of Modal */}
      {isVenueModalVisible && (
        <VenueModal
          visible={isVenueModalVisible}
          venue={selectedVenue}
          userLocation={userLocation}
          onClose={() => {
            setIsVenueModalVisible(false);
            setCameraCenter(null);
            setCurrentZoom(12); // Reset zoom when modal closes
          }}
          onQrScan={handleQRScanPress}
        />
      )}

      {/* QR Code Scanner Modal */}
      <Modal
        visible={isQRScannerVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={handleQRScanClose}
      >
        <QRCodeScanner
          onScan={handleQRScan}
          onClose={handleQRScanClose}
        />
      </Modal>
    </View>
  );
}

export default MapScreen;