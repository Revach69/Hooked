import { firestore } from 'firebase-admin';
import { logger } from 'firebase-functions';

// Types for venue event system
export interface TokenizedQRAuth {
  venueId: string;
  qrCodeId: string; // Static, printed on venue QR
  nonce: string; // Short-lived, server-generated
  expiresAt: Date; // 10 min outdoor venues, 15 min complex indoor venues
  userId?: string; // Optional binding to prevent sharing
  sessionId: string; // Bind to specific session
  venueType: 'outdoor' | 'indoor_complex' | 'indoor_simple'; // Determines token lifetime
  issuedAt: Date;
  consumed: boolean;
}

export interface EventEntryResult {
  success: boolean;
  reason?: 'invalid_qr' | 'expired_token' | 'outside_radius' | 'venue_closed' | 'mock_location' | 'token_consumed';
  requiresRescan?: boolean;
  nextActionTime?: Date;
  venueRules?: string; // Surface custom guidance at join time to improve success rates
  locationTips?: string; // Show when location verification fails
  eventId?: string;
  nonce?: string; // Return nonce for successful token generation
}

export interface SecurityLogEntry {
  eventType: 'qr_validation' | 'token_generation' | 'location_verification' | 'mock_detection';
  userId: string;
  venueId: string;
  nonce?: string;
  result: 'success' | 'failed';
  failureReason?: string;
  mockLocationDetected: boolean;
  ipAddress?: string;
  userAgent?: string;
  locationAccuracy?: number;
  timestamp: Date;
}

export interface Location {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: Date;
}

export interface VenueEventConfig {
  id: string;
  venueId: string;
  eventName: string;
  qrCodeId: string;
  locationRadius: number;
  kFactor: number;
  timezone: string;
  schedule: {
    [day: string]: {
      enabled: boolean;
      startTime: string;
      endTime: string;
    };
  };
  venueRules: string;
  locationTips: string;
  venueType: 'outdoor' | 'indoor_complex' | 'indoor_simple';
}

export class VenueEventService {
  private db = firestore();

