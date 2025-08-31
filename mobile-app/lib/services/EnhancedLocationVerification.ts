import * as Location from 'expo-location';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import * as Sentry from '@sentry/react-native';
import { AsyncStorageUtils } from '../asyncStorageUtils';

// Enhanced location verification interfaces
export interface LocationVerification {
  withinRadius: boolean;
  distance: number;
  accuracy: number;
  needsRefix: boolean; // if accuracy > 150m
  
  // GPS spoofing detection using multiple location sources
  spoofingRisk: 'low' | 'medium' | 'high';
  locationSources: {
    gps: boolean;
    network: boolean;
    passive: boolean;
  };
  
  // WiFi fingerprinting for improved indoor accuracy
  wifiFingerprint?: {
    availableNetworks: string[]; // BSSID hashes for privacy
    signalStrengths: number[];
    matchesVenueProfile: boolean;
  };
  
  // Additional verification metrics
  verificationScore: number; // 0-100, higher = more trustworthy
  recommendedAction: 'allow' | 'retry' | 'require_rescan' | 'deny';
}

export interface VenueWiFiProfile {
  venueId: string;
  knownNetworks: string[]; // Hashed BSSIDs
  signalPattern: { [bssid: string]: { min: number; max: number; avg: number } };
  lastUpdated: Date;
  sampleCount: number;
}

export interface SpoofingIndicators {
  rapidLocationChanges: boolean;
  impossibleSpeed: boolean;
  inconsistentAccuracy: boolean;
  mockProviderDetected: boolean;
  wifiMismatch: boolean;
  suspiciousPattern: boolean;
}

// Storage keys
const WIFI_PROFILES_KEY = 'venue_wifi_profiles';
const LOCATION_HISTORY_KEY = 'recent_location_history';
const SPOOFING_PATTERNS_KEY = 'spoofing_detection_patterns';

export class EnhancedLocationVerification {
  private static instance: EnhancedLocationVerification;
  private wifiProfiles: Map<string, VenueWiFiProfile> = new Map();
  private recentLocations: Location.LocationObject[] = [];
  private readonly MAX_LOCATION_HISTORY = 10;
  
  static getInstance(): EnhancedLocationVerification {
    if (!EnhancedLocationVerification.instance) {
      EnhancedLocationVerification.instance = new EnhancedLocationVerification();
    }
    return EnhancedLocationVerification.instance;
  }

  constructor() {
    this.loadStoredData();
  }

  /**
   * Comprehensive location verification with spoofing detection
   */
  async verifyLocationWithEnhancedSecurity(
    userLocation: { lat: number; lng: number; accuracy: number },
    venueLocation: { lat: number; lng: number },
    radius: number,
    venueId?: string
  ): Promise<LocationVerification> {
    try {
      // Basic distance calculation
      const distance = this.calculateHaversineDistance(
        userLocation.lat,
        userLocation.lng,
        venueLocation.lat,
        venueLocation.lng
      );

      const withinRadius = distance <= radius;
      const needsRefix = userLocation.accuracy > 150;

      // Multi-source location verification
      const locationSources = await this.detectLocationSources();
      
      // GPS spoofing detection
      const spoofingIndicators = await this.detectGPSSpoofing(userLocation);
      const spoofingRisk = this.calculateSpoofingRisk(spoofingIndicators);

      // WiFi fingerprinting (if venue ID provided)
      let wifiFingerprint;
      if (venueId) {
        wifiFingerprint = await this.performWiFiFingerprinting(venueId);
      }

      // Calculate overall verification score
      const verificationScore = this.calculateVerificationScore({
        withinRadius,
        accuracy: userLocation.accuracy,
        spoofingRisk,
        locationSources,
        wifiFingerprint
      });

      // Determine recommended action
      const recommendedAction = this.determineRecommendedAction(
        verificationScore,
        spoofingRisk,
        withinRadius,
        needsRefix
      );

      // Store location for pattern analysis
      await this.storeLocationForAnalysis(userLocation);

      const result: LocationVerification = {
        withinRadius,
        distance,
        accuracy: userLocation.accuracy,
        needsRefix,
        spoofingRisk,
        locationSources,
        wifiFingerprint,
        verificationScore,
        recommendedAction
      };

      // Log verification result
      Sentry.addBreadcrumb({
        message: 'Enhanced location verification completed',
        data: {
          distance,
          spoofingRisk,
          verificationScore,
          recommendedAction,
          withinRadius
        },
        level: 'info'
      });

      return result;

    } catch (error) {
      console.error('Enhanced location verification failed:', error);
      Sentry.captureException(error);

      // Return safe fallback result
      return {
        withinRadius: false,
        distance: 9999,
        accuracy: userLocation.accuracy,
        needsRefix: true,
        spoofingRisk: 'high',
        locationSources: { gps: false, network: false, passive: false },
        verificationScore: 0,
        recommendedAction: 'deny'
      };
    }
  }

