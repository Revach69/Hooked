import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, ArrowLeft, Navigation } from 'lucide-react-native';
import { AsyncStorageUtils } from '../lib/asyncStorageUtils';
import { Image } from 'react-native';
import { venueApi } from '../lib/api/venueApi';
import { MapClient } from '../types/venue';

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

// Set Mapbox access token from environment variable (only if Mapbox is available)
const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
if (Mapbox && mapboxToken && mapboxToken.startsWith('pk.') && !mapboxToken.includes('placeholder')) {
  Mapbox.setAccessToken(mapboxToken);
} else if (!Mapbox) {
  console.warn('Mapbox not available - running in Expo Go mode');
} else {
  console.warn('Mapbox access token not configured or is placeholder');
}

// Tel Aviv default location (Ruppin 23) for simulator testing
const TEL_AVIV_DEFAULT_LOCATION = {
  longitude: 34.770515,
  latitude: 32.082885,
  address: 'Ruppin 23, Tel Aviv',
};

function MapScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { centerLat, centerLng, centerOnUser } = useLocalSearchParams();
  
  const [isLoading, setIsLoading] = useState(true);
  const [currentEvent, setCurrentEvent] = useState<any>(null);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapboxTokenAvailable, setMapboxTokenAvailable] = useState(false);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [userLocation, setUserLocation] = useState<{longitude: number, latitude: number} | null>(null);
  const [showUserLocation, setShowUserLocation] = useState(false);
  const [followUserLocation, setFollowUserLocation] = useState(false);
  const [venues, setVenues] = useState<MapClient[]>([]);
  const [isLoadingVenues, setIsLoadingVenues] = useState(false);
  const [venuesError, setVenuesError] = useState<string | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<any>(null);
  const [mapStyle, setMapStyle] = useState<'street' | 'satellite'>('street');
  const [currentZoom, setCurrentZoom] = useState(12);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [isVenueModalVisible, setIsVenueModalVisible] = useState(false);
  const [cameraCenter, setCameraCenter] = useState<[number, number] | null>(null);
  const [isQRScannerVisible, setIsQRScannerVisible] = useState(false);
  const [lastStatusUpdate, setLastStatusUpdate] = useState<Date>(new Date());
  const mapViewRef = useRef<any>(null);
  
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
    return venues.filter(venue => venue.type === selectedFilter);
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
          });
          
          const userCoords = {
            longitude: location.coords.longitude,
            latitude: location.coords.latitude,
          };
          
          setUserLocation(userCoords);
          
          // If no camera center is set yet, use user location
          if (!cameraCenter) {
            setCameraCenter([userCoords.longitude, userCoords.latitude]);
            setFollowUserLocation(true);
          }
        } catch (locationError) {
          console.warn('Could not get current location, using Tel Aviv default:', locationError);
          // Use Tel Aviv default location for simulator
          setUserLocation(TEL_AVIV_DEFAULT_LOCATION);
          
          // If no camera center is set yet, use Tel Aviv default
          if (!cameraCenter) {
            setCameraCenter([TEL_AVIV_DEFAULT_LOCATION.longitude, TEL_AVIV_DEFAULT_LOCATION.latitude]);
          }
        }
        
        return true;
      } else {
        setLocationPermissionGranted(false);
        setShowUserLocation(false);
        
        // Set default Tel Aviv location if no permission
        if (!cameraCenter) {
          setCameraCenter([TEL_AVIV_DEFAULT_LOCATION.longitude, TEL_AVIV_DEFAULT_LOCATION.latitude]);
        }
        
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
      
      // Set default Tel Aviv location on error
      if (!cameraCenter) {
        setCameraCenter([TEL_AVIV_DEFAULT_LOCATION.longitude, TEL_AVIV_DEFAULT_LOCATION.latitude]);
      }
      
      return false;
    }
  }, [cameraCenter]);

  const fetchVenuesFromAPI = useCallback(async () => {
    setIsLoadingVenues(true);
    setVenuesError(null);
    
    try {
      const response = await venueApi.fetchVenues();
      
      if (response.success && response.venues.length > 0) {
        setVenues(response.venues);
        console.log(`Loaded ${response.venues.length} venues from API`);
      } else {
        console.warn('No venues returned from API');
        setVenues([]);
        setVenuesError(response.error || 'No venues available');
      }
    } catch (error) {
      console.error('Failed to fetch venues from API:', error);
      setVenues([]);
      setVenuesError('Failed to connect to server');
    } finally {
      setIsLoadingVenues(false);
    }
  }, []);

  const initializeMapScreen = useCallback(async () => {
    try {
      // Check if Mapbox token is available and valid, and library is loaded
      const token = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
      const tokenAvailable = !!(Mapbox && token && token.startsWith('pk.') && !token.includes('placeholder'));
      setMapboxTokenAvailable(tokenAvailable);
      
      // Fetch real venues from API
      await fetchVenuesFromAPI();
      
      // Request location permission regardless (needed for venue events)
      const locationGranted = await requestLocationPermission();
      
      // Handle centering from navigation params
      if (centerOnUser === 'true' && centerLat && centerLng) {
        const lat = parseFloat(centerLat as string);
        const lng = parseFloat(centerLng as string);
        if (!isNaN(lat) && !isNaN(lng)) {
          setUserLocation({ longitude: lng, latitude: lat });
          setCameraCenter([lng, lat]);
          setFollowUserLocation(true);
        }
      }
      // Note: Camera center is now set in requestLocationPermission based on actual location
      
      // For venue discovery, we don't need event/session validation
      // Users can browse venues without being in an event
      setCurrentEvent({ name: 'Venue Discovery' });
      setIsLoading(false);
    } catch (error) {
      console.error('Error initializing map screen:', error);
      setIsLoading(false);
    }
  }, [requestLocationPermission, centerOnUser, centerLat, centerLng, fetchVenuesFromAPI]);
  
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
    
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const userCoords = {
        longitude: location.coords.longitude,
        latitude: location.coords.latitude,
      };
      
      setUserLocation(userCoords);
      setCameraCenter([userCoords.longitude, userCoords.latitude]);
      setFollowUserLocation(true);
      setCurrentZoom(14);
      
      // Center the map camera on user location with animation
      if (mapViewRef.current) {
        mapViewRef.current.setCamera({
          centerCoordinate: [userCoords.longitude, userCoords.latitude],
          zoomLevel: 14,
          animationDuration: 1000,
        });
      }
      
    } catch (error) {
      console.warn('Could not get current location for centering, using Tel Aviv default:', error);
      // Use Tel Aviv default location for simulator
      const defaultCoords = TEL_AVIV_DEFAULT_LOCATION;
      setUserLocation(defaultCoords);
      setCameraCenter([defaultCoords.longitude, defaultCoords.latitude]);
      setFollowUserLocation(true);
      setCurrentZoom(14);
      
      // Center the map camera on default location with animation
      if (mapViewRef.current) {
        mapViewRef.current.setCamera({
          centerCoordinate: [defaultCoords.longitude, defaultCoords.latitude],
          zoomLevel: 14,
          animationDuration: 1000,
        });
      }
    }
  }, [locationPermissionGranted, requestLocationPermission]);

  // Preload venue images for caching
  const preloadVenueImages = useCallback(async () => {
    try {
      const cachedVenues = await AsyncStorageUtils.getItem<string[]>('cached_venue_images') || [];
      const newImagesToCache: string[] = [];
      
      venues.forEach(venue => {
        if (venue.image && !cachedVenues.includes(venue.image)) {
          newImagesToCache.push(venue.image);
        }
      });
      
      if (newImagesToCache.length > 0) {
        // Preload images by creating Image objects (using React Native Image)
        const imagePromises = newImagesToCache.map(imageUri => {
          return new Promise<void>((resolve) => {
            Image.prefetch(imageUri)
              .then(() => resolve())
              .catch(() => resolve()); // Don't fail on individual image errors
          });
        });
        
        await Promise.allSettled(imagePromises);
        
        // Update cached venues list
        const updatedCache = [...cachedVenues, ...newImagesToCache];
        await AsyncStorageUtils.setItem('cached_venue_images', updatedCache);
        
        console.log(`Preloaded ${newImagesToCache.length} venue images`);
      }
    } catch (error) {
      console.warn('Failed to preload venue images:', error);
    }
  }, [venues]);

  // Preload images when venues update
  useEffect(() => {
    preloadVenueImages();
  }, [venues, preloadVenueImages]);

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
    
    if (result.type === 'event' && result.code) {
      // Navigate to unified join page - server will determine if it's regular or venue event
      router.push(`/join?code=${result.code}`);
    } else {
      Alert.alert('Invalid QR Code', 'The scanned QR code is not a valid event code.');
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
      overflow: 'hidden',
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
              ref={mapViewRef}
              style={styles.mapView}
              onDidFinishLoadingMap={handleMapReady}
              styleURL={isDark ? Mapbox?.StyleURL?.Dark : Mapbox?.StyleURL?.Light}
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
                    : [TEL_AVIV_DEFAULT_LOCATION.longitude, TEL_AVIV_DEFAULT_LOCATION.latitude] // Tel Aviv as default
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
                // Convert MapClient to Venue type for utils
                const venueForUtils = {
                  id: venue.id,
                  name: venue.name,
                  coordinates: venue.coordinates,
                  hookedHours: venue.hookedHours || undefined,
                  openingHours: venue.openingHours || undefined,
                };
                
                // Re-evaluate status based on current time (triggered by lastStatusUpdate)
                const venueStatus = getVenueActiveStatus(venueForUtils);
                const isActive = venueStatus.shouldGlow;
                
                return (
                  <PointAnnotation
                    key={venue.id}
                    id={venue.id}
                    coordinate={venue.coordinates}
                    onSelected={() => handleVenuePress(venue)}
                  >
                    <View style={{ position: 'relative' }}>
                      {/* Main venue marker */}
                      <View style={styles.venueMarker}>
                        {venue.image ? (
                          <Image
                            source={{ 
                              uri: venue.image,
                              // Add cache and quality settings for mobile optimization
                              cache: 'force-cache',
                              headers: {
                                'Cache-Control': 'max-age=604800' // Cache for 1 week
                              }
                            }}
                            style={styles.venueImage}
                            resizeMode="cover"
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