  /**
   * Step 1: Scan static QR, get tokenized nonce
   * This is called when user scans the static QR code at the venue
   */
  async requestEventNonce(
    staticQRData: string, 
    location: Location, 
    userId: string,
    sessionId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<EventEntryResult> {
    try {
      logger.info('Requesting event nonce', { staticQRData, userId, sessionId });
      
      // Parse static QR data
      let qrPayload;
      try {
        qrPayload = JSON.parse(staticQRData);
      } catch (error) {
        logger.warn('Invalid QR code format', { staticQRData, error });
        return {
          success: false,
          reason: 'invalid_qr'
        };
      }

      if (qrPayload.type !== 'venue_event') {
        return {
          success: false,
          reason: 'invalid_qr'
        };
      }

      const { venueId, qrCodeId } = qrPayload;

      // Get venue event configuration
      const venueConfig = await this.getVenueEventConfig(venueId, qrCodeId);
      if (!venueConfig) {
        logger.warn('Venue event config not found', { venueId, qrCodeId });
        return {
          success: false,
          reason: 'invalid_qr'
        };
      }

      // Check if venue is currently open
      const isOpen = await this.isVenueOpen(venueConfig);
      if (!isOpen) {
        logger.info('Venue is closed', { venueId, eventName: venueConfig.eventName });
        return {
          success: false,
          reason: 'venue_closed',
          venueRules: venueConfig.venueRules
        };
      }

      // Check location proximity (basic check before generating nonce)
      const isWithinRadius = await this.isLocationWithinRadius(
        location, 
        venueConfig.venueId, 
        venueConfig.locationRadius * venueConfig.kFactor
      );

      if (!isWithinRadius) {
        logger.info('User outside venue radius', { 
          venueId, 
          userId, 
          accuracy: location.accuracy,
          requiredRadius: venueConfig.locationRadius * venueConfig.kFactor
        });
        return {
          success: false,
          reason: 'outside_radius',
          locationTips: venueConfig.locationTips,
          venueRules: venueConfig.venueRules
        };
      }

      // Generate secure nonce
      const nonce = await this.generateSecureNonce();
      const expirationMinutes = this.getTokenLifetime(venueConfig.venueType);
      const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

      const tokenData: TokenizedQRAuth = {
        venueId,
        qrCodeId,
        nonce,
        expiresAt,
        userId,
        sessionId,
        venueType: venueConfig.venueType,
        issuedAt: new Date(),
        consumed: false
      };

      // Store token in database with expiration
      await this.storeToken(tokenData);

      // Log successful token generation
      await this.logSecurityEvent({
        eventType: 'token_generation',
        userId,
        venueId,
        nonce,
        result: 'success',
        mockLocationDetected: false, // Will be checked in verification step
        ipAddress,
        userAgent,
        locationAccuracy: location.accuracy,
        timestamp: new Date()
      });

      logger.info('Event nonce generated successfully', { 
        venueId, 
        userId, 
        nonce: nonce.substring(0, 8) + '...' // Log partial nonce for debugging
      });

      return {
        success: true,
        eventId: venueConfig.id,
        nonce,
        venueRules: venueConfig.venueRules
      };

    } catch (error) {
      logger.error('Error generating event nonce', { error, userId, staticQRData });
      return {
        success: false,
        reason: 'invalid_qr'
      };
    }
  }

  /**
   * Step 2: Verify nonce + location for entry
   * This is called when user attempts to join the event with their nonce
   */
  async verifyTokenizedEntry(
    nonce: string, 
    location: Location, 
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<EventEntryResult> {
    try {
      logger.info('Verifying tokenized entry', { nonce: nonce.substring(0, 8) + '...', userId });

      // Validate QR token
      const tokenValidation = await this.validateQRToken(nonce, userId);
      if (!tokenValidation.valid) {
        return {
          success: false,
          reason: tokenValidation.reason as any,
          requiresRescan: tokenValidation.reason === 'expired_token'
        };
      }

      const token = tokenValidation.token!;
      const venueConfig = await this.getVenueEventConfig(token.venueId, token.qrCodeId);
      
      if (!venueConfig) {
        return {
          success: false,
          reason: 'invalid_qr'
        };
      }

      // Check if venue is still open
      const isOpen = await this.isVenueOpen(venueConfig);
      if (!isOpen) {
        return {
          success: false,
          reason: 'venue_closed'
        };
      }

      // Enhanced location verification with mock detection
      const locationVerification = await this.verifyLocation(location, venueConfig, userId);
      if (!locationVerification.valid) {
        // Log failed location verification
        await this.logSecurityEvent({
          eventType: 'location_verification',
          userId,
          venueId: token.venueId,
          nonce,
          result: 'failed',
          failureReason: locationVerification.reason,
          mockLocationDetected: locationVerification.mockDetected,
          ipAddress,
          userAgent,
          locationAccuracy: location.accuracy,
          timestamp: new Date()
        });

        return {
          success: false,
          reason: locationVerification.mockDetected ? 'mock_location' : 'outside_radius',
          locationTips: venueConfig.locationTips,
          requiresRescan: locationVerification.mockDetected
        };
      }

      // Mark token as consumed
      await this.consumeToken(nonce);

      // Log successful entry
      await this.logSecurityEvent({
        eventType: 'qr_validation',
        userId,
        venueId: token.venueId,
        nonce,
        result: 'success',
        mockLocationDetected: false,
        ipAddress,
        userAgent,
        locationAccuracy: location.accuracy,
        timestamp: new Date()
      });

      // Create or update event session for user
      await this.createEventSession(userId, token.venueId, venueConfig.id);

      logger.info('User successfully joined venue event', { 
        venueId: token.venueId, 
        userId, 
        eventName: venueConfig.eventName 
      });

      return {
        success: true,
        eventId: venueConfig.id
      };

    } catch (error) {
      logger.error('Error verifying tokenized entry', { error, userId });
      return {
        success: false,
        reason: 'invalid_qr'
      };
    }
  }

  /**
   * QR Code validation with anti-replay and security logging
   */
  private async validateQRToken(nonce: string, userId: string): Promise<{
    valid: boolean;
    reason?: string;
    token?: TokenizedQRAuth;
  }> {
    try {
      const tokenDoc = await this.db.collection('venue_tokens').doc(nonce).get();
      
      if (!tokenDoc.exists) {
        logger.warn('Token not found', { nonce: nonce.substring(0, 8) + '...', userId });
        return { valid: false, reason: 'invalid_token' };
      }

      const token = tokenDoc.data() as TokenizedQRAuth;

      // Check if token is expired
      if (new Date() > token.expiresAt) {
        logger.info('Token expired', { nonce: nonce.substring(0, 8) + '...', userId });
        return { valid: false, reason: 'expired_token' };
      }

      // Check if token is already consumed
      if (token.consumed) {
        logger.warn('Token already consumed', { nonce: nonce.substring(0, 8) + '...', userId });
        return { valid: false, reason: 'token_consumed' };
      }

      // Check user binding (prevent sharing)
      if (token.userId && token.userId !== userId) {
        logger.warn('Token user mismatch', { 
          nonce: nonce.substring(0, 8) + '...', 
          tokenUserId: token.userId, 
          requestUserId: userId 
        });
        return { valid: false, reason: 'invalid_binding' };
      }

      return { valid: true, token };

    } catch (error) {
      logger.error('Error validating QR token', { error, nonce: nonce.substring(0, 8) + '...' });
      return { valid: false, reason: 'validation_error' };
    }
  }

  /**
   * Enhanced location verification with mock detection
   */
  private async verifyLocation(
    location: Location, 
    venueConfig: VenueEventConfig,
    userId: string
  ): Promise<{ valid: boolean; reason?: string; mockDetected: boolean }> {
    try {
      // Get venue coordinates
      const venueDoc = await this.db.collection('map_clients').doc(venueConfig.venueId).get();
      if (!venueDoc.exists) {
        return { valid: false, reason: 'venue_not_found', mockDetected: false };
      }

      const venueData = venueDoc.data();
      const venueCoords = venueData?.coordinates;
      
      if (!venueCoords) {
        return { valid: false, reason: 'venue_coordinates_missing', mockDetected: false };
      }

      // Calculate distance
      const distance = this.calculateDistance(
        location.lat, 
        location.lng, 
        venueCoords.lat, 
        venueCoords.lng
      );

      const effectiveRadius = venueConfig.locationRadius * venueConfig.kFactor;

      // Mock location detection
      const mockDetected = await this.detectMockLocation(location, userId);
      if (mockDetected) {
        // For mock location users, require tighter radius
        const strictRadius = effectiveRadius * 0.7; // 30% tighter
        if (distance > strictRadius) {
          return { valid: false, reason: 'mock_location_strict_radius', mockDetected: true };
        }
      }

      // Standard radius check
      if (distance > effectiveRadius) {
        logger.info('User outside effective radius', {
          userId,
          venueId: venueConfig.venueId,
          distance,
          effectiveRadius,
          accuracy: location.accuracy
        });
        return { valid: false, reason: 'outside_radius', mockDetected };
      }

      return { valid: true, mockDetected };

    } catch (error) {
      logger.error('Error verifying location', { error, userId, venueId: venueConfig.venueId });
      return { valid: false, reason: 'verification_error', mockDetected: false };
    }
  }

  /**
   * Mock location detection using various heuristics
   */
  private async detectMockLocation(location: Location, userId: string): Promise<boolean> {
    // Check accuracy - mock locations often have perfect accuracy
    if (location.accuracy < 5) {
      logger.info('Suspicious high accuracy detected', { 
        userId, 
        accuracy: location.accuracy 
      });
      return true;
    }

    // Check for impossible accuracy improvements
    const recentLocations = await this.getRecentUserLocations(userId, 5);
    if (recentLocations.length > 1) {
      const previousAccuracy = recentLocations[recentLocations.length - 2].accuracy;
      if (previousAccuracy > 100 && location.accuracy < 10) {
        logger.warn('Impossible accuracy improvement detected', {
          userId,
          previousAccuracy,
          currentAccuracy: location.accuracy
        });
        return true;
      }
    }

    // Additional heuristics can be added here
    // - Check for location jumps that are physically impossible
    // - Pattern analysis for repeated exact coordinates
    // - Time-based analysis for location updates

    return false;
  }

  /**
   * Generate cryptographically secure nonce
   */
  private async generateSecureNonce(): Promise<string> {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Get token lifetime based on venue type
   */
  private getTokenLifetime(venueType: string): number {
    switch (venueType) {
      case 'outdoor': return 10; // 10 minutes
      case 'indoor_complex': return 15; // 15 minutes
      case 'indoor_simple': return 12; // 12 minutes
      default: return 10;
    }
  }

  /**
   * Store token with automatic expiration
   */
  private async storeToken(token: TokenizedQRAuth): Promise<void> {
    const tokenDoc = this.db.collection('venue_tokens').doc(token.nonce);
    await tokenDoc.set(token);
    
    // Set Firestore TTL for automatic cleanup
    const expirationSeconds = Math.floor(token.expiresAt.getTime() / 1000);
    await tokenDoc.update({
      ttl: firestore.Timestamp.fromDate(token.expiresAt)
    });
  }

  /**
   * Mark token as consumed to prevent replay
   */
  private async consumeToken(nonce: string): Promise<void> {
    await this.db.collection('venue_tokens').doc(nonce).update({
      consumed: true,
      consumedAt: firestore.Timestamp.now()
    });
  }

  /**
   * Log security events for monitoring and analysis
   */
  private async logSecurityEvent(entry: SecurityLogEntry): Promise<void> {
    const logDoc = this.db.collection('venue_security_logs').doc();
    await logDoc.set({
      ...entry,
      timestamp: firestore.Timestamp.fromDate(entry.timestamp)
    });

    // Also log to Cloud Functions logs for real-time monitoring
    if (entry.result === 'failed' || entry.mockLocationDetected) {
      logger.warn('Security event logged', {
        eventType: entry.eventType,
        userId: entry.userId,
        venueId: entry.venueId,
        result: entry.result,
        failureReason: entry.failureReason,
        mockLocationDetected: entry.mockLocationDetected
      });
    }
  }

  /**
   * Get venue event configuration
   */
  private async getVenueEventConfig(venueId: string, qrCodeId: string): Promise<VenueEventConfig | null> {
    try {
      const venueDoc = await this.db.collection('map_clients').doc(venueId).get();
      if (!venueDoc.exists) {
        return null;
      }

      const venueData = venueDoc.data();
      const eventSettings = venueData?.eventHubSettings;

      if (!eventSettings?.enabled || eventSettings.qrCodeId !== qrCodeId) {
        return null;
      }

      return {
        id: `${venueId}_recurring_event`,
        venueId,
        eventName: eventSettings.eventName,
        qrCodeId: eventSettings.qrCodeId,
        locationRadius: eventSettings.locationRadius || 50,
        kFactor: eventSettings.kFactor || 1.2,
        timezone: eventSettings.timezone || 'UTC',
        schedule: eventSettings.schedule || {},
        venueRules: eventSettings.venueRules || '',
        locationTips: eventSettings.locationTips || '',
        venueType: this.inferVenueType(venueData?.businessType)
      };
    } catch (error) {
      logger.error('Error getting venue event config', { error, venueId, qrCodeId });
      return null;
    }
  }

  /**
   * Infer venue type from business type for token lifetime decisions
   */
  private inferVenueType(businessType: string): 'outdoor' | 'indoor_complex' | 'indoor_simple' {
    switch (businessType) {
      case 'club':
        return 'indoor_complex';
      case 'restaurant':
      case 'bar':
      case 'cafe':
        return 'indoor_simple';
      case 'venue':
        return 'indoor_complex';
      default:
        return 'outdoor';
    }
  }

  /**
   * Check if venue is currently within operating hours
   */
  private async isVenueOpen(config: VenueEventConfig): Promise<boolean> {
    const now = new Date();
    const venueTime = new Date(now.toLocaleString("en-US", { timeZone: config.timezone }));
    
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = days[venueTime.getDay()];
    
    const daySchedule = config.schedule[currentDay];
    if (!daySchedule?.enabled) {
      return false;
    }
    
    const currentTimeStr = venueTime.toTimeString().slice(0, 5); // "HH:MM"
    
    // Handle overnight events (e.g., 22:00 - 02:00)
    if (daySchedule.endTime < daySchedule.startTime) {
      return currentTimeStr >= daySchedule.startTime || currentTimeStr <= daySchedule.endTime;
    }
    
    return currentTimeStr >= daySchedule.startTime && currentTimeStr <= daySchedule.endTime;
  }

  /**
   * Check if location is within venue radius
   */
  private async isLocationWithinRadius(location: Location, venueId: string, radius: number): Promise<boolean> {
    try {
      const venueDoc = await this.db.collection('map_clients').doc(venueId).get();
      if (!venueDoc.exists) {
        return false;
      }

      const venueCoords = venueDoc.data()?.coordinates;
      if (!venueCoords) {
        return false;
      }

      const distance = this.calculateDistance(
        location.lat,
        location.lng,
        venueCoords.lat,
        venueCoords.lng
      );

      return distance <= radius;
    } catch (error) {
      logger.error('Error checking location radius', { error, venueId });
      return false;
    }
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Create event session for user
   */
  private async createEventSession(userId: string, venueId: string, eventId: string): Promise<void> {
    const sessionDoc = this.db.collection('venue_event_sessions').doc(`${eventId}_${userId}`);
    await sessionDoc.set({
      userId,
      venueId,
      eventId,
      joinedAt: firestore.Timestamp.now(),
      currentState: 'active',
      lastPingAt: firestore.Timestamp.now(),
      totalDuration: 0,
      profileVisible: true
    }, { merge: true });
  }

  /**
   * Get recent user locations for mock detection
   */
  private async getRecentUserLocations(userId: string, limit: number): Promise<Location[]> {
    // This would query a user locations collection
    // For now, return empty array as placeholder
    return [];
  }
}