  /**
   * Detect available location sources (GPS, Network, Passive)
   */
  private async detectLocationSources(): Promise<{ gps: boolean; network: boolean; passive: boolean }> {
    try {
      const hasServicesEnabled = await Location.hasServicesEnabledAsync();
      const providerStatus = await Location.getProviderStatusAsync();

      // Check network connectivity for network-based location
      const networkState = await NetInfo.fetch();
      const hasNetworkLocation = networkState.isConnected && (networkState.type === 'wifi' || networkState.type === 'cellular');

      return {
        gps: hasServicesEnabled && providerStatus.gpsAvailable,
        network: hasNetworkLocation,
        passive: providerStatus.passiveAvailable || false
      };
    } catch (error) {
      console.warn('Error detecting location sources:', error);
      return { gps: false, network: false, passive: false };
    }
  }

  /**
   * Detect GPS spoofing using multiple indicators
   */
  private async detectGPSSpoofing(
    currentLocation: { lat: number; lng: number; accuracy: number }
  ): Promise<SpoofingIndicators> {
    const indicators: SpoofingIndicators = {
      rapidLocationChanges: false,
      impossibleSpeed: false,
      inconsistentAccuracy: false,
      mockProviderDetected: false,
      wifiMismatch: false,
      suspiciousPattern: false
    };

    try {
      // Check for rapid location changes
      if (this.recentLocations.length >= 2) {
        const lastLocation = this.recentLocations[this.recentLocations.length - 1];
        const distance = this.calculateHaversineDistance(
          currentLocation.lat,
          currentLocation.lng,
          lastLocation.coords.latitude,
          lastLocation.coords.longitude
        );

        const timeDiff = (Date.now() - lastLocation.timestamp) / 1000; // seconds
        const speed = distance / timeDiff; // m/s

        // Flag impossible speed (>50 m/s = 180 km/h)
        indicators.impossibleSpeed = speed > 50;

        // Flag rapid location changes (>500m in <10 seconds)
        indicators.rapidLocationChanges = distance > 500 && timeDiff < 10;
      }

      // Check for inconsistent accuracy patterns
      const recentAccuracies = this.recentLocations
        .slice(-5)
        .map(loc => loc.coords.accuracy || 999);
      recentAccuracies.push(currentLocation.accuracy);

      const accuracyVariance = this.calculateVariance(recentAccuracies);
      indicators.inconsistentAccuracy = accuracyVariance > 10000; // High variance in accuracy

      // Android: Check for mock location providers
      if (Platform.OS === 'android') {
        indicators.mockProviderDetected = await this.detectMockLocationProvider();
      }

      // Check for suspicious patterns (perfect accuracy, round coordinates)
      indicators.suspiciousPattern = this.detectSuspiciousLocationPattern(currentLocation);

    } catch (error) {
      console.warn('Error in GPS spoofing detection:', error);
    }

    return indicators;
  }

  /**
   * Android-specific mock location provider detection
   */
  private async detectMockLocationProvider(): Promise<boolean> {
    try {
      // Note: This would require native module implementation for full detection
      // For now, we use heuristics available through Expo
      
      // Check if location is too precise (common in mock apps)
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });

      // Mock apps often provide exactly 5-digit precision
      const latStr = location.coords.latitude.toString();
      const lngStr = location.coords.longitude.toString();
      
