import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { VenueEventService, Location } from './VenueEventService';

// Rate limiting configuration
const RATE_LIMITS = {
  nonce_request: { requests: 5, windowMs: 60000 }, // 5 requests per minute
  entry_verify: { requests: 3, windowMs: 60000 }, // 3 requests per minute
  ping: { requests: 60, windowMs: 60000 } // 60 pings per minute
};

// In-memory rate limiting (in production, use Redis or Firestore)
const rateLimitCache = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string, endpoint: keyof typeof RATE_LIMITS): boolean {
  const limit = RATE_LIMITS[endpoint];
  const key = `${userId}_${endpoint}`;
  const now = Date.now();
  
  const current = rateLimitCache.get(key);
  if (!current || now > current.resetTime) {
    rateLimitCache.set(key, { count: 1, resetTime: now + limit.windowMs });
    return true;
  }
  
  if (current.count >= limit.requests) {
    return false;
  }
  
  current.count++;
  return true;
}

/**
 * Request Event Nonce - Step 1 of venue entry
 * Called when user scans QR code at venue
 */
export const requestEventNonce = onCall(
  { 
    cors: ['https://hooked.app'],
    enforceAppCheck: true // Ensure requests come from authentic app
  },
  async (request) => {
    try {
      const { auth, data } = request;
      
      if (!auth) {
        throw new HttpsError('unauthenticated', 'Authentication required');
      }

      const { 
        staticQRData, 
        location, 
        sessionId 
      }: { 
        staticQRData: string;
        location: Location;
        sessionId: string;
      } = data;

      // Rate limiting
      if (!checkRateLimit(auth.uid, 'nonce_request')) {
        logger.warn('Rate limit exceeded for nonce request', { userId: auth.uid });
        throw new HttpsError('resource-exhausted', 'Rate limit exceeded. Please wait before trying again.');
      }

      // Input validation
      if (!staticQRData || !location || !sessionId) {
        throw new HttpsError('invalid-argument', 'Missing required parameters');
      }

      if (!location.lat || !location.lng || !location.accuracy || !location.timestamp) {
        throw new HttpsError('invalid-argument', 'Invalid location data');
      }

      // Validate location accuracy
      if (location.accuracy > 500) {
        logger.info('Poor location accuracy', { 
          userId: auth.uid, 
          accuracy: location.accuracy 
        });
        throw new HttpsError('failed-precondition', 'Location accuracy too poor. Please try again with better GPS signal.');
      }

      const venueService = new VenueEventService();
      
      const result = await venueService.requestEventNonce(
        staticQRData,
        location,
        auth.uid,
        sessionId,
        request.rawRequest.ip,
        request.rawRequest.headers['user-agent']
      );

      return result;

    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      
      logger.error('Error in requestEventNonce', { error, userId: request.auth?.uid });
      throw new HttpsError('internal', 'Internal server error');
    }
  }
);

/**
 * Verify Tokenized Entry - Step 2 of venue entry
 * Called when user attempts to join event with nonce
 */
export const verifyTokenizedEntry = onCall(
  {
    cors: ['https://hooked.app'],
    enforceAppCheck: true
  },
  async (request) => {
    try {
      const { auth, data } = request;
      
      if (!auth) {
        throw new HttpsError('unauthenticated', 'Authentication required');
      }

      const { 
        nonce, 
        location 
      }: { 
        nonce: string;
        location: Location;
      } = data;

      // Rate limiting
      if (!checkRateLimit(auth.uid, 'entry_verify')) {
        logger.warn('Rate limit exceeded for entry verification', { userId: auth.uid });
        throw new HttpsError('resource-exhausted', 'Rate limit exceeded. Please wait before trying again.');
      }

      // Input validation
      if (!nonce || !location) {
        throw new HttpsError('invalid-argument', 'Missing required parameters');
      }

      if (!location.lat || !location.lng || !location.accuracy || !location.timestamp) {
        throw new HttpsError('invalid-argument', 'Invalid location data');
      }

      // Validate nonce format
      if (typeof nonce !== 'string' || nonce.length !== 64) { // 32 bytes = 64 hex chars
        throw new HttpsError('invalid-argument', 'Invalid nonce format');
      }

      const venueService = new VenueEventService();
      
      const result = await venueService.verifyTokenizedEntry(
        nonce,
        location,
        auth.uid,
        request.rawRequest.ip,
        request.rawRequest.headers['user-agent']
      );

      return result;

    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      
      logger.error('Error in verifyTokenizedEntry', { error, userId: request.auth?.uid });
      throw new HttpsError('internal', 'Internal server error');
    }
  }
);