      const latDecimals = latStr.split('.')[1]?.length || 0;
      const lngDecimals = lngStr.split('.')[1]?.length || 0;
      
      // Suspicious if both have exactly 5 decimal places (common mock pattern)
      return latDecimals === 5 && lngDecimals === 5;
      
    } catch (error) {
      return false;
    }
  }

  /**
   * Detect suspicious location patterns
   */
  private detectSuspiciousLocationPattern(location: { lat: number; lng: number; accuracy: number }): boolean {
    // Check for suspiciously round coordinates
    const latRounded = Math.abs(location.lat - Math.round(location.lat * 10000) / 10000) < 0.00001;
    const lngRounded = Math.abs(location.lng - Math.round(location.lng * 10000) / 10000) < 0.00001;
    
    // Check for suspiciously perfect accuracy
    const perfectAccuracy = location.accuracy === 1 || location.accuracy === 3 || location.accuracy === 5;
    
    return (latRounded && lngRounded) || perfectAccuracy;
  }

  /**
   * WiFi fingerprinting for venue verification
   */
  private async performWiFiFingerprinting(venueId: string): Promise<{
    availableNetworks: string[];
    signalStrengths: number[];
    matchesVenueProfile: boolean;
  } | undefined> {
    try {
      // Note: React Native doesn't have direct WiFi scanning APIs for security reasons
      // This would typically require:
      // 1. Third-party library like react-native-wifi-reborn (Android only)
      // 2. Native module development
      // 3. Platform-specific implementations
      
      // For now, we'll simulate with network connection info
      const networkState = await NetInfo.fetch();
      
      if (networkState.type !== 'wifi') {
        return undefined;
      }

      // Simulate WiFi fingerprinting result
      // In real implementation, this would scan for available networks
      const simulatedNetworks = ['network_hash_1', 'network_hash_2'];
      const simulatedSignals = [-45, -60]; // dBm values
      
      const venueProfile = this.wifiProfiles.get(venueId);
      const matchesVenueProfile = venueProfile 
        ? this.compareWiFiFingerprint(simulatedNetworks, venueProfile)
        : false;

      // Update venue profile if we're learning
      if (!venueProfile) {
        await this.createWiFiProfile(venueId, simulatedNetworks, simulatedSignals);
      }

      return {
        availableNetworks: simulatedNetworks,
        signalStrengths: simulatedSignals,
        matchesVenueProfile
      };

    } catch (error) {
      console.warn('WiFi fingerprinting failed:', error);
      return undefined;
    }
  }

  /**
   * Calculate spoofing risk based on indicators
   */
  private calculateSpoofingRisk(indicators: SpoofingIndicators): 'low' | 'medium' | 'high' {
    let riskScore = 0;

    if (indicators.mockProviderDetected) riskScore += 40;
    if (indicators.impossibleSpeed) riskScore += 30;
    if (indicators.rapidLocationChanges) riskScore += 25;
    if (indicators.inconsistentAccuracy) riskScore += 20;
    if (indicators.suspiciousPattern) riskScore += 15;
    if (indicators.wifiMismatch) riskScore += 10;

    if (riskScore >= 60) return 'high';
    if (riskScore >= 30) return 'medium';
    return 'low';
  }

  /**
   * Calculate overall verification score (0-100)
   */
  private calculateVerificationScore(params: {
    withinRadius: boolean;
    accuracy: number;
    spoofingRisk: 'low' | 'medium' | 'high';
    locationSources: { gps: boolean; network: boolean; passive: boolean };
    wifiFingerprint?: { matchesVenueProfile: boolean };
  }): number {
    let score = 0;

    // Base score for being within radius
    if (params.withinRadius) score += 40;

    // Accuracy bonus (better accuracy = higher score)
    const accuracyBonus = Math.max(0, 30 - (params.accuracy / 5));
    score += accuracyBonus;

    // Location sources bonus
    if (params.locationSources.gps) score += 15;
    if (params.locationSources.network) score += 10;
    if (params.locationSources.passive) score += 5;

    // WiFi fingerprint bonus
    if (params.wifiFingerprint?.matchesVenueProfile) score += 20;

    // Spoofing risk penalty
    switch (params.spoofingRisk) {
      case 'high': score -= 50; break;
      case 'medium': score -= 25; break;
      case 'low': break; // no penalty
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Determine recommended action based on verification result
   */
  private determineRecommendedAction(
    verificationScore: number,
    spoofingRisk: 'low' | 'medium' | 'high',
    withinRadius: boolean,
    needsRefix: boolean
  ): 'allow' | 'retry' | 'require_rescan' | 'deny' {
    if (spoofingRisk === 'high') return 'deny';
    if (verificationScore < 30) return 'deny';
    if (needsRefix) return 'retry';
    if (!withinRadius && spoofingRisk === 'medium') return 'require_rescan';
    if (verificationScore >= 70) return 'allow';
    if (verificationScore >= 50) return 'retry';
    return 'require_rescan';
  }

  // Helper methods

  private calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  private async storeLocationForAnalysis(location: { lat: number; lng: number; accuracy: number }): Promise<void> {
    const locationObj = {
      coords: {
        latitude: location.lat,
        longitude: location.lng,
        accuracy: location.accuracy
      },
      timestamp: Date.now()
    } as Location.LocationObject;

    this.recentLocations.push(locationObj);
    
    if (this.recentLocations.length > this.MAX_LOCATION_HISTORY) {
      this.recentLocations = this.recentLocations.slice(-this.MAX_LOCATION_HISTORY);
    }

    // Persist to storage
    await AsyncStorageUtils.setItem(LOCATION_HISTORY_KEY, this.recentLocations);
  }

  private compareWiFiFingerprint(networks: string[], venueProfile: VenueWiFiProfile): boolean {
    const matchingNetworks = networks.filter(network => 
      venueProfile.knownNetworks.includes(network)
    );
    
    // Require at least 50% match
    return matchingNetworks.length >= Math.ceil(venueProfile.knownNetworks.length * 0.5);
  }

  private async createWiFiProfile(
    venueId: string, 
    networks: string[], 
    signals: number[]
  ): Promise<void> {
    const profile: VenueWiFiProfile = {
      venueId,
      knownNetworks: networks,
      signalPattern: {},
      lastUpdated: new Date(),
      sampleCount: 1
    };

    networks.forEach((network, index) => {
      if (signals[index] !== undefined) {
        profile.signalPattern[network] = {
          min: signals[index],
          max: signals[index],
          avg: signals[index]
        };
      }
    });

    this.wifiProfiles.set(venueId, profile);
    await this.saveWiFiProfiles();
  }

  private async loadStoredData(): Promise<void> {
    try {
      // Load WiFi profiles
      const storedProfiles = await AsyncStorageUtils.getItem<VenueWiFiProfile[]>(WIFI_PROFILES_KEY);
      if (storedProfiles) {
        storedProfiles.forEach(profile => {
          this.wifiProfiles.set(profile.venueId, profile);
        });
      }

      // Load location history
      const storedHistory = await AsyncStorageUtils.getItem<Location.LocationObject[]>(LOCATION_HISTORY_KEY);
      if (storedHistory) {
        this.recentLocations = storedHistory;
      }
    } catch (error) {
      console.warn('Error loading stored location data:', error);
    }
  }

  private async saveWiFiProfiles(): Promise<void> {
    try {
      const profilesArray = Array.from(this.wifiProfiles.values());
      await AsyncStorageUtils.setItem(WIFI_PROFILES_KEY, profilesArray);
    } catch (error) {
      console.warn('Error saving WiFi profiles:', error);
    }
  }

  /**
   * Clear old data for privacy compliance
   */
  async clearOldData(olderThanDays: number = 7): Promise<void> {
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    
    // Clear old location history
    this.recentLocations = this.recentLocations.filter(
      loc => loc.timestamp > cutoffTime
    );
    
    // Clear old WiFi profiles
    for (const [venueId, profile] of this.wifiProfiles) {
      if (profile.lastUpdated.getTime() < cutoffTime) {
        this.wifiProfiles.delete(venueId);
      }
    }
    
    // Save updated data
    await AsyncStorageUtils.setItem(LOCATION_HISTORY_KEY, this.recentLocations);
    await this.saveWiFiProfiles();
  }
}