/**
 * Venue Ping - Location verification for active users
 * Called periodically while user is in venue event
 */
export const venuePing = onCall(
  {
    cors: ['https://hooked.app'],
    enforceAppCheck: true
  },
  async (request) => {
    try {
      const { auth, data } = request;
      
      if (!auth) {
        throw new HttpsError('unauthenticated', 'Authentication required');
      }

      const { 
        venues,
        batteryLevel,
        movementSpeed
      }: { 
        venues: Array<{
          venueId: string;
          location: Location;
        }>;
        batteryLevel?: number;
        movementSpeed?: number;
      } = data;

      // Rate limiting
      if (!checkRateLimit(auth.uid, 'ping')) {
        logger.warn('Rate limit exceeded for venue ping', { userId: auth.uid });
        throw new HttpsError('resource-exhausted', 'Rate limit exceeded');
      }

      // Input validation
      if (!venues || !Array.isArray(venues) || venues.length === 0) {
        throw new HttpsError('invalid-argument', 'Invalid venues data');
      }

      // Limit batch size to prevent abuse
      if (venues.length > 5) {
        throw new HttpsError('invalid-argument', 'Too many venues in single ping');
      }

      const results: Array<{
        venueId: string;
        inside: boolean;
        distance?: number;
        nextPingDelay?: number;
      }> = [];

      for (const venue of venues) {
        try {
          const result = await this.processSingleVenuePing(venue, auth.uid, batteryLevel, movementSpeed);
          results.push(result);
        } catch (error) {
          logger.warn('Error processing venue ping', { 
            venueId: venue.venueId, 
            userId: auth.uid, 
            error 
          });
          results.push({
            venueId: venue.venueId,
            inside: false,
            distance: undefined,
            nextPingDelay: 120 // Default 2 minute delay on error
          });
        }
      }

      // Determine overall profile visibility
      const profileVisible = results.some(r => r.inside);

      return {
        venues: results,
        profileVisibility: profileVisible
      };

    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      
      logger.error('Error in venuePing', { error, userId: request.auth?.uid });
      throw new HttpsError('internal', 'Internal server error');
    }
  }
);

/**
 * Process a single venue ping (helper function)
 */
async function processSingleVenuePing(
  venue: { venueId: string; location: Location },
  userId: string,
  batteryLevel?: number,
  movementSpeed?: number
): Promise<{
  venueId: string;
  inside: boolean;
  distance?: number;
  nextPingDelay?: number;
}> {
  // TODO: Implement venue ping logic
  // This is a placeholder that will be implemented in the next phase
  
  return {
    venueId: venue.venueId,
    inside: false,
    nextPingDelay: 60 // Default 1 minute
  };
}

/**
 * Get Venue Dashboard - Real-time venue metrics for admin
 * Separate endpoint for admin dashboard data
 */
export const getVenueDashboard = onCall(
  {
    cors: ['https://admin.hooked.app'],
    enforceAppCheck: false // Admin dashboard might not use app check
  },
  async (request) => {
    try {
      const { auth, data } = request;
      
      if (!auth) {
        throw new HttpsError('unauthenticated', 'Authentication required');
      }

      // TODO: Add admin role verification
      // if (!auth.token.admin) {
      //   throw new HttpsError('permission-denied', 'Admin access required');
      // }

      const { venueId }: { venueId: string } = data;

      if (!venueId) {
        throw new HttpsError('invalid-argument', 'Venue ID required');
      }

      // TODO: Implement dashboard data aggregation
      // This is a placeholder for aggregated venue metrics
      
      return {
        venueId,
        activeUsers: 0,
        pausedUsers: 0,
        joinSuccessRate: 0,
        avgAccuracy: 0,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      
      logger.error('Error in getVenueDashboard', { error, userId: request.auth?.uid });
      throw new HttpsError('internal', 'Internal server error');
    }
  }
);

/**
 * Security Alert Handler - Process security events and send alerts
 */
export const handleSecurityAlert = onCall(
  {
    cors: ['https://admin.hooked.app']
  },
  async (request) => {
    try {
      const { auth, data } = request;
      
      if (!auth) {
        throw new HttpsError('unauthenticated', 'Authentication required');
      }

      // TODO: Add admin role verification and implement security alerting
      
      return { success: true };

    } catch (error) {
      logger.error('Error in handleSecurityAlert', { error });
      throw new HttpsError('internal', 'Internal server error');
    }
  